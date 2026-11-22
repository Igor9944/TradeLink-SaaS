// ============================================================================
// TRADELINK V6.0 — MIDDLEWARES SERVEUR : GESTION CENTRALISÉE DES ERREURS,
// AUTHENTIFICATION SESSION UNIQUE REDIS, MFA ADMIN OBLIGATOIRE, RBAC GRANULAIRE,
// PROTECTION IDOR (OWNERSHIP) & IDEMPOTENCE
// Conforme aux Chapitres 2.1, 2.2, 9.20, PROMPT 4 et PROMPT 5
// ============================================================================

import { UserRoleCode } from '../../types';
import { GranularPermission, hasGranularPermission } from '../../services/securityCrypto';
import { TradeLinkRedisManager } from '../database/redis.client';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export interface ServerRequestContext {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
  body: Record<string, any>;
  rawBody?: string;
  correlationId: string;
  ipAddress: string;
  user?: {
    id: string;
    email: string;
    role: UserRoleCode;
    sessionId: string;
    companyName: string;
    mfaVerified?: boolean;
  };
}

export interface ServerResponsePayload<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: {
    success: boolean;
    correlationId: string;
    persistedInDatabase: boolean;
    dataSource: 'POSTGRESQL_PRISMA' | 'ISOLATED_SANDBOX_STORE';
    data?: T;
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
}

// Registre distribué Redis 7 (partagé entre toutes les instances Node.js — Zéro dépendance à une Map locale isolée)
export function registerSingleActiveSession(
  userId: string,
  sessionId: string,
  mfaVerified = true
): {
  previousRevokedSessionId: string | null;
} {
  return TradeLinkRedisManager.registerActiveSession(userId, sessionId, mfaVerified);
}

export function markSessionMfaVerified(sessionId: string): void {
  TradeLinkRedisManager.setSessionMfaVerified(sessionId, true);
}

export function isSessionMfaVerified(sessionId: string): boolean {
  return TradeLinkRedisManager.getSessionMfaVerified(sessionId) ?? false;
}

export interface SecurityEventLogEntry {
  timestamp: string;
  event: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  correlationId: string;
  ipAddress: string;
  actorId?: string;
  actorRole?: string;
  path: string;
  details: string;
}

const securityEventLogs: SecurityEventLogEntry[] = [];

export function recordSecurityEventLog(entry: Omit<SecurityEventLogEntry, 'timestamp'>): void {
  // Redaction préventive contre toute fuite de secret ou token dans les logs
  const safeDetails = entry.details.replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
  securityEventLogs.push({
    ...entry,
    details: safeDetails,
    timestamp: new Date().toISOString(),
  });
}

export function getSecurityEventLogs(): SecurityEventLogEntry[] {
  return [...securityEventLogs];
}

export function verifySingleActiveSession(userId: string, sessionId: string): boolean {
  return TradeLinkRedisManager.verifyActiveSession(userId, sessionId);
}

export function revokeUserActiveSession(userId: string): boolean {
  return TradeLinkRedisManager.revokeActiveSessionForUser(userId);
}

// Middleware d'authentification et vérification de session unique via Redis 7
export function requireAuthenticatedSession(
  ctx: ServerRequestContext
): NonNullable<ServerRequestContext['user']> {
  if (!ctx.user) {
    throw new AppError(
      401,
      'AUTH_UNAUTHORIZED',
      'Authentification requise : jeton JWT manquant ou invalide.'
    );
  }
  const isSessionValid = verifySingleActiveSession(ctx.user.id, ctx.user.sessionId);
  if (!isSessionValid) {
    throw new AppError(
      401,
      'SESSION_REVOKED_SINGLE_ACCESS_POLICY',
      'Votre session a été révoquée suite à une nouvelle connexion ou une révocation administrative (Chapitre 2.2).'
    );
  }

  // Vérification MFA obligatoire pour l'Administrateur (Chapitre 2.2 & PROMPT 5)
  // Si la session en registre Redis est explicitement marquée non vérifiée (false), bloquer même si le payload non élevé tente de passer
  const registryMfa = TradeLinkRedisManager.getSessionMfaVerified(ctx.user.sessionId);
  const mfaOk =
    registryMfa === false
      ? false
      : registryMfa === true
      ? (ctx.user.mfaVerified ?? true)
      : Boolean(ctx.user.mfaVerified);

  if (ctx.user.role === 'ADMIN' && !mfaOk && !ctx.path.startsWith('/api/v1/auth/mfa')) {
    recordSecurityEventLog({
      event: 'ADMIN_MFA_BYPASS_ATTEMPT_BLOCKED',
      severity: 'CRITICAL',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      path: ctx.path,
      details: 'Tentative d’accès administrateur sans validation MFA TOTP.',
    });
    throw new AppError(
      403,
      'ADMIN_MFA_MANDATORY',
      'Sécurité TRADELINK (Chapitre 2.2) : La double authentification TOTP (MFA) est strictement obligatoire pour tout compte Administrateur.'
    );
  }

  return ctx.user;
}

