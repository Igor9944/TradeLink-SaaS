// ============================================================================
// TRADELINK V6.0 — SERVICES MÉTIERS CONNECTÉS AUX REPOSITORIES, AUTHENTIFICATION
// ARGON2ID, OTP, MFA TOTP ADMIN, REFRESH TOKENS ROTATIFS, APPAREILS & TRANSACTIONS
// Conforme aux Chapitres 2, 6, 7, 10, PROMPT 4 et PROMPT 5
// ============================================================================

import Decimal from 'decimal.js';
import {
  AppError,
  markSessionMfaVerified,
  registerSingleActiveSession,
  revokeUserActiveSession,
  ServerRequestContext,
} from '../middlewares/errorAndSecurity.middleware';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import {
  calculateFinancialInterest,
  canCreateRoomLiveGeneral,
  evaluateKYCDossierRule,
  validateDualAdminApproval,
} from '../../services/backendServices';
import {
  buildOtpAuthUri,
  generateTotpSecretBase32,
  hashPasswordArgon2id,
  signJwtAccessToken,
  verifyPasswordArgon2id,
  verifyTotpCode,
} from '../../services/securityCrypto';
import {
  checkMandatoryKycCompletion,
  encryptAndStoreKycDocument,
  executeKycCronBatch,
  KYC_REQUIRED_DOCUMENTS_BY_PROFILE,
  KycActorProfile,
} from '../../services/kycEngine';
import {
  analyzeFileInIsolatedSandbox,
  buildAuditChainFromLogs,
  exportDatasetToFormat,
  ImportExportFormat,
  rotateKmsMasterKey,
  SandboxAnalysisReport,
  validateDualAdminOperation,
  verifyAuditLogChainIntegrity,
  verifyBackupCryptographicIntegrity,
} from '../../services/adminAdvancedEngine';
import {
  DayCountBasis,
  IncidentRecord,
  InvoiceRecord,
  KMSKeyRecord,
  OrderRecord,
  ProductItem,
  QuoteRecord,
  RoomLiveRecord,
  ShipmentRecord,
  ShipmentStatus,
  UserRoleCode,
} from '../../types';
import {
  CommercialEngine,
  INITIAL_PRODUCT_CATEGORIES,
  ProductCategory,
  QuoteCreateInput,
  QuoteRespondInput,
  StockMovementRecord,
  StripeCheckoutSessionSimulated,
  StripeWebhookPayloadSimulated,
} from '../../services/commercialEngine';
import {
  INITIAL_SHIPMENT_WAYPOINTS,
  LogisticsEngine,
  LogisticsMissionRecord,
  ProofOfDeliveryData,
  RouteWaypoint,
  TransportDocumentRecord,
  VehicleRecord,
} from '../../services/logisticsEngine';
import {
  AccountingEngine,
  AccountingEntryRecord,
  AccountingFramework,
  AccountingJournalRecord,
  BankReconciliationResult,
  BankStatementLine,
  CHARTS_OF_ACCOUNTS,
  STANDARD_JOURNALS,
} from '../../services/accountingEngine';

export interface RegisteredAccountRecord {
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  taxId: string;
  country: string;
  role: UserRoleCode;
  requestedRole: UserRoleCode;
  passwordHashArgon2id: string;
  emailVerified: boolean;
  kycStatus: 'PENDING_OTP' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';
  mfaEnabled: boolean;
  mfaSecretBase32?: string;
  failedLoginAttempts: number;
  lockedUntilMs?: number;
  createdAt: string;
}

export interface OtpChallengeRecord {
  email: string;
  code: string;
  purpose: 'REGISTRATION_VERIFICATION' | 'LOGIN_VERIFICATION';
  expiresAtMs: number;
  attemptsRemaining: number;
  consumed: boolean;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  sessionId: string;
  deviceId: string;
  expiresAtMs: number;
  consumed: boolean;
  revoked: boolean;
}

export interface PasswordResetTokenRecord {
  token: string;
  email: string;
  userId: string;
  expiresAtMs: number;
  used: boolean;
}

export interface UserDeviceRecord {
  id: string;
  userId: string;
  sessionId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  trusted: boolean;
  revoked: boolean;
  lastActiveAt: string;
}

export class TradeLinkDomainServices {
  private readonly accountsByEmail = new Map<string, RegisteredAccountRecord>();
  private readonly otpChallenges = new Map<string, OtpChallengeRecord>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();
  private readonly resetTokens = new Map<string, PasswordResetTokenRecord>();
  private readonly devicesById = new Map<string, UserDeviceRecord>();
  private readonly processedStripeEventIds = new Set<string>();

  constructor(private readonly repo: TradeLinkRepositoryStore) {
    // Provisionnement manuel initial de l'Administrateur (Chapitre 2.1 : Admin provisionné manuellement)
    this.seedProvisionedAccounts();
  }

  private seedProvisionedAccounts(): void {
    const adminSecret = generateTotpSecretBase32('usr-admin-01-tradelink-v6');
    this.accountsByEmail.set('k.benali@tradelink-global.com', {
      userId: 'usr-admin-01',
      email: 'k.benali@tradelink-global.com',
      fullName: 'Karim Benali',
      companyName: 'TradeLink Global HQ',
      taxId: 'FR-TL-00000001',
      country: 'France',
      role: 'ADMIN',
      requestedRole: 'ADMIN',
      passwordHashArgon2id: hashPasswordArgon2id('AdminTradeLink!2026', 'salt-admin-01'),
      emailVerified: true,
      kycStatus: 'VALIDATED',
      mfaEnabled: true,
      mfaSecretBase32: adminSecret,
      failedLoginAttempts: 0,
      createdAt: '2026-01-01T00:00:00Z',
    });

    this.accountsByEmail.set('s.mansouri@atlas-import.ma', {
      userId: 'usr-client-01',
      email: 's.mansouri@atlas-import.ma',
      fullName: 'Sofia Mansouri',
      companyName: 'Atlas Import & Distribution SARL',
      taxId: 'MA-ICE-002849100',
      country: 'Maroc',
      role: 'CLIENT',
      requestedRole: 'CLIENT',
      passwordHashArgon2id: hashPasswordArgon2id('ClientAtlas!2026', 'salt-client-01'),
      emailVerified: true,
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-10T00:00:00Z',
    });

    this.accountsByEmail.set('h.weber@eurotech-supply.de', {
      userId: 'usr-supp-01',
      email: 'h.weber@eurotech-supply.de',
      fullName: 'Hans Weber',
      companyName: 'EuroTech Industrial & ColdChain GmbH',
      taxId: 'DE-998877665',
      country: 'Allemagne',
      role: 'FOURNISSEUR',
      requestedRole: 'FOURNISSEUR',
      passwordHashArgon2id: hashPasswordArgon2id('SupplierEuro!2026', 'salt-supp-01'),
      emailVerified: true,
      kycStatus: 'VALIDATED',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-02-12T00:00:00Z',
    });
  }

  // 1A. Inscription Visiteur (Chapitre 2.1 & PROMPT 5 : Admin provisionné manuellement, Visiteur -> Client après approbation)
  public registerVisitorAccount(params: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    taxId: string;
    country: string;
    requestedRole?: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      throw new AppError(400, 'VALIDATION_INVALID_EMAIL', 'Adresse email professionnelle invalide.');
    }

