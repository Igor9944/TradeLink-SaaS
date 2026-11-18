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
import { evaluateKYCDossierRule } from '../../services/backendServices';

export class TradeLinkApiApplication {
  private readonly services: TradeLinkDomainServices;

  constructor(private readonly repo: TradeLinkRepositoryStore) {
    this.services = new TradeLinkDomainServices(repo);
  }

  private ok<T>(
    ctx: ServerRequestContext,
    data: T,
    statusCode = 200,
    pagination?: ServerResponsePayload['body']['pagination']
  ): ServerResponsePayload<T> {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': ctx.correlationId,
        'X-Data-Source': this.repo.isProductionDatabaseConnected
          ? 'POSTGRESQL_PRISMA'
          : 'ISOLATED_SANDBOX_STORE',
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

      return response;
    } catch (err) {
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

    // 2A. Inscription Visiteur (Argon2id + OTP + Interdiction d'inscription publique ADMIN)
    if (method === 'POST' && path === '/api/v1/auth/register') {
      const { email, password, fullName, companyName, taxId, country, requestedRole } = ctx.body;
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
        fullName: String(fullName ?? companyName),
        companyName: String(companyName),
        taxId: String(taxId ?? 'ICE-PENDING'),
        country: String(country ?? 'Maroc'),
        requestedRole: requestedRole ? String(requestedRole) : 'CLIENT',
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, created, 201);
    }

    // 2B. Vérification OTP (6 chiffres, expiration 10 min, max 5 essais, transition Visiteur -> Client)
    if (method === 'POST' && path === '/api/v1/auth/verify-otp') {
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

    // 2C. Connexion (Argon2id + Protection Brute-Force + Session Unique Redis + JWT & Refresh Token)
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
      return this.ok(ctx, sessionData, 200);
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

    // 3A. Catégories & Produits (Pagination, Filtres, Soft Delete, Restriction Comptable Stage 3)
    if (method === 'GET' && path === '/api/v1/categories') {
      const categories = this.services.listProductCategories();
      return this.ok(ctx, categories);
    }

    if (method === 'GET' && path === '/api/v1/products') {
      const pagination = validatePaginationAndFilters(ctx.query);
      const res = this.repo.getActiveProducts(pagination);
      return this.ok(ctx, res.items, 200, {
        page: res.page,
        limit: res.limit,
        totalItems: res.totalItems,
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

    // 6. Room Live — Création contrôlée par rôle (Client interdit en création générale)
    if (method === 'POST' && path === '/api/v1/rooms') {
      const user = requireAuthenticatedSession(ctx);
      const room = this.services.createRoomLiveChecked({
        title: String(ctx.body.title ?? 'Réunion B2B'),
        scheduledAt: String(ctx.body.scheduledAt ?? '2026-11-20 10:00'),
        actor: user,
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
      });
      return this.ok(ctx, room, 201);
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

    throw new AppError(404, 'ENDPOINT_NOT_FOUND', `Route API introuvable : ${method} ${path}`);
  }
}
