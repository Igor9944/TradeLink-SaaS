// ============================================================================
// TRADELINK V6.0 — CONTRÔLEURS API ET ROUTEUR CENTRALISÉ
// Séparation stricte : Routes -> Middlewares -> Validateurs -> Contrôleurs -> Services -> Repositories
// Conforme aux Chapitres 2, 6, 7, 9, 10, PROMPT 4 et PROMPT 5
// ============================================================================

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
  validateCalculationPayload,
  validateKycDecisionPayload,
  validateOrderCreatePayload,
  validatePaginationAndFilters,
} from '../validators/schema.validator';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkDomainServices } from '../services/domain.services';
import { buildOpenApiSpecification } from '../openapi/openapi.spec';
import { evaluateKYCDossierRule, APM_TELEMETRY } from '../../services/backendServices';
import { CentralTranslationService } from '../../services/translationEngine';

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
      // Assainissement XSS préventif de l'intégralité du payload entrant
      if (ctx.body && typeof ctx.body === 'object') {
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

      APM_TELEMETRY.record(`${ctx.method} ${ctx.path}`, performance.now() - start, true);
      return response;
    } catch (err) {
      APM_TELEMETRY.record(`${ctx.method} ${ctx.path}`, performance.now() - start, false);
      return handleCentralizedServerError(
        err,
        ctx.correlationId,
        this.repo.isProductionDatabaseConnected
      );
    }
  }

  private routeRequest(ctx: ServerRequestContext): ServerResponsePayload {
    const { method, path } = ctx;

    // 1. Health & OpenAPI 3.1.0 Documentation
    if (method === 'GET' && path === '/api/v1/health') {
      return this.ok(ctx, {
        status: 'UP',
        version: '6.0.0',
        persistedInDatabase: this.repo.isProductionDatabaseConnected,
      });
    }

    if (method === 'GET' && path === '/api/v1/docs/openapi.json') {
      return this.ok(ctx, buildOpenApiSpecification());
    }

    // 2A. Inscription Visiteur (Argon2id + OTP + Conditions Générales + Interdiction d'inscription publique ADMIN/COMPTABLE/SUPPORT)
    if (method === 'POST' && path === '/api/v1/auth/register') {
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
      } = ctx.body;

      if (!email || !password || !companyName) {
        throw new AppError(
          400,
          'VALIDATION_REGISTER_FIELDS',
          'email, password et companyName sont obligatoires.'
        );
      }

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
      const { email, code, approveClientOnboarding } = ctx.body;
      if (!email || !code) {
        throw new AppError(400, 'VALIDATION_OTP_FIELDS', 'email et code OTP sont requis.');
      }
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
      const { phone, code } = ctx.body;
      if (!phone || !code) {
        throw new AppError(400, 'VALIDATION_PHONE_OTP_FIELDS', 'phone et code SMS OTP sont requis.');
      }
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
      const { userId, email, password, role, companyName, deviceName, userAgent, mfaCode } =
        ctx.body;
      if (!email || (!password && (!userId || !role))) {
        throw new AppError(
          400,
          'VALIDATION_LOGIN_FIELDS',
          'email et password (ou contexte userId/role) sont requis.'
        );
      }
      const sessionData = this.services.loginAndCreateSingleSession({
        userId,
        email: String(email),
        password: password !== undefined ? String(password) : undefined,
        role,
        companyName: companyName ?? 'TradeLink Partner',
        deviceName,
        userAgent,
        mfaCode,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });

      const sessionCookie = `tradelink_session=${sessionData.sessionId}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`;

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

    // 2C-ter. Gestion des sessions de l'utilisateur
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
      const csrfToken = `csrf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return this.ok(ctx, { csrfToken }, 200, undefined, {
        'X-CSRF-Token': csrfToken,
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
      const { code } = ctx.body;
      if (!code) {
        throw new AppError(400, 'VALIDATION_MFA_CODE', 'Le code TOTP à 6 chiffres est requis.');
      }
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
      const { refreshToken } = ctx.body;
      if (!refreshToken) {
        throw new AppError(400, 'VALIDATION_REFRESH_TOKEN', 'refreshToken est requis.');
      }
      const rotated = this.services.rotateRefreshToken({
        refreshToken: String(refreshToken),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, rotated, 200);
    }

    // 2F. Mot de passe oublié & Réinitialisation sécurisée à usage unique
    if (method === 'POST' && path === '/api/v1/auth/forgot-password') {
      const { email } = ctx.body;
      if (!email) {
        throw new AppError(400, 'VALIDATION_EMAIL_REQUIRED', 'L’adresse email est requise.');
      }
      const res = this.services.requestPasswordReset({
        email: String(email),
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'POST' && path === '/api/v1/auth/reset-password') {
      const { token, newPassword } = ctx.body;
      if (!token || !newPassword) {
        throw new AppError(
          400,
          'VALIDATION_RESET_FIELDS',
          'Le jeton et le nouveau mot de passe sont requis.'
        );
      }
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

    // 3A. Catégories & Produits (Pagination, Filtres, Soft Delete, Restriction Comptable Stage 3)
    if (method === 'GET' && path === '/api/v1/categories') {
      const categories = this.services.listProductCategories();
      return this.ok(ctx, categories);
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

    // 3B. Mouvements de stock
    if (method === 'GET' && path === '/api/v1/stocks/movements') {
      requireAuthenticatedSession(ctx);
      const list = this.services.listStockMovements(ctx.query?.productId);
      return this.ok(ctx, list);
    }

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
      const { productId, movementType, quantity, reason, referenceDocument } = ctx.body;
      if (!productId || !movementType || quantity === undefined || !reason) {
        throw new AppError(
          400,
          'VALIDATION_STOCK_MOVEMENT_FIELDS',
          'productId, movementType, quantity et reason sont requis.'
        );
      }
      const res = this.services.recordStockMovementTransactional({
        actor: user,
        productId: String(productId),
        movementType,
        quantity: Number(quantity),
        reason: String(reason),
        referenceDocument: referenceDocument ? String(referenceDocument) : undefined,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 201);
    }

    if (method === 'DELETE' && path.startsWith('/api/v1/products/')) {
      const productId = path.split('/').pop() ?? '';
      const product = this.repo.findActiveProductById(productId);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable ou déjà supprimé.');
      }
      // Protection IDOR : un Fournisseur ne peut supprimer que ses propres produits
      enforceRBACAndOwnership(
        ctx,
        ['FOURNISSEUR', 'ADMIN'],
        ctx.user?.role === 'FOURNISSEUR' ? product.supplierId : undefined,
        'products:write'
      );
      this.repo.softDeleteProduct(productId);
      return this.ok(ctx, { id: productId, softDeleted: true });
    }

    // 4. Commandes Transactionnelles, Ownership & Réservation de Stock
    if (method === 'GET' && path === '/api/v1/orders') {
      const user = requireAuthenticatedSession(ctx);
      const pagination = validatePaginationAndFilters(ctx.query);
      const res = this.repo.getActiveOrdersForActor(user.id, user.role, pagination);
      return this.ok(ctx, res.items, 200, {
        page: res.page,
        limit: res.limit,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      });
    }

    if (method === 'GET' && path.startsWith('/api/v1/orders/')) {
      const orderId = path.split('/').pop() ?? '';
      const order = this.repo.findActiveOrderById(orderId);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }
      enforceRBACAndOwnership(
        ctx,
        ['CLIENT', 'FOURNISSEUR', 'COMPTABLE', 'ADMIN'],
        ctx.user?.role === 'CLIENT'
          ? order.clientId
          : ctx.user?.role === 'FOURNISSEUR'
          ? order.supplierId
          : undefined,
        'orders:read_own'
      );
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
      const created = this.services.createOrderTransactional({
        actor: ctx.user!,
        shippingAddress: payload.shippingAddress,
        lines: payload.lines,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, created, 201);
    }

    // 4B. Devis (Quotes) — Création, Chiffrage Fournisseur, Acceptation Client & Conversion en Commande
    if (method === 'GET' && path === '/api/v1/quotes') {
      const user = requireAuthenticatedSession(ctx);
      const allQuotes = this.repo.getSnapshot().quotes;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allQuotes
          : user.role === 'CLIENT'
          ? allQuotes.filter((q) => q.clientId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allQuotes.filter((q) => q.supplierId === user.id)
          : allQuotes;
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
      const quote = this.services.createQuoteTransactional({
        actor: user,
        quoteInput: ctx.body as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, quote, 201);
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
      const allInvoices = this.repo.getSnapshot().invoices;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allInvoices
          : user.role === 'CLIENT'
          ? allInvoices.filter((i) => i.clientId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allInvoices.filter((i) => i.supplierId === user.id)
          : allInvoices;
      return this.ok(ctx, scoped);
    }

    if (method === 'POST' && path === '/api/v1/invoices/generate') {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['FOURNISSEUR', 'COMPTABLE', 'ADMIN']);
      const { orderId, dueInDays, jurisdiction } = ctx.body;
      if (!orderId) {
        throw new AppError(400, 'VALIDATION_INVOICE_FIELDS', 'orderId est obligatoire.');
      }
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
      const { orderId, invoiceId } = ctx.body;
      if (!orderId || !invoiceId) {
        throw new AppError(
          400,
          'VALIDATION_PAYMENT_SESSION_FIELDS',
          'orderId et invoiceId sont requis.'
        );
      }
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
      const payload = ctx.body;
      if (!payload?.id || !payload?.type || !payload?.data?.object) {
        throw new AppError(
          400,
          'VALIDATION_STRIPE_WEBHOOK_PAYLOAD',
          'Payload de webhook Stripe invalide.'
        );
      }
      const res = this.services.processStripeWebhookTransactional({
        webhookPayload: payload as any,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res, 200);
    }

    if (method === 'GET' && path === '/api/v1/payments') {
      const user = requireAuthenticatedSession(ctx);
      const allPayments = this.repo.getSnapshot().payments;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allPayments
          : user.role === 'CLIENT'
          ? allPayments.filter((p) => p.clientId === user.id)
          : user.role === 'FOURNISSEUR'
          ? allPayments.filter((p) => p.supplierId === user.id)
          : allPayments;
      return this.ok(ctx, scoped);
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

    // 6.1. Liste des salles accessibles
    if (method === 'GET' && path === '/api/v1/rooms') {
      const user = requireAuthenticatedSession(ctx);
      const rooms = this.services.listAccessibleRoomsService(user.id, user.role);
      return this.ok(ctx, rooms, 200);
    }

    // 6.2. Création contrôlée par rôle (Client interdit en création générale -> 403)
    if (method === 'POST' && path === '/api/v1/rooms') {
      const user = requireAuthenticatedSession(ctx);
      const room = this.services.createRoomLiveChecked({
        title: String(ctx.body?.title ?? 'Réunion B2B'),
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
      });
      return this.ok(ctx, room, 201);
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
      requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/raise-hand', '');
      const session = this.services.raiseHandRoomService(
        roomIdOrCode,
        String(ctx.body?.participantId),
        ctx.body?.isRaised
      );
      return this.ok(ctx, { session }, 200);
    }

    // 6.12. Diffusion de réactions interactives
    if (method === 'POST' && path.startsWith('/api/v1/rooms/') && path.endsWith('/reactions')) {
      requireAuthenticatedSession(ctx);
      const roomIdOrCode = path.replace('/api/v1/rooms/', '').replace('/reactions', '');
      const res = this.services.broadcastRoomReactionService(
        roomIdOrCode,
        String(ctx.body?.participantId),
        String(ctx.body?.emoji)
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
    // 9. MODULE LOGISTIQUE ET TRANSPORT MULTIMODAL (PROMPT 9)
    // ============================================================================

    if (method === 'GET' && path === '/api/v1/logistics/vehicles') {
      requireAuthenticatedSession(ctx);
      const vehicles = this.services.listVehicles(ctx.query?.carrierId);
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

    if (method === 'GET' && path === '/api/v1/logistics/shipments') {
      const user = requireAuthenticatedSession(ctx);
      const allShipments = this.repo.getSnapshot().shipments;
      const scoped =
        user.role === 'ADMIN' || user.role === 'COMPTABLE'
          ? allShipments
          : user.role === 'CLIENT'
          ? allShipments.filter((s) => s.clientId === user.id)
          : user.role === 'TRANSPORTEUR'
          ? allShipments.filter((s) => s.carrierId === user.id)
          : allShipments;
      return this.ok(ctx, scoped);
    }

    if (method === 'GET' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/tracking')) {
      requireAuthenticatedSession(ctx);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const res = this.services.getShipmentTrackingWithWaypoints(shipmentId);
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
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, res);
    }

    if (method === 'POST' && path.startsWith('/api/v1/logistics/shipments/') && path.endsWith('/documents')) {
      const user = requireAuthenticatedSession(ctx);
      enforceRBACAndOwnership(ctx, ['TRANSPORTEUR', 'FOURNISSEUR', 'ADMIN']);
      const parts = path.split('/');
      const shipmentId = parts[parts.length - 2];
      const docs = this.services.generateTransportDocumentsTransactional({
        actor: user,
        shipmentId,
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
      const inc = this.services.reportLogisticsIncidentTransactional({
        actor: user,
        ...ctx.body,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      } as any);
      return this.ok(ctx, inc, 201);
    }

    if (method === 'GET' && path === '/api/v1/logistics/incidents') {
      requireAuthenticatedSession(ctx);
      return this.ok(ctx, this.repo.getSnapshot().incidents);
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
      const text = ctx.body?.text || '';
      const result = CentralTranslationService.detectLanguage(text);
      return this.ok(ctx, result, 200);
    }

    // 21B. Traduction de texte générique / B2B
    if (method === 'POST' && path === '/api/v1/translation/text') {
      const { text, sourceLang, targetLang, domain, preserveTerms, bypassCache } = ctx.body || {};
      if (!text || !targetLang) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Paramètres requis : text et targetLang.');
      }
      const result = CentralTranslationService.translateTextSync({
        text,
        sourceLang,
        targetLang,
        domain,
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
      const productId = path.replace('/api/v1/translation/product/', '');
      const targetLang = ctx.body?.targetLang;
      if (!targetLang) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'targetLang requis.');
      }
      const result = this.services.translateCatalogProduct(productId, targetLang);
      return this.ok(ctx, result, 200);
    }

    // 21E. Consultation et filtrage du glossaire officiel TradeLink
    if (method === 'GET' && path === '/api/v1/translation/glossary') {
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

    throw new AppError(404, 'ENDPOINT_NOT_FOUND', `Route API introuvable : ${method} ${path}`);
  }
}
