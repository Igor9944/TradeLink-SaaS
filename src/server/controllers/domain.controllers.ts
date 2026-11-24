// ============================================================================
// TRADELINK V6.0 — CONTRÔLEURS API ET ROUTEUR CENTRALISÉ
// Séparation stricte : Routes -> Middlewares -> Validateurs -> Contrôleurs -> Services -> Repositories
// Conforme aux Chapitres 2, 6, 7, 9, 10, PROMPT 4 et PROMPT 5
// ============================================================================

import crypto from 'node:crypto';
import {
  AppError,
  checkIdempotencyCache,
  enforceRBACAndOwnership,
  handleCentralizedServerError,
  requireAuthenticatedSession,
  sanitizeObjectFields,
  ServerRequestContext,
  ServerResponsePayload,
  storeIdempotencyResult,
} from '../middlewares/errorAndSecurity.middleware';
import {
  assertFlatStringQuery,
  AuthForgotPasswordZodSchema,
  AuthLoginZodSchema,
  AuthMfaVerifyZodSchema,
  AuthRefreshZodSchema,
  AuthRegisterZodSchema,
  AuthResetPasswordZodSchema,
  AuthVerifyOtpZodSchema,
  AuthVerifyPhoneZodSchema,
  CartValidateZodSchema,
  InvoiceGenerateZodSchema,
  LogisticsIncidentCreateZodSchema,
  OrderDisputeCreateZodSchema,
  OrderStatusUpdateZodSchema,
  parseWithZod,
  PaymentInitiateZodSchema,
  QuoteCreateZodSchema,
  ShipmentGpsZodSchema,
  StockMovementLegacyZodSchema,
  StripeCheckoutSessionZodSchema,
  StripeWebhookZodSchema,
  TranslationDetectZodSchema,
  TranslationTextZodSchema,
  validateCalculationPayload,
  validateKycDecisionPayload,
  validateOrderCreatePayload,
  validatePaginationAndFilters,
} from '../validators/schema.validator';
import {
  constantTimeEqual,
  getServiceHmacSecret,
  isWeakOrExposedSecret,
} from '../../services/securityCrypto';
import { GeminiAiService } from '../../services/geminiAiService';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkDomainServices } from '../services/domain.services';
import { buildOpenApiSpecification } from '../openapi/openapi.spec';
import { evaluateKYCDossierRule, APM_TELEMETRY } from '../../services/backendServices';
import { CentralTranslationService } from '../../services/translationEngine';
import { TAX_JURISDICTIONS } from '../../services/billingDocumentEngine';
import { observabilityMetrics } from '../../services/observabilityMetrics';
import { DeadLetterQueueManager } from '../../services/deadLetterQueue';
import {
  geminiCircuitBreaker,
  meetCircuitBreaker,
  clamAvCircuitBreaker,
  paymentCircuitBreaker,
} from '../../services/circuitBreaker';
import { TradeLinkPostgresManager } from '../database/prisma.client';
import { TradeLinkRedisManager } from '../database/redis.client';

export class TradeLinkApiApplication {
  private readonly services: TradeLinkDomainServices;

  constructor(private readonly repo: TradeLinkRepositoryStore) {
    this.services = new TradeLinkDomainServices(repo);
  }