// Middleware RBAC granulaire et contrôle de propriété de ressource (Ownership / Anti-IDOR)
export function enforceRBACAndOwnership(
  ctx: ServerRequestContext,
  allowedRoles: UserRoleCode[],
  resourceOwnerId?: string,
  requiredPermission?: GranularPermission
): void {
  const user = requireAuthenticatedSession(ctx);

  // Un compte VISITEUR (en attente d'approbation OTP/KYC) ne peut accéder aux opérations métiers
  if (user.role === 'VISITEUR' && !allowedRoles.includes('VISITEUR')) {
    throw new AppError(
      403,
      'VISITOR_ACCOUNT_PENDING_APPROVAL',
      'Votre demande de compte Visiteur est en attente de validation OTP/KYC avant transformation en compte Client B2B.'
    );
  }

  // Règle Stage 3 : Le Comptable est strictement en lecture seule sur les données commerciales sources
  if (
    user.role === 'COMPTABLE' &&
    ['POST', 'PUT', 'DELETE'].includes(ctx.method) &&
    (ctx.path.startsWith('/api/v1/products') ||
      ctx.path.startsWith('/api/v1/stocks') ||
      ctx.path.startsWith('/api/v1/orders'))
  ) {
    throw new AppError(
      403,
      'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
      'Interdit (Chapitre 2.1 & Annexe B) : Le rôle Comptable est en lecture seule sur les données commerciales sources.'
    );
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      403,
      'RBAC_FORBIDDEN_ROLE',
      `Accès refusé : le rôle ${user.role} n'est pas autorisé sur cet endpoint (${ctx.method} ${ctx.path}).`
    );
  }

  if (requiredPermission && !hasGranularPermission(user.role, requiredPermission)) {
    throw new AppError(
      403,
      'RBAC_MISSING_GRANULAR_PERMISSION',
      `Permission granulaire manquante (${requiredPermission}) pour le rôle ${user.role}.`
    );
  }

  // Vérification d'ownership (Protection IDOR) sauf pour ADMIN
  if (resourceOwnerId && user.role !== 'ADMIN' && user.id !== resourceOwnerId) {
    throw new AppError(
      403,
      'RESOURCE_OWNERSHIP_VIOLATION',
      'Accès refusé (Protection IDOR) : vous ne pouvez consulter ou modifier que les ressources qui vous appartiennent.'
    );
  }
}

// Middleware d'idempotence distribué via Redis 7 (Chapitre 9.20 : Idempotency-Key)
export function checkIdempotencyCache(
  idempotencyKey: string | undefined
): ServerResponsePayload | null {
  if (!idempotencyKey) return null;
  return TradeLinkRedisManager.getIdempotencyPayload<ServerResponsePayload>(idempotencyKey);
}

export function storeIdempotencyResult(
  idempotencyKey: string | undefined,
  response: ServerResponsePayload
): void {
  if (idempotencyKey && response.statusCode >= 200 && response.statusCode < 300) {
    TradeLinkRedisManager.setIdempotencyPayload(idempotencyKey, response, 86400);
  }
}

