// ============================================================================
// TRADELINK V6.0 — MIDDLEWARES SERVEUR : GESTION CENTRALISÉE DES ERREURS,
// AUTHENTIFICATION SESSION UNIQUE REDIS, MFA ADMIN OBLIGATOIRE, RBAC GRANULAIRE,
// PROTECTION IDOR (OWNERSHIP) & IDEMPOTENCE
// Conforme aux Chapitres 2.1, 2.2, 9.20, PROMPT 4 et PROMPT 5
// ============================================================================

import { UserRoleCode } from '../../types';
import { GranularPermission, hasGranularPermission } from '../../services/securityCrypto';

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

// Registre Redis simulé de sessions actives (1 seule session active par userId)
const activeSessionRegistry = new Map<string, string>();
// Registre Redis de statut MFA par sessionId (pour les sessions ADMIN)
const sessionMfaRegistry = new Map<string, boolean>();
// Registre Redis de clés d'idempotence (anti-rejeu sur paiements, commandes, imports, restaurations)
const idempotencyCache = new Map<string, ServerResponsePayload>();

export function registerSingleActiveSession(
  userId: string,
  sessionId: string,
  mfaVerified = true
): {
  previousRevokedSessionId: string | null;
} {
  const previous = activeSessionRegistry.get(userId) ?? null;
  if (previous && previous !== sessionId) {
    sessionMfaRegistry.delete(previous);
  }
  activeSessionRegistry.set(userId, sessionId);
  sessionMfaRegistry.set(sessionId, mfaVerified);
  return {
    previousRevokedSessionId: previous && previous !== sessionId ? previous : null,
  };
}

export function markSessionMfaVerified(sessionId: string): void {
  sessionMfaRegistry.set(sessionId, true);
}

export function isSessionMfaVerified(sessionId: string): boolean {
  return sessionMfaRegistry.get(sessionId) ?? true;
}

export function verifySingleActiveSession(userId: string, sessionId: string): boolean {
  const current = activeSessionRegistry.get(userId);
  if (!current) return false;
  return current === sessionId;
}

export function revokeUserActiveSession(userId: string): boolean {
  const current = activeSessionRegistry.get(userId);
  if (current) {
    sessionMfaRegistry.delete(current);
  }
  return activeSessionRegistry.delete(userId);
}

// Middleware d'authentification et vérification de session unique
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
  const mfaOk =
    ctx.user.mfaVerified !== undefined
      ? ctx.user.mfaVerified
      : isSessionMfaVerified(ctx.user.sessionId);

  if (ctx.user.role === 'ADMIN' && !mfaOk && !ctx.path.startsWith('/api/v1/auth/mfa')) {
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

// Middleware d'idempotence (Chapitre 9.20 : Idempotency-Key)
export function checkIdempotencyCache(
  idempotencyKey: string | undefined
): ServerResponsePayload | null {
  if (!idempotencyKey) return null;
  return idempotencyCache.get(idempotencyKey) ?? null;
}

export function storeIdempotencyResult(
  idempotencyKey: string | undefined,
  response: ServerResponsePayload
): void {
  if (idempotencyKey && response.statusCode >= 200 && response.statusCode < 300) {
    idempotencyCache.set(idempotencyKey, response);
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

// Assainissement XSS automatique des entrées utilisateur (DAST / Injection)
export function sanitizeHtmlInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript:[^\s"'>]+/gi, '')
    .replace(/<svg\b[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '');
}

export function sanitizeObjectFields<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? (sanitizeHtmlInput(obj) as unknown as T) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectFields) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = sanitizeObjectFields(v);
  }
  return result as T;
}