  private ok<T>(
    ctx: ServerRequestContext,
    data: T,
    statusCode = 200,
    pagination?: ServerResponsePayload['body']['pagination'],
    extraHeaders?: Record<string, string>
  ): ServerResponsePayload<T> {
    const isGet = ctx.method === 'GET';
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': ctx.correlationId,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'Cache-Control': isGet
          ? 'public, max-age=60, stale-while-revalidate=120'
          : 'no-store, no-cache, must-revalidate',
        'X-Data-Source': this.repo.isProductionDatabaseConnected
          ? 'POSTGRESQL_PRISMA'
          : 'ISOLATED_SANDBOX_STORE',
        ...(extraHeaders ?? {}),
      },
      body: {
        success: true,
        correlationId: ctx.correlationId,
        persistedInDatabase: this.repo.isProductionDatabaseConnected,
        dataSource: this.repo.isProductionDatabaseConnected
          ? 'POSTGRESQL_PRISMA'
          : 'ISOLATED_SANDBOX_STORE',
        data,
        pagination,
      },
    };
  }

  public handleRequest(ctx: ServerRequestContext): ServerResponsePayload {
    const start = performance.now();
    try {
      // Protection Express 5 contre les paramètres de requête non scalaires (?search[x]=1)
      ctx.query = assertFlatStringQuery(ctx.query);

      // Assainissement XSS préventif (exclu sur les webhooks signés HMAC afin de préserver la charge utile brute)
      const isSignedWebhookRoute =
        ctx.path === '/api/v1/payments/stripe/webhook' ||
        ctx.path.startsWith('/api/v1/webhooks/payments/');
      if (!isSignedWebhookRoute && ctx.body && typeof ctx.body === 'object') {
        ctx.body = sanitizeObjectFields(ctx.body);
      }

      // Vérification d'idempotence sur les requêtes mutantes avec Idempotency-Key
      const idempotencyKey = ctx.headers['idempotency-key'];
      if (['POST', 'PUT'].includes(ctx.method) && idempotencyKey) {
        const cached = checkIdempotencyCache(idempotencyKey);
        if (cached) {
          return {
            ...cached,
            headers: { ...cached.headers, 'X-Idempotent-Replay': 'true' },
          };
        }
      }

      const response = this.routeRequest(ctx);

      if (['POST', 'PUT'].includes(ctx.method) && idempotencyKey) {
        storeIdempotencyResult(idempotencyKey, response);
      }

      const durationMs = performance.now() - start;
      APM_TELEMETRY.record(`${ctx.method} ${ctx.path}`, durationMs, true);
      observabilityMetrics.recordHttpRequest(ctx.method, ctx.path, response.statusCode, durationMs);
      return response;
    } catch (err: any) {
      const durationMs = performance.now() - start;
      const statusCode = err?.statusCode || 500;
      APM_TELEMETRY.record(`${ctx.method} ${ctx.path}`, durationMs, false);
      observabilityMetrics.recordHttpRequest(ctx.method, ctx.path, statusCode, durationMs);
      return handleCentralizedServerError(
        err,
        ctx.correlationId,
        this.repo.isProductionDatabaseConnected
      );
    }
  }

  private routeRequest(ctx: ServerRequestContext): ServerResponsePayload {
    const { method, path } = ctx;

    // 1. Health & Readiness & Liveness & Metrics (LOT 8 Observabilité)
    if (method === 'GET' && path === '/api/v1/health') {
      const pgAvailable = TradeLinkPostgresManager.isDatabaseAvailable();
      const redisHealth = TradeLinkRedisManager.checkRedisHealth();
      const isHealthy = pgAvailable && redisHealth.status === 'UP';
      const kmsConfigured = Boolean(
        process.env.KMS_VAULT_ADDR &&
          process.env.KMS_VAULT_TOKEN &&
          !isWeakOrExposedSecret(process.env.KMS_VAULT_TOKEN, 20)
      );
      const clamConfigured = Boolean(process.env.CLAMAV_HOST?.trim());
      const clamBreaker = clamAvCircuitBreaker.getState();
      const geminiConfigured = GeminiAiService.getInstance().isConfigured();
      const geminiBreaker = geminiCircuitBreaker.getState();
      return this.ok(
        ctx,
        {
          status: isHealthy ? 'UP' : 'DEGRADED',
          version: '6.1.0',
          persistedInDatabase: this.repo.isProductionDatabaseConnected,
          checks: {
            database: pgAvailable ? 'UP' : 'DOWN',
            redis: redisHealth.status,
            vault: kmsConfigured ? 'UP (Configured)' : 'NOT_CONFIGURED',
            clamav:
              clamBreaker === 'OPEN'
                ? 'DEGRADED (Circuit Open)'
                : clamConfigured
                ? 'CONFIGURED'
                : 'NOT_CONFIGURED',
            gemini:
              geminiBreaker === 'OPEN'
                ? 'DEGRADED (Circuit Open)'
                : geminiConfigured
                ? 'UP (Configured)'
                : 'NOT_CONFIGURED',
          },
        },
        isHealthy ? 200 : 503
      );
    }

    if (method === 'GET' && (path === '/api/v1/health/ready' || path === '/health/ready')) {
      const pgAvailable = TradeLinkPostgresManager.isDatabaseAvailable();
      const redisHealth = TradeLinkRedisManager.checkRedisHealth();
      const isReady = pgAvailable && redisHealth.status === 'UP';
      const kmsConfigured = Boolean(
        process.env.KMS_VAULT_ADDR &&
          process.env.KMS_VAULT_TOKEN &&
          !isWeakOrExposedSecret(process.env.KMS_VAULT_TOKEN, 20)
      );
      const clamConfigured = Boolean(process.env.CLAMAV_HOST?.trim());
      const clamBreaker = clamAvCircuitBreaker.getState();
      const geminiConfigured = GeminiAiService.getInstance().isConfigured();
      const geminiBreaker = geminiCircuitBreaker.getState();
      return this.ok(
        ctx,
        {
          ready: isReady,
          checks: {
            postgresql16: pgAvailable ? 'READY' : 'UNAVAILABLE',
            redis7Cluster: redisHealth.status === 'UP' ? 'READY' : 'UNAVAILABLE',
            clamAvDaemon:
              clamBreaker === 'OPEN'
                ? 'DEGRADED'
                : clamConfigured
                ? 'CONFIGURED'
                : 'NOT_CONFIGURED',
            hashiCorpVaultKms: kmsConfigured ? 'READY' : 'NOT_CONFIGURED',
            googleGeminiAi:
              geminiBreaker === 'OPEN'
                ? 'DEGRADED'
                : geminiConfigured
                ? 'READY'
                : 'NOT_CONFIGURED',
          },
        },
        isReady ? 200 : 503
      );
    }

    if (method === 'GET' && (path === '/api/v1/health/live' || path === '/health/live')) {
      return this.ok(ctx, {
        live: true,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryOk: process.memoryUsage().heapUsed < 1.5 * 1024 * 1024 * 1024,
      });
    }

    if (method === 'GET' && (path === '/api/v1/metrics' || path === '/api/v1/system/metrics')) {
      const scrapeToken = process.env.METRICS_SCRAPE_TOKEN?.trim();
      const authHeader = String(ctx.headers?.authorization || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const hasValidScrapeToken =
        Boolean(scrapeToken) &&
        scrapeToken!.length >= 16 &&
        Boolean(bearer) &&
        constantTimeEqual(bearer, scrapeToken!);
      if (!hasValidScrapeToken) {
        enforceRBACAndOwnership(ctx, ['ADMIN']);
      }
      return this.ok(ctx, observabilityMetrics.getSnapshot());
    }

    if (method === 'GET' && path === '/api/v1/circuit-breakers') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      return this.ok(ctx, {
        gemini: geminiCircuitBreaker.getStats(),
        meet: meetCircuitBreaker.getStats(),
        clamav: clamAvCircuitBreaker.getStats(),
        payment: paymentCircuitBreaker.getStats(),
      });
    }

    if (method === 'GET' && path === '/api/v1/dlq/jobs') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      return this.ok(ctx, DeadLetterQueueManager.listJobs());
    }

    if (method === 'GET' && path === '/api/v1/docs/openapi.json') {
      return this.ok(ctx, buildOpenApiSpecification());
    }

    // 2A. Inscription Visiteur (Argon2id + OTP + Conditions Générales + Interdiction d'inscription publique ADMIN/COMPTABLE/SUPPORT)
    if (method === 'POST' && path === '/api/v1/auth/register') {
      const parsedBody = parseWithZod(AuthRegisterZodSchema, ctx.body, 'VALIDATION_REGISTER_FIELDS');
      const {
        email,
        password,
        fullName,
        firstName,
        lastName,
        companyName,
        taxId,
        country,
        phone,
        businessAddress,
        city,
        postalCode,
        requestedRole,
        termsAccepted,
        privacyAccepted,
      } = parsedBody;

      const created = this.services.registerVisitorAccount({
        email: String(email),
        password: String(password),
        fullName: fullName ? String(fullName) : undefined,
        firstName: firstName ? String(firstName) : undefined,
        lastName: lastName ? String(lastName) : undefined,
        companyName: String(companyName),
        taxId: taxId ? String(taxId) : 'ICE-PENDING',
        country: String(country ?? 'Maroc'),
        phone: phone ? String(phone) : undefined,
        businessAddress: businessAddress ? String(businessAddress) : undefined,
        city: city ? String(city) : undefined,
        postalCode: postalCode ? String(postalCode) : undefined,
        requestedRole: requestedRole ? String(requestedRole) : 'CLIENT',
        termsAccepted: termsAccepted !== undefined ? Boolean(termsAccepted) : undefined,
        privacyAccepted: privacyAccepted !== undefined ? Boolean(privacyAccepted) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, created, 201);
    }

    // 2B. Vérification OTP Email (6 chiffres, expiration 10 min, max 5 essais, transition Visiteur -> Profil métier)
    if (method === 'POST' && (path === '/api/v1/auth/verify-otp' || path === '/api/v1/auth/verify-email')) {
      const { email, code, approveClientOnboarding } = parseWithZod(
        AuthVerifyOtpZodSchema,
        ctx.body,
        'VALIDATION_OTP_FIELDS'
      );
      const verified = this.services.verifyOtpChallenge({
        email: String(email),
        code: String(code),
        approveClientOnboarding:
          approveClientOnboarding !== undefined ? Boolean(approveClientOnboarding) : true,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, verified, 200);
    }

    // 2B-bis. Vérification SMS OTP Téléphone
    if (method === 'POST' && path === '/api/v1/auth/verify-phone') {
      const { phone, code } = parseWithZod(
        AuthVerifyPhoneZodSchema,
        ctx.body,
        'VALIDATION_PHONE_OTP_FIELDS'
      );
      const verified = this.services.verifyPhoneOtpChallenge({
        phone: String(phone),
        code: String(code),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, verified, 200);
    }

    // 2C. Connexion (Argon2id + Protection Brute-Force + Session Unique Redis + JWT + Refresh Token + Cookie Sécurisé)
    if (method === 'POST' && path === '/api/v1/auth/login') {
      const parsedLogin = parseWithZod(AuthLoginZodSchema, ctx.body, 'VALIDATION_LOGIN_FIELDS');
      const { email, password, companyName, deviceName, userAgent, mfaCode } = parsedLogin;
      const sessionData = this.services.loginAndCreateSingleSession({
        email: String(email),
        password: String(password),
        companyName: companyName ?? 'TradeLink Partner',
        deviceName,
        userAgent,
        mfaCode: mfaCode ? String(mfaCode) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      const sessionCookie = `tradelink_session=${sessionData.accessToken}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`;

      return this.ok(ctx, sessionData, 200, undefined, {
        'Set-Cookie': sessionCookie,
      });
    }

    // 2C-bis. Déconnexion (Révocation de session active & Invalidation Cookie)
    if (method === 'POST' && path === '/api/v1/auth/logout') {
      const user = requireAuthenticatedSession(ctx);
      const res = this.services.logoutUserSession({
        sessionId: user.sessionId,
        userId: user.id,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200, undefined, {
        'Set-Cookie': 'tradelink_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict',
      });
    }

    // 2C-ter. Gestion des sessions de l'utilisateur et endpoint de session courante
    if (method === 'GET' && path === '/api/v1/auth/session') {
      const user = requireAuthenticatedSession(ctx);
      return this.ok(
        ctx,
        {
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            sessionId: user.sessionId,
            companyName: user.companyName,
            mfaVerified: Boolean(user.mfaVerified),
          },
        },
        200
      );
    }

    if (method === 'GET' && path === '/api/v1/auth/sessions') {
      const user = requireAuthenticatedSession(ctx);
      const sessions = this.services.listUserSessions(user.id);
      return this.ok(ctx, sessions, 200);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/auth/sessions/')) {
      const user = requireAuthenticatedSession(ctx);
      const targetSessionId = path.split('/').pop() ?? '';
      const res = this.services.revokeUserSessionById({
        userId: user.id,
        targetSessionId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    // 2C-quater. Protection anti-CSRF & Redirection intelligente
    if (method === 'GET' && path === '/api/v1/auth/csrf-token') {
      const csrfToken = `csrf-${crypto.randomBytes(32).toString('hex')}`;
      const isProdEnv = process.env.NODE_ENV === 'production';
      return this.ok(ctx, { csrfToken }, 200, undefined, {
        'X-CSRF-Token': csrfToken,
        'Set-Cookie': `tradelink_csrf=${csrfToken}; Path=/; SameSite=Strict${isProdEnv ? '; Secure' : ''}`,
      });
    }

    if (method === 'GET' && path === '/api/v1/auth/redirect-target') {
      const user = requireAuthenticatedSession(ctx);
      const redirect = this.services.computeSmartRedirect({
        role: user.role,
        mfaVerified: user.mfaVerified,
      });
      return this.ok(ctx, redirect, 200);
    }

    // 2C-quinquies. Consultation des tentatives de connexion (Audit Security)
    if (method === 'GET' && path === '/api/v1/auth/login-attempts') {
      const user = requireAuthenticatedSession(ctx);
      const attempts =
        user.role === 'ADMIN'
          ? this.services.getLoginAttempts()
          : this.services.getLoginAttempts(user.id, user.email);
      return this.ok(ctx, attempts, 200);
    }

    // 2D. MFA TOTP obligatoire Admin : Setup QR Code & Vérification TOTP
    if (method === 'POST' && path === '/api/v1/auth/mfa/setup') {
      const user = requireAuthenticatedSession(ctx);
      const setup = this.services.setupTotpMfaForUser({
        userId: user.id,
        email: user.email,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, setup, 200);
    }

    if (method === 'POST' && path === '/api/v1/auth/mfa/verify') {
      const user = requireAuthenticatedSession(ctx);
      const { code } = parseWithZod(AuthMfaVerifyZodSchema, ctx.body, 'VALIDATION_MFA_CODE');
      const verified = this.services.verifyAdminTotpMfa({
        user,
        code: String(code),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, verified, 200);
    }

    // 2E. Rotation des Refresh Tokens & Détection de vol de jeton
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      const { refreshToken } = parseWithZod(AuthRefreshZodSchema, ctx.body, 'VALIDATION_REFRESH_TOKEN');
      const rotated = this.services.rotateRefreshToken({
        refreshToken: String(refreshToken),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, rotated, 200);
    }

    // 2F. Mot de passe oublié & Réinitialisation sécurisée à usage unique
    if (method === 'POST' && path === '/api/v1/auth/forgot-password') {
      const { email } = parseWithZod(AuthForgotPasswordZodSchema, ctx.body, 'VALIDATION_EMAIL_REQUIRED');
      const res = this.services.requestPasswordReset({
        email: String(email),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path === '/api/v1/auth/reset-password') {
      const { token, newPassword } = parseWithZod(
        AuthResetPasswordZodSchema,
        ctx.body,
        'VALIDATION_RESET_FIELDS'
      );
      const res = this.services.confirmPasswordReset({
        token: String(token),
        newPassword: String(newPassword),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    // 2G. Gestion des appareils (Device Management + Protection IDOR)
    if (method === 'GET' && path === '/api/v1/auth/devices') {
      const user = requireAuthenticatedSession(ctx);
      const devices = this.services.listUserDevices(user.id);
      return this.ok(ctx, devices, 200);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/auth/devices/')) {
      const user = requireAuthenticatedSession(ctx);
      const deviceId = path.split('/').pop() ?? '';
      const revoked = this.services.revokeUserDevice({
        actorUserId: user.id,
        actorRole: user.role,
        deviceId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, revoked, 200);
    }

    // 2H. Administration des comptes : Suspension & Réactivation (Admin Uniquement)
    if (method === 'POST' && path === '/api/v1/admin/users/suspend') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
      }
      const { userId, email, reason } = ctx.body;
      const target = userId ?? email;
      if (!target || !reason) {
        throw new AppError(400, 'VALIDATION_SUSPEND_FIELDS', 'userId ou email et reason sont requis.');
      }
      const res = this.services.suspendUserAccount({
        targetEmailOrId: String(target),
        reason: String(reason),
        adminUserId: user.id,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path === '/api/v1/admin/users/unsuspend') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
      }
      const { userId, email } = ctx.body;
      const target = userId ?? email;
      if (!target) {
        throw new AppError(400, 'VALIDATION_UNSUSPEND_FIELDS', 'userId ou email est requis.');
      }
      const res = this.services.unsuspendUserAccount({
        targetEmailOrId: String(target),
        adminUserId: user.id,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    // ============================================================================
    // 2I. LOT 3 : CYCLE DE VIE COMPLET DES COMPTES, ACTEURS, ENTREPRISES B2B & ESPACES
    // ============================================================================

    // Codes de récupération MFA à usage unique
    if (method === 'POST' && path === '/api/v1/auth/mfa/recovery-codes') {
      const user = requireAuthenticatedSession(ctx);
      const res = this.services.generateMfaRecoveryCodesService({
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path === '/api/v1/auth/mfa/verify-recovery') {
      const user = requireAuthenticatedSession(ctx);
      const { recoveryCode } = ctx.body || {};
      if (!recoveryCode) {
        throw new AppError(400, 'VALIDATION_RECOVERY_CODE', 'Le code de récupération MFA est requis.');
      }
      const res = this.services.verifyMfaRecoveryCodeService({
        actor: user,
        recoveryCode: String(recoveryCode),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    // Gouvernance des 7 acteurs (Spécifications et permissions serveur)
    if (method === 'GET' && path === '/api/v1/actors/roles') {
      requireAuthenticatedSession(ctx);
      const specs = this.services.listActorSpecificationsService();
      return this.ok(ctx, specs, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/actors/roles/')) {
      requireAuthenticatedSession(ctx);
      const roleCode = (path.split('/').pop() ?? '').toUpperCase() as any;
      const spec = this.services.getActorSpecificationService(roleCode);
      return this.ok(ctx, spec, 200);
    }

    // Espace utilisateur adapté par acteur (/api/v1/workspace/me & /api/v1/users/:id/workspace)
    if (method === 'GET' && path === '/api/v1/workspace/me') {
      const user = requireAuthenticatedSession(ctx);
      const ws = this.services.getActorWorkspaceService(user.id, user);
      return this.ok(ctx, ws, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/users/') && path.endsWith('/workspace')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetUserId = parts[parts.length - 2];
      const ws = this.services.getActorWorkspaceService(targetUserId, user);
      return this.ok(ctx, ws, 200);
    }

    // Gestion des utilisateurs (Admin list, Profil, Appareils de confiance, Sessions, Désactivation, Suppression contrôlée)
    if (method === 'GET' && path === '/api/v1/users') {
      const user = requireAuthenticatedSession(ctx);
      const list = this.services.listAllUsersForAdmin(user);
      return this.ok(ctx, list, 200);
    }

    if (method === 'PUT' && path === '/api/v1/auth/profile') {
      const user = requireAuthenticatedSession(ctx);
      const updated = this.services.updateUserProfileService({
        targetUserId: user.id,
        patch: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/users/') && path.endsWith('/profile')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetUserId = parts[parts.length - 2];
      const updated = this.services.updateUserProfileService({
        targetUserId,
        patch: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    if (
      method === 'POST' &&
      path.startsWith('/api/v1/users/') &&
      path.includes('/devices/') &&
      path.endsWith('/trust')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const deviceId = parts[parts.length - 2];
      const targetUserId = parts[parts.length - 4];
      const trusted = this.services.trustUserDevice({
        actorUserId: user.id,
        actorRole: user.role,
        targetUserId,
        deviceId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, trusted, 200);
    }

    if (
      method === 'DELETE' &&
      path.startsWith('/api/v1/users/') &&
      path.includes('/sessions/')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetSessionId = parts[parts.length - 1];
      const targetUserId = parts[parts.length - 3];
      if (user.role !== 'ADMIN' && user.id !== targetUserId) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Protection IDOR : révocation de session refusée.');
      }
      const res = this.services.revokeUserSessionById({
        userId: targetUserId,
        targetSessionId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/users/') && path.endsWith('/deactivate')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetUserId = parts[parts.length - 2];
      const res = this.services.deactivateUserAccountService({
        targetUserId,
        reason: String(ctx.body?.reason ?? 'Désactivation volontaire du compte.'),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/users/') && path.split('/').length === 5) {
      const user = requireAuthenticatedSession(ctx);
      const targetUserId = path.split('/').pop() ?? '';
      const res = this.services.deleteUserAccountControlledService({
        targetUserId,
        reason: ctx.body?.reason ? String(ctx.body.reason) : undefined,
        forceByAdmin: Boolean(ctx.body?.forceByAdmin),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/users/') && path.split('/').length === 5) {
      const user = requireAuthenticatedSession(ctx);
      const targetUserId = path.split('/').pop() ?? '';
      const detail = this.services.getUserProfileService(targetUserId, user);
      return this.ok(ctx, detail, 200);
    }

    // Gestion des Entreprises B2B (/api/v1/companies/*) avec isolation stricte Anti-IDOR
    if (method === 'GET' && path === '/api/v1/companies') {
      const user = requireAuthenticatedSession(ctx);
      const companies = this.services.listCompaniesService(user);
      return this.ok(ctx, companies, 200);
    }

    if (method === 'POST' && path === '/api/v1/companies') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN']);
      const created = this.services.createCompanyService({
        body: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, created, 201);
    }

    if (method === 'POST' && path.startsWith('/api/v1/companies/') && path.endsWith('/representatives')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const rep = this.services.addCompanyRepresentativeService({
        companyId,
        body: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, rep, 201);
    }

    if (method === 'POST' && path.startsWith('/api/v1/companies/') && path.endsWith('/documents')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const doc = this.services.addCompanyDocumentService({
        companyId,
        body: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, doc, 201);
    }

    if (method === 'GET' && path.startsWith('/api/v1/companies/') && path.endsWith('/members')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const comp = this.services.getCompanyByIdService(companyId, user);
      return this.ok(ctx, comp.members, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/companies/') && path.endsWith('/invitations')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const { invitedEmail, targetInternalRole, customPermissions } = ctx.body || {};
      if (!invitedEmail) {
        throw new AppError(400, 'VALIDATION_INVITED_EMAIL', 'invitedEmail est obligatoire.');
      }
      const res = this.services.inviteCompanyMemberService({
        companyId,
        invitedEmail: String(invitedEmail),
        targetInternalRole: targetInternalRole || 'COMPANY_VIEWER',
        customPermissions: Array.isArray(customPermissions) ? customPermissions : undefined,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (
      method === 'POST' &&
      path.startsWith('/api/v1/companies/') &&
      path.includes('/invitations/') &&
      path.endsWith('/accept')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const invitationId = parts[parts.length - 2];
      const companyId = parts[parts.length - 4];
      const rawToken = String(ctx.body?.token ?? '');
      const member = this.services.acceptCompanyInvitationService({
        companyId,
        invitationId,
        rawToken,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, member, 200);
    }

    if (
      method === 'PUT' &&
      path.startsWith('/api/v1/companies/') &&
      path.includes('/members/') &&
      path.endsWith('/permissions')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetMemberId = parts[parts.length - 2];
      const companyId = parts[parts.length - 4];
      const updated = this.services.updateCompanyMemberPermissionsService({
        companyId,
        targetMemberId,
        internalRole: ctx.body?.internalRole,
        permissions: Array.isArray(ctx.body?.permissions) ? ctx.body.permissions : undefined,
        actor: user,
      });
      return this.ok(ctx, updated, 200);
    }

    if (
      method === 'DELETE' &&
      path.startsWith('/api/v1/companies/') &&
      path.includes('/members/')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const targetMemberId = parts[parts.length - 1];
      const companyId = parts[parts.length - 3];
      const removed = this.services.removeCompanyMemberService({
        companyId,
        targetMemberId,
        actor: user,
      });
      return this.ok(ctx, removed, 200);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/companies/') && path.endsWith('/status')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const updated = this.services.updateCompanyStatusAdminService({
        companyId,
        status: ctx.body?.status,
        reason: String(ctx.body?.reason ?? ''),
        actor: user,
      });
      return this.ok(ctx, updated, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/companies/') && path.endsWith('/history')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const companyId = parts[parts.length - 2];
      const comp = this.services.getCompanyByIdService(companyId, user);
      return this.ok(ctx, comp.history, 200);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/companies/') && path.split('/').length === 5) {
      const user = requireAuthenticatedSession(ctx);
      const companyId = path.split('/').pop() ?? '';
      const updated = this.services.updateCompanyProfileService({
        companyId,
        patch: ctx.body || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/companies/') && path.split('/').length === 5) {
      const user = requireAuthenticatedSession(ctx);
      const companyId = path.split('/').pop() ?? '';
      const comp = this.services.getCompanyByIdService(companyId, user);
      return this.ok(ctx, comp, 200);
    }

    // 3A. Catégories & Produits (Pagination, Filtres, Soft Delete, Restriction Comptable Stage 3)
    if (method === 'GET' && path === '/api/v1/categories') {
      const categories = this.services.listProductCategories();
      return this.ok(ctx, categories);
    }

    if (method === 'POST' && path === '/api/v1/categories') {
      const user = requireAuthenticatedSession(ctx);
      const cat = this.services.createCatalogCategoryService(user, ctx.body as any);
      return this.ok(ctx, cat, 201);
    }

    if ((method === 'PUT' || method === 'PATCH') && path.startsWith('/api/v1/categories/')) {
      const user = requireAuthenticatedSession(ctx);
      const categoryId = path.replace('/api/v1/categories/', '');
      const cat = this.services.updateCatalogCategoryService(user, categoryId, ctx.body);
      return this.ok(ctx, cat);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/categories/')) {
      const user = requireAuthenticatedSession(ctx);
      const categoryId = path.replace('/api/v1/categories/', '');
      const result = this.services.deleteCatalogCategoryService(user, categoryId);
      return this.ok(ctx, result);
    }

    if (method === 'GET' && path === '/api/v1/products') {
      const pagination = validatePaginationAndFilters(ctx.query);
      const res = this.repo.getActiveProducts(pagination);
      const items = !ctx.user ? res.items.filter((p) => p.isPublished !== false) : res.items;
      return this.ok(ctx, items, 200, {
        page: res.page,
        limit: res.limit,
        totalItems: items.length,
        totalPages: res.totalPages,
      });
    }

    if (method === 'POST' && path === '/api/v1/products') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source.'
        );
      }
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN'], undefined, 'products:write');
      const prod = this.services.createProductTransactional({
        actor: user,
        product: ctx.body as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, prod, 201);
    }

    // 3B. Mouvements de stock (POST uniquement ici; GET unifié et protégé dans section Stocks ci-dessous)
    if (method === 'POST' && path === '/api/v1/stocks/movements') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source.'
        );
      }
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN'], undefined, 'stocks:write');
      const { productId, movementType, quantity, reason, referenceDocument } = parseWithZod(
        StockMovementLegacyZodSchema,
        ctx.body,
        'VALIDATION_STOCK_MOVEMENT_FIELDS'
      );
      const res = this.services.recordStockMovementTransactional({
        actor: user,
        productId: String(productId),
        movementType: movementType as any,
        quantity: Number(quantity),
        reason: String(reason),
        referenceDocument: referenceDocument ? String(referenceDocument) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/products/')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN'], undefined, 'products:write');
      const productId = path.split('/').pop() ?? '';
      const product = this.repo.findActiveProductById(productId);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable ou déjà supprimé.');
      }
      // Protection IDOR : un Fournisseur ne peut supprimer que ses propres produits
      if (user.role === 'FOURNISSEUR' && product.supplierId !== user.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Accès refusé (Protection IDOR) : vous ne pouvez supprimer que vos propres produits.'
        );
      }
      if (this.services.hasActiveOrdersForProduct(productId)) {
        throw new AppError(
          409,
          'PRODUCT_HAS_ACTIVE_ORDERS',
          'Suppression refusée : ce produit est rattaché à une ou plusieurs commandes actives. Veuillez l’archiver ou clôturer les commandes en cours.'
        );
      }
      this.repo.softDeleteProduct(productId);
      return this.ok(ctx, { id: productId, softDeleted: true });
    }

    // ============================================================================
    // PROMPT 09 : CATALOGUE CENTRAL B2B & GESTION DES PRODUITS (/api/v1/catalog/*)
    // ============================================================================

    // 1. Catégories Hiérarchiques
    if (method === 'GET' && path === '/api/v1/catalog/categories') {
      const includeInactive = ctx.query?.includeInactive === 'true';
      const categories = this.services.listCatalogCategoriesService(includeInactive);
      return this.ok(ctx, categories);
    }

    if (method === 'GET' && path.startsWith('/api/v1/catalog/categories/')) {
      const categoryId = path.replace('/api/v1/catalog/categories/', '');
      const cat = this.services.getCatalogCategoryDetailService(categoryId);
      return this.ok(ctx, cat);
    }

    if (method === 'POST' && path === '/api/v1/catalog/categories') {
      const user = requireAuthenticatedSession(ctx);
      const cat = this.services.createCatalogCategoryService(user, ctx.body as any);
      return this.ok(ctx, cat, 201);
    }

    if ((method === 'PUT' || method === 'PATCH') && path.startsWith('/api/v1/catalog/categories/')) {
      const user = requireAuthenticatedSession(ctx);
      const categoryId = path.replace('/api/v1/catalog/categories/', '');
      const cat = this.services.updateCatalogCategoryService(user, categoryId, ctx.body);
      return this.ok(ctx, cat);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/catalog/categories/')) {
      const user = requireAuthenticatedSession(ctx);
      const categoryId = path.replace('/api/v1/catalog/categories/', '');
      const result = this.services.deleteCatalogCategoryService(user, categoryId);
      return this.ok(ctx, result);
    }

    // 2. Recherche & Filtres Produits
    if (method === 'GET' && path === '/api/v1/catalog/products') {
      const pagination = validatePaginationAndFilters(ctx.query);
      const criteria = {
        search: ctx.query?.search,
        categoryId: ctx.query?.categoryId || ctx.query?.category,
        subcategoryId: ctx.query?.subcategoryId || ctx.query?.subcategory,
        originCountry: ctx.query?.originCountry || ctx.query?.country,
        minPrice: ctx.query?.minPrice,
        maxPrice: ctx.query?.maxPrice,
        currency: ctx.query?.currency,
        inStockOnly: ctx.query?.inStockOnly === 'true',
        maxMoq: ctx.query?.maxMoq ? Number(ctx.query.maxMoq) : undefined,
        incoterm: ctx.query?.incoterm,
        supplierId: ctx.query?.supplierId,
        status: ctx.query?.status as any,
        sortBy: ctx.query?.sortBy as any,
        page: pagination.page,
        limit: pagination.limit,
      };
      const result = this.services.searchCatalogProductsService(criteria, ctx.user);
      return this.ok(ctx, result, 200, {
        page: result.page,
        limit: criteria.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
      });
    }

    // 3. Comparateur B2B
    if (method === 'POST' && path === '/api/v1/catalog/compare') {
      const { productIds } = ctx.body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new AppError(400, 'INVALID_PRODUCT_IDS', 'Un tableau productIds non vide est requis.');
      }
      const matrix = this.services.compareCatalogProductsService(productIds);
      return this.ok(ctx, matrix);
    }

    // 4. Favoris / Wishlist Client
    if (method === 'POST' && path.startsWith('/api/v1/catalog/favorites/') && path.endsWith('/toggle')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/favorites/', '').replace('/toggle', '');
      const result = this.services.toggleCatalogFavoriteService(user, productId);
      return this.ok(ctx, result);
    }

    if (method === 'GET' && path === '/api/v1/catalog/favorites') {
      const user = requireAuthenticatedSession(ctx);
      const favs = this.services.listCatalogFavoritesService(user);
      return this.ok(ctx, favs);
    }

    // 5. Importation par Lot (Bulk Import)
    if (method === 'POST' && path === '/api/v1/catalog/products/bulk-import') {
      const user = requireAuthenticatedSession(ctx);
      const { items } = ctx.body;
      if (!Array.isArray(items)) {
        throw new AppError(400, 'INVALID_BULK_ITEMS', 'Un tableau "items" est requis.');
      }
      const result = this.services.importCatalogProductsBulkService(user, items);
      return this.ok(ctx, result, 201);
    }

    // 6. Statistiques Globales Catalogue (Admin)
    if (method === 'GET' && path === '/api/v1/catalog/stats') {
      const user = requireAuthenticatedSession(ctx);
      const stats = this.services.getCatalogStatsService(user);
      return this.ok(ctx, stats);
    }

    // 7. Actions Spécifiques sur Produit (/api/v1/catalog/products/:id/*)
    if (method === 'PUT' && path.startsWith('/api/v1/catalog/products/') && path.endsWith('/quick-update')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '').replace('/quick-update', '');
      const updated = this.services.updateCatalogStockAndPriceQuickService(user, productId, ctx.body);
      return this.ok(ctx, updated);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/catalog/products/') && path.endsWith('/archive')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '').replace('/archive', '');
      const updated = this.services.archiveCatalogProductService(user, productId);
      return this.ok(ctx, updated);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/catalog/products/') && path.endsWith('/moderate')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '').replace('/moderate', '');
      const { action, reason } = ctx.body;
      if (action !== 'APPROVE' && action !== 'REJECT') {
        throw new AppError(400, 'INVALID_MODERATION_ACTION', 'Action doit être APPROVE ou REJECT.');
      }
      const updated = this.services.moderateCatalogProductService(user, productId, action, reason);
      return this.ok(ctx, updated);
    }

    if (method === 'POST' && path.startsWith('/api/v1/catalog/products/') && path.endsWith('/report')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '').replace('/report', '');
      const { reason } = ctx.body;
      const reported = this.services.reportCatalogProductService(user, productId, reason);
      return this.ok(ctx, reported);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/catalog/products/') && path.endsWith('/suspend')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '').replace('/suspend', '');
      const { reason } = ctx.body;
      const suspended = this.services.suspendCatalogProductService(user, productId, reason);
      return this.ok(ctx, suspended);
    }

    // 8. CRUD Produit Individuel (/api/v1/catalog/products/:id et /api/v1/catalog/products)
    if (method === 'GET' && path.startsWith('/api/v1/catalog/products/')) {
      const productId = path.replace('/api/v1/catalog/products/', '');
      const product = this.services.getCatalogProductDetailService(productId, ctx.user);
      return this.ok(ctx, product);
    }

    if (method === 'POST' && path === '/api/v1/catalog/products') {
      const user = requireAuthenticatedSession(ctx);
      const created = this.services.createCatalogProductService(
        user,
        ctx.body,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, created, 201);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/catalog/products/')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '');
      const updated = this.services.updateCatalogProductService(
        user,
        productId,
        ctx.body,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, updated);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/catalog/products/')) {
      const user = requireAuthenticatedSession(ctx);
      const productId = path.replace('/api/v1/catalog/products/', '');
      const result = this.services.deleteCatalogProductService(user, productId);
      return this.ok(ctx, result);
    }

    // ========================================================================
    // PROMPT 10 : GESTION DES STOCKS, DISPONIBILITÉS & INVENTAIRES (/api/v1/stocks/*)
    // ========================================================================

    // 1. Vue d'ensemble consolidée des stocks
    if (method === 'GET' && path === '/api/v1/stocks/overview') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const supplierId = ctx.query?.supplierId;
      const overview = this.services.getStockOverviewService(user, supplierId);
      return this.ok(ctx, overview);
    }

    // 2. Historique des mouvements de stock
    if (method === 'GET' && path === '/api/v1/stocks/movements') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const filter = {
        productId: ctx.query?.productId,
        supplierId: ctx.query?.supplierId,
        movementType: ctx.query?.movementType as any,
        search: ctx.query?.search,
        startDate: ctx.query?.startDate,
        endDate: ctx.query?.endDate,
      };
      const movements = this.services.listStockMovementsService(user, filter);
      return this.ok(ctx, movements);
    }

    // 3. Entrée de stock (INBOUND_RECEIPT)
    if (method === 'POST' && path === '/api/v1/stocks/inbound') {
      const user = requireAuthenticatedSession(ctx);
      const movement = this.services.recordInboundStockService(
        user,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, movement, 201);
    }

    // 4. Ajustement de stock (ajustement, perte, casse, régularisation)
    if (method === 'POST' && path === '/api/v1/stocks/adjust') {
      const user = requireAuthenticatedSession(ctx);
      const movement = this.services.adjustStockService(
        user,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, movement, 200);
    }

    // 5. Réservation de stock (commande engagée, anti-surréservation)
    if (method === 'POST' && path === '/api/v1/stocks/reserve') {
      const user = requireAuthenticatedSession(ctx);
      const reservations = this.services.reserveStockForOrderService(
        user,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, reservations, 201);
    }

    // 6. Libération de réservation (annulation commande / modification)
    if (method === 'POST' && path === '/api/v1/stocks/release') {
      const user = requireAuthenticatedSession(ctx);
      const movements = this.services.releaseStockReservationService(
        user,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, movements, 200);
    }

    // 7. Confirmation sortie expédition (FULFILLMENT)
    if (method === 'POST' && path === '/api/v1/stocks/fulfill') {
      const user = requireAuthenticatedSession(ctx);
      const movements = this.services.fulfillStockReservationService(
        user,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, movements, 200);
    }

    // 8. Balayage TTL automatique des réservations expirées
    if (method === 'POST' && path === '/api/v1/stocks/reservations/sweep-expired') {
      const user = requireAuthenticatedSession(ctx);
      const result = this.services.sweepExpiredStockReservationsService(user, ctx.correlationId);
      return this.ok(ctx, result, 200);
    }

    // 9. Liste des réservations de stock
    if (method === 'GET' && path === '/api/v1/stocks/reservations') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const filter = {
        orderId: ctx.query?.orderId,
        clientId: ctx.query?.clientId,
        productId: ctx.query?.productId,
        status: ctx.query?.status as any,
      };
      const reservations = this.services.listStockReservationsService(user, filter);
      return this.ok(ctx, reservations);
    }

    // 10. Sessions d'inventaires physiques
    if (method === 'POST' && path === '/api/v1/stocks/inventory') {
      const user = requireAuthenticatedSession(ctx);
      const session = this.services.createInventorySessionService(
        user,
        ctx.body as any,
        ctx.correlationId
      );
      return this.ok(ctx, session, 201);
    }

    if (method === 'GET' && path === '/api/v1/stocks/inventory') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const sessions = this.services.listInventorySessionsService(user, ctx.query?.supplierId);
      return this.ok(ctx, sessions);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/stocks/inventory/') && path.endsWith('/count')) {
      const user = requireAuthenticatedSession(ctx);
      const sessionId = path.replace('/api/v1/stocks/inventory/', '').replace('/count', '');
      const updated = this.services.updateInventoryCountService(user, sessionId, (ctx.body as any).counts);
      return this.ok(ctx, updated);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/stocks/inventory/') && path.endsWith('/reconcile')) {
      const user = requireAuthenticatedSession(ctx);
      const sessionId = path.replace('/api/v1/stocks/inventory/', '').replace('/reconcile', '');
      const result = this.services.reconcileInventorySessionService(
        user,
        sessionId,
        (ctx.body as any)?.notes,
        ctx.correlationId
      );
      return this.ok(ctx, result);
    }

    if (method === 'GET' && path.startsWith('/api/v1/stocks/inventory/')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const sessionId = path.replace('/api/v1/stocks/inventory/', '');
      const session = this.services.getInventorySessionDetailService(user, sessionId);
      return this.ok(ctx, session);
    }

    // 11. Alertes de stock faible & ruptures
    if (method === 'GET' && path === '/api/v1/stocks/alerts') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const alerts = this.services.listStockAlertsService(
        user,
        ctx.query?.supplierId,
        ctx.query?.resolved === 'true' ? false : true
      );
      return this.ok(ctx, alerts);
    }

    if (method === 'POST' && path.startsWith('/api/v1/stocks/alerts/') && path.endsWith('/resolve')) {
      const user = requireAuthenticatedSession(ctx);
      const alertId = path.replace('/api/v1/stocks/alerts/', '').replace('/resolve', '');
      const resolved = this.services.resolveStockAlertService(user, alertId);
      return this.ok(ctx, resolved);
    }

    // 12. Rapport financier de valorisation & rotation des stocks
    if (method === 'GET' && path === '/api/v1/stocks/reports/valuation') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const report = this.services.getStockValuationReportService(user, ctx.query?.supplierId);
      return this.ok(ctx, report);
    }

    // ============================================================================
    // 4A. PANIER CLIENT (Validation serveur, prix déterministes, devises, persistance)
    // ============================================================================
    if (method === 'POST' && path === '/api/v1/cart/validate') {
      const user = requireAuthenticatedSession(ctx);
      const { items, currency, vatRatePct, shippingFlatRate, persist } = parseWithZod(
        CartValidateZodSchema,
        ctx.body,
        'INVALID_CART_PAYLOAD'
      );

      const res = this.services.validateCartService({
        items: items as any,
        currency: currency ? String(currency) : 'EUR',
        vatRatePct: vatRatePct !== undefined ? String(vatRatePct) : '20.00',
        shippingFlatRate: shippingFlatRate !== undefined ? String(shippingFlatRate) : '650.00',
        saveForUserId: persist ? user.id : undefined,
      });

      return this.ok(ctx, res, 200);
    }

    if (method === 'GET' && path === '/api/v1/cart') {
      const user = requireAuthenticatedSession(ctx);
      const cartItems = this.services.getPersistedCartService(user.id);
      return this.ok(ctx, cartItems, 200);
    }

    if (method === 'PUT' && path === '/api/v1/cart') {
      const user = requireAuthenticatedSession(ctx);
      const items = ctx.body?.items;
      if (!Array.isArray(items)) {
        throw new AppError(400, 'INVALID_CART_ITEMS', 'items doit être un tableau d’articles.');
      }
      const saved = this.services.savePersistedCartService(user.id, items);
      return this.ok(ctx, saved, 200);
    }

    if (method === 'DELETE' && path === '/api/v1/cart') {
      const user = requireAuthenticatedSession(ctx);
      this.services.savePersistedCartService(user.id, []);
      return this.ok(ctx, { success: true, message: 'Panier réinitialisé.' }, 200);
    }

    // 4. Commandes Transactionnelles, Ownership & Réservation de Stock
    if (method === 'GET' && path === '/api/v1/orders') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const pagination = validatePaginationAndFilters(ctx.query);
      const res = this.repo.getActiveOrdersForActor(user.id, user.role, pagination);
      return this.ok(ctx, res.items, 200, {
        page: res.page,
        limit: res.limit,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      });
    }

    if (method === 'PUT' && path.startsWith('/api/v1/orders/') && path.endsWith('/status')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune commande commerciale source.'
        );
      }
      const parts = path.split('/');
      const orderId = parts[parts.length - 2];
      const { status, reason } = parseWithZod(
        OrderStatusUpdateZodSchema,
        ctx.body,
        'STATUS_REQUIRED'
      );

      const updated = this.services.updateOrderStatusTransactional({
        actor: user,
        orderId,
        targetStatus: status as any,
        reason,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, updated, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/orders/') && path.endsWith('/cancel')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune commande commerciale source.'
        );
      }
      const parts = path.split('/');
      const orderId = parts[parts.length - 2];
      const { reason } = ctx.body || {};

      const updated = this.services.updateOrderStatusTransactional({
        actor: user,
        orderId,
        targetStatus: 'CANCELLED',
        reason: reason || 'Annulation demandée par l’utilisateur',
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, updated, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/orders/') && path.endsWith('/disputes')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR']);
      const parts = path.split('/');
      const orderId = parts[parts.length - 2];
      const { reason, description } = parseWithZod(
        OrderDisputeCreateZodSchema,
        ctx.body,
        'DISPUTE_FIELDS_REQUIRED'
      );

      const result = this.services.openOrderDisputeTransactional({
        actor: user,
        orderId,
        reason: reason as any,
        description,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, result, 201);
    }

    if (method === 'GET' && path.startsWith('/api/v1/orders/')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN'], undefined, 'orders:read_own');
      const orderId = path.split('/').pop() ?? '';
      const order = this.repo.findActiveOrderById(orderId);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }
      if (
        (user.role === 'CLIENT' && order.clientId !== user.id) ||
        (user.role === 'FOURNISSEUR' && order.supplierId !== user.id)
      ) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Accès refusé (Protection IDOR) : vous ne pouvez consulter que vos propres commandes.'
        );
      }
      return this.ok(ctx, order);
    }

    if (method === 'POST' && path === '/api/v1/orders') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source.'
        );
      }
      enforceRBACAndOwnership(ctx, ['CLIENT'], undefined, 'orders:create');
      const payload = validateOrderCreatePayload(ctx.body);
      const idempotencyKey =
        (ctx.headers['idempotency-key'] as string | undefined) ||
        (ctx.body?.idempotencyKey ? String(ctx.body.idempotencyKey) : undefined);
      const created = this.services.createOrderTransactional({
        actor: ctx.user!,
        shippingAddress: payload.shippingAddress,
        lines: payload.lines,
        idempotencyKey,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, created, 201);
    }

    // 4B. Devis (Quotes) — Création, Chiffrage Fournisseur, Acceptation Client & Conversion en Commande
    if (method === 'GET' && path === '/api/v1/quotes') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const allQuotes = this.repo.getSnapshot().quotes;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allQuotes
          : user.role === 'CLIENT'
          ? allQuotes.filter((q) => q.clientId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allQuotes.filter((q) => q.supplierId === user.id)
          : [];
      return this.ok(ctx, scoped);
    }

    if (method === 'POST' && path === '/api/v1/quotes') {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source.'
        );
      }
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN']);
      const validatedQuote = parseWithZod(QuoteCreateZodSchema, ctx.body, 'VALIDATION_QUOTE_FIELDS');
      const quote = this.services.createQuoteTransactional({
        actor: user,
        quoteInput: validatedQuote as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, quote, 201);
    }

    if (method === 'POST' && path === '/api/v1/quotes/sweep-expired') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['ADMIN', 'FOURNISSEUR', 'CLIENT']);
      const res = this.services.sweepExpiredQuotesTransactional({
        actor: user,
        asOfDateStr: ctx.body?.asOfDate ? String(ctx.body.asOfDate) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if ((method === 'PUT' || method === 'POST') && path.startsWith('/api/v1/quotes/') && path.endsWith('/negotiate')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const quoteId = parts[parts.length - 2];
      const res = this.services.negotiateQuoteTransactional({
        actor: user,
        quoteId,
        notes: ctx.body?.notes ? String(ctx.body.notes) : undefined,
        incoterm: ctx.body?.incoterm ? String(ctx.body.incoterm) : undefined,
        paymentTerms: ctx.body?.paymentTerms ? String(ctx.body.paymentTerms) : undefined,
        validUntilDate: ctx.body?.validUntilDate ? String(ctx.body.validUntilDate) : undefined,
        lines: Array.isArray(ctx.body?.lines) ? ctx.body.lines : [],
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/quotes/') && !path.replace('/api/v1/quotes/', '').includes('/')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const quoteId = path.split('/').pop() || '';
      const quote = this.repo.findQuoteById(quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }
      enforceRBACAndOwnership(
        ctx,
        ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN'],
        user.role === 'CLIENT' ? quote.clientId : user.role === 'FOURNISSEUR' ? quote.supplierId : undefined
      );
      return this.ok(ctx, quote);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/quotes/') && path.endsWith('/reject')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN']);
      const parts = path.split('/');
      const quoteId = parts[parts.length - 2];
      const { reason } = ctx.body || {};
      if (!reason) {
        throw new AppError(400, 'REJECTION_REASON_REQUIRED', 'Un motif explicite de refus est obligatoire.');
      }

      const res = this.services.rejectQuoteTransactional({
        actor: user,
        quoteId,
        reason: String(reason),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/quotes/') && path.endsWith('/respond')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const quoteId = parts[parts.length - 2];
      const res = this.services.respondToQuoteTransactional({
        actor: user,
        respondInput: { ...ctx.body, quoteId } as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/quotes/') && path.endsWith('/accept')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN']);
      const parts = path.split('/');
      const quoteId = parts[parts.length - 2];
      const res = this.services.acceptQuoteTransactional({
        actor: user,
        quoteId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'POST' && path.startsWith('/api/v1/quotes/') && path.endsWith('/convert')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role === 'COMPTABLE') {
        throw new AppError(
          403,
          'COMPTABLE_STAGE3_READONLY_SOURCE_DATA',
          'Interdit (Stage 3 Cahier des Charges) : Le rôle COMPTABLE ne peut modifier aucune donnée commerciale source.'
        );
      }
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const quoteId = parts[parts.length - 2];
      const res = this.services.convertQuoteToOrderTransactional({
        actor: user,
        quoteId,
        shippingAddress: String(ctx.body?.shippingAddress ?? 'Adresse logistique confirmée'),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    // 4C. Facturation & Paiements Stripe Idempotents
    if (method === 'GET' && path === '/api/v1/invoices') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const allInvoices = this.repo.getSnapshot().invoices;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allInvoices
          : user.role === 'CLIENT'
          ? allInvoices.filter((i) => i.clientId === user.id)
          : allInvoices.filter((i) => i.supplierId === user.id);
      return this.ok(ctx, scoped);
    }

    if (method === 'POST' && path === '/api/v1/invoices/sweep-overdue') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN', 'FOURNISSEUR']);
      const res = this.services.sweepOverdueInvoicesTransactional({
        actor: user,
        asOfDateStr: ctx.body?.asOfDate ? String(ctx.body.asOfDate) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (
      method === 'GET' &&
      path.startsWith('/api/v1/invoices/') &&
      !path.replace('/api/v1/invoices/', '').includes('/')
    ) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const invoiceId = path.replace('/api/v1/invoices/', '');
      const inv = this.services.getInvoiceByIdService(invoiceId, user);
      return this.ok(ctx, inv, 200);
    }

    if (method === 'POST' && path === '/api/v1/invoices/generate') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const { orderId, dueInDays, jurisdiction } = parseWithZod(
        InvoiceGenerateZodSchema,
        ctx.body,
        'VALIDATION_INVOICE_FIELDS'
      );
      const inv = this.services.generateInvoiceFromOrderTransactional({
        actor: user,
        orderId: String(orderId),
        dueInDays: dueInDays ? Number(dueInDays) : undefined,
        jurisdiction: jurisdiction ? String(jurisdiction) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, inv, 201);
    }

    if (method === 'POST' && path === '/api/v1/payments/stripe/checkout-session') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN']);
      const { orderId, invoiceId } = parseWithZod(
        StripeCheckoutSessionZodSchema,
        ctx.body,
        'VALIDATION_PAYMENT_SESSION_FIELDS'
      );
      const session = this.services.createStripeCheckoutSessionTransactional({
        actor: user,
        orderId: String(orderId),
        invoiceId: String(invoiceId),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, session, 201);
    }

    if (method === 'POST' && path === '/api/v1/payments/stripe/webhook') {
      const signatureHeader = String(ctx.headers['stripe-signature'] || '');
      const timestampHeader = (
        ctx.headers['x-timestamp'] || ctx.headers['x-tradelink-timestamp']
      ) as string | undefined;

      let webhookSecret: string;
      try {
        if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
          throw new AppError(
            503,
            'WEBHOOK_PROVIDER_NOT_CONFIGURED',
            'Passerelle webhook STRIPE non configurée en production.'
          );
        }
        webhookSecret = getServiceHmacSecret('STRIPE_WEBHOOK_SECRET');
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.message.startsWith('FATAL_SECURITY_CONFIG_ERROR:')) {
          throw new AppError(
            503,
            'WEBHOOK_PROVIDER_NOT_CONFIGURED',
            'Passerelle webhook STRIPE non configurée en production.'
          );
        }
        throw err;
      }

      const payload = parseWithZod(
        StripeWebhookZodSchema,
        ctx.body,
        'VALIDATION_STRIPE_WEBHOOK_PAYLOAD'
      );
      try {
        const res = this.services.processStripeWebhookTransactional({
          webhookPayload: payload as any,
          rawPayload: ctx.rawBody ?? ctx.body,
          signatureHeader,
          timestampHeader,
          webhookSecret,
          correlationId: ctx.correlationId,
          ipAddress: ctx.ipAddress,
        });
        return this.ok(ctx, res, 200);
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.message.startsWith('FATAL_SECURITY_CONFIG_ERROR:')) {
          throw new AppError(
            503,
            'WEBHOOK_PROVIDER_NOT_CONFIGURED',
            'Passerelle webhook STRIPE non configurée en production.'
          );
        }
        throw err;
      }
    }

    if (method === 'GET' && path === '/api/v1/payments') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const allPayments = this.repo.getSnapshot().payments;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allPayments
          : user.role === 'CLIENT'
          ? allPayments.filter((p) => p.clientId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allPayments.filter((p) => p.supplierId === user.id)
          : [];
      return this.ok(ctx, scoped);
    }

    // ============================================================================
    // 4D. PAIEMENTS MULTI-PRESTATAIRES (Stripe, Konnect, Flouci, CMI, Virement)
    // ============================================================================
    if (method === 'POST' && path === '/api/v1/payments/initiate') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN']);
      const { orderId, invoiceId, provider, customerEmail, currency } = parseWithZod(
        PaymentInitiateZodSchema,
        ctx.body,
        'PAYMENT_INITIATE_VALIDATION'
      );

      const idempotencyKey = ctx.headers['idempotency-key'] as string | undefined;

      const session = this.services.initiateMultiProviderPaymentTransactional({
        actor: user,
        orderId: String(orderId),
        invoiceId: invoiceId ? String(invoiceId) : undefined,
        provider,
        customerEmail: customerEmail || user.email,
        currency,
        idempotencyKey,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, session, 201);
    }

    if (method === 'POST' && path === '/api/v1/payments/confirm') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['ADMIN', 'COMPTABLE']);
      const { paymentId, providerTxId } = ctx.body || {};
      if (!paymentId) {
        throw new AppError(400, 'PAYMENT_ID_REQUIRED', 'paymentId est obligatoire.');
      }

      const result = this.services.confirmPaymentTransactional({
        actor: user,
        paymentId: String(paymentId),
        providerTxId,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, result, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/payments/') && path.endsWith('/refund')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['ADMIN', 'COMPTABLE']);
      const parts = path.split('/');
      const paymentId = parts[parts.length - 2];
      const { refundAmountStr, reason } = ctx.body || {};

      const result = this.services.refundPaymentTransactional({
        actor: user,
        paymentId,
        refundAmountStr: refundAmountStr ? String(refundAmountStr) : undefined,
        reason: reason ? String(reason) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, result, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/payments/') && (path.endsWith('/fail') || path.endsWith('/cancel'))) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'ADMIN', 'COMPTABLE']);
      const parts = path.split('/');
      const paymentId = parts[parts.length - 2];
      const action = path.endsWith('/fail') ? 'FAIL' : 'CANCEL';
      const updated = this.services.failOrCancelPaymentTransactional({
        actor: user,
        paymentId,
        action,
        reason: String(ctx.body?.reason ?? (action === 'FAIL' ? 'Échec de paiement' : 'Annulation de paiement')),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    if (method === 'GET' && path === '/api/v1/payments/receipts') {
      const user = requireAuthenticatedSession(ctx);
      const receipts = this.repo.getPaymentReceiptsForActor(user.id, user.role);
      return this.ok(ctx, receipts, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/payments/') && path.endsWith('/receipt')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const paymentId = parts[parts.length - 2];
      const receipts = this.repo.getPaymentReceiptsForActor(user.id, user.role);
      const receipt = receipts.find((r) => r.paymentId === paymentId || r.paymentReference === paymentId);
      if (!receipt) {
        throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Quittance de paiement introuvable.');
      }
      return this.ok(ctx, receipt, 200);
    }

    // ============================================================================
    // 4E. WEBHOOKS DE PAIEMENT SÉCURISÉS (HMAC-SHA256 & Anti-Rejeu)
    // ============================================================================
    if (method === 'POST' && path.startsWith('/api/v1/webhooks/payments/')) {
      const rawProvider = path.split('/').pop()?.toUpperCase() || '';
      const ALLOWED_WEBHOOK_PROVIDERS = new Set([
        'STRIPE',
        'KONNECT',
        'FLOUCI',
        'CMI',
        'WIRE_TRANSFER',
        'LETTER_OF_CREDIT',
      ]);
      if (!ALLOWED_WEBHOOK_PROVIDERS.has(rawProvider)) {
        throw new AppError(
          400,
          'INVALID_PAYMENT_PROVIDER',
          `Fournisseur de paiement webhook non autorisé : ${rawProvider || 'EMPTY'}`
        );
      }
      const provider = rawProvider as any;
      const signatureHeader = (
        ctx.headers['stripe-signature'] ||
        ctx.headers['x-tradelink-signature'] ||
        ctx.headers['x-konnect-signature'] ||
        ctx.headers['x-flouci-signature'] ||
        ctx.headers['x-cmi-signature'] ||
        ctx.headers['x-signature'] ||
        ''
      ) as string;

      const timestampHeader = (
        ctx.headers['x-timestamp'] ||
        ctx.headers['x-tradelink-timestamp']
      ) as string | undefined;

      const secretEnvKey = `${rawProvider}_WEBHOOK_SECRET`;
      let webhookSecret: string;
      try {
        if (process.env.NODE_ENV === 'production' && !process.env[secretEnvKey]?.trim()) {
          throw new AppError(
            503,
            'WEBHOOK_PROVIDER_NOT_CONFIGURED',
            `Passerelle webhook ${rawProvider} non configurée en production.`
          );
        }
        webhookSecret = getServiceHmacSecret(secretEnvKey);
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.message.startsWith('FATAL_SECURITY_CONFIG_ERROR:')) {
          throw new AppError(
            503,
            'WEBHOOK_PROVIDER_NOT_CONFIGURED',
            `Passerelle webhook ${rawProvider} non configurée en production.`
          );
        }
        throw err;
      }

      const result = this.services.processSecureMultiProviderWebhookTransactional({
        provider,
        rawPayload: ctx.rawBody ?? ctx.body,
        signatureHeader,
        timestampHeader,
        webhookSecret,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, result, 200);
    }

    // ============================================================================
    // 4F. GESTION DES LITIGES (DISPUTES) & ARBITRAGE ADMINISTRATEUR
    // ============================================================================
    if (method === 'GET' && path === '/api/v1/disputes') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const pagination = validatePaginationAndFilters(ctx.query);
      const disputes = this.repo.getDisputesForActor(user.id, user.role, pagination);
      return this.ok(ctx, disputes, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/disputes/') && path.endsWith('/resolve')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const parts = path.split('/');
      const disputeId = parts[parts.length - 2];
      const { resolution, action } = ctx.body || {};
      if (!resolution || !action) {
        throw new AppError(400, 'RESOLUTION_PARAMS_REQUIRED', 'resolution et action sont obligatoires.');
      }

      const result = this.services.resolveOrderDisputeTransactional({
        actor: user,
        disputeId,
        resolution: String(resolution),
        action,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      return this.ok(ctx, result, 200);
    }

    // ============================================================================
    // 4G. VUE GLOBALE DU CYCLE COMMERCIAL ADMINISTRATEUR
    // ============================================================================
    if (method === 'GET' && path === '/api/v1/commercial/admin/overview') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['ADMIN', 'COMPTABLE']);
      const overview = this.services.getCommercialOverviewAdmin({ actor: user });
      return this.ok(ctx, overview, 200);
    }

    // 5. MODULE KYC COMPLET (PROMPT 6 — Référentiel par profil, Upload chiffré, Prévisualisation KMS, Commentaires, Décisions Admin & Cron J+1/J+3/J+5/J+6/J+7)
    if (method === 'GET' && path === '/api/v1/kyc/requirements') {
      requireAuthenticatedSession(ctx);
      const reqs = this.services.getKycRequirementsByProfile(ctx.query.profile);
      return this.ok(ctx, reqs);
    }

    if (method === 'GET' && path === '/api/v1/kyc/status') {
      const user = requireAuthenticatedSession(ctx);
      const allDossiers = this.repo.getSnapshot().kycDossiers;
      const scoped =
        user.role === 'ADMIN'
          ? allDossiers
          : allDossiers.filter((d) => d.userId === user.id);
      const dossiers = scoped.map((d) => ({
        dossier: d,
        evaluation: evaluateKYCDossierRule(d),
      }));
      return this.ok(ctx, dossiers);
    }

    if (method === 'POST' && path.startsWith('/api/v1/kyc/') && path.endsWith('/documents')) {
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN']);
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const { docType, fileName, fileSizeBytes, mimeType } = ctx.body;
      if (!docType || !fileName) {
        throw new AppError(
          400,
          'VALIDATION_KYC_UPLOAD_FIELDS',
          'docType et fileName sont obligatoires.'
        );
      }
      const res = this.services.uploadAndEncryptKycDocumentTransactional({
        dossierId,
        docType: String(docType),
        fileName: String(fileName),
        fileSizeBytes: fileSizeBytes !== undefined ? Number(fileSizeBytes) : undefined,
        mimeType: mimeType ? String(mimeType) : undefined,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'GET' && path.startsWith('/api/v1/kyc/') && path.endsWith('/preview')) {
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN']);
      // /api/v1/kyc/:id/documents/:docId/preview
      const parts = path.split('/');
      const docId = parts[parts.length - 2];
      const dossierId = parts[parts.length - 4];
      const res = this.services.previewEncryptedKycDocument({
        dossierId,
        docId,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path.startsWith('/api/v1/kyc/') && path.endsWith('/comments')) {
      enforceRBACAndOwnership(ctx, ['ADMIN'], undefined, 'kyc:decide');
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const res = this.services.addAdminKycCommentTransactional({
        dossierId,
        comment: String(ctx.body.comment ?? ''),
        visibility: ctx.body.visibility,
        targetDocType: ctx.body.targetDocType,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/kyc/') && path.endsWith('/decision')) {
      enforceRBACAndOwnership(ctx, ['ADMIN'], undefined, 'kyc:decide');
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const payload = validateKycDecisionPayload(ctx.body);
      const res = this.services.reviewKycDossierTransactional({
        dossierId,
        decision: payload.decision,
        reason: payload.reason,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'POST' && path === '/api/v1/kyc/cron/run') {
      enforceRBACAndOwnership(ctx, ['ADMIN'], undefined, 'kyc:decide');
      const simulatedDayOverride =
        ctx.body.simulatedDayOverride !== undefined
          ? Number(ctx.body.simulatedDayOverride)
          : undefined;
      const report = this.services.runKycScheduledCronJobTransactional({
        simulatedDayOverride,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, report, 200);
    }

    // 5B. Référentiel des exigences par juridiction (MA, FR, DE, ES, AE, INTL)
    if (method === 'GET' && path === '/api/v1/kyc/jurisdictions') {
      requireAuthenticatedSession(ctx);
      const jurisdictions = this.services.listKycJurisdictions();
      return this.ok(ctx, jurisdictions, 200);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/kyc/jurisdictions/')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
      }
      const countryCode = path.split('/').pop() ?? '';
      const updated = this.services.updateKycJurisdiction({
        countryCode,
        patch: ctx.body,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    // 5C. Mise à jour des informations d'entreprise et du représentant légal
    if (method === 'PUT' && path.startsWith('/api/v1/kyc/') && path.endsWith('/profile')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const updated = this.services.updateKycCompanyProfile({
        dossierId,
        profile: ctx.body,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    // 5D. Génération d'URL présignée temporaire (15 min / 900s) pour téléchargement sécurisé
    if (
      method === 'GET' &&
      path.startsWith('/api/v1/kyc/') &&
      (path.includes('/presigned-url/') || path.endsWith('/presigned-url'))
    ) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      let dossierId = '';
      let docId = '';
      if (path.endsWith('/presigned-url')) {
        // /api/v1/kyc/:id/documents/:docId/presigned-url
        docId = parts[parts.length - 2];
        dossierId = parts[parts.length - 4];
      } else {
        // /api/v1/kyc/:id/presigned-url/:docId
        docId = parts[parts.length - 1];
        dossierId = parts[parts.length - 3];
      }
      const expiresInSeconds = ctx.query.expiresIn ? Number(ctx.query.expiresIn) : 900;
      const presigned = this.services.generateKycPresignedUrl({
        dossierId,
        docId,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
        expiresInSeconds,
      });
      return this.ok(ctx, presigned, 200);
    }

    // 5E. Demande de complément documentaire administratif
    if (method === 'POST' && path.startsWith('/api/v1/kyc/') && path.endsWith('/complements')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
      }
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const { complementDocs, reason } = ctx.body;
      const result = this.services.requestKycComplementsTransactional({
        dossierId,
        complementDocs: Array.isArray(complementDocs) ? complementDocs : [],
        reason: String(reason ?? ''),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 5F. Réactivation administrative d'un compte suspendu
    if (method === 'POST' && path.startsWith('/api/v1/kyc/') && path.endsWith('/reactivate')) {
      const user = requireAuthenticatedSession(ctx);
      if (user.role !== 'ADMIN') {
        throw new AppError(403, 'FORBIDDEN_ADMIN_ONLY', 'Action réservée aux administrateurs TRADELINK.');
      }
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const { reason } = ctx.body;
      const result = this.services.reactivateKycAccountTransactional({
        dossierId,
        reason: String(reason ?? 'Régularisation des pièces justificatives.'),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 5G. Consultation de l'historique d'audit et des décisions du dossier KYC
    if (method === 'GET' && path.startsWith('/api/v1/kyc/') && path.endsWith('/history')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const dossierId = parts[parts.length - 2];
      const history = this.services.getKycDossierHistory({
        dossierId,
        actor: user,
      });
      return this.ok(ctx, history, 200);
    }

    // ============================================================================
    // 6. ROOM LIVE & VISIOCONFÉRENCE SFU WEBRTC (PROMPT 07)
    // ============================================================================

    // 6.1. Liste des salles accessibles ou invitations spécifiques
    if (method === 'GET' && (path === '/api/v1/rooms' || path === '/api/v1/rooms/invitations')) {
      const user = requireAuthenticatedSession(ctx);
      if (path === '/api/v1/rooms/invitations' || ctx.query?.scope === 'invitations') {
        const invitations = this.services.listUserInvitationsService(user.id, user.email);
        return this.ok(ctx, invitations, 200);
      }
      const rooms = this.services.listAccessibleRoomsService(user.id, user.role);
      return this.ok(ctx, rooms, 200);
    }

    // 6.2. Création contrôlée par rôle (Client interdit en création générale -> 403)
    if (method === 'POST' && (path === '/api/v1/rooms' || path === '/api/v1/rooms/google-meet/create')) {
      const user = requireAuthenticatedSession(ctx);
      const isGoogleMeetEndpoint = path === '/api/v1/rooms/google-meet/create';
      const meetingProvider = isGoogleMeetEndpoint ? 'GOOGLE_MEET' : ctx.body?.meetingProvider;

      const room = this.services.createRoomLiveChecked({
        title: String(ctx.body?.title ?? (isGoogleMeetEndpoint ? 'Réunion Google Meet B2B' : 'Réunion B2B')),
        scheduledAt: String(ctx.body?.scheduledAt ?? '2026-11-20 10:00'),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
        description: ctx.body?.description,
        isImmediate: ctx.body?.isImmediate,
        isPrivate: ctx.body?.isPrivate,
        hasWaitingRoom: ctx.body?.hasWaitingRoom,
        allowedUserIds: ctx.body?.allowedUserIds,
        invitedEmails: ctx.body?.invitedEmails,
        durationMinutes: ctx.body?.durationMinutes,
        meetingProvider,
        googleMeetAccessType: ctx.body?.accessType ?? ctx.body?.googleMeetAccessType,
        forceFallbackToSfu: ctx.body?.forceFallbackToSfu,
      });
      return this.ok(ctx, room, 201);
    }

    // 6.2.a. URL de consentement OAuth 2.0 Google Meet (Scopes minimaux — interdit au Client)
    if (method === 'GET' && path === '/api/v1/rooms/google-meet/oauth-url') {
      const user = requireAuthenticatedSession(ctx);
      const oauthInfo = this.services.getGoogleMeetOAuthUrlService(user, ctx.query?.redirectUri);
      return this.ok(ctx, oauthInfo, 200);
    }

    // 6.2.b. Synchronisation espace Google Meet
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/google-meet/sync')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/google-meet/sync', '');
      const syncRes = this.services.syncGoogleMeetSpaceService(roomIdOrCode, user);
      return this.ok(ctx, syncRes, 200);
    }

    // 6.2.b-bis. Mise à jour configuration espace Google Meet (spaces.patch)
    if ((method === 'PATCH' || method === 'PUT') && path.startsWith('/api/v1/rooms/') && path.endsWith('/google-meet')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/google-meet', '');
      const patchRes = this.services.patchGoogleMeetSpaceService(roomIdOrCode, ctx.body || {}, user);
      return this.ok(ctx, patchRes, 200);
    }

    // 6.2.b-ter. Ressources conferenceRecords, participants et sessions Google Meet
    if (method === 'GET' && path.startsWith('/api/v1/rooms/') && path.endsWith('/google-meet/conference-records')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/google-meet/conference-records', '');
      const records = this.services.getGoogleMeetConferenceRecordsService(roomIdOrCode, user);
      return this.ok(ctx, records, 200);
    }

    // 6.2.c. Clôture d'une réunion (Meet ou SFU)
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && (path.endsWith('/google-meet/end') || path.endsWith('/end'))) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/google-meet/end', '').replace('/end', '');
      const endRes = this.services.endGoogleMeetSpaceService(roomIdOrCode, user);
      return this.ok(ctx, endRes, 200);
    }

    // 6.3. Rejoindre une salle ou le lobby Knocking
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/join')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/join', '');
      const res = this.services.joinRoomLiveService({
        roomIdOrCode,
        actor: user,
        deviceInfo: ctx.body?.deviceInfo,
      });
      return this.ok(ctx, res, 200);
    }

    // 6.4. Admission d'un participant en salle d'attente (Knocking)
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/lobby/admit')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/lobby/admit', '');
      const res = this.services.admitLobbyParticipantService(roomIdOrCode, String(ctx.body?.participantId), user);
      return this.ok(ctx, res, 200);
    }

    // 6.5. Refus d'un participant en salle d'attente (Knocking)
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/lobby/reject')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/lobby/reject', '');
      const res = this.services.rejectLobbyParticipantService(roomIdOrCode, String(ctx.body?.participantId), user);
      return this.ok(ctx, res, 200);
    }

    // 6.6. Modération des médias & participants
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/moderate')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/moderate', '');
      const session = this.services.moderateRoomParticipantService(
        roomIdOrCode,
        String(ctx.body?.participantId),
        ctx.body?.action,
        user
      );
      return this.ok(ctx, { session }, 200);
    }

    // 6.7. Démarrage de l'enregistrement chiffré KMS AES-256 RGPD
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/recording/start')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/recording/start', '');
      const res = this.services.startRoomRecordingService(roomIdOrCode, user);
      return this.ok(ctx, res, 200);
    }

    // 6.8. Arrêt de l'enregistrement & Rétention 90j
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/recording/stop')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/recording/stop', '');
      const res = this.services.stopRoomRecordingService(roomIdOrCode, user);
      return this.ok(ctx, res, 200);
    }

    // 6.9. Synthèse IA post-réunion multilingue & Sceau SHA-256
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/ai-summary')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/ai-summary', '');
      const targetLocale = (ctx.body?.locale ?? 'fr') as 'fr' | 'en' | 'ar';
      const summary = this.services.generateRoomAiSummaryService(roomIdOrCode, user, targetLocale);
      return this.ok(ctx, { ...summary, language: targetLocale }, 200);
    }

    // 6.10. Partage de document métier certifié
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/documents')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/documents', '');
      const session = this.services.shareRoomDocumentService(roomIdOrCode, ctx.body?.document, user);
      return this.ok(ctx, { session }, 200);
    }

    // 6.11. Lever / Abaisser la main
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/raise-hand')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN']);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/raise-hand', '');
      const participantId = typeof ctx.body?.participantId === 'string' ? ctx.body.participantId.trim() : '';
      if (!participantId) {
        throw new AppError(400, 'VALIDATION_PARTICIPANT_ID', 'Identifiant participantId requis.');
      }
      const session = this.services.raiseHandRoomService(
        roomIdOrCode,
        participantId,
        typeof ctx.body?.isRaised === 'boolean' ? ctx.body.isRaised : undefined,
        user
      );
      return this.ok(ctx, { session }, 200);
    }

    // 6.12. Diffusion de réactions interactives
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/reactions')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN']);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/reactions', '');
      const participantId = typeof ctx.body?.participantId === 'string' ? ctx.body.participantId.trim() : '';
      const emoji = typeof ctx.body?.emoji === 'string' ? ctx.body.emoji.trim() : '';
      if (!participantId || !emoji) {
        throw new AppError(400, 'VALIDATION_REACTION_PAYLOAD', 'participantId et emoji valides requis.');
      }
      const res = this.services.broadcastRoomReactionService(
        roomIdOrCode,
        participantId,
        emoji,
        user
      );
      return this.ok(ctx, res, 200);
    }

    // 6.13. Inviter des collaborateurs (liens signés HMAC)
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/invite')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/invite', '');
      const res = this.services.inviteToRoomService(
        roomIdOrCode,
        ctx.body?.userIds || [],
        ctx.body?.emails || [],
        user
      );
      return this.ok(ctx, res, 200);
    }

    // 6.14. Détails d'une salle & session SFU
    if (method === 'GET' && path.startsWith('/api/v1/rooms/')) {
      const user = requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '');
      const details = this.services.getRoomDetailsService(roomIdOrCode, user);
      return this.ok(ctx, details, 200);
    }

    // 7. Moteur de Calcul Financier Déterministe Decimal.js
    if (method === 'POST' && path === '/api/v1/calc/simple') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN'], undefined, 'accounting:calculate');
      const payload = validateCalculationPayload(ctx.body);
      const result = this.services.executeDeterministicCalculation({
        ...payload,
        actor: ctx.user!,
      });
      return this.ok(ctx, result);
    }

    // 8. Sauvegardes & Double Approbation par 2 Administrateurs distincts
    if (method === 'POST' && path.startsWith('/api/v1/admin/backups/') && path.endsWith('/restore')) {
      enforceRBACAndOwnership(ctx, ['ADMIN'], undefined, 'backups:restore');
      const parts = path.split('/');
      const backupId = parts[parts.length - 2];
      const approved = this.services.approveBackupRestoreDualAdmin({
        backupId,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, approved);
    }

    // ============================================================================
    // 9. MODULE LOGISTIQUE ET TRANSPORT MULTIMODAL (PROMPT 13)
    // ============================================================================

    if (method === 'GET' && path === '/api/v1/logistics/vehicles') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'TRANSPORTEUR', 'ADMIN']);
      const targetCarrierId =
        user.role === 'TRANSPORTEUR' ? user.id : ctx.query?.carrierId;
      const vehicles = this.services.listVehicles(targetCarrierId);
      return this.ok(ctx, vehicles);
    }

    if (method === 'POST' && path === '/api/v1/logistics/missions') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN']);
      const mission = this.services.createLogisticsMissionTransactional({
        actor: user,
        ...ctx.body,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      } as any);
      return this.ok(ctx, mission, 201);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/logistics/missions/') && path.endsWith('/respond')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'ADMIN']);
      const parts = path.split('/');
      const missionId = parts[parts.length - 2];
      const res = this.services.respondToLogisticsMissionTransactional({
        actor: user,
        missionId,
        accept: Boolean(ctx.body?.accept),
        rejectionReason: ctx.body?.rejectionReason,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    // Création d'une expédition complète avec colisage et adresses (Prompt 13)
    if (method === 'POST' && path === '/api/v1/logistics/shipments') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN']);
      const res = this.services.createShipmentTransactional({
        actor: user,
        orderId: ctx.body?.orderId,
        packages: ctx.body?.packages || [],
        pickupAddress: ctx.body?.pickupAddress,
        deliveryAddress: ctx.body?.deliveryAddress,
        carrierId: ctx.body?.carrierId,
        carrierName: ctx.body?.carrierName,
        scheduledPickupDate: ctx.body?.scheduledPickupDate,
        scheduledPickupTimeWindow: ctx.body?.scheduledPickupTimeWindow,
        handlingInstructions: ctx.body?.handlingInstructions,
        customsNotes: ctx.body?.customsNotes,
        transportMode: ctx.body?.transportMode,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'GET' && path === '/api/v1/logistics/shipments') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN']);
      const allShipments = this.repo.getSnapshot().shipments;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allShipments
          : user.role === 'CLIENT'
          ? allShipments.filter((s) => s.clientId === user.id)
          : user.role === 'TRANSPORTEUR'
          ? allShipments.filter((s) => s.carrierId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allShipments.filter((s) => s.supplierId === user.id)
          : [];
      return this.ok(ctx, scoped);
    }

    if (method === 'GET' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/tracking')) {
      const user = requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.getShipmentTrackingWithWaypoints(shipmentId, user);
      return this.ok(ctx, res);
    }

    // Consultation d'une expédition par ID ou tracking number avec Anti-IDOR
    if (
      method === 'GET' &&
      path.startsWith('/api/v1/logistics/shipments/') &&
      !path.endsWith('/tracking') &&
      !path.endsWith('/status') &&
      !path.endsWith('/assign') &&
      !path.endsWith('/gps') &&
      !path.endsWith('/documents') &&
      !path.endsWith('/pod')
    ) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN']);
      const shipmentId = path.split('/').pop() || '';
      const shipment = this.repo.getSnapshot().shipments.find((s) => s.id === shipmentId || s.trackingNumber === shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }
      if (user.role === 'CLIENT' && shipment.clientId !== user.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Accès interdit à cette expédition.');
      }
      if (user.role === 'TRANSPORTEUR' && shipment.carrierId !== user.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Accès interdit à cette expédition.');
      }
      if (user.role === 'FOURNISSEUR' && shipment.supplierId !== user.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Accès interdit à cette expédition.');
      }
      return this.ok(ctx, shipment);
    }

    // Affectation ou réaffectation de transporteur (Prompt 13)
    if (method === 'PUT' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/assign')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.assignCarrierTransactional({
        actor: user,
        shipmentId,
        carrierId: ctx.body?.carrierId,
        carrierName: ctx.body?.carrierName,
        vehicleId: ctx.body?.vehicleId,
        driverName: ctx.body?.driverName,
        reason: ctx.body?.reason,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/status')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'ADMIN']);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.updateShipmentStatusTransactional({
        actor: user,
        shipmentId,
        nextStatus: ctx.body?.nextStatus,
        reason: ctx.body?.reason,
        actualDate: ctx.body?.actualDate,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    // Émission télématique GPS temps réel & recalcul dynamique d'ETA (Prompt 13)
    if (method === 'POST' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/gps')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'ADMIN']);
      const gpsBody = parseWithZod(ShipmentGpsZodSchema, ctx.body, 'VALIDATION_GPS_PAYLOAD');
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.recordShipmentGpsLocationTransactional({
        actor: user,
        shipmentId,
        latitude: Number(gpsBody.latitude),
        longitude: Number(gpsBody.longitude),
        altitudeMeters: (gpsBody as any).altitudeMeters,
        speedKmh: gpsBody.speedKmh,
        headingDeg: (gpsBody as any).headingDeg,
        ambientTempCelsius: (gpsBody as any).ambientTempCelsius,
        batteryLevelPct: (gpsBody as any).batteryLevelPct,
        addressDescription: (gpsBody as any).addressDescription,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'POST' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/documents')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const docs = this.services.generateTransportDocumentsTransactional({
        actor: user,
        shipmentId,
        fullBundle: Boolean(ctx.body?.fullBundle),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, docs, 201);
    }

    if (method === 'POST' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/pod')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'ADMIN']);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.submitProofOfDeliveryTransactional({
        actor: user,
        podData: { ...ctx.body, shipmentId } as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'POST' && path === '/api/v1/logistics/incidents') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'CLIENT', 'FOURNISSEUR', 'ADMIN']);
      const incidentPayload = parseWithZod(
        LogisticsIncidentCreateZodSchema,
        ctx.body,
        'VALIDATION_INCIDENT_PAYLOAD'
      );
      const inc = this.services.reportLogisticsIncidentTransactional({
        actor: user,
        ...(incidentPayload as any),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, inc, 201);
    }

    // Résolution d'incident logistique (Prompt 13)
    if (method === 'PUT' && path.startsWith('/api/v1/logistics/incidents/') && path.endsWith('/resolve')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const incidentId = parts[parts.length - 2];
      const res = this.services.resolveLogisticsIncidentTransactional({
        actor: user,
        incidentId,
        resolutionNotes: ctx.body?.resolutionNotes,
        actionTaken: ctx.body?.actionTaken,
        resumeShipmentStatus: ctx.body?.resumeShipmentStatus,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'GET' && path === '/api/v1/logistics/incidents') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'ADMIN']);
      const snapshot = this.repo.getSnapshot();
      const allIncidents = snapshot.incidents;
      if (user.role === 'ADMIN' || user.role === 'COMPTABLE') {
        return this.ok(ctx, allIncidents);
      }
      const allowedShipments = new Set(
        snapshot.shipments
          .filter(
            (s) =>
              (user.role === 'CLIENT' && s.clientId === user.id) ||
              (user.role === 'FOURNISSEUR' && s.supplierId === user.id) ||
              (user.role === 'TRANSPORTEUR' && s.carrierId === user.id)
          )
          .map((s) => s.id)
      );
      const scoped = allIncidents.filter(
        (inc) => allowedShipments.has(inc.shipmentId) || inc.reporterId === user.id
      );
      return this.ok(ctx, scoped);
    }

    // ============================================================================
    // 10. MODULE COMPTABILITÉ COMPLÈTE & AUDIT FINANCIER (PROMPT 8)
    // ============================================================================

    if (method === 'GET' && path === '/api/v1/accounting/chart-of-accounts') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const framework = ctx.query?.framework as any;
      const chart = this.services.getChartOfAccounts(framework);
      return this.ok(ctx, chart);
    }

    if (method === 'GET' && path === '/api/v1/accounting/journals') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      return this.ok(ctx, this.services.listAccountingJournals());
    }

    if (method === 'GET' && path === '/api/v1/accounting/entries') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const entries = this.services.listAccountingEntries(
        ctx.query?.journalCode,
        ctx.query?.fiscalPeriod
      );
      return this.ok(ctx, entries);
    }

    if (method === 'POST' && path === '/api/v1/accounting/entries') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const entry = this.services.createManualAccountingEntryTransactional({
        actor: ctx.user!,
        ...ctx.body,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      } as any);
      return this.ok(ctx, entry, 201);
    }

    if (method === 'POST' && path.startsWith('/api/v1/accounting/entries/') && path.endsWith('/reverse')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const entryId = path.replace('/api/v1/accounting/entries/', '').replace('/reverse', '');
      const result = this.services.reverseAccountingEntryTransactional({
        actor: user,
        entryIdOrNumber: entryId,
        reason: String(ctx.body?.reason ?? ''),
        replacementLines: Array.isArray(ctx.body?.replacementLines) ? ctx.body.replacementLines : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 201);
    }

    if (
      (method === 'PUT' || method === 'PATCH' || method === 'DELETE') &&
      path.startsWith('/api/v1/accounting/entries/')
    ) {
      requireAuthenticatedSession(ctx);
      throw new AppError(
        403,
        'ACCOUNTING_VALIDATED_ENTRY_IMMUTABLE',
        'Immuabilité comptable stricte : une écriture comptable validée ne peut jamais être modifiée ni supprimée directement. Utilisez POST /api/v1/accounting/entries/:id/reverse pour émettre une écriture de contre-passation.'
      );
    }

    if (method === 'GET' && path === '/api/v1/accounting/general-ledger') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const ledger = this.services.getGeneralLedger(ctx.query?.framework as any);
      return this.ok(ctx, ledger);
    }

    if (method === 'GET' && path === '/api/v1/accounting/trial-balance') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const trial = this.services.getTrialBalance(ctx.query?.framework as any);
      return this.ok(ctx, trial);
    }

    if (method === 'POST' && path === '/api/v1/accounting/reconcile') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const lines = ctx.body?.bankLines ?? [];
      const res = this.services.executeBankReconciliationBatchTransactional({
        actor: ctx.user!,
        bankLines: lines,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'GET' && path === '/api/v1/accounting/financial-statements') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const stmts = this.services.getFinancialStatements(ctx.query?.framework as any);
      return this.ok(ctx, stmts);
    }

    if (method === 'POST' && path === '/api/v1/accounting/calc/amortization') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const res = this.services.calculateLoanAmortizationSchedule(ctx.body as any);
      return this.ok(ctx, res);
    }

    if (method === 'GET' && path === '/api/v1/accounting/export/trial-balance.csv') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const csv = this.services.exportTrialBalanceCsv(ctx.query?.framework as any);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="trial-balance-2026.csv"',
          'X-Correlation-Id': ctx.correlationId,
        },
        body: csv as any,
      };
    }

    // ============================================================================
    // MOTEUR DE CALCUL FINANCIER DÉTERMINISTE, AGING BALANCE, FEC & FISCAL PERIODS (PROMPT 14)
    // ============================================================================

    if (method === 'POST' && path === '/api/v1/accounting/calculate-interest') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const result = this.services.calculateFinancialInterestService(
        ctx.user!,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, result);
    }

    if (method === 'GET' && path === '/api/v1/accounting/calculation-history') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const limit = ctx.query?.limit ? parseInt(ctx.query.limit, 10) : 100;
      const history = this.services.listCalculationHistoryService(ctx.user!, limit);
      return this.ok(ctx, history);
    }

    if (method === 'GET' && path === '/api/v1/accounting/financial-config') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const config = this.services.getFinancialEngineConfigService(ctx.user!);
      return this.ok(ctx, config);
    }

    if (method === 'PUT' && path === '/api/v1/accounting/financial-config') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const res = this.services.updateFinancialEngineConfigService(
        ctx.user!,
        ctx.body as any,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, res);
    }

    if (method === 'GET' && path === '/api/v1/accounting/financial-config/audits') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const audits = this.services.listFinancialConfigAuditsService(ctx.user!);
      return this.ok(ctx, audits);
    }

    if (method === 'GET' && path === '/api/v1/accounting/benchmark-rates') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const rates = this.services.listBenchmarkRatesService(ctx.user!);
      return this.ok(ctx, rates);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/accounting/benchmark-rates/')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const code = path.replace('/api/v1/accounting/benchmark-rates/', '');
      const newRatePct = ctx.body?.currentRatePct ?? ctx.body?.ratePct;
      if (!newRatePct) {
        throw new AppError(400, 'INVALID_RATE_PAYLOAD', 'Le paramètre currentRatePct est obligatoire.');
      }
      const updated = this.services.updateBenchmarkRateService(
        ctx.user!,
        code,
        String(newRatePct),
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, updated);
    }

    if (method === 'GET' && path === '/api/v1/accounting/aging-balance') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const asOfDate = ctx.query?.asOfDate;
      const report = this.services.getAgingBalanceReportService(ctx.user!, asOfDate);
      return this.ok(ctx, report);
    }

    if (method === 'GET' && path === '/api/v1/accounting/export/fec') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const fiscalYear = ctx.query?.fiscalYear ? parseInt(ctx.query.fiscalYear, 10) : 2026;
      const fec = this.services.exportFecService(ctx.user!, fiscalYear);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': fec.mimeType,
          'Content-Disposition': `attachment; filename="${fec.filename}"`,
          'X-Correlation-Id': ctx.correlationId,
        },
        body: fec.fecContent as any,
      };
    }

    if (method === 'GET' && path === '/api/v1/accounting/fiscal-periods') {
      enforceRBACAndOwnership(ctx, ['COMPTABLE', 'ADMIN']);
      const periods = this.services.listFiscalPeriodsService(ctx.user!);
      return this.ok(ctx, periods);
    }

    if (method === 'PUT' && path.startsWith('/api/v1/accounting/fiscal-periods/') && path.endsWith('/lock')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const periodCode = path
        .replace('/api/v1/accounting/fiscal-periods/', '')
        .replace('/lock', '');
      const locked = this.services.lockFiscalPeriodService(
        ctx.user!,
        periodCode,
        ctx.correlationId,
        ctx.ipAddress
      );
      return this.ok(ctx, locked);
    }

    // ============================================================================
    // PROMPT 11 : ADMINISTRATION AVANCÉE, IMPORTS, KMS, BACKUPS ET AUDIT
    // ============================================================================

    if (method === 'POST' && path === '/api/v1/admin/sandbox/analyze') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const fileName = ctx.body?.fileName || 'dataset.sql';
      const fileSize = ctx.body?.fileSize || 1024;
      const format = ctx.body?.format;
      const report = this.services.analyzeSandboxDump({
        fileName,
        fileSize,
        format,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, report, 200);
    }

    if (method === 'POST' && path === '/api/v1/admin/sandbox/promote') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const report = ctx.body?.report;
      const initiatorId = ctx.body?.initiatorId;
      const planHash = ctx.body?.planHash;
      if (!report || !initiatorId || !planHash) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Paramètres requis manquants pour la promotion sandbox.');
      }
      const result = this.services.promoteSandboxDumpTransactional({
        report,
        initiatorId,
        actor: ctx.user!,
        planHash,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    if (method === 'POST' && path === '/api/v1/admin/kms/rotate') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const keyAlias = ctx.body?.keyAlias || 'tradelink-master-kek';
      const res = this.services.rotateKmsKeyTransactional({
        keyAlias,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path === '/api/v1/admin/backups/test-sandbox') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const backupId = ctx.body?.backupId;
      if (!backupId) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Identifiant de sauvegarde requis (backupId).');
      }
      const res = this.services.testBackupRestoreInSandbox({
        backupId,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'GET' && path.startsWith('/api/v1/admin/export/')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const entity = path.replace('/api/v1/admin/export/', '').toUpperCase() as any;
      const format = (ctx.query?.format || 'CSV').toUpperCase() as any;
      const exported = this.services.exportDataset({
        entity,
        format,
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return {
        statusCode: 200,
        headers: {
          'Content-Type': exported.mimeType,
          'Content-Disposition': `attachment; filename="${exported.fileName}"`,
          'X-Correlation-Id': ctx.correlationId,
          'X-Checksum-SHA256': exported.sha256,
        },
        body: exported as any,
      };
    }

    if (method === 'GET' && path === '/api/v1/admin/audit/chain-verify') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const res = this.services.verifyAuditLogChain({
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    // ============================================================================
    // 21. TRADUCTION AUTOMATIQUE IA & PRÉFÉRENCES LINGUISTIQUES (FR / EN / AR)
    // ============================================================================

    // 21A. Détection de langue
    if (method === 'POST' && path === '/api/v1/translation/detect') {
      requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN']);
      const { text } = parseWithZod(TranslationDetectZodSchema, ctx.body, 'INVALID_PAYLOAD');
      const result = CentralTranslationService.detectLanguage(text);
      return this.ok(ctx, result, 200);
    }

    // 21B. Traduction de texte générique / B2B
    if (method === 'POST' && path === '/api/v1/translation/text') {
      requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN']);
      const { text, sourceLang, targetLang, domain, preserveTerms, bypassCache } = parseWithZod(
        TranslationTextZodSchema,
        ctx.body,
        'INVALID_PAYLOAD'
      );
      const result = CentralTranslationService.translateTextSync({
        text,
        sourceLang,
        targetLang,
        domain: domain as any,
        preserveTerms,
        bypassCache,
      });
      return this.ok(ctx, result, 200);
    }

    // 21C. Traduction de message chat avec conservation de l'original
    if (method === 'POST' && path === '/api/v1/translation/message') {
      requireAuthenticatedSession(ctx);
      const { messageId, text, targetLang } = ctx.body || {};
      if (!messageId || !text || !targetLang) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Paramètres requis : messageId, text, targetLang.');
      }
      const result = this.services.translateMessage({
        messageId,
        text,
        senderId: ctx.user!.id,
        senderRole: ctx.user!.role,
        targetLang,
      });
      return this.ok(ctx, result, 200);
    }

    // 21C-bis. Messagerie intelligente entre acteurs (détection automatique de la langue du destinataire)
    if (method === 'POST' && path === '/api/v1/translation/smart-message') {
      requireAuthenticatedSession(ctx);
      const { recipientId, text, conversationId, recipientName } = ctx.body || {};
      if (!recipientId || !text) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'recipientId et text sont requis pour la messagerie intelligente.');
      }
      const result = this.services.translateSmartMessageService({
        senderId: ctx.user!.id,
        senderName: `${ctx.user!.email}`,
        senderRole: ctx.user!.role,
        recipientId,
        recipientName,
        text,
        conversationId,
      });
      return this.ok(ctx, result, 200);
    }

    // 21C-ter. Traduction de procès-verbal / compte-rendu certifié Room Live
    if (method === 'POST' && path === '/api/v1/translation/meeting-report') {
      requireAuthenticatedSession(ctx);
      const { reportText, targetLang } = ctx.body || {};
      if (!reportText || !targetLang) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'reportText et targetLang sont requis.');
      }
      const result = CentralTranslationService.translateMeetingReport(reportText, targetLang);
      return this.ok(ctx, result, 200);
    }

    // 21D. Traduction de produit de catalogue
    if (method === 'POST' && path.startsWith('/api/v1/translation/product/')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'ADMIN']);
      const productId = path.replace('/api/v1/translation/product/', '');
      const targetLang = ctx.body?.targetLang;
      if (!targetLang) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'targetLang requis.');
      }
      const result = this.services.translateCatalogProduct(productId, targetLang, user);
      return this.ok(ctx, result, 200);
    }

    // 21E. Consultation et filtrage du glossaire officiel TradeLink
    if (method === 'GET' && path === '/api/v1/translation/glossary') {
      requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR', 'COMPTABLE', 'SUPPORT', 'ADMIN']);
      const { category, status, search } = ctx.query || {};
      const terms = this.services.listGlossaryTermsService({
        category: category as any,
        status: status as any,
        search: search as any,
      });
      return this.ok(ctx, { terms, count: terms.length }, 200);
    }

    // 21F. Ajout d'un terme au glossaire (Admin uniquement)
    if (method === 'POST' && path === '/api/v1/translation/glossary') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const user = requireAuthenticatedSession(ctx);
      const { category, termFr, termEn, termAr, context } = ctx.body || {};
      if (!category || !termFr || !termEn || !termAr) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Tous les termes (FR, EN, AR) et la catégorie sont requis.');
      }
      const isAdmin = user.role === 'ADMIN';
      const newTerm = this.services.addGlossaryTermService({
        category,
        termFr,
        termEn,
        termAr,
        context,
        isAdmin,
        adminEmail: user.email,
      });
      return this.ok(ctx, newTerm, 201);
    }

    // 21F-bis. Validation administrative d'un terme
    if (method === 'POST' && path.startsWith('/api/v1/translation/glossary/') && path.endsWith('/validate')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const termId = path.replace('/api/v1/translation/glossary/', '').replace('/validate', '');
      const validated = this.services.validateGlossaryTermService(termId, ctx.user!.email);
      return this.ok(ctx, validated, 200);
    }

    // 21F-ter. Mise à jour administrative d'un terme
    if (method === 'PUT' && path.startsWith('/api/v1/translation/glossary/')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const termId = path.replace('/api/v1/translation/glossary/', '');
      const updated = this.services.updateGlossaryTermService(termId, ctx.body || {});
      return this.ok(ctx, updated, 200);
    }

    // 21F-quater. Suppression d'un terme du glossaire
    if (method === 'DELETE' && path.startsWith('/api/v1/translation/glossary/')) {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const termId = path.replace('/api/v1/translation/glossary/', '');
      const deleted = this.services.deleteGlossaryTermService(termId);
      return this.ok(ctx, { deleted }, 200);
    }

    // 21F-quinquies. File d'attente asynchrone pour lots de traduction
    if (method === 'POST' && path === '/api/v1/translation/jobs') {
      requireAuthenticatedSession(ctx);
      const { sourceLang, targetLang, entityType, totalItems } = ctx.body || {};
      if (!sourceLang || !targetLang || !entityType) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'sourceLang, targetLang et entityType requis.');
      }
      const job = this.services.createTranslationJobService({
        sourceLang,
        targetLang,
        entityType,
        totalItems: Number(totalItems) || 1,
      });
      return this.ok(ctx, job, 201);
    }

    if (method === 'GET' && path.startsWith('/api/v1/translation/jobs/')) {
      requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/translation/jobs/', '');
      const job = this.services.getTranslationJobService(jobId);
      return this.ok(ctx, job, 200);
    }

    // 21G. Métriques et quotas du moteur de traduction
    if (method === 'GET' && path === '/api/v1/translation/metrics') {
      enforceRBACAndOwnership(ctx, ['ADMIN']);
      const metrics = CentralTranslationService.getEngineMetrics();
      return this.ok(ctx, metrics, 200);
    }

    // 21H. Préférences linguistiques de l'utilisateur
    if (method === 'GET' && path === '/api/v1/user/preferences/language') {
      requireAuthenticatedSession(ctx);
      const pref = this.services.getUserLanguagePreference(ctx.user!.id);
      return this.ok(ctx, pref, 200);
    }

    if (method === 'PUT' && path === '/api/v1/user/preferences/language') {
      requireAuthenticatedSession(ctx);
      const pref = this.services.updateUserLanguagePreference(ctx.user!.id, ctx.body || {});
      return this.ok(ctx, pref, 200);
    }

    // ============================================================================
    // 22. ASSISTANT IA FLOTTANT — AI COPILOT API (PROMPT 03)
    // ============================================================================

    // 22A. Envoi d'une requête au Copilot & Génération contextuelle
    if (method === 'POST' && path === '/api/v1/copilot/chat') {
      requireAuthenticatedSession(ctx);
      const { message, threadId, modelId, context, attachments } = ctx.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Le message de la requête est obligatoire.');
      }
      const result = this.services.processCopilotChatTransactional({
        message: message.trim(),
        threadId,
        modelId,
        context,
        attachments,
        actor: {
          id: ctx.user!.id,
          email: ctx.user!.email,
          role: ctx.user!.role,
          companyName: (ctx.user as any).companyName,
        },
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 22B. Liste des conversations de l'utilisateur actif
    if (method === 'GET' && path === '/api/v1/copilot/conversations') {
      requireAuthenticatedSession(ctx);
      const list = this.services.listCopilotConversations(ctx.user!);
      return this.ok(ctx, { conversations: list, count: list.length }, 200);
    }

    // 22C. Récupération d'une conversation par ID
    if (method === 'GET' && path.startsWith('/api/v1/copilot/conversations/')) {
      requireAuthenticatedSession(ctx);
      const threadId = path.replace('/api/v1/copilot/conversations/', '');
      const thread = this.services.getCopilotConversation(threadId, ctx.user!);
      return this.ok(ctx, thread, 200);
    }

    // 22D. Suppression d'une conversation (Anti-IDOR)
    if (method === 'DELETE' && path.startsWith('/api/v1/copilot/conversations/')) {
      requireAuthenticatedSession(ctx);
      const threadId = path.replace('/api/v1/copilot/conversations/', '');
      const result = this.services.deleteCopilotConversation(threadId, ctx.user!);
      return this.ok(ctx, result, 200);
    }

    // 22E. Exécution sécurisée d'une action assistée
    if (method === 'POST' && path === '/api/v1/copilot/action/execute') {
      requireAuthenticatedSession(ctx);
      const { actionId, actionType, payload, confirmed, isCritical } = ctx.body || {};
      if (!actionId || !actionType) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'actionId et actionType requis.');
      }
      const result = this.services.executeCopilotAssistedAction({
        actionId,
        actionType,
        payload: payload || {},
        confirmed: Boolean(confirmed),
        isCritical: Boolean(isCritical),
        actor: ctx.user!,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 22F. Synthèse d'une pièce jointe
    if (method === 'POST' && path === '/api/v1/copilot/summarize-document') {
      requireAuthenticatedSession(ctx);
      const { name, size, mimeType } = ctx.body || {};
      if (!name || size === undefined) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'name et size requis pour analyser la pièce jointe.');
      }
      const result = this.services.summarizeCopilotAttachment({
        name,
        size: Number(size),
        mimeType: mimeType || 'application/octet-stream',
      });
      return this.ok(ctx, result, 200);
    }

    // 22G. Configuration publique du Copilot (sans clés privées)
    if (method === 'GET' && path === '/api/v1/copilot/config') {
      const config = this.services.getCopilotConfig();
      return this.ok(ctx, config, 200);
    }

    // ============================================================================
    // 23. CONTRÔLEURS DE SAISIE ET DICTÉE VOCALE INTELLIGENTE (PROMPT 04)
    // ============================================================================

    // 23A. Référentiel des langues de dictée vocale (FR/EN/AR) & métadonnées
    if (method === 'GET' && path === '/api/v1/voice/languages') {
      const data = this.services.getSupportedVoiceLanguagesService();
      return this.ok(ctx, data, 200);
    }

    // 23B. Consultation du statut de consentement de l'utilisateur (RGPD/CNDP)
    if (method === 'GET' && path === '/api/v1/voice/consent') {
      const user = requireAuthenticatedSession(ctx);
      const consent = this.services.getVoiceConsentService(user.id);
      return this.ok(ctx, consent, 200);
    }

    // 23C. Enregistrement ou mise à jour du consentement de l'utilisateur
    if (method === 'POST' && path === '/api/v1/voice/consent') {
      const user = requireAuthenticatedSession(ctx);
      const { granted } = ctx.body || {};
      if (typeof granted !== 'boolean') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Le champ booléen "granted" est obligatoire.');
      }
      const result = this.services.saveVoiceConsentService(user.id, granted, ctx.ipAddress);
      return this.ok(ctx, result, 200);
    }

    // 23D. Transcription vocale sécurisée (fallback serveur & ponctuation automatique)
    if (method === 'POST' && path === '/api/v1/voice/transcribe') {
      const user = requireAuthenticatedSession(ctx);
      const {
        audioBase64,
        mimeType,
        language,
        durationSeconds,
        consentGranted,
        autoFormatPunctuation,
        targetField,
      } = ctx.body || {};

      const result = this.services.transcribeVoiceAudioService(
        user.id,
        {
          audioBase64,
          mimeType,
          language: language || 'fr-FR',
          durationSeconds: Number(durationSeconds) || 5,
          consentGranted: Boolean(consentGranted),
          autoFormatPunctuation: autoFormatPunctuation !== false,
          targetField,
        },
        ctx.ipAddress
      );
      return this.ok(ctx, result, 200);
    }

    // ============================================================================
    // 24. CONTRÔLEURS OCR, EXTRACTION & INTELLIGENCE DOCUMENTAIRE (PROMPT 05)
    // ============================================================================

    // 24A. Importation et analyse OCR d'un document
    if (method === 'POST' && path === '/api/v1/ocr/upload') {
      const user = requireAuthenticatedSession(ctx);
      const { fileName, fileBytesBase64, fileSizeBytes, mimeType, profile } = ctx.body || {};
      if (!fileName || !profile) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'fileName et profile sont obligatoires pour importer un document.');
      }
      const result = this.services.uploadAndAnalyzeOcrDocumentService({
        actor: user,
        fileName,
        fileBytesBase64,
        fileSizeBytes: Number(fileSizeBytes) || (fileBytesBase64 ? Buffer.from(fileBytesBase64, 'base64').length : 1024),
        mimeType: mimeType || 'application/pdf',
        profile,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 201);
    }

    // 24B. Liste des documents analysés par OCR
    if (method === 'GET' && path === '/api/v1/ocr/documents') {
      const user = requireAuthenticatedSession(ctx);
      const profile = ctx.query.profile as any;
      const status = ctx.query.status as any;
      const list = this.services.listOcrDocumentsService(user, { profile, status });
      return this.ok(ctx, list, 200);
    }

    // 24C. État de la file d'attente OCR
    if (method === 'GET' && path === '/api/v1/ocr/queue') {
      requireAuthenticatedSession(ctx);
      const status = this.services.getOcrQueueStatusService();
      return this.ok(ctx, status, 200);
    }

    // 24D. Consultation détaillée d'un document OCR
    if (method === 'GET' && path.startsWith('/api/v1/ocr/documents/')) {
      const user = requireAuthenticatedSession(ctx);
      const documentId = path.replace('/api/v1/ocr/documents/', '');
      const doc = this.services.getOcrDocumentByIdService(documentId, user);
      return this.ok(ctx, doc, 200);
    }

    // 24E. Correction manuelle d'un champ OCR
    if ((method === 'PUT' || method === 'PATCH') && path.includes('/api/v1/ocr/documents/') && path.endsWith('/fields')) {
      const user = requireAuthenticatedSession(ctx);
      const documentId = path.replace('/api/v1/ocr/documents/', '').replace('/fields', '');
      const { fieldKey, newValue, reason } = ctx.body || {};
      if (!fieldKey || newValue === undefined) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'fieldKey et newValue requis.');
      }
      const updated = this.services.correctOcrFieldService({
        documentId,
        fieldKey,
        newValue: String(newValue),
        reason,
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, updated, 200);
    }

    // 24F. Validation humaine finale obligatoire
    if (method === 'POST' && path.includes('/api/v1/ocr/documents/') && path.endsWith('/validate')) {
      const user = requireAuthenticatedSession(ctx);
      const documentId = path.replace('/api/v1/ocr/documents/', '').replace('/validate', '');
      const { confirmedFields } = ctx.body || {};
      const result = this.services.validateOcrDocumentHumanReviewService({
        documentId,
        confirmedFields: confirmedFields || {},
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 24G. Rejet d'un document OCR
    if (method === 'POST' && path.includes('/api/v1/ocr/documents/') && path.endsWith('/reject')) {
      const user = requireAuthenticatedSession(ctx);
      const documentId = path.replace('/api/v1/ocr/documents/', '').replace('/reject', '');
      const { reason } = ctx.body || {};
      const result = this.services.rejectOcrDocumentService({
        documentId,
        reason: reason || '',
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, result, 200);
    }

    // 24H. Suppression d'un document OCR (Soft delete)
    if (method === 'DELETE' && path.startsWith('/api/v1/ocr/documents/')) {
      const user = requireAuthenticatedSession(ctx);
      const documentId = path.replace('/api/v1/ocr/documents/', '');
      const result = this.services.softDeleteOcrDocumentService(documentId, user);
      return this.ok(ctx, result, 200);
    }

    // ============================================================================
    // 25. NOTIFICATIONS ET MESSAGERIE CENTRALISÉES (PROMPT 08)
    // ============================================================================

    // 25A. Liste des notifications filtrées
    if (method === 'GET' && path === '/api/v1/notifications') {
      const user = requireAuthenticatedSession(ctx);
      const category = ctx.query?.category;
      const priority = ctx.query?.priority;
      const isReadParam = ctx.query?.isRead;
      const isRead =
        isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

      const notifs = this.services.listNotificationsService(user, {
        category,
        priority,
        isRead,
      });
      return this.ok(ctx, { notifications: notifs, total: notifs.length }, 200);
    }

    // 25B. Marquer une notification comme lue
    if (method === 'PUT' && path.startsWith('/api/v1/notifications/') && path.endsWith('/read')) {
      const user = requireAuthenticatedSession(ctx);
      const notifId = path.replace('/api/v1/notifications/', '').replace('/read', '');
      const updated = this.services.markNotificationReadService(notifId, user);
      return this.ok(ctx, { notification: updated }, 200);
    }

    // 25B-bis. Marquer une notification comme non lue
    if (method === 'PUT' && path.startsWith('/api/v1/notifications/') && path.endsWith('/unread')) {
      const user = requireAuthenticatedSession(ctx);
      const notifId = path.replace('/api/v1/notifications/', '').replace('/unread', '');
      const updated = this.services.markNotificationUnreadService(notifId, user);
      return this.ok(ctx, { notification: updated }, 200);
    }

    // 25C. Marquer toutes les notifications comme lues
    if (method === 'PUT' && path === '/api/v1/notifications/read-all') {
      const user = requireAuthenticatedSession(ctx);
      const result = this.services.markAllNotificationsReadService(user);
      return this.ok(ctx, result, 200);
    }

    // 25D. Obtenir les préférences de notification
    if (method === 'GET' && path === '/api/v1/notifications/preferences') {
      const user = requireAuthenticatedSession(ctx);
      const prefs = this.services.getNotificationPreferencesService(user);
      return this.ok(ctx, { preferences: prefs }, 200);
    }

    // 25E. Mettre à jour les préférences de notification
    if (method === 'PUT' && path === '/api/v1/notifications/preferences') {
      const user = requireAuthenticatedSession(ctx);
      const updated = this.services.updateNotificationPreferencesService(user, ctx.body || {});
      return this.ok(ctx, { preferences: updated }, 200);
    }

    // 25F. Dispatcher une notification (Événement métier)
    if (method === 'POST' && path === '/api/v1/notifications/dispatch') {
      const user = requireAuthenticatedSession(ctx);
      const { notification, recipientEmail, recipientPhone, recipientName } = ctx.body || {};
      if (!notification) {
        throw new AppError(400, 'NOTIFICATION_PAYLOAD_MISSING', 'Payload de notification requis.');
      }
      const result = this.services.dispatchNotificationService(
        {
          notification,
          recipientEmail,
          recipientPhone,
          recipientName,
        },
        user
      );
      return this.ok(ctx, result, 201);
    }

    // 25G. Lister les conversations de l'acteur
    if (method === 'GET' && path === '/api/v1/messaging/conversations') {
      const user = requireAuthenticatedSession(ctx);
      const conversations = this.services.listConversationsService(user);
      return this.ok(ctx, { conversations, total: conversations.length }, 200);
    }

    // 25H. Créer une nouvelle conversation
    if (method === 'POST' && path === '/api/v1/messaging/conversations') {
      const user = requireAuthenticatedSession(ctx);
      const { type, title, participants, relatedEntityId, relatedEntityType } = ctx.body || {};
      if (!title || !participants || !Array.isArray(participants)) {
        throw new AppError(400, 'INVALID_CONVERSATION_PAYLOAD', 'Titre et participants obligatoires.');
      }
      const conv = this.services.createConversationService(user, {
        type: type || 'DIRECT',
        title,
        participants,
        relatedEntityId,
        relatedEntityType,
      });
      return this.ok(ctx, { conversation: conv }, 201);
    }

    // 25I. Obtenir une conversation et ses messages
    if (method === 'GET' && path.startsWith('/api/v1/messaging/conversations/') && !path.includes('/messages') && !path.includes('/read') && !path.includes('/search') && !path.includes('/attachments')) {
      const user = requireAuthenticatedSession(ctx);
      const convId = path.replace('/api/v1/messaging/conversations/', '');
      const result = this.services.getConversationService(convId, user);
      return this.ok(ctx, result, 200);
    }

    // 25J. Envoyer un message dans une conversation
    if (method === 'POST' && path.includes('/api/v1/messaging/conversations/') && path.endsWith('/messages')) {
      const user = requireAuthenticatedSession(ctx);
      const convId = path.replace('/api/v1/messaging/conversations/', '').replace('/messages', '');
      const { text, attachments, targetRecipientLocale } = ctx.body || {};
      const result = this.services.sendMessageService(convId, user, {
        text: text || '',
        attachments: attachments || [],
        targetRecipientLocale,
      });
      return this.ok(ctx, result, 201);
    }

    // 25K. Marquer les messages d'une conversation comme lus
    if (method === 'PUT' && path.includes('/api/v1/messaging/conversations/') && path.endsWith('/read')) {
      const user = requireAuthenticatedSession(ctx);
      const convId = path.replace('/api/v1/messaging/conversations/', '').replace('/read', '');
      const result = this.services.markMessagesAsReadService(convId, user);
      return this.ok(ctx, result, 200);
    }

    // 25L. Recherche de messages dans une conversation
    if (method === 'GET' && path.includes('/api/v1/messaging/conversations/') && path.endsWith('/search')) {
      const user = requireAuthenticatedSession(ctx);
      const convId = path.replace('/api/v1/messaging/conversations/', '').replace('/search', '');
      const q = ctx.query?.q || '';
      const messages = this.services.searchMessagesService(convId, q, user);
      return this.ok(ctx, { messages, total: messages.length }, 200);
    }

    // 25M. Téléverser une pièce jointe sécurisée pour la messagerie
    if (method === 'POST' && path.includes('/api/v1/messaging/conversations/') && path.endsWith('/attachments')) {
      const user = requireAuthenticatedSession(ctx);
      const convId = path.replace('/api/v1/messaging/conversations/', '').replace('/attachments', '');
      const { fileName, fileSizeBytes, mimeType, base64Data, magicBytesHeaderHex } = ctx.body || {};
      if (!fileName || !fileSizeBytes || !mimeType) {
        throw new AppError(400, 'INVALID_ATTACHMENT_METADATA', 'Nom de fichier, taille et type MIME requis.');
      }
      const attachment = this.services.uploadMessageAttachmentService(convId, user, {
        fileName,
        fileSizeBytes,
        mimeType,
        base64Data,
        magicBytesHeaderHex,
      });
      return this.ok(ctx, { attachment }, 201);
    }

    // ============================================================================
    // 26. GESTION DES DOCUMENTS COMMERCIAUX & FACTURATION (PROMPT 12)
    // ============================================================================

    // 26A. Liste des juridictions fiscales configurables
    if (method === 'GET' && path === '/api/v1/documents/jurisdictions') {
      return this.ok(ctx, { jurisdictions: TAX_JURISDICTIONS }, 200);
    }

    // 26B. Création d'un document commercial
    if (method === 'POST' && path === '/api/v1/documents') {
      const user = requireAuthenticatedSession(ctx);
      const b = ctx.body || {};
      const doc = this.services.createCommercialDocumentService({
        actor: user,
        documentType: b.documentType,
        jurisdiction: b.jurisdiction,
        issuer: b.issuer,
        recipient: b.recipient,
        carrier: b.carrier,
        lines: b.lines || [],
        orderId: b.orderId,
        orderNumber: b.orderNumber,
        quoteId: b.quoteId,
        quoteNumber: b.quoteNumber,
        shippingAmount: b.shippingAmount,
        currency: b.currency,
        validityDays: b.validityDays,
        dueInDays: b.dueInDays,
        incoterm: b.incoterm,
        incotermLocation: b.incotermLocation,
        transportDetails: b.transportDetails,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, { document: doc }, 201);
    }

    // 26C. Recherche et filtrage des documents
    if (method === 'GET' && path === '/api/v1/documents') {
      const user = requireAuthenticatedSession(ctx);
      const q = ctx.query || {};
      const docs = this.services.queryCommercialDocumentsService(user, {
        query: q.query,
        documentType: q.documentType as any,
        jurisdiction: q.jurisdiction as any,
        status: q.status as any,
        currency: q.currency,
        orderNumber: q.orderNumber,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
      });
      return this.ok(ctx, { documents: docs, total: docs.length }, 200);
    }

    // 26D. Téléchargement sécurisé via Token temporaire (Public / No session required if valid token)
    if (method === 'GET' && path.startsWith('/api/v1/documents/') && path.endsWith('/download')) {
      const docId = path.replace('/api/v1/documents/', '').replace('/download', '');
      const token = (ctx.query?.token || '').trim();
      const expiresRaw = ctx.query?.expires || '';
      const expires = Number(expiresRaw);
      const userId = (ctx.query?.user || '').trim();
      const locale = (ctx.query?.locale as any) || 'fr';

      if (!token || !userId || !Number.isFinite(expires) || expires <= 0) {
        throw new AppError(
          400,
          'INVALID_DOWNLOAD_TOKEN_PARAMS',
          'Paramètres de téléchargement temporaire invalides ou manquants (token, expires, user).'
        );
      }

      let resPdf: { pdfBuffer: Buffer; filename: string; mimeType: string };
      try {
        resPdf = this.services.verifyAndDownloadDocumentWithTokenService(
          docId,
          token,
          expires,
          userId,
          undefined,
          locale
        );
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.message.startsWith('FATAL_SECURITY_CONFIG_ERROR:')) {
          throw new AppError(
            503,
            'DOCUMENT_DOWNLOAD_NOT_CONFIGURED',
            'Service de téléchargement documentaire non configuré en production.'
          );
        }
        throw err;
      }

      return this.ok(
        ctx,
        {
          filename: resPdf.filename,
          base64Pdf: resPdf.pdfBuffer.toString('base64'),
        },
        200,
        undefined,
        {
          'Content-Type': resPdf.mimeType,
          'Content-Disposition': `attachment; filename="${resPdf.filename}"`,
        }
      );
    }

    // 26E. Génération d'un token temporaire de téléchargement (15 min)
    if (method === 'POST' && path.startsWith('/api/v1/documents/') && path.endsWith('/token')) {
      const user = requireAuthenticatedSession(ctx);
      const docId = path.replace('/api/v1/documents/', '').replace('/token', '');
      const tokenInfo = this.services.createDocumentDownloadTokenService(user, docId);
      return this.ok(ctx, tokenInfo, 200);
    }

    // 26F. Prévisualisation d'un document avec vérification du sceau et traduction informative
    if (method === 'GET' && path.startsWith('/api/v1/documents/') && path.endsWith('/preview')) {
      const user = requireAuthenticatedSession(ctx);
      const docId = path.replace('/api/v1/documents/', '').replace('/preview', '');
      const locale = (ctx.query?.locale as any) || 'fr';
      const preview = this.services.getCommercialDocumentPreviewService(user, docId, locale);
      return this.ok(ctx, preview, 200);
    }

    // 26G. Génération directe du PDF pour utilisateur authentifié
    if (method === 'GET' && path.startsWith('/api/v1/documents/') && path.endsWith('/pdf')) {
      const user = requireAuthenticatedSession(ctx);
      const docId = path.replace('/api/v1/documents/', '').replace('/pdf', '');
      const locale = (ctx.query?.locale as any) || 'fr';
      const pdfRes = this.services.generateCommercialDocumentPdfService(user, docId, locale);
      return this.ok(
        ctx,
        {
          filename: pdfRes.filename,
          base64Pdf: pdfRes.pdfBuffer.toString('base64'),
        },
        200,
        undefined,
        {
          'Content-Type': pdfRes.mimeType,
          'Content-Disposition': `inline; filename="${pdfRes.filename}"`,
        }
      );
    }

    // 26H. Émission d'une facture d'avoir (Credit Note)
    if (method === 'POST' && path.startsWith('/api/v1/documents/') && path.endsWith('/credit-note')) {
      const user = requireAuthenticatedSession(ctx);
      const invoiceId = path.replace('/api/v1/documents/', '').replace('/credit-note', '');
      const { reason, partialLines } = ctx.body || {};
      const resAvoir = this.services.createCreditNoteService({
        actor: user,
        invoiceId,
        reason: reason || '',
        partialLines,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, resAvoir, 201);
    }

    // 26I. Consultation d'un document unique par ID
    if (method === 'GET' && path.startsWith('/api/v1/documents/')) {
      const user = requireAuthenticatedSession(ctx);
      const docId = path.replace('/api/v1/documents/', '');
      const doc = this.services.getCommercialDocumentByIdService(user, docId);
      return this.ok(ctx, { document: doc }, 200);
    }

    // =========================================================================
    // 27. PROMPT 15 : IMPORTATION EN 12 ÉTAPES, SANDBOX BASES & EXPORTATIONS
    // =========================================================================

    // 27A. Upload fichier et initialisation parcours 12 étapes
    if (method === 'POST' && path === '/api/v1/import/upload') {
      const user = requireAuthenticatedSession(ctx);
      const { fileName, fileSize, fileContentRaw, entity } = ctx.body || {};
      const job = this.services.uploadImportJobService(user, {
        fileName: fileName || 'import.csv',
        fileSize: fileSize || (fileContentRaw?.length ?? 100),
        fileContentRaw: fileContentRaw || '',
        entity: entity || 'CATALOG_PRODUCTS',
      });
      return this.ok(ctx, job, 201);
    }

    // 27B. Étape 2 : Identification du format
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/identify')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/identify', '');
      const updated = this.services.identifyImportFormatService(user, jobId);
      return this.ok(ctx, updated, 200);
    }

    // 27C. Étape 3 : Validation
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/validate')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/validate', '');
      const updated = this.services.validateImportJobService(user, jobId);
      return this.ok(ctx, updated, 200);
    }

    // 27D. Étape 4 & 5 : Analyse du contenu & Prévisualisation
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/analyze')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/analyze', '');
      const res = this.services.analyzeImportContentService(user, jobId);
      return this.ok(ctx, res, 200);
    }

    // 27E. Étape 6 : Mapping des colonnes
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/map')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/map', '');
      const { customMappings } = ctx.body || {};
      const updated = this.services.mapImportColumnsService(user, jobId, customMappings);
      return this.ok(ctx, updated, 200);
    }

    // 27F. Étape 7 : Détection des doublons
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/duplicates')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/duplicates', '');
      const { duplicateStrategy, uniqueKeyField } = ctx.body || {};
      const res = this.services.checkImportDuplicatesService(user, jobId, duplicateStrategy, uniqueKeyField);
      return this.ok(ctx, res, 200);
    }

    // 27G. Étape 8 : Rapport des erreurs
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/errors')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/errors', '');
      const res = this.services.reportImportErrorsService(user, jobId);
      return this.ok(ctx, res, 200);
    }

    // 27H. Étape 9 : Simulation (Dry Run)
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/simulate')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/simulate', '');
      const updated = this.services.simulateImportService(user, jobId);
      return this.ok(ctx, updated, 200);
    }

    // 27I. Étape 10 : Confirmation préalable
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/confirm')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/confirm', '');
      const updated = this.services.confirmImportService(user, jobId);
      return this.ok(ctx, updated, 200);
    }

    // 27J. Étape 11 & 12 : Exécution réelle & Rapport final
    if (method === 'POST' && path.startsWith('/api/v1/import/') && path.endsWith('/execute')) {
      const user = requireAuthenticatedSession(ctx);
      const jobId = path.replace('/api/v1/import/', '').replace('/execute', '');
      const finalReport = this.services.executeImportService(user, jobId);
      return this.ok(ctx, finalReport, 200);
    }

    // 27K. Analyse de bases en Sandbox isolée (SQL, BAK, DBF)
    if (method === 'POST' && path === '/api/v1/import/sandbox/database') {
      const user = requireAuthenticatedSession(ctx);
      const { fileName, fileContentRaw } = ctx.body || {};
      const session = this.services.createDatabaseSandboxSessionService(user, {
        fileName: fileName || 'dump.sql',
        fileContentRaw: fileContentRaw || '',
      });
      return this.ok(ctx, session, 201);
    }

    // 27L. Double approbation Admin pour migration en production
    if (method === 'POST' && path.startsWith('/api/v1/import/sandbox/database/') && path.endsWith('/approve')) {
      const user = requireAuthenticatedSession(ctx);
      const sessionId = path.replace('/api/v1/import/sandbox/database/', '').replace('/approve', '');
      const updated = this.services.approveDatabaseMigrationService(user, sessionId);
      return this.ok(ctx, updated, 200);
    }

    // 27M. Exécution de la migration après double approbation
    if (method === 'POST' && path.startsWith('/api/v1/import/sandbox/database/') && path.endsWith('/execute')) {
      const user = requireAuthenticatedSession(ctx);
      const sessionId = path.replace('/api/v1/import/sandbox/database/', '').replace('/execute', '');
      const result = this.services.executeDatabaseMigrationService(user, sessionId);
      return this.ok(ctx, result, 200);
    }

    // 27N. Exportation certifiée multi-formats (CSV, XLSX, JSON, PDF)
    if (method === 'POST' && path === '/api/v1/export') {
      const user = requireAuthenticatedSession(ctx);
      const { entity, format, selectedFields, preventFormulaInjection } = ctx.body || {};
      const exportRes = this.services.exportDatasetService(user, {
        entity: entity || 'PRODUCTS',
        format: format || 'CSV',
        selectedFields,
        preventFormulaInjection,
      });
      return this.ok(ctx, exportRes, 200);
    }

    // =========================================================================
    // 28. PROMPT 16 : ADMINISTRATION AVANCÉE, SÉCURITÉ, AUDIT, KMS & APM
    // =========================================================================

    // 28A. Centre des Alertes de Sécurité & Surveillance
    if (method === 'GET' && path === '/api/v1/admin/security/alerts') {
      const user = requireAuthenticatedSession(ctx);
      const alerts = this.services.listSecurityAlertsService(user);
      return this.ok(ctx, { alerts, total: alerts.length }, 200);
    }

    // 28B. Résolution d'une Alerte de Sécurité
    if (method === 'POST' && path.startsWith('/api/v1/admin/security/alerts/') && path.endsWith('/resolve')) {
      const user = requireAuthenticatedSession(ctx);
      const alertId = path.replace('/api/v1/admin/security/alerts/', '').replace('/resolve', '');
      const resolved = this.services.resolveSecurityAlertService(user, alertId);
      return this.ok(ctx, resolved, 200);
    }

    // 28C. Gestion des Sessions Actives & Kill Session
    if (method === 'GET' && path === '/api/v1/admin/security/sessions') {
      const user = requireAuthenticatedSession(ctx);
      const sessions = this.services.listActiveUserSessionsService(user);
      return this.ok(ctx, { sessions, total: sessions.length }, 200);
    }

    // 28D. Révocation unitaire d'une session
    if (method === 'POST' && path.startsWith('/api/v1/admin/security/sessions/') && path.endsWith('/revoke')) {
      const user = requireAuthenticatedSession(ctx);
      const sessionId = path.replace('/api/v1/admin/security/sessions/', '').replace('/revoke', '');
      const res = this.services.revokeUserSessionService(user, sessionId);
      return this.ok(ctx, res, 200);
    }

    // 28E. Révocation globale de toutes les sessions d'un utilisateur
    if (method === 'POST' && path.startsWith('/api/v1/admin/security/users/') && path.endsWith('/revoke-all-sessions')) {
      const user = requireAuthenticatedSession(ctx);
      const targetUserId = path.replace('/api/v1/admin/security/users/', '').replace('/revoke-all-sessions', '');
      const res = this.services.revokeAllUserSessionsService(user, targetUserId);
      return this.ok(ctx, res, 200);
    }

    // 28F. Gestionnaire KMS : Cycle de vie de la KEK
    if (method === 'GET' && path === '/api/v1/admin/security/kms/key') {
      const user = requireAuthenticatedSession(ctx);
      const key = this.services.getKmsKeyLifecycleService(user);
      return this.ok(ctx, key, 200);
    }

    // 28G. Gestionnaire KMS : Rotation HSM de la KEK
    if (method === 'POST' && path === '/api/v1/admin/security/kms/rotate') {
      const user = requireAuthenticatedSession(ctx);
      const result = this.services.rotateKmsKeyService(user);
      return this.ok(ctx, result, 200);
    }

    // 28H. Gestionnaire KMS : Test de chiffrement par enveloppe AES-256-GCM
    if (method === 'POST' && path === '/api/v1/admin/security/kms/test-envelope') {
      const user = requireAuthenticatedSession(ctx);
      const { plainText } = ctx.body || {};
      const cipherResult = this.services.testEnvelopeEncryptionService(user, plainText);
      return this.ok(ctx, cipherResult, 200);
    }

    // 28I. Sauvegardes : Création d'une sauvegarde chiffrée
    if (method === 'POST' && path === '/api/v1/admin/security/backups') {
      const user = requireAuthenticatedSession(ctx);
      const { type } = ctx.body || {};
      const backup = this.services.createSystemBackupService(user, type);
      return this.ok(ctx, backup, 201);
    }

    // 28J. Sauvegardes : Test de restauration en Sandbox (Restore Drill)
    if (method === 'POST' && path.startsWith('/api/v1/admin/security/backups/') && path.endsWith('/drill')) {
      const user = requireAuthenticatedSession(ctx);
      const backupCode = path.replace('/api/v1/admin/security/backups/', '').replace('/drill', '');
      const drill = this.services.performRestoreDrillService(user, backupCode);
      return this.ok(ctx, drill, 200);
    }

    // 28K. Sauvegardes : Restauration en Production avec Double Approbation
    if (method === 'POST' && path.startsWith('/api/v1/admin/security/backups/') && path.endsWith('/restore-prod')) {
      const user = requireAuthenticatedSession(ctx);
      const backupCode = path.replace('/api/v1/admin/security/backups/', '').replace('/restore-prod', '');
      const { planHash, secondApproverId } = ctx.body || {};
      const res = this.services.restoreBackupToProductionService(user, {
        backupCode,
        planHash: planHash || '',
        secondApproverId: secondApproverId || '',
      });
      return this.ok(ctx, res, 200);
    }

    // 28L. Supervision Technique APM : Télémétrie temps réel
    if (method === 'GET' && path === '/api/v1/admin/security/supervision') {
      const user = requireAuthenticatedSession(ctx);
      const metrics = this.services.getSystemSupervisionMetricsService(user);
      return this.ok(ctx, metrics, 200);
    }

    // 28M. Journal d'Audit : Vérification de l'intégrité de la chaîne SHA-256
    if (method === 'GET' && path === '/api/v1/admin/security/audit/verify-chain') {
      const user = requireAuthenticatedSession(ctx);
      const verification = this.services.verifyAuditLogChainService(user);
      return this.ok(ctx, verification, 200);
    }

    // ========================================================================
    // PROMPT 17 : CENTRE D'ASSISTANCE & GESTION DES TICKETS (HELPDESK)
    // ========================================================================

    // 29A. Support : Liste des tickets avec pagination & filtrage sécurisé
    if (method === 'GET' && path === '/api/v1/support/tickets') {
      const user = requireAuthenticatedSession(ctx);
      const res = this.services.listSupportTicketsService(user, {
        status: ctx.query?.status as any,
        priority: ctx.query?.priority as any,
        category: ctx.query?.category as any,
        assignedToAgentId: ctx.query?.assignedToAgentId,
        search: ctx.query?.search || ctx.query?.q,
        page: ctx.query?.page ? parseInt(ctx.query.page, 10) : 1,
        limit: ctx.query?.limit ? parseInt(ctx.query.limit, 10) : 20,
      });
      return this.ok(ctx, res.tickets, 200, {
        page: res.page,
        limit: res.limit,
        totalItems: res.total,
        totalPages: res.totalPages,
      });
    }

    // 29B. Support : Création d'un ticket avec classification IA initiale
    if (method === 'POST' && path === '/api/v1/support/tickets') {
      const user = requireAuthenticatedSession(ctx);
      const ticket = this.services.createSupportTicketService(user, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 201);
    }

    // 29C. Support : Base de connaissances (KB) - Recherche & Liste
    if (method === 'GET' && path === '/api/v1/support/kb/articles') {
      const user = requireAuthenticatedSession(ctx);
      const articles = this.services.listKnowledgeArticlesService(user, {
        query: ctx.query?.q || ctx.query?.query,
        category: ctx.query?.category,
        locale: ctx.query?.locale,
      });
      return this.ok(ctx, articles, 200);
    }

    // 29D. Support : Article KB par ID
    if (method === 'GET' && path.startsWith('/api/v1/support/kb/articles/') && !path.endsWith('/vote')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/kb/articles/', '');
      const article = this.services.getKnowledgeArticleByIdService(user, id);
      return this.ok(ctx, article, 200);
    }

    // 29E. Support : Vote utilité d'un article KB
    if (method === 'POST' && path.startsWith('/api/v1/support/kb/articles/') && path.endsWith('/vote')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/kb/articles/', '').replace('/vote', '');
      const { helpful } = ctx.body || {};
      const res = this.services.voteKnowledgeArticleService(user, id, !!helpful);
      return this.ok(ctx, res, 200);
    }

    // 29F. Support IA : Proposition de réponse
    if (method === 'POST' && path === '/api/v1/support/ai/suggest') {
      const user = requireAuthenticatedSession(ctx);
      const { ticketId } = ctx.body || {};
      if (!ticketId) throw new AppError(400, 'INVALID_PAYLOAD', 'ticketId est obligatoire.');
      const res = this.services.generateAiSuggestedReplyService(user, ticketId);
      return this.ok(ctx, res, 200);
    }

    // 29G. Support IA : Résumé de conversation
    if (method === 'POST' && path === '/api/v1/support/ai/summarize') {
      const user = requireAuthenticatedSession(ctx);
      const { ticketId } = ctx.body || {};
      if (!ticketId) throw new AppError(400, 'INVALID_PAYLOAD', 'ticketId est obligatoire.');
      const res = this.services.summarizeSupportTicketService(user, ticketId);
      return this.ok(ctx, res, 200);
    }

    // 29H. Support : Consultation d'un ticket individuel
    if (
      method === 'GET' &&
      path.startsWith('/api/v1/support/tickets/') &&
      !path.includes('/messages') &&
      !path.includes('/assign') &&
      !path.includes('/escalate') &&
      !path.includes('/resolve') &&
      !path.includes('/close') &&
      !path.includes('/reopen') &&
      !path.includes('/room-live')
    ) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '');
      const ticket = this.services.getSupportTicketByIdService(user, id);
      return this.ok(ctx, ticket, 200);
    }

    // 29I. Support : Ajout d'un message public ou note interne
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/messages')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/messages', '');
      const ticket = this.services.addSupportMessageService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 201);
    }

    // 29J. Support : Affectation d'un agent
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/assign')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/assign', '');
      const ticket = this.services.assignSupportTicketService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 200);
    }

    // 29K. Support : Escalade N1 -> N2 -> N3 / Superviseur / Technique
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/escalate')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/escalate', '');
      const ticket = this.services.escalateSupportTicketService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 200);
    }

    // 29L. Support : Résolution d'un ticket avec notes
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/resolve')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/resolve', '');
      const ticket = this.services.resolveSupportTicketService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 200);
    }

    // 29M. Support : Clôture définitive avec note CSAT (1-5 étoiles)
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/close')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/close', '');
      const ticket = this.services.closeSupportTicketService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 200);
    }

    // 29N. Support : Réouverture conditionnelle (< 14 jours)
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/reopen')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/reopen', '');
      const ticket = this.services.reopenSupportTicketService(user, id, (ctx.body || {}) as any);
      return this.ok(ctx, ticket, 200);
    }

    // 29O. Support : Session Room Live d'assistance en direct
    if (method === 'POST' && path.startsWith('/api/v1/support/tickets/') && path.endsWith('/room-live')) {
      const user = requireAuthenticatedSession(ctx);
      const id = path.replace('/api/v1/support/tickets/', '').replace('/room-live', '');
      const session = this.services.createSupportRoomLiveService(user, id);
      return this.ok(ctx, session, 201);
    }

    // ========================================================================
    // PROMPT 18 : RECHERCHE GLOBALE ET ANALYSE INTELLIGENTE (ANALYTICS)
    // ========================================================================

    // 30A. Recherche Globale : Recherche multi-domaines avec tolérance typo
    if (method === 'GET' && path === '/api/v1/search') {
      const user = requireAuthenticatedSession(ctx);
      const domainsRaw = ctx.query?.domains;
      const domains = domainsRaw ? (domainsRaw.split(',').map((d: string) => d.trim().toUpperCase()) as any) : undefined;
      const res = this.services.executeGlobalSearchService(user, {
        query: ctx.query?.q || ctx.query?.query || '',
        domains,
        page: ctx.query?.page ? parseInt(ctx.query.page, 10) : 1,
        limit: ctx.query?.limit ? parseInt(ctx.query.limit, 10) : 20,
        sortBy: ctx.query?.sortBy as any,
        statusFilter: ctx.query?.status,
        dateFrom: ctx.query?.dateFrom,
        dateTo: ctx.query?.dateTo,
      });
      return this.ok(ctx, res, 200);
    }

    // 30B. Recherche Globale : Autocomplétion temps réel & Suggestions
    if (method === 'GET' && path === '/api/v1/search/autocomplete') {
      const user = requireAuthenticatedSession(ctx);
      const res = this.services.getAutocompleteSuggestionsService(
        user,
        ctx.query?.q || ctx.query?.query || '',
        ctx.query?.domain as any
      );
      return this.ok(ctx, res, 200);
    }

    // 30C. Analytics : Tableaux de bord spécifiques aux 6 rôles
    if (method === 'GET' && path === '/api/v1/analytics/dashboard') {
      const user = requireAuthenticatedSession(ctx);
      const dashboard = this.services.getRoleAnalyticsDashboardService(user, {
        period: (ctx.query?.period as any) || '30D',
        roleOverride: ctx.query?.roleOverride as any,
      });
      return this.ok(ctx, dashboard, 200);
    }

    // 30D. Analytics : Export certifié multi-format (CSV, XLSX, JSON, PDF)
    if (method === 'GET' && path === '/api/v1/analytics/export') {
      const user = requireAuthenticatedSession(ctx);
      const format = ((ctx.query?.format || 'CSV') as string).toUpperCase() as 'CSV' | 'XLSX' | 'JSON' | 'PDF';
      const exported = this.services.exportAnalyticsReportService(user, {
        period: (ctx.query?.period as any) || '30D',
        format,
        roleOverride: ctx.query?.roleOverride as any,
      });
      return this.ok(ctx, exported, 200);
    }

    throw new AppError(404, 'ENDPOINT_NOT_FOUND', `Route API introuvable : ${method} ${path}`);
  }
}