// Gestionnaire centralisé d'erreurs (Chapitre 9.20 : aucun secret ni stack trace exposé)
export function handleCentralizedServerError(
  err: unknown,
  correlationId: string,
  persistedInDatabase: boolean
): ServerResponsePayload {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
      },
      body: {
        success: false,
        correlationId,
        persistedInDatabase,
        dataSource: persistedInDatabase ? 'POSTGRESQL_PRISMA' : 'ISOLATED_SANDBOX_STORE',
        error: {
          code: err.errorCode,
          message: err.message,
          details: err.details,
        },
      },
    };
  }

  console.error('SERVER_UNCAUGHT_ERROR:', err);
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
    },
    body: {
      success: false,
      correlationId,
      persistedInDatabase,
      dataSource: persistedInDatabase ? 'POSTGRESQL_PRISMA' : 'ISOLATED_SANDBOX_STORE',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'Une erreur interne est survenue. Veuillez communiquer l’identifiant de corrélation au support.',
      },
    },
  };
}

const NON_SANITIZED_SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'passwordHash',
  'secret',
  'token',
  'refreshToken',
  'accessToken',
  'rawToken',
  'signature',
  'hmacSignature',
  'totpCode',
  'mfaCode',
  'code',
  'otp',
  'recoveryCode',
  'webhookSecret',
  'base64Data',
  'fileBytesBase64',
  'audioBase64',
]);

function decodeHtmlEntitiesForSecurityScan(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#([0-9]+);?/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&colon;/gi, ':')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

// Assainissement XSS automatique des entrées utilisateur (DAST / Injection)
export function sanitizeHtmlInput(input: string): string {
  if (typeof input !== 'string') return input;
  let cleaned = input;
  let prev = '';
  let iterations = 0;

  do {
    prev = cleaned;
    // Neutralise les entités / caractères de contrôle utilisés pour obfusquer javascript:/vbscript:/data:
    const decodedForCheck = decodeHtmlEntitiesForSecurityScan(cleaned).replace(/[\x00-\x20]+/g, '');
    if (/(?:javascript|vbscript):/i.test(decodedForCheck) || /data:(?:text\/html|image\/svg\+xml|application\/)/i.test(decodedForCheck)) {
      cleaned = decodeHtmlEntitiesForSecurityScan(cleaned);
    }

    cleaned = cleaned
      // Blocs complets à contenu exécutable / style
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
      .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '')
      .replace(/<math\b[^>]*>[\s\S]*?<\/math\s*>/gi, '')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, '')
      // Balises dangereuses ouvrantes/fermantes (préserve le contenu interne de <svg>...</svg> tel que <path> pour la POD >= 10 chars avant échappement)
      .replace(/<\/?(?:script|iframe|object|embed|svg|math|style|link|meta|base|form|img|details|video|audio|source|body|html|head)\b[^>]*>/gi, '')
      // Gestionnaires d'événements inline (onerror=, onload=, onclick=, etc.)
      .replace(/\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]*)/gi, '')
      .replace(/\bon[a-z]+\s*=/gi, '')
      // Schémas URI dangereux (y compris avec espaces/contrôles intercalés)
      .replace(/(?:j[\x00-\x20]*a[\x00-\x20]*v[\x00-\x20]*a[\x00-\x20]*s[\x00-\x20]*c[\x00-\x20]*r[\x00-\x20]*i[\x00-\x20]*p[\x00-\x20]*t|v[\x00-\x20]*b[\x00-\x20]*s[\x00-\x20]*c[\x00-\x20]*r[\x00-\x20]*i[\x00-\x20]*p[\x00-\x20]*t)\s*:/gi, '')
      .replace(/data\s*:\s*(?:text\/html|image\/svg\+xml|application\/[^\s"'>;,]*)/gi, '');

    iterations += 1;
  } while (cleaned !== prev && iterations < 10);

  // Neutralise tout résidu '<' ou '>' (ex. balise tronquée ou vecteur <path>/<svg>) afin qu'aucun nœud HTML ne puisse être interprété
  return cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeObjectFields<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? (sanitizeHtmlInput(obj) as unknown as T) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectFields(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (NON_SANITIZED_SENSITIVE_FIELDS.has(k)) {
      result[k] = v;
    } else {
      result[k] = sanitizeObjectFields(v);
    }
  }
  return result as T;
}