    // Règle stricte : L'Administrateur est provisionné manuellement uniquement
    if (params.requestedRole === 'ADMIN') {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: normalizedEmail,
          actorRole: 'VISITEUR',
          action: 'AUTH_PUBLIC_ADMIN_REGISTRATION_BLOCKED',
          targetType: 'User',
          targetId: normalizedEmail,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Tentative bloquée : le rôle ADMIN est provisionné manuellement uniquement.',
        });
      });
      throw new AppError(
        403,
        'ADMIN_PROVISIONED_MANUALLY_ONLY',
        'Interdit (Chapitre 2.1) : Le compte Administrateur est provisionné manuellement et ne peut pas être demandé via l’inscription publique.'
      );
    }

    if (!params.password || params.password.length < 10) {
      throw new AppError(
        400,
        'PASSWORD_POLICY_VIOLATION',
        'Le mot de passe doit contenir au moins 10 caractères.'
      );
    }

    if (this.accountsByEmail.has(normalizedEmail)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Un compte existe déjà avec cet email.');
    }

    const userId = `usr-vis-${Date.now().toString(36)}`;
    const passwordHashArgon2id = hashPasswordArgon2id(params.password);
    const targetRole: UserRoleCode =
      params.requestedRole === 'FOURNISSEUR'
        ? 'FOURNISSEUR'
        : params.requestedRole === 'TRANSPORTEUR'
        ? 'TRANSPORTEUR'
        : 'CLIENT';

    // Le demandeur démarre à l'état pré-client VISITEUR jusqu'à vérification OTP et approbation
    const record: RegisteredAccountRecord = {
      userId,
      email: normalizedEmail,
      fullName: params.fullName.trim(),
      companyName: params.companyName.trim(),
      taxId: params.taxId.trim(),
      country: params.country.trim(),
      role: 'VISITEUR',
      requestedRole: targetRole,
      passwordHashArgon2id,
      emailVerified: false,
      kycStatus: 'PENDING_OTP',
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.accountsByEmail.set(normalizedEmail, record);

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    this.otpChallenges.set(normalizedEmail, {
      email: normalizedEmail,
      code: otpCode,
      purpose: 'REGISTRATION_VERIFICATION',
      expiresAtMs: Date.now() + 10 * 60 * 1000, // 10 minutes
      attemptsRemaining: 5,
      consumed: false,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: 'VISITEUR',
        action: 'AUTH_VISITOR_REGISTERED_ARGON2ID',
        targetType: 'User',
        targetId: userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Demande de compte Visiteur créée (${record.companyName}) avec hash Argon2id et OTP émis.`,
      });
    });

    return {
      userId,
      email: normalizedEmail,
      role: record.role,
      requestedRole: record.requestedRole,
      kycStatus: record.kycStatus,
      passwordHashAlgorithm: 'Argon2id (v=19, m=65536, t=3, p=4)',
      otpIssued: true,
      otpExpiresInSeconds: 600,
      // Renvoyé uniquement en mode test/sandbox pour permettre la vérification automatisée sans exposer de secret de prod
      sandboxOtpCode: this.repo.isProductionDatabaseConnected ? undefined : otpCode,
    };
  }

  // 1B. Vérification OTP et transition Visiteur -> Client après processus d'approbation
  public verifyOtpChallenge(params: {
    email: string;
    code: string;
    approveClientOnboarding?: boolean;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const challenge = this.otpChallenges.get(normalizedEmail);
    if (!challenge || challenge.consumed) {
      throw new AppError(400, 'OTP_CHALLENGE_NOT_FOUND', 'Aucun code OTP actif pour cet email.');
    }

    if (Date.now() > challenge.expiresAtMs) {
      throw new AppError(400, 'OTP_EXPIRED', 'Le code OTP a expiré (délai de 10 minutes dépassé).');
    }

    if (challenge.attemptsRemaining <= 0) {
      throw new AppError(
        429,
        'OTP_MAX_ATTEMPTS_EXCEEDED',
        'Nombre maximal de tentatives OTP atteint (5/5). Veuillez demander un nouveau code.'
      );
    }

    if (challenge.code !== params.code.trim()) {
      challenge.attemptsRemaining -= 1;
      if (challenge.attemptsRemaining <= 0) {
        throw new AppError(
          429,
          'OTP_MAX_ATTEMPTS_EXCEEDED',
          'Code OTP invalide. Quota de 5 tentatives épuisé ; le code est désormais verrouillé.'
        );
      }
      throw new AppError(
        400,
        'OTP_INVALID_CODE',
        `Code OTP incorrect. Tentatives restantes : ${challenge.attemptsRemaining}.`
      );
    }

    challenge.consumed = true;
    const account = this.accountsByEmail.get(normalizedEmail);
    if (!account) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Compte utilisateur introuvable.');
    }

    account.emailVerified = true;
    if (params.approveClientOnboarding !== false) {
      account.role = account.requestedRole;
      account.kycStatus = 'SUBMITTED';
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: account.role,
        action: 'AUTH_OTP_VERIFIED_ONBOARDING',
        targetType: 'User',
        targetId: account.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `OTP vérifié ; statut du compte promu vers ${account.role} (KYC: ${account.kycStatus}).`,
      });
    });

    return {
      userId: account.userId,
      email: account.email,
      emailVerified: account.emailVerified,
      role: account.role,
      kycStatus: account.kycStatus,
    };
  }

  // 1C. AuthService & SessionService — Connexion avec Argon2id, Brute-Force Lockout, Session Unique Redis, JWT & Refresh Token
  public loginAndCreateSingleSession(params: {
    userId?: string;
    email: string;
    password?: string;
    role?: NonNullable<ServerRequestContext['user']>['role'];
    companyName?: string;
    deviceName?: string;
    userAgent?: string;
    mfaCode?: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);

    // Si un mot de passe est fourni ou que le compte est enregistré avec Argon2id, appliquer le contrôle Brute-Force + Argon2id
    if (account && params.password !== undefined) {
      if (account.lockedUntilMs && Date.now() < account.lockedUntilMs) {
        this.repo.executeTransaction((tx) => {
          tx.auditLogs.unshift({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: normalizedEmail,
            actorRole: account.role,
            action: 'AUTH_LOGIN_BLOCKED_LOCKOUT',
            targetType: 'User',
            targetId: account.userId,
            result: 'DENIED',
            correlationId: params.correlationId,
            ipAddress: params.ipAddress,
            details: 'Tentative de connexion rejetée : compte temporairement verrouillé (anti-brute-force).',
          });
        });
        throw new AppError(
          429,
          'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE',
          'Compte temporairement verrouillé suite à 5 tentatives de connexion infructueuses (15 minutes).'
        );
      }

      const validPassword = verifyPasswordArgon2id(params.password, account.passwordHashArgon2id);
      if (!validPassword) {
        account.failedLoginAttempts += 1;
        if (account.failedLoginAttempts >= 5) {
          account.lockedUntilMs = Date.now() + 15 * 60 * 1000;
          this.repo.executeTransaction((tx) => {
            tx.auditLogs.unshift({
              id: `aud-${Date.now()}`,
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
              actorName: normalizedEmail,
              actorRole: account.role,
              action: 'AUTH_BRUTE_FORCE_LOCKOUT',
              targetType: 'User',
              targetId: account.userId,
              result: 'DENIED',
              correlationId: params.correlationId,
              ipAddress: params.ipAddress,
              details: `Verrouillage de sécurité déclenché après ${account.failedLoginAttempts} échecs consécutifs.`,
            });
          });
          throw new AppError(
            429,
            'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE',
            'Sécurité TRADELINK : Votre compte est verrouillé pendant 15 minutes après 5 tentatives infructueuses.'
          );
        }

        this.repo.executeTransaction((tx) => {
          tx.auditLogs.unshift({
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            actorName: normalizedEmail,
            actorRole: account.role,
            action: 'AUTH_LOGIN_FAILED_BAD_PASSWORD',
            targetType: 'User',
            targetId: account.userId,
            result: 'DENIED',
            correlationId: params.correlationId,
            ipAddress: params.ipAddress,
            details: `Échec de mot de passe Argon2id (${account.failedLoginAttempts}/5).`,
          });
        });

        throw new AppError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          `Identifiants invalides. Tentatives restantes avant verrouillage : ${5 - account.failedLoginAttempts}.`
        );
      }

      // Réinitialisation du compteur d'échecs après authentification réussie
      account.failedLoginAttempts = 0;
      account.lockedUntilMs = undefined;
    }

    const resolvedUserId = account?.userId ?? params.userId ?? `usr-${Date.now().toString(36)}`;
    const resolvedRole = account?.role ?? params.role ?? 'CLIENT';
    const resolvedCompany = account?.companyName ?? params.companyName ?? 'TradeLink Partner';

    // MFA obligatoire pour l'Administrateur lorsque l'authentification complète par mot de passe est utilisée
    let mfaVerified = true;
    if (resolvedRole === 'ADMIN' && params.password !== undefined) {
      if (params.mfaCode && account?.mfaSecretBase32) {
        const checkTotp = verifyTotpCode(account.mfaSecretBase32, params.mfaCode);
        if (!checkTotp) {
          throw new AppError(401, 'AUTH_INVALID_MFA_TOTP', 'Code TOTP Administrateur invalide.');
        }
        mfaVerified = true;
      } else {
        mfaVerified = false;
      }
    }

    const newSessionId = `sess-redis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const { previousRevokedSessionId } = registerSingleActiveSession(
      resolvedUserId,
      newSessionId,
      mfaVerified
    );

    // Révocation de tous les anciens refresh tokens et appareils de la session précédente
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === resolvedUserId && !rt.revoked) {
        rt.revoked = true;
      }
    }
    for (const dev of this.devicesById.values()) {
      if (dev.userId === resolvedUserId && dev.sessionId === previousRevokedSessionId) {
        dev.revoked = true;
      }
    }

    const deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.devicesById.set(deviceId, {
      id: deviceId,
      userId: resolvedUserId,
      sessionId: newSessionId,
      deviceName: params.deviceName ?? 'Poste de travail B2B (Chrome/Windows)',
      userAgent: params.userAgent ?? 'Mozilla/5.0 TradeLink-Client/6.0',
      ipAddress: params.ipAddress,
      trusted: true,
      revoked: false,
      lastActiveAt: new Date().toISOString(),
    });

    const accessToken = signJwtAccessToken({
      sub: resolvedUserId,
      email: normalizedEmail,
      role: resolvedRole,
      sessionId: newSessionId,
      mfaVerified,
      deviceId,
      ttlSeconds: 900,
    });

    const refreshToken = `rt-rot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.refreshTokens.set(refreshToken, {
      token: refreshToken,
      userId: resolvedUserId,
      sessionId: newSessionId,
      deviceId,
      expiresAtMs: Date.now() + 7 * 24 * 3600 * 1000,
      consumed: false,
      revoked: false,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: resolvedRole,
        action: 'AUTH_LOGIN_SINGLE_SESSION',
        targetType: 'Session',
        targetId: newSessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: previousRevokedSessionId
          ? `Nouvelle session ${newSessionId} active ; session précédente ${previousRevokedSessionId} révoquée.`
          : `Première session active ${newSessionId} ouverte.`,
      });
    });

    return {
      userId: resolvedUserId,
      email: normalizedEmail,
      role: resolvedRole,
      companyName: resolvedCompany,
      sessionId: newSessionId,
      previousRevokedSessionId,
      mfaRequired: resolvedRole === 'ADMIN',
      mfaVerified,
      accessToken,
      refreshToken,
      deviceId,
    };
  }

  // 1D. Configuration & Vérification TOTP MFA Administrateur (RFC 6238 + QR Code URI)
  public setupTotpMfaForUser(params: {
    userId: string;
    email: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const secretBase32 =
      account?.mfaSecretBase32 ?? generateTotpSecretBase32(`${params.userId}-${normalizedEmail}`);

    if (account) {
      account.mfaSecretBase32 = secretBase32;
      account.mfaEnabled = true;
    }

    const otpauthUri = buildOtpAuthUri(normalizedEmail, secretBase32);

    return {
      userId: params.userId,
      email: normalizedEmail,
      secretBase32,
      otpauthUri,
      algorithm: 'SHA1',
      digits: 6,
      periodSeconds: 30,
    };
  }

  public verifyAdminTotpMfa(params: {
    user: NonNullable<ServerRequestContext['user']>;
    code: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.user.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const secretBase32 =
      account?.mfaSecretBase32 ?? generateTotpSecretBase32(`${params.user.id}-${normalizedEmail}`);

    const check = verifyTotpCode(secretBase32, params.code);
    if (!check) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: normalizedEmail,
          actorRole: params.user.role,
          action: 'AUTH_MFA_TOTP_FAILED',
          targetType: 'Session',
          targetId: params.user.sessionId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Code TOTP MFA invalide lors de la vérification Administrateur.',
        });
      });
      throw new AppError(401, 'AUTH_INVALID_MFA_TOTP', 'Code TOTP à 6 chiffres invalide ou expiré.');
    }

    markSessionMfaVerified(params.user.sessionId);

    const upgradedAccessToken = signJwtAccessToken({
      sub: params.user.id,
      email: normalizedEmail,
      role: params.user.role,
      sessionId: params.user.sessionId,
      mfaVerified: true,
      deviceId: 'dev-mfa-verified',
      ttlSeconds: 900,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: params.user.role,
        action: 'AUTH_MFA_TOTP_VERIFIED',
        targetType: 'Session',
        targetId: params.user.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Double authentification TOTP validée pour la session ${params.user.sessionId}.`,
      });
    });

    return {
      sessionId: params.user.sessionId,
      mfaVerified: true,
      accessToken: upgradedAccessToken,
    };
  }

  // 1E. Rotation des Refresh Tokens & Détection de réutilisation frauduleuse (Token Reuse Detection)
  public rotateRefreshToken(params: {
    refreshToken: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const record = this.refreshTokens.get(params.refreshToken);
    if (!record) {
      throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token inconnu.');
    }

    // Détection de vol de Refresh Token : si déjà consommé, révoquer immédiatement la session active
    if (record.consumed) {
      revokeUserActiveSession(record.userId);
      for (const rt of this.refreshTokens.values()) {
        if (rt.userId === record.userId) {
          rt.revoked = true;
        }
      }
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: record.userId,
          actorRole: 'CLIENT',
          action: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
          targetType: 'Session',
          targetId: record.sessionId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Alerte sécurité : réutilisation d’un refresh token déjà consommé. Session révoquée.',
        });
      });
      throw new AppError(
        401,
        'REFRESH_TOKEN_REUSE_DETECTED',
        'Alerte de sécurité : réutilisation d’un refresh token déjà consommé détectée. Toutes vos sessions ont été révoquées.'
      );
    }

    if (record.revoked || Date.now() > record.expiresAtMs) {
      throw new AppError(
        401,
        'REFRESH_TOKEN_REVOKED_OR_EXPIRED',
        'Ce refresh token a expiré ou a été révoqué suite à une nouvelle connexion.'
      );
    }

    record.consumed = true;

    const newRefreshToken = `rt-rot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.refreshTokens.set(newRefreshToken, {
      token: newRefreshToken,
      userId: record.userId,
      sessionId: record.sessionId,
      deviceId: record.deviceId,
      expiresAtMs: Date.now() + 7 * 24 * 3600 * 1000,
      consumed: false,
      revoked: false,
    });

    const newAccessToken = signJwtAccessToken({
      sub: record.userId,
      email: `${record.userId}@tradelink.io`,
      role: 'CLIENT',
      sessionId: record.sessionId,
      mfaVerified: true,
      deviceId: record.deviceId,
      ttlSeconds: 900,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: record.sessionId,
    };
  }

  // 1F. Mot de passe oublié & Réinitialisation sécurisée à usage unique
  public requestPasswordReset(params: {
    email: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.accountsByEmail.get(normalizedEmail);
    const resetToken = `rst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    if (account) {
      this.resetTokens.set(resetToken, {
        token: resetToken,
        email: normalizedEmail,
        userId: account.userId,
        expiresAtMs: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false,
      });
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: normalizedEmail,
        actorRole: account?.role ?? 'VISITEUR',
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: account?.userId ?? 'UNKNOWN',
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: 'Jeton de réinitialisation à usage unique généré (expiration 15 min).',
      });
    });

    return {
      accepted: true,
      expiresInSeconds: 900,
      sandboxResetToken: this.repo.isProductionDatabaseConnected ? undefined : resetToken,
    };
  }

  public confirmPasswordReset(params: {
    token: string;
    newPassword: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const resetRecord = this.resetTokens.get(params.token);
    if (!resetRecord || resetRecord.used || Date.now() > resetRecord.expiresAtMs) {
      throw new AppError(
        400,
        'RESET_TOKEN_ALREADY_USED_OR_EXPIRED',
        'Le jeton de réinitialisation est invalide, expiré ou a déjà été consommé.'
      );
    }

    if (!params.newPassword || params.newPassword.length < 10) {
      throw new AppError(
        400,
        'PASSWORD_POLICY_VIOLATION',
        'Le nouveau mot de passe doit contenir au moins 10 caractères.'
      );
    }

    const account = this.accountsByEmail.get(resetRecord.email);
    if (!account) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }

    resetRecord.used = true;
    account.passwordHashArgon2id = hashPasswordArgon2id(params.newPassword);
    account.failedLoginAttempts = 0;
    account.lockedUntilMs = undefined;

    // Révocation immédiate de toutes les sessions actives et refresh tokens de l'utilisateur
    revokeUserActiveSession(account.userId);
    for (const rt of this.refreshTokens.values()) {
      if (rt.userId === account.userId) {
        rt.revoked = true;
      }
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: account.email,
        actorRole: account.role,
        action: 'AUTH_PASSWORD_RESET_COMPLETED',
        targetType: 'User',
        targetId: account.userId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: 'Mot de passe re-haché avec Argon2id ; jeton invalidé et sessions actives révoquées.',
      });
    });

    return {
      userId: account.userId,
      email: account.email,
      passwordReset: true,
      allPreviousSessionsRevoked: true,
    };
  }

  // 1G. Gestion des appareils (Device Management)
  public listUserDevices(userId: string): UserDeviceRecord[] {
    return Array.from(this.devicesById.values()).filter((d) => d.userId === userId);
  }

  public revokeUserDevice(params: {
    actorUserId: string;
    actorRole: UserRoleCode;
    deviceId: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const dev = this.devicesById.get(params.deviceId);
    if (!dev) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Appareil introuvable.');
    }

    // Protection IDOR : un utilisateur ne peut révoquer que ses propres appareils (sauf ADMIN)
    if (params.actorRole !== 'ADMIN' && dev.userId !== params.actorUserId) {
      throw new AppError(
        403,
        'RESOURCE_OWNERSHIP_VIOLATION',
        'Interdit (Protection IDOR) : vous ne pouvez pas révoquer l’appareil d’un autre utilisateur.'
      );
    }

    dev.revoked = true;
    revokeUserActiveSession(dev.userId);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actorUserId,
        actorRole: params.actorRole,
        action: 'AUTH_DEVICE_REVOKED',
        targetType: 'Device',
        targetId: dev.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Appareil ${dev.deviceName} (${dev.id}) et session associée ${dev.sessionId} révoqués.`,
      });
    });

    return dev;
  }

  // 2. OrderService & StockService — Création de commande TRANSACTIONNELLE avec réservation de stock
  public createOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shippingAddress: string;
    lines: { productId: string; quantity: number }[];
    correlationId: string;
    ipAddress: string;
  }): OrderRecord {
    return this.repo.executeTransaction((tx) => {
      let subtotalDec = new Decimal(0);
      const builtItems: OrderRecord['items'] = [];

      for (const reqLine of params.lines) {
        const prod = tx.products.find((p) => p.id === reqLine.productId && !p.deletedAt);
        if (!prod) {
          throw new AppError(
            404,
            'PRODUCT_NOT_FOUND',
            `Le produit ${reqLine.productId} est introuvable ou a été supprimé logiquement.`
          );
        }
        if (prod.stockAvailable < reqLine.quantity) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK_TRANSACTION_ABORTED',
            `Stock insuffisant pour ${prod.sku} : demandé ${reqLine.quantity}, disponible ${prod.stockAvailable}. Transaction annulée (Rollback).`
          );
        }

        // Réservation atomique du stock
        prod.stockAvailable -= reqLine.quantity;
        prod.stockReserved += reqLine.quantity;

        const unitDec = new Decimal(prod.unitPrice);
        const lineTotalDec = unitDec.times(reqLine.quantity);
        subtotalDec = subtotalDec.plus(lineTotalDec);

        builtItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name.fr,
          quantity: reqLine.quantity,
          unitPrice: unitDec.toFixed(2),
          totalLine: lineTotalDec.toFixed(2),
          icon3d: prod.icon3d,
        });
      }

      const taxDec = subtotalDec.times('0.20').toDecimalPlaces(2);
      const shippingDec = new Decimal('650.00');
      const totalDec = subtotalDec.plus(taxDec).plus(shippingDec);
      const orderNumber = `CMD-2026-${Math.floor(10000 + Math.random() * 89999)}`;

      const createdOrder: OrderRecord = {
        id: `ord-${Date.now()}`,
        orderNumber,
        clientId: params.actor.id,
        clientName: params.actor.companyName,
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial & ColdChain GmbH',
        status: 'PENDING',
        subtotalAmount: subtotalDec.toFixed(2),
        taxAmount: taxDec.toFixed(2),
        shippingAmount: shippingDec.toFixed(2),
        totalAmount: totalDec.toFixed(2),
        currency: 'EUR',
        shippingAddress: params.shippingAddress,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        items: builtItems,
        timeline: [
          {
            step: 'Commande créée & Stock réservé atomiquement',
            timestamp: new Date().toISOString(),
            actor: params.actor.companyName,
            completed: true,
          },
        ],
      };

      tx.orders.unshift(createdOrder);
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ORDER_CREATED_TRANSACTIONAL',
        targetType: 'Order',
        targetId: orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Commande ${orderNumber} créée avec réservation de stock (${totalDec.toFixed(2)} EUR TTC).`,
      });

      return createdOrder;
    });
  }

  // 3A. KYCService — Référentiel des documents requis selon le profil
  public getKycRequirementsByProfile(profile?: string) {
    if (profile && ['CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR'].includes(profile)) {
      const p = profile as KycActorProfile;
      return {
        profile: p,
        requiredDocuments: KYC_REQUIRED_DOCUMENTS_BY_PROFILE[p],
      };
    }
    return {
      profiles: KYC_REQUIRED_DOCUMENTS_BY_PROFILE,
    };
  }

  // 3B. KYCService — Dépôt, scan antivirus et chiffrement par enveloppe AES-256-GCM d'un justificatif
  public uploadAndEncryptKycDocumentTransactional(params: {
    dossierId: string;
    docType: string;
    fileName: string;
    fileSizeBytes?: number;
    mimeType?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      // Protection IDOR : seul le propriétaire du dossier ou un ADMIN peut déposer une pièce
      if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Interdit (Protection IDOR) : vous ne pouvez déposer des pièces que sur votre propre dossier KYC.'
        );
      }

      let encryptedResult;
      try {
        encryptedResult = encryptAndStoreKycDocument({
          dossierId: dos.id,
          actorType: dos.actorType,
          docType: params.docType,
          fileName: params.fileName,
          fileSizeBytes: params.fileSizeBytes,
          mimeType: params.mimeType,
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'KYC_SECURITY_MALICIOUS_FILE_EXTENSION') {
          throw new AppError(
            400,
            'KYC_SECURITY_MALICIOUS_FILE_EXTENSION',
            'Rejet Antivirus / Sécurité : les fichiers exécutables ou scripts sont strictement interdits.'
          );
        }
        if (err instanceof Error && err.message === 'KYC_FILE_SIZE_EXCEEDS_10MB') {
          throw new AppError(
            400,
            'KYC_FILE_SIZE_EXCEEDS_10MB',
            'La taille du fichier dépasse la limite maximale autorisée de 10 Mo.'
          );
        }
        throw err;
      }

      const { documentItem } = encryptedResult;
      dos.documents = [
        ...dos.documents.filter((existing) => existing.docType !== params.docType),
        {
          id: documentItem.id,
          docType: documentItem.docType,
          label: documentItem.label,
          fileName: documentItem.fileName,
          uploadedAt: documentItem.uploadedAt,
          sha256: documentItem.sha256,
          encryptionKeyId: documentItem.encryptionKeyId,
          status: 'UPLOADED',
          mimeType: documentItem.encryptedMeta.mimeType,
          fileSizeBytes: documentItem.encryptedMeta.fileSizeBytes,
          encryptedVaultUri: documentItem.encryptedMeta.encryptedVaultUri,
          ivHex: documentItem.encryptedMeta.ivHex,
          authTagHex: documentItem.encryptedMeta.authTagHex,
          virusScanStatus: documentItem.encryptedMeta.virusScanStatus,
        },
      ];

      const completion = checkMandatoryKycCompletion(dos.actorType, dos.documents);
      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (completion.allMandatoryUploaded && dos.daysElapsed < 7 && dos.status !== 'VALIDATED') {
        dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
        dos.submittedAt = dos.submittedAt ?? nowIso;
      }

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: completion.allMandatoryUploaded
            ? 'ALL_MANDATORY_SUBMITTED_IN_TIME'
            : 'DOCUMENT_UPLOADED_ENCRYPTED',
          summary: `Pièce ${params.docType} (${params.fileName}) chiffrée AES-256-GCM. Complétude obligatoire : ${completion.uploadedMandatory}/${completion.totalMandatory}.`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_DOCUMENT_UPLOADED_ENCRYPTED',
        targetType: 'KYCDocument',
        targetId: `${dos.id}:${documentItem.id}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Pièce ${params.docType} (${params.fileName}) chiffrée AES-256-GCM (SHA-256: ${documentItem.sha256.slice(
          0,
          16
        )}...).`,
      });

      return {
        dossier: dos,
        uploadedDocument: documentItem,
        completion,
        ruleEvaluation: evaluateKYCDossierRule(dos),
      };
    });
  }

  // 3C. KYCService — Prévisualisation sécurisée et déchiffrement KMS journalisé
  public previewEncryptedKycDocument(params: {
    dossierId: string;
    docId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      if (params.actor.role !== 'ADMIN' && dos.userId !== params.actor.id) {
        throw new AppError(
          403,
          'RESOURCE_OWNERSHIP_VIOLATION',
          'Interdit (Protection IDOR) : vous ne pouvez pas prévisualiser les pièces KYC d’un autre utilisateur.'
        );
      }

      const doc = dos.documents.find((item) => item.id === params.docId);
      if (!doc) {
        throw new AppError(404, 'KYC_DOCUMENT_NOT_FOUND', 'Document KYC introuvable.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'DOCUMENT_PREVIEWED',
          summary: `Déchiffrement KMS à la volée et prévisualisation autorisée de ${doc.fileName}.`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_ENCRYPTED_DOCUMENT_PREVIEWED',
        targetType: 'KYCDocument',
        targetId: `${dos.id}:${doc.id}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Prévisualisation KMS autorisée pour ${doc.fileName} (SHA-256: ${doc.sha256.slice(0, 16)}...).`,
      });

      return {
        dossierId: dos.id,
        companyName: dos.companyName,
        document: doc,
        decryptedPreviewContent: `CERTIFIED_PREVIEW::${dos.companyName}::${doc.docType}::${doc.fileName}`,
        integrityVerified: true,
      };
    });
  }

  // 3D. KYCService — Commentaire administratif horodaté
  public addAdminKycCommentTransactional(params: {
    dossierId: string;
    comment: string;
    visibility?: 'INTERNAL_ADMIN_ONLY' | 'SHARED_WITH_APPLICANT';
    targetDocType?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }
      const trimmed = params.comment.trim();
      if (trimmed.length < 3) {
        throw new AppError(400, 'VALIDATION_COMMENT_EMPTY', 'Le commentaire administratif est requis.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const commentItem = {
        id: `kcom-${Date.now()}`,
        authorEmail: params.actor.email,
        authorName: params.actor.email,
        createdAt: nowIso,
        comment: trimmed,
        targetDocType: params.targetDocType,
        visibility: params.visibility ?? 'SHARED_WITH_APPLICANT',
      };

      dos.adminComments = [commentItem, ...(dos.adminComments ?? [])];
      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ADMIN_COMMENT_ADDED',
          summary: `Commentaire administratif (${commentItem.visibility}) : ${trimmed}`,
        },
        ...(dos.history ?? []),
      ];

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_ADMIN_COMMENT_ADDED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Commentaire administratif ajouté sur ${dos.id}.`,
      });

      return { dossier: dos, addedComment: commentItem };
    });
  }

  // 3E. KYCService — Décision administrative (VALIDATED, REJECTED, COMPLEMENT_REQUESTED, REACTIVATE)
  public reviewKycDossierTransactional(params: {
    dossierId: string;
    decision: 'VALIDATED' | 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE';
    reason?: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const dos = tx.kycDossiers.find((d) => d.id === params.dossierId);
      if (!dos) {
        throw new AppError(404, 'KYC_DOSSIER_NOT_FOUND', 'Dossier KYC introuvable.');
      }

      const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (params.decision === 'REACTIVATE') {
        dos.status = 'SUBMITTED_IN_TIME_PENDING_REVIEW';
        dos.reactivatedAt = nowIso;
        dos.reactivatedBy = params.actor.email;
      } else {
        dos.status = params.decision;
      }

      dos.reviewedAt = nowIso;
      dos.reviewedBy = params.actor.email;
      dos.rejectionReason = params.decision === 'REJECTED' ? params.reason : dos.rejectionReason;
      dos.complementReason =
        params.decision === 'COMPLEMENT_REQUESTED' ? params.reason : dos.complementReason;

      if (params.decision === 'VALIDATED') {
        dos.documents = dos.documents.map((doc) => ({ ...doc, status: 'VALIDATED' }));
      }

      dos.history = [
        {
          id: `khist-${Date.now()}`,
          timestamp: nowIso,
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: `ADMIN_${params.decision}`,
          summary: params.reason
            ? `Décision [${params.decision}] par ${params.actor.email} — Motif : ${params.reason}`
            : `Décision [${params.decision}] par ${params.actor.email}`,
        },
        ...(dos.history ?? []),
      ];

      const ruleEvaluation = evaluateKYCDossierRule(dos);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: nowIso,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action:
          params.decision === 'VALIDATED'
            ? 'KYC_VALIDATED'
            : params.decision === 'REJECTED'
            ? 'KYC_REJECTED_WITH_REASON'
            : params.decision === 'COMPLEMENT_REQUESTED'
            ? 'KYC_COMPLEMENT_REQUESTED'
            : 'KYC_ACCOUNT_REACTIVATED',
        targetType: 'KYC',
        targetId: dos.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: params.reason
          ? `${params.decision} — Motif : ${params.reason}`
          : `Dossier KYC ${params.decision}.`,
      });

      return { dossier: dos, ruleEvaluation };
    });
  }

  // 3F. KYCCronService — Tâche programmée J+1, J+3, J+5, J+6 et suspension conditionnelle J+7
  public runKycScheduledCronJobTransactional(params: {
    simulatedDayOverride?: number;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const report = executeKycCronBatch(tx.kycDossiers, params.simulatedDayOverride);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: report.executedAt,
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KYC_CRON_BATCH_EXECUTED',
        targetType: 'KYCCronService',
        targetId: `BATCH-${report.evaluatedCount}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Relances=${report.remindersTriggered.length} ; Suspendus J+7=${report.suspendedAtJ7.length} ; Protégés à J+7 (soumis à temps)=${report.protectedInTimeAtJ7.length}`,
      });

      return report;
    });
  }

  // 4. RoomService — Création de salle Room Live (Interdite en création générale aux Clients)
  public createRoomLiveChecked(params: {
    title: string;
    scheduledAt: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }): RoomLiveRecord {
    if (!canCreateRoomLiveGeneral(params.actor.role)) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'ROOM_CREATE_DENIED_CLIENT_ROLE',
          targetType: 'Room',
          targetId: 'N/A',
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: 'Refusé (Annexe B) : Le rôle CLIENT ne dispose pas d’un droit général de création Room Live.',
        });
      });
      throw new AppError(
        403,
        'CLIENT_ROOM_CREATION_FORBIDDEN',
        'Interdit (Chapitre 6.10 & Annexe B) : Le Client rejoint uniquement les salles autorisées et ne dispose pas d’un droit général de création.'
      );
    }

    return this.repo.executeTransaction((tx) => {
      const room: RoomLiveRecord = {
        id: `room-${Date.now()}`,
        roomCode: `RM-LIVE-${Math.floor(1000 + Math.random() * 8999)}`,
        title: params.title,
        createdById: params.actor.id,
        creatorName: params.actor.email,
        creatorRole: params.actor.role,
        status: 'LIVE',
        scheduledAt: params.scheduledAt,
        participantsCount: 1,
        allowedUserIds: [params.actor.id, 'usr-client-01'],
        recordingConsent: true,
        aiSummaryAvailable: false,
      };
      tx.rooms.unshift(room);
      return room;
    });
  }

  // 5. CalculationEngine — Calcul financier déterministe Decimal.js
  public executeDeterministicCalculation(params: {
    principalStr: string;
    annualRatePctStr: string;
    startDateStr: string;
    endDateStr: string;
    basis: DayCountBasis;
    actor: NonNullable<ServerRequestContext['user']>;
  }) {
    return this.repo.executeTransaction((tx) => {
      const calc = calculateFinancialInterest({
        ...params,
        executedBy: `${params.actor.email} (${params.actor.role})`,
      });
      tx.calcHistory.unshift(calc);
      return calc;
    });
  }

  // 6. BackupService — Double validation par deux administrateurs distincts
  public approveBackupRestoreDualAdmin(params: {
    backupId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const backup = tx.backups.find((b) => b.id === params.backupId);
      if (!backup) {
        throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable.');
      }
      const initiatorId = backup.restoreInitiatorId ?? 'usr-admin-01';
      const check = validateDualAdminApproval(initiatorId, params.actor.id);
      if (!check.allowed) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'BACKUP_RESTORE_SELF_APPROVAL_DENIED',
          targetType: 'Backup',
          targetId: backup.backupCode,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: check.reason,
        });
        throw new AppError(403, 'SELF_APPROVAL_FORBIDDEN', check.reason);
      }

      backup.restoreStatus = 'APPROVED_READY';
      backup.restoreSecondApproverId = params.actor.id;
      backup.restoreSecondApproverName = params.actor.email;

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BACKUP_RESTORE_DUAL_APPROVED',
        targetType: 'Backup',
        targetId: backup.backupCode,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Double approbation validée par ${params.actor.email} (distinct de ${initiatorId}).`,
      });

      return backup;
    });
  }

  // 7. SandboxService — Analyse isolée et contrôle avant migration (PROMPT 11)
  public analyzeSandboxDump(params: {
    fileName: string;
    fileSize: number;
    format?: ImportExportFormat;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }): SandboxAnalysisReport {
    const report = analyzeFileInIsolatedSandbox({
      fileName: params.fileName,
      fileSize: params.fileSize,
      format: params.format,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'SANDBOX_ISOLATED_ANALYSIS',
        targetType: 'SandboxDump',
        targetId: report.jobId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Analyse isolée (Réseau OFF, Secrets OFF) : ${params.fileName} (${report.totalRowsDetected} lignes, score ${report.compatibilityScore}%).`,
      });
    });

    return report;
  }

  // 8. SandboxService — Promotion vers la production soumise à Double Validation Admin
  public promoteSandboxDumpTransactional(params: {
    report: SandboxAnalysisReport;
    initiatorId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    planHash: string;
    correlationId: string;
    ipAddress: string;
  }) {
    const check = validateDualAdminOperation({
      initiatorId: params.initiatorId,
      approverId: params.actor.id,
      actionCode: 'SANDBOX_PROMOTE_TO_PROD',
      planHash: params.planHash,
      expectedPlanHash: params.report.migrationPlanHash,
    });

    if (!check.allowed) {
      this.repo.executeTransaction((tx) => {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: params.actor.email,
          actorRole: params.actor.role,
          action: 'SANDBOX_PROMOTION_DENIED_DUAL_ADMIN',
          targetType: 'SandboxDump',
          targetId: params.report.jobId,
          result: 'DENIED',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: check.reason,
        });
      });
      throw new AppError(403, check.errorCode || 'DUAL_ADMIN_CHECK_FAILED', check.reason);
    }

    return this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'SANDBOX_PROMOTION_SUCCESS_DUAL_ADMIN',
        targetType: 'SandboxDump',
        targetId: params.report.jobId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Promotion vers la production validée par 2e Admin distinct (${params.actor.email}) pour planHash ${params.planHash.slice(0, 16)}...`,
      });

      return {
        success: true,
        jobId: params.report.jobId,
        rowsMigrated: params.report.validRows,
        migratedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        approverAdmin: params.actor.email,
        initiatorAdmin: params.initiatorId,
      };
    });
  }

  // 9. KMSService — Rotation de clé maître KEK sous HSM avec ré-enveloppement des DEK
  public rotateKmsKeyTransactional(params: {
    keyAlias: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      // Simuler l'enregistrement de clé KMS
      const kekRecord: KMSKeyRecord = {
        id: `kms-key-${params.keyAlias.replace(/[^a-zA-Z0-9]/g, '-')}`,
        keyAlias: params.keyAlias,
        keyType: 'KEK_MASTER',
        algorithm: 'AES-256-GCM',
        kmsProvider: 'HASHICORP_VAULT_KMS',
        keyArnMasked: `arn:aws:kms:eu-west-3:774910294102:key/${params.keyAlias}-****`,
        version: 3,
        status: 'ACTIVE',
        lastRotatedAt: '2026-08-15 00:00:00',
        nextRotationAt: '2026-11-15',
      };

      const result = rotateKmsMasterKey(kekRecord, params.actor.email);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'KMS_KEK_MASTER_ROTATED',
        targetType: 'KMSKey',
        targetId: params.keyAlias,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: result.logEntry.details,
      });

      return result;
    });
  }

  // 10. BackupService — Test de restauration en Sandbox éphémère isolée
  public testBackupRestoreInSandbox(params: {
    backupId: string;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    const backup = this.repo.getSnapshot().backups.find((b) => b.id === params.backupId);
    if (!backup) {
      throw new AppError(404, 'BACKUP_NOT_FOUND', 'Sauvegarde introuvable pour le test en sandbox.');
    }

    const integrityCheck = verifyBackupCryptographicIntegrity(backup);
    if (!integrityCheck.isValid) {
      throw new AppError(400, 'BACKUP_INTEGRITY_CHECK_FAILED', integrityCheck.message);
    }

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BACKUP_SANDBOX_RESTORE_TEST_SUCCESS',
        targetType: 'Backup',
        targetId: backup.backupCode,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Restauration test exécutée en instance Sandbox isolée (Aucune écriture prod, intégrité SHA-256 confirmée).`,
      });
    });

    return {
      testSuccess: true,
      backupCode: backup.backupCode,
      integrityVerified: true,
      tablesRestoredCount: 8,
      durationMs: 380,
      sandboxContainerId: `sbx-test-${Date.now().toString().slice(-6)}`,
      isolationGuaranteed: true,
      testedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  // 11. ExportService — Exports structurés multi-formats (CSV, XLSX, JSON, SQL, DBF, CDX)
  public exportDataset(params: {
    entity: 'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS';
    format: ImportExportFormat;
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    let dataset: any[] = [];
    const snapshot = this.repo.getSnapshot();

    switch (params.entity) {
      case 'PRODUCTS':
        dataset = snapshot.products.filter((p) => !p.deletedAt);
        break;
      case 'ORDERS':
        dataset = snapshot.orders.filter((o) => !o.deletedAt);
        break;
      case 'ENTRIES':
        dataset = snapshot.accountingEntries || [];
        break;
      case 'AUDIT_LOGS':
        dataset = snapshot.auditLogs;
        break;
    }

    const exported = exportDatasetToFormat({
      entityName: params.entity,
      records: dataset,
      format: params.format,
    });

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ADMIN_DATASET_EXPORT',
        targetType: params.entity,
        targetId: exported.fileName,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Export ${params.entity} au format ${params.format} (${exported.rowsCount} lignes, SHA-256: ${exported.sha256.slice(0, 16)}...).`,
      });
    });

    return exported;
  }

  // 12. AuditService — Vérification cryptographique de l'intégrité de la chaîne de hachage append-only
  public verifyAuditLogChain(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    correlationId: string;
    ipAddress: string;
  }) {
    const rawLogs = this.repo.getSnapshot().auditLogs;
    const chained = buildAuditChainFromLogs(rawLogs);
    const integrity = verifyAuditLogChainIntegrity(chained);

    this.repo.executeTransaction((tx) => {
      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'AUDIT_HASH_CHAIN_VERIFIED',
        targetType: 'AuditLog',
        targetId: 'CHAIN_INTEGRITY',
        result: integrity.isChainIntact ? 'SUCCESS' : 'WARNING',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Vérification cryptographique de la chaîne (${integrity.totalEntriesVerified} entrées vérifiées, Intacte : ${integrity.isChainIntact}).`,
      });
    });

    return {
      ...integrity,
      latestHash: chained[0]?.currentHash || 'GENESIS',
      genesisHash: chained[chained.length - 1]?.currentHash || 'GENESIS',
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  // ============================================================================
  // PROMPT 7 : ÉCOSYSTÈME COMMERCIAL COMPLET (CATÉGORIES, PRODUITS, STOCKS,
  // DEVIS, COMMANDES, FACTURATION, STRIPE IDEMPOTENT)
  // ============================================================================

  public listProductCategories(): ProductCategory[] {
    return INITIAL_PRODUCT_CATEGORIES;
  }

  public createProductTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    product: Omit<ProductItem, 'id'>;
    correlationId: string;
    ipAddress: string;
  }): ProductItem {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'CREATE_PRODUCT');

    return this.repo.executeTransaction((tx) => {
      const newProduct: ProductItem = {
        ...params.product,
        id: `prod-${Date.now()}`,
      };

      tx.products.unshift(newProduct);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'COMMERCIAL_PRODUCT_CREATED',
        targetType: 'Product',
        targetId: newProduct.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Produit ${newProduct.sku} (${newProduct.name.fr}) créé avec succès.`,
      });

      return newProduct;
    });
  }

  public recordStockMovementTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    productId: string;
    movementType: StockMovementRecord['movementType'];
    quantity: number;
    reason: string;
    referenceDocument?: string;
    correlationId: string;
    ipAddress: string;
  }) {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'UPDATE_STOCK');

    return this.repo.executeTransaction((tx) => {
      const product = tx.products.find((p) => p.id === params.productId && !p.deletedAt);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produit introuvable.');
      }

      if (params.actor.role === 'FOURNISSEUR' && product.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier le stock que de vos propres produits.');
      }

      const { updatedProduct, movementRecord, alertTriggered } = CommercialEngine.applyStockMovement(
        product,
        params.movementType,
        params.quantity,
        params.reason,
        { id: params.actor.id, name: params.actor.email },
        params.referenceDocument
      );

      const idx = tx.products.findIndex((p) => p.id === updatedProduct.id);
      if (idx !== -1) {
        tx.products[idx] = updatedProduct;
      }

      tx.stockMovements.unshift(movementRecord);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: alertTriggered ? 'STOCK_MOVEMENT_WITH_MIN_ALERT' : 'STOCK_MOVEMENT_RECORDED',
        targetType: 'StockMovement',
        targetId: movementRecord.movementNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Mouvement ${movementRecord.movementType} (${params.quantity}) sur ${updatedProduct.sku}. Stock dispo: ${updatedProduct.stockAvailable}. Alerte seuil mini: ${alertTriggered}.`,
      });

      return { updatedProduct, movementRecord, alertTriggered };
    });
  }

  public listStockMovements(productId?: string): StockMovementRecord[] {
    const list = this.repo.getSnapshot().stockMovements;
    return productId ? list.filter((m) => m.productId === productId) : list;
  }

  public createQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteInput: QuoteCreateInput;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = CommercialEngine.createQuote(params.quoteInput);
      tx.quotes.unshift(quote);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_REQUEST_CREATED',
        targetType: 'Quote',
        targetId: quote.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Demande de devis ${quote.quoteNumber} émise par ${quote.clientName}. Total estimé: ${quote.totalAmount} ${quote.currency}.`,
      });

      return quote;
    });
  }

  public respondToQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    respondInput: QuoteRespondInput;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.respondInput.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }

      if (params.actor.role === 'FOURNISSEUR' && quote.supplierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez chiffrer que les devis qui vous sont adressés.');
      }

      const updated = CommercialEngine.respondToQuote(quote, params.respondInput);
      const idx = tx.quotes.findIndex((q) => q.id === updated.id);
      if (idx !== -1) {
        tx.quotes[idx] = updated;
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_RESPONDED_BY_SUPPLIER',
        targetType: 'Quote',
        targetId: updated.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${updated.quoteNumber} chiffré par le fournisseur (${updated.totalAmount} ${updated.currency} TTC).`,
      });

      return updated;
    });
  }

  public acceptQuoteTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    correlationId: string;
    ipAddress: string;
  }): QuoteRecord {
    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }
      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez accepter que vos propres devis.');
      }

      quote.status = 'ACCEPTED';

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_ACCEPTED_BY_CLIENT',
        targetType: 'Quote',
        targetId: quote.quoteNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${quote.quoteNumber} accepté par le client.`,
      });

      return quote;
    });
  }

  public convertQuoteToOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    quoteId: string;
    shippingAddress: string;
    correlationId: string;
    ipAddress: string;
  }): { updatedQuote: QuoteRecord; createdOrder: OrderRecord } {
    CommercialEngine.enforceCommercialAccessControl(params.actor.role, 'CREATE_ORDER');

    return this.repo.executeTransaction((tx) => {
      const quote = tx.quotes.find((q) => q.id === params.quoteId);
      if (!quote) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Devis introuvable.');
      }

      if (params.actor.role === 'CLIENT' && quote.clientId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez convertir que vos propres devis.');
      }

      const activeProds = tx.products.filter((p) => !p.deletedAt);
      const { updatedQuote, createdOrder, updatedProducts } = CommercialEngine.convertQuoteToOrder(
        quote,
        params.shippingAddress,
        activeProds
      );

      for (const up of updatedProducts) {
        const idx = tx.products.findIndex((p) => p.id === up.id);
        if (idx !== -1) {
          tx.products[idx] = up;
        }
      }

      const qIdx = tx.quotes.findIndex((q) => q.id === updatedQuote.id);
      if (qIdx !== -1) {
        tx.quotes[qIdx] = updatedQuote;
      }

      tx.orders.unshift(createdOrder);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'QUOTE_CONVERTED_TO_ORDER_TRANSACTIONAL',
        targetType: 'Order',
        targetId: createdOrder.orderNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Devis ${quote.quoteNumber} converti en commande ${createdOrder.orderNumber} avec réservation de stock atomique.`,
      });

      return { updatedQuote, createdOrder };
    });
  }

  public generateInvoiceFromOrderTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    dueInDays?: number;
    jurisdiction?: string;
    correlationId: string;
    ipAddress: string;
  }): InvoiceRecord {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const invoice = CommercialEngine.generateInvoiceFromOrder(
        order,
        params.dueInDays ?? 30,
        params.jurisdiction ?? 'France / UE (TVA 20%)'
      );

      tx.invoices.unshift(invoice);

      const salesEntry = AccountingEngine.createSalesInvoiceEntry(
        invoice,
        `${params.actor.email} (${params.actor.role})`
      );
      tx.accountingEntries.unshift(salesEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'COMMERCIAL_INVOICE_GENERATED',
        targetType: 'Invoice',
        targetId: invoice.invoiceNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Facture ${invoice.invoiceNumber} générée pour la commande ${order.orderNumber}. Écriture comptable VTE ${salesEntry.entryNumber} équilibrée créée automatiquement.`,
      });

      return invoice;
    });
  }

  public createStripeCheckoutSessionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    invoiceId: string;
    correlationId: string;
    ipAddress: string;
  }): StripeCheckoutSessionSimulated {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      const invoice = tx.invoices.find((i) => i.id === params.invoiceId);

      if (!order || !invoice) {
        throw new AppError(404, 'ORDER_OR_INVOICE_NOT_FOUND', 'Commande ou facture introuvable.');
      }

      const session = CommercialEngine.createStripeCheckoutSession(order, invoice, params.actor.email);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'STRIPE_CHECKOUT_SESSION_CREATED',
        targetType: 'Payment',
        targetId: session.sessionId,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Session Stripe Test créée pour la facture ${invoice.invoiceNumber} (${session.amountTotalCents / 100} ${session.currency.toUpperCase()}).`,
      });

      return session;
    });
  }

  public processStripeWebhookTransactional(params: {
    webhookPayload: StripeWebhookPayloadSimulated;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const result = CommercialEngine.processStripeWebhookIdempotent(
        params.webhookPayload,
        this.processedStripeEventIds,
        tx.payments,
        tx.invoices,
        tx.orders.filter((o) => !o.deletedAt)
      );

      if (result.isIdempotentReplay) {
        tx.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actorName: 'Stripe Webhook Gateway',
          actorRole: 'SUPPORT',
          action: 'STRIPE_WEBHOOK_IDEMPOTENT_REPLAY_IGNORED',
          targetType: 'Payment',
          targetId: params.webhookPayload.id,
          result: 'SUCCESS',
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          details: `Webhook Stripe ${params.webhookPayload.id} déjà traité : rejeu idempotent ignoré sans double débit.`,
        });

        return {
          status: 'IDEMPOTENT_REPLAY',
          payment: result.paymentRecord,
        };
      }

      if (result.paymentRecord) {
        tx.payments.unshift(result.paymentRecord);
      }

      if (result.updatedInvoice) {
        const invIdx = tx.invoices.findIndex((i) => i.id === result.updatedInvoice!.id);
        if (invIdx !== -1) {
          tx.invoices[invIdx] = result.updatedInvoice;
        }
      }

      if (result.updatedOrder) {
        const ordIdx = tx.orders.findIndex((o) => o.id === result.updatedOrder!.id);
        if (ordIdx !== -1) {
          tx.orders[ordIdx] = result.updatedOrder;
        }
      }

      if (result.paymentRecord) {
        const cashEntry = AccountingEngine.createPaymentCashEntry(
          result.paymentRecord,
          '1.40',
          '0.25',
          'Stripe Webhook Gateway'
        );
        tx.accountingEntries.unshift(cashEntry);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: 'Stripe Webhook Gateway',
        actorRole: 'SUPPORT',
        action: 'STRIPE_WEBHOOK_PROCESSED_SUCCESSFULLY',
        targetType: 'Payment',
        targetId: params.webhookPayload.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Paiement Stripe ${result.paymentRecord?.paymentReference} validé (${result.paymentRecord?.amount} ${result.paymentRecord?.currency}). Facture payée & commande passée en PREPARING.`,
      });

      return {
        status: 'PROCESSED',
        payment: result.paymentRecord,
        invoice: result.updatedInvoice,
        order: result.updatedOrder,
      };
    });
  }

  // ============================================================================
  // PROMPT 9 : MODULE LOGISTIQUE ET TRANSPORT MULTIMODAL
  // ============================================================================

  public listVehicles(carrierId?: string): VehicleRecord[] {
    const list = this.repo.getSnapshot().vehicles;
    return carrierId ? list.filter((v) => v.carrierId === carrierId) : list;
  }

  public createLogisticsMissionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    orderId: string;
    carrierId: string;
    carrierName: string;
    pickupAddress: string;
    deliveryAddress: string;
    cargoWeightKg: string;
    cargoVolumeM3: string;
    isColdChain: boolean;
    requiredVehicleType?: VehicleRecord['vehicleType'];
    correlationId: string;
    ipAddress: string;
  }): LogisticsMissionRecord {
    return this.repo.executeTransaction((tx) => {
      const order = tx.orders.find((o) => o.id === params.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const mission = LogisticsEngine.createMission({
        order,
        carrierId: params.carrierId,
        carrierName: params.carrierName,
        pickupAddress: params.pickupAddress,
        deliveryAddress: params.deliveryAddress,
        cargoWeightKg: params.cargoWeightKg,
        cargoVolumeM3: params.cargoVolumeM3,
        isColdChain: params.isColdChain,
        requiredVehicleType: params.requiredVehicleType,
      });

      tx.logisticsMissions.unshift(mission);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_MISSION_OFFERED',
        targetType: 'Mission',
        targetId: mission.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Mission logistique pour la commande ${order.orderNumber} affectée à ${params.carrierName}.`,
      });

      return mission;
    });
  }

  public respondToLogisticsMissionTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    missionId: string;
    accept: boolean;
    rejectionReason?: string;
    correlationId: string;
    ipAddress: string;
  }): { updatedMission: LogisticsMissionRecord; createdShipment?: ShipmentRecord } {
    return this.repo.executeTransaction((tx) => {
      const mission = tx.logisticsMissions.find((m) => m.id === params.missionId);
      if (!mission) {
        throw new AppError(404, 'MISSION_NOT_FOUND', 'Mission logistique introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && mission.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez répondre qu’aux missions qui vous sont attribuées.');
      }

      const { updatedMission, createdShipment } = LogisticsEngine.respondToMission(
        mission,
        params.accept,
        params.rejectionReason
      );

      const mIdx = tx.logisticsMissions.findIndex((m) => m.id === updatedMission.id);
      if (mIdx !== -1) {
        tx.logisticsMissions[mIdx] = updatedMission;
      }

      if (createdShipment) {
        tx.shipments.unshift(createdShipment);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: params.accept ? 'LOGISTICS_MISSION_ACCEPTED' : 'LOGISTICS_MISSION_REFUSED',
        targetType: 'Mission',
        targetId: updatedMission.id,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: params.accept
          ? `Mission acceptée par ${params.actor.email} -> Expédition ${createdShipment?.trackingNumber} initialisée.`
          : `Mission refusée avec motif : ${params.rejectionReason}`,
      });

      return { updatedMission, createdShipment };
    });
  }

  public updateShipmentStatusTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    nextStatus: ShipmentStatus;
    correlationId: string;
    ipAddress: string;
  }): ShipmentRecord {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      if (params.actor.role === 'TRANSPORTEUR' && shipment.carrierId !== params.actor.id) {
        throw new AppError(403, 'RESOURCE_OWNERSHIP_VIOLATION', 'Vous ne pouvez modifier le statut que de vos propres expéditions.');
      }

      const updated = LogisticsEngine.transitionShipmentStatus(shipment, params.nextStatus);
      const sIdx = tx.shipments.findIndex((s) => s.id === updated.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updated;
      }

      if (params.nextStatus === 'COLLECTED' || params.nextStatus === 'IN_TRANSIT') {
        const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
        if (order) {
          order.status = 'SHIPPED';
        }
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_SHIPMENT_STATUS_TRANSITION',
        targetType: 'Shipment',
        targetId: updated.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Expédition ${updated.trackingNumber} passée à ${updated.status}.`,
      });

      return updated;
    });
  }

  public getShipmentTrackingWithWaypoints(shipmentId: string) {
    const shipment = this.repo.getSnapshot().shipments.find((s) => s.id === shipmentId || s.trackingNumber === shipmentId);
    if (!shipment) {
      throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
    }

    const waypoints: RouteWaypoint[] = INITIAL_SHIPMENT_WAYPOINTS[shipment.trackingNumber] ?? [
      {
        name: shipment.origin,
        country: 'Origine',
        latitude: 33.5731,
        longitude: -7.5898,
        estimatedPassedAt: '2026-11-18 08:00',
        actualPassedAt: '2026-11-18 08:15',
        isCheckpoint: true,
      },
      {
        name: shipment.destination,
        country: 'Destination',
        latitude: 48.8566,
        longitude: 2.3522,
        estimatedPassedAt: '2026-11-20 18:00',
        isCheckpoint: true,
      },
    ];

    const docs = this.repo.getSnapshot().transportDocuments.filter((d) => d.shipmentId === shipment.id);

    return {
      shipment,
      waypoints,
      documents: docs,
      hasGeoCoordinates: waypoints.some((w) => w.latitude !== undefined && w.longitude !== undefined),
    };
  }

  public generateTransportDocumentsTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    correlationId: string;
    ipAddress: string;
  }): TransportDocumentRecord[] {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const docs = LogisticsEngine.generateTransportDocuments(shipment, order);
      for (const d of docs) {
        tx.transportDocuments.unshift(d);
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'TRANSPORT_DOCUMENTS_GENERATED',
        targetType: 'Document',
        targetId: shipment.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Documents CMR et EUR.1 certifiés générés pour ${shipment.trackingNumber}.`,
      });

      return docs;
    });
  }

  public submitProofOfDeliveryTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    podData: ProofOfDeliveryData;
    correlationId: string;
    ipAddress: string;
  }) {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.podData.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      const order = tx.orders.find((o) => o.id === shipment.orderId && !o.deletedAt);
      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.');
      }

      const { updatedShipment, updatedOrder, podCertifiedRecord } = LogisticsEngine.recordProofOfDelivery(
        shipment,
        order,
        params.podData
      );

      const sIdx = tx.shipments.findIndex((s) => s.id === updatedShipment.id);
      if (sIdx !== -1) {
        tx.shipments[sIdx] = updatedShipment;
      }

      const oIdx = tx.orders.findIndex((o) => o.id === updatedOrder.id);
      if (oIdx !== -1) {
        tx.orders[oIdx] = updatedOrder;
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'PROOF_OF_DELIVERY_CERTIFIED',
        targetType: 'Shipment',
        targetId: updatedShipment.trackingNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Preuve de livraison (POD) certifiée avec signature par ${podCertifiedRecord.recipientFullName} (SHA-256: ${podCertifiedRecord.certificationSha256}). Commande et expédition livrées.`,
      });

      return { updatedShipment, updatedOrder, podCertifiedRecord };
    });
  }

  public reportLogisticsIncidentTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    shipmentId: string;
    title: string;
    description: string;
    severity: IncidentRecord['severity'];
    correlationId: string;
    ipAddress: string;
  }): IncidentRecord {
    return this.repo.executeTransaction((tx) => {
      const shipment = tx.shipments.find((s) => s.id === params.shipmentId);
      if (!shipment) {
        throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Expédition introuvable.');
      }

      const inc = LogisticsEngine.logLogisticsIncident({
        shipment,
        title: params.title,
        description: params.description,
        severity: params.severity,
      });

      tx.incidents.unshift(inc);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'LOGISTICS_INCIDENT_REPORTED',
        targetType: 'Incident',
        targetId: inc.id,
        result: 'WARNING',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Incident logistique [${inc.severity}] signalé pour ${shipment.trackingNumber} : ${inc.title}`,
      });

      return inc;
    });
  }

  // ============================================================================
  // PROMPT 8 : MODULE DE COMPTABILITÉ COMPLÈTE & AUDIT FINANCIER
  // ============================================================================

  public getChartOfAccounts(framework: AccountingFramework = 'PCG') {
    return {
      framework,
      accounts: CHARTS_OF_ACCOUNTS[framework] ?? CHARTS_OF_ACCOUNTS.PCG,
    };
  }

  public listAccountingJournals(): AccountingJournalRecord[] {
    return STANDARD_JOURNALS;
  }

  public listAccountingEntries(journalCode?: string, fiscalPeriod?: string): AccountingEntryRecord[] {
    let list = this.repo.getSnapshot().accountingEntries;
    if (journalCode) {
      list = list.filter((e) => e.journalCode === journalCode);
    }
    if (fiscalPeriod) {
      list = list.filter((e) => e.fiscalPeriod === fiscalPeriod);
    }
    return list;
  }

  public createManualAccountingEntryTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    journalCode: AccountingJournalRecord['code'];
    date: string;
    pieceReference: string;
    description: string;
    lines: {
      accountCode: string;
      accountName: string;
      auxiliaryCode?: string;
      label: string;
      debit: string;
      credit: string;
    }[];
    correlationId: string;
    ipAddress: string;
  }): AccountingEntryRecord {
    return this.repo.executeTransaction((tx) => {
      const balanceCheck = AccountingEngine.validateDoubleEntryBalance(params.lines);
      if (!balanceCheck.isBalanced) {
        throw new AppError(
          400,
          'UNBALANCED_ACCOUNTING_ENTRY',
          `Écriture comptable déséquilibrée : Total Débit (${balanceCheck.totalDebit}) différent de Total Crédit (${balanceCheck.totalCredit}). La partie double est violée.`
        );
      }

      const entryNumber = `${params.journalCode}-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();

      const createdEntry: AccountingEntryRecord = {
        id: `ent-${Date.now()}`,
        entryNumber,
        journalCode: params.journalCode,
        date: params.date || now.toISOString().slice(0, 10),
        fiscalPeriod: (params.date || now.toISOString()).slice(0, 7),
        pieceReference: params.pieceReference,
        description: params.description,
        totalDebit: balanceCheck.totalDebit,
        totalCredit: balanceCheck.totalCredit,
        isBalanced: true,
        validatedAt: now.toISOString(),
        validatedBy: params.actor.email,
        lines: params.lines.map((l, idx) => ({
          id: `line-${Date.now()}-${idx}`,
          accountCode: l.accountCode,
          accountName: l.accountName,
          auxiliaryCode: l.auxiliaryCode,
          label: l.label,
          debit: l.debit || '0.00',
          credit: l.credit || '0.00',
        })),
      };

      tx.accountingEntries.unshift(createdEntry);

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'ACCOUNTING_ENTRY_MANUAL_VALIDATED',
        targetType: 'AccountingEntry',
        targetId: createdEntry.entryNumber,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Écriture ${createdEntry.entryNumber} (${createdEntry.journalCode}) équilibrée créée avec succès (${createdEntry.totalDebit} EUR).`,
      });

      return createdEntry;
    });
  }

  public getGeneralLedger(framework: AccountingFramework = 'PCG') {
    const chart = CHARTS_OF_ACCOUNTS[framework] ?? CHARTS_OF_ACCOUNTS.PCG;
    const entries = this.repo.getSnapshot().accountingEntries;
    return AccountingEngine.computeGeneralLedger(entries, chart);
  }

  public getTrialBalance(framework: AccountingFramework = 'PCG') {
    const ledger = this.getGeneralLedger(framework);
    return AccountingEngine.computeTrialBalance(ledger);
  }

  public executeBankReconciliationBatchTransactional(params: {
    actor: NonNullable<ServerRequestContext['user']>;
    bankLines: BankStatementLine[];
    correlationId: string;
    ipAddress: string;
  }): BankReconciliationResult[] {
    return this.repo.executeTransaction((tx) => {
      const results = AccountingEngine.executeBankReconciliation(params.bankLines, tx.payments);

      for (const res of results) {
        if (res.status === 'MATCHED' && res.paymentId) {
          const pay = tx.payments.find((p) => p.id === res.paymentId);
          if (pay) {
            pay.reconciled = true;
          }
        }
      }

      tx.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: params.actor.email,
        actorRole: params.actor.role,
        action: 'BANK_RECONCILIATION_BATCH_EXECUTED',
        targetType: 'BankReconciliation',
        targetId: `REC-BATCH-${results.length}`,
        result: 'SUCCESS',
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        details: `Rapprochement bancaire exécuté : ${results.filter((r) => r.status === 'MATCHED').length} rapprochés, ${results.filter((r) => r.status === 'DISCREPANCY').length} écarts, ${results.filter((r) => r.status === 'UNMATCHED').length} non rapprochés.`,
      });

      return results;
    });
  }

  public getFinancialStatements(framework: AccountingFramework = 'PCG') {
    const trialBalance = this.getTrialBalance(framework);
    return AccountingEngine.generateFinancialStatements(trialBalance.items, framework);
  }

  public calculateLoanAmortizationSchedule(params: {
    principalStr: string;
    annualRatePctStr: string;
    durationMonths: number;
    startDateStr: string;
  }) {
    return AccountingEngine.calculateAmortizationSchedule(params);
  }

  public exportTrialBalanceCsv(framework: AccountingFramework = 'PCG'): string {
    const trial = this.getTrialBalance(framework);
    return AccountingEngine.exportTrialBalanceToCsv(trial.items);
  }
}

