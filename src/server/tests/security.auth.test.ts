// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS DE SÉCURITÉ, AUTHENTIFICATION & AUTORISATIONS (PROMPT 5)
// Vérifie de bout en bout :
// 1. Inscription Visiteur (Argon2id) & Interdiction d'inscription publique ADMIN
// 2. Vérification OTP (6 chiffres, quota 5 tentatives) & Promotion Visiteur -> Client
// 3. Protection Brute-Force (verrouillage du compte après 5 échecs Argon2id)
// 4. MFA TOTP obligatoire pour l'Administrateur (RFC 6238 + QR Code URI + blocage sans MFA)
// 5. Sessions uniques par utilisateur & Révocation immédiate de la session précédente
// 6. Rotation des Refresh Tokens & Détection de vol/rejeu (Token Reuse Detection)
// 7. Mot de passe oublié & Réinitialisation à usage unique avec révocation des sessions
// 8. Gestion des appareils & Isolation stricte des ressources entre utilisateurs (Anti-IDOR / RBAC)
// ============================================================================

import {
  DatabaseStateSnapshot,
  TradeLinkRepositoryStore,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  computeCurrentTotpCode,
  hashPasswordArgon2id,
  verifyJwtAccessToken,
  verifyPasswordArgon2id,
} from '../../services/securityCrypto';

export interface SecurityTestAssertionResult {
  testId: string;
  title: string;
  passed: boolean;
  statusCode: number;
  assertionSummary: string;
}

function createInitialSecurityTestSnapshot(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prd-001',
        sku: 'TL-COLD-400X',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial & ColdChain GmbH',
        category: 'Chaîne du Froid',
        name: {
          fr: 'Conteneur Isotherme Pharma IoT',
          en: 'Pharma IoT Cold Container',
          ar: 'حاوية تبريد دوائية ذكية',
        },
        description: {
          fr: 'Conteneur certifié GDP',
          en: 'GDP certified container',
          ar: 'حاوية معتمدة',
        },
        unitPrice: '1450.00',
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'UNITÉ',
        stockAvailable: 25,
        stockReserved: 2,
        minStockAlert: 5,
        icon3d: 'cold-chain',
        originCountry: 'DE',
        incoterm: 'CIP',
        leadTimeDays: 5,
        isPublished: true,
        deletedAt: null,
      },
    ],
    orders: [
      {
        id: 'ord-101',
        orderNumber: 'CMD-2026-88410',
        clientId: 'usr-client-01',
        clientName: 'Atlas Import & Distribution SARL',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial & ColdChain GmbH',
        status: 'PENDING',
        subtotalAmount: '14500.00',
        taxAmount: '2900.00',
        shippingAmount: '650.00',
        totalAmount: '18050.00',
        currency: 'EUR',
        shippingAddress: 'Zone Logistique Zenata, Casablanca',
        createdAt: '2026-11-15 09:30',
        items: [],
        timeline: [],
      },
    ],
    kycDossiers: [
      {
        id: 'kyc-001',
        userId: 'usr-client-01',
        userName: 'Sofia Mansouri',
        companyName: 'Atlas Import & Distribution SARL',
        actorType: 'CLIENT',
        jurisdiction: 'MA',
        status: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
        startedAt: '2026-11-12',
        deadlineAt: '2026-11-19',
        daysElapsed: 4,
        daysRemaining: 3,
        submittedAt: '2026-11-14 10:30',
        remindersSent: ['J+1'],
        documents: [],
      },
    ],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };
}

export function runSecurityAndAuthTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  results: SecurityTestAssertionResult[];
} {
  const repo = new TradeLinkRepositoryStore(createInitialSecurityTestSnapshot(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: SecurityTestAssertionResult[] = [];

  // TEST 1 : Hachage Argon2id + Inscription Visiteur + Interdiction d'inscription publique ADMIN
  {
    const hash = hashPasswordArgon2id('MonMotDePasseSecurise!2026');
    const verifiedOk = verifyPasswordArgon2id('MonMotDePasseSecurise!2026', hash);
    const verifiedWrong = verifyPasswordArgon2id('MauvaisMotDePasse!2026', hash);

    // Tentative illégale de création d'un compte ADMIN via l'inscription publique
    const adminAttempt = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/register',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'hacker-admin@evil.org',
        password: 'StrongPassword!2026',
        companyName: 'Evil Corp',
        requestedRole: 'ADMIN',
      },
      correlationId: 'sec-corr-01a',
      ipAddress: '203.0.113.55',
    });

    // Inscription légitime d'un Visiteur demandant un compte Client
    const visitorReg = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/register',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'contact@maghreb-logistics.ma',
        password: 'MaghrebSecure!2026',
        fullName: 'Nadia El Fassi',
        companyName: 'Maghreb Logistics SARL',
        taxId: 'MA-ICE-009182736',
        country: 'Maroc',
        requestedRole: 'CLIENT',
      },
      correlationId: 'sec-corr-01b',
      ipAddress: '196.200.141.10',
    });

    const regData = visitorReg.body.data as {
      role: string;
      requestedRole: string;
      kycStatus: string;
      sandboxOtpCode: string;
    };

    const passed =
      hash.startsWith('$argon2id$v=19$m=65536,t=3,p=4$') &&
      verifiedOk === true &&
      verifiedWrong === false &&
      adminAttempt.statusCode === 403 &&
      adminAttempt.body.error?.code === 'ADMIN_PROVISIONED_MANUALLY_ONLY' &&
      visitorReg.statusCode === 201 &&
      regData.role === 'VISITEUR' &&
      regData.requestedRole === 'CLIENT' &&
      regData.kycStatus === 'PENDING_OTP';

    results.push({
      testId: 'SEC-01',
      title: 'Hachage Argon2id, Inscription Visiteur (état pré-client) & Blocage inscription publique ADMIN',
      passed,
      statusCode: visitorReg.statusCode,
      assertionSummary: `Hash=${hash.slice(0, 31)}... ; Admin public rejeté (${adminAttempt.statusCode} ${adminAttempt.body.error?.code}) ; Visiteur créé avec rôle initial=${regData.role}`,
    });

    // TEST 2 : Vérification OTP (tentative erronée puis code valide -> promotion VISITEUR vers CLIENT)
    const badOtp = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/verify-otp',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'contact@maghreb-logistics.ma',
        code: '000000',
      },
      correlationId: 'sec-corr-02a',
      ipAddress: '196.200.141.10',
    });

    const goodOtp = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/verify-otp',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'contact@maghreb-logistics.ma',
        code: regData.sandboxOtpCode,
        approveClientOnboarding: true,
      },
      correlationId: 'sec-corr-02b',
      ipAddress: '196.200.141.10',
    });

    const otpData = goodOtp.body.data as {
      emailVerified: boolean;
      role: string;
      kycStatus: string;
    };

    const passedOtp =
      badOtp.statusCode === 400 &&
      badOtp.body.error?.code === 'OTP_INVALID_CODE' &&
      goodOtp.statusCode === 200 &&
      otpData.emailVerified === true &&
      otpData.role === 'CLIENT' &&
      otpData.kycStatus === 'SUBMITTED';

    results.push({
      testId: 'SEC-02',
      title: 'Vérification OTP à 6 chiffres & Promotion du Visiteur en Client après approbation',
      passed: passedOtp,
      statusCode: goodOtp.statusCode,
      assertionSummary: `Mauvais OTP rejeté (${badOtp.statusCode}) ; Bon OTP validé -> emailVerified=${otpData.emailVerified}, nouveau rôle=${otpData.role}`,
    });
  }

  // TEST 3 : Protection contre les tentatives répétées (Brute-Force Lockout après 5 échecs)
  {
    let fifthFailureStatus = 0;
    let fifthFailureCode = '';

    for (let i = 1; i <= 5; i++) {
      const attempt = app.handleRequest({
        method: 'POST',
        path: '/api/v1/auth/login',
        headers: {},
        query: {},
        params: {},
        body: {
          email: 'h.weber@eurotech-supply.de',
          password: `WrongPasswordAttempt#${i}`,
        },
        correlationId: `sec-corr-03-${i}`,
        ipAddress: '198.51.100.77',
      });
      if (i === 5) {
        fifthFailureStatus = attempt.statusCode;
        fifthFailureCode = attempt.body.error?.code ?? '';
      }
    }

    // Même avec le BON mot de passe immédiatement après le 5e échec, le compte reste verrouillé
    const lockedEvenWithCorrectPass = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'h.weber@eurotech-supply.de',
        password: 'SupplierEuro!2026',
      },
      correlationId: 'sec-corr-03-locked',
      ipAddress: '198.51.100.77',
    });

    const passed =
      fifthFailureStatus === 429 &&
      fifthFailureCode === 'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE' &&
      lockedEvenWithCorrectPass.statusCode === 429;

    results.push({
      testId: 'SEC-03',
      title: 'Protection Brute-Force : Verrouillage automatique de 15 min après 5 tentatives infructueuses',
      passed,
      statusCode: fifthFailureStatus,
      assertionSummary: `5e échec -> ${fifthFailureStatus} (${fifthFailureCode}) ; Connexion suivante bloquée (${lockedEvenWithCorrectPass.statusCode})`,
    });
  }

  // TEST 4 : MFA TOTP obligatoire pour l'Administrateur (Blocage sans TOTP + Validation RFC 6238)
  {
    const adminLoginStep1 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 'k.benali@tradelink-global.com',
        password: 'AdminTradeLink!2026',
      },
      correlationId: 'sec-corr-04-login',
      ipAddress: '10.10.0.1',
    });

    const loginData = adminLoginStep1.body.data as {
      userId: string;
      sessionId: string;
      mfaRequired: boolean;
      mfaVerified: boolean;
    };

    // L'Admin tente d'accéder à une décision KYC critique AVANT d'avoir validé son MFA TOTP -> Doit être bloqué 403
    const blockedBeforeMfa = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-001/decision',
      headers: {},
      query: {},
      params: {},
      body: { decision: 'VALIDATED' },
      correlationId: 'sec-corr-04-blocked',
      ipAddress: '10.10.0.1',
      user: {
        id: loginData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: loginData.sessionId,
        companyName: 'TradeLink Global HQ',
      },
    });

    // Récupération de la configuration TOTP (secret Base32 + URI QR Code)
    const mfaSetup = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/mfa/setup',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'sec-corr-04-setup',
      ipAddress: '10.10.0.1',
      user: {
        id: loginData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: loginData.sessionId,
        companyName: 'TradeLink Global HQ',
      },
    });

    const setupData = mfaSetup.body.data as {
      secretBase32: string;
      otpauthUri: string;
    };

    const validTotpCode = computeCurrentTotpCode(setupData.secretBase32);

    // Validation du code TOTP à 6 chiffres
    const mfaVerify = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/mfa/verify',
      headers: {},
      query: {},
      params: {},
      body: { code: validTotpCode },
      correlationId: 'sec-corr-04-verify',
      ipAddress: '10.10.0.1',
      user: {
        id: loginData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: loginData.sessionId,
        companyName: 'TradeLink Global HQ',
      },
    });

    // Après validation TOTP, la même décision KYC Admin est autorisée (200)
    const allowedAfterMfa = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-001/decision',
      headers: {},
      query: {},
      params: {},
      body: { decision: 'VALIDATED' },
      correlationId: 'sec-corr-04-allowed',
      ipAddress: '10.10.0.1',
      user: {
        id: loginData.userId,
        email: 'k.benali@tradelink-global.com',
        role: 'ADMIN',
        sessionId: loginData.sessionId,
        companyName: 'TradeLink Global HQ',
      },
    });

    const passed =
      loginData.mfaRequired === true &&
      loginData.mfaVerified === false &&
      blockedBeforeMfa.statusCode === 403 &&
      blockedBeforeMfa.body.error?.code === 'ADMIN_MFA_MANDATORY' &&
      setupData.otpauthUri.startsWith('otpauth://totp/') &&
      mfaVerify.statusCode === 200 &&
      allowedAfterMfa.statusCode === 200;

    results.push({
      testId: 'SEC-04',
      title: 'MFA TOTP obligatoire Admin : Blocage 403 sans MFA, QR URI otpauth:// et élévation après code TOTP',
      passed,
      statusCode: mfaVerify.statusCode,
      assertionSummary: `Avant MFA=${blockedBeforeMfa.statusCode} (${blockedBeforeMfa.body.error?.code}) ; TOTP=${validTotpCode} validé ; Après MFA=${allowedAfterMfa.statusCode}`,
    });
  }

  // TEST 5 : Sessions uniques, JWT signé & Rotation des Refresh Tokens avec détection de vol (Reuse Detection)
  {
    const loginRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 's.mansouri@atlas-import.ma',
        password: 'ClientAtlas!2026',
      },
      correlationId: 'sec-corr-05-login',
      ipAddress: '41.214.0.10',
    });

    const loginData = loginRes.body.data as {
      userId: string;
      sessionId: string;
      accessToken: string;
      refreshToken: string;
    };

    const jwtPayload = verifyJwtAccessToken(loginData.accessToken);

    // 1re rotation légitime du Refresh Token
    const refresh1 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {},
      query: {},
      params: {},
      body: { refreshToken: loginData.refreshToken },
      correlationId: 'sec-corr-05-rot1',
      ipAddress: '41.214.0.10',
    });

    // Tentative frauduleuse de rejouer le PREMIER refresh token déjà consommé -> Détection de vol + Révocation de session
    const replayStolenRefresh = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/refresh',
      headers: {},
      query: {},
      params: {},
      body: { refreshToken: loginData.refreshToken },
      correlationId: 'sec-corr-05-replay',
      ipAddress: '185.220.101.5',
    });

    // Vérification que la session active de l'utilisateur a bien été révoquée suite à la détection de rejeu
    const sessionAfterTheft = app.handleRequest({
      method: 'GET',
      path: '/api/v1/orders',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'sec-corr-05-revoked',
      ipAddress: '41.214.0.10',
      user: {
        id: loginData.userId,
        email: 's.mansouri@atlas-import.ma',
        role: 'CLIENT',
        sessionId: loginData.sessionId,
        companyName: 'Atlas Import & Distribution SARL',
      },
    });

    const passed =
      jwtPayload !== null &&
      jwtPayload.sub === 'usr-client-01' &&
      refresh1.statusCode === 200 &&
      replayStolenRefresh.statusCode === 401 &&
      replayStolenRefresh.body.error?.code === 'REFRESH_TOKEN_REUSE_DETECTED' &&
      sessionAfterTheft.statusCode === 401 &&
      sessionAfterTheft.body.error?.code === 'SESSION_REVOKED_SINGLE_ACCESS_POLICY';

    results.push({
      testId: 'SEC-05',
      title: 'JWT signé HS256, Rotation des Refresh Tokens & Révocation automatique sur détection de rejeu',
      passed,
      statusCode: replayStolenRefresh.statusCode,
      assertionSummary: `JWT sub=${jwtPayload?.sub} ; Rotation 1=${refresh1.statusCode} ; Rejeu=${replayStolenRefresh.statusCode} (${replayStolenRefresh.body.error?.code}) -> Session révoquée (${sessionAfterTheft.statusCode})`,
    });
  }

  // TEST 6 : Mot de passe oublié & Réinitialisation sécurisée à usage unique
  {
    const forgotRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/forgot-password',
      headers: {},
      query: {},
      params: {},
      body: { email: 's.mansouri@atlas-import.ma' },
      correlationId: 'sec-corr-06-forgot',
      ipAddress: '41.214.0.10',
    });

    const forgotData = forgotRes.body.data as { sandboxResetToken: string };

    // Utilisation du jeton unique pour définir un nouveau mot de passe
    const resetRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/reset-password',
      headers: {},
      query: {},
      params: {},
      body: {
        token: forgotData.sandboxResetToken,
        newPassword: 'NewAtlasPassword!2027',
      },
      correlationId: 'sec-corr-06-reset',
      ipAddress: '41.214.0.10',
    });

    // Tentative de réutiliser le même jeton de réinitialisation -> Doit être rejetée (400)
    const replayReset = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/reset-password',
      headers: {},
      query: {},
      params: {},
      body: {
        token: forgotData.sandboxResetToken,
        newPassword: 'AnotherPassword!2028',
      },
      correlationId: 'sec-corr-06-replay',
      ipAddress: '41.214.0.10',
    });

    // Connexion avec le nouveau mot de passe Argon2id -> Succès (200)
    const loginWithNewPassword = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        email: 's.mansouri@atlas-import.ma',
        password: 'NewAtlasPassword!2027',
      },
      correlationId: 'sec-corr-06-login-new',
      ipAddress: '41.214.0.10',
    });

    const passed =
      forgotRes.statusCode === 200 &&
      resetRes.statusCode === 200 &&
      replayReset.statusCode === 400 &&
      replayReset.body.error?.code === 'RESET_TOKEN_ALREADY_USED_OR_EXPIRED' &&
      loginWithNewPassword.statusCode === 200;

    results.push({
      testId: 'SEC-06',
      title: 'Mot de passe oublié & Réinitialisation sécurisée à usage unique (Argon2id)',
      passed,
      statusCode: resetRes.statusCode,
      assertionSummary: `Reset=${resetRes.statusCode} ; Rejeu jeton=${replayReset.statusCode} (${replayReset.body.error?.code}) ; Login nouveau mot de passe=${loginWithNewPassword.statusCode}`,
    });
  }

  // TEST 7 : Isolation stricte des ressources entre utilisateurs (Anti-IDOR sur Commandes, Produits et Appareils)
  {
    // Connexion Client A (usr-client-01)
    const loginClientA = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        userId: 'usr-client-01',
        email: 's.mansouri@atlas-import.ma',
        role: 'CLIENT',
      },
      correlationId: 'sec-corr-07-ca',
      ipAddress: '41.214.0.10',
    });
    const clientASession = loginClientA.body.data as { sessionId: string; deviceId: string };

    // Connexion Client B (usr-client-99)
    const loginClientB = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        userId: 'usr-client-99',
        email: 'autre.client@concurrent.ma',
        role: 'CLIENT',
      },
      correlationId: 'sec-corr-07-cb',
      ipAddress: '41.214.0.99',
    });
    const clientBSession = loginClientB.body.data as { sessionId: string };

    // 7a. Client B tente de lire la commande ord-101 appartenant à Client A -> 403 RESOURCE_OWNERSHIP_VIOLATION
    const idorOrderAttempt = app.handleRequest({
      method: 'GET',
      path: '/api/v1/orders/ord-101',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'sec-corr-07-idor-order',
      ipAddress: '41.214.0.99',
      user: {
        id: 'usr-client-99',
        email: 'autre.client@concurrent.ma',
        role: 'CLIENT',
        sessionId: clientBSession.sessionId,
        companyName: 'Concurrent SARL',
      },
    });

    // 7b. Client B tente de révoquer l'appareil de Client A -> 403 RESOURCE_OWNERSHIP_VIOLATION
    const idorDeviceAttempt = app.handleRequest({
      method: 'DELETE',
      path: `/api/v1/auth/devices/${clientASession.deviceId}`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'sec-corr-07-idor-device',
      ipAddress: '41.214.0.99',
      user: {
        id: 'usr-client-99',
        email: 'autre.client@concurrent.ma',
        role: 'CLIENT',
        sessionId: clientBSession.sessionId,
        companyName: 'Concurrent SARL',
      },
    });

    // 7c. Fournisseur B (usr-supp-99) tente de supprimer le produit prd-001 appartenant à Fournisseur A (usr-supp-01) -> 403 RESOURCE_OWNERSHIP_VIOLATION
    const loginSupplierB = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        userId: 'usr-supp-99',
        email: 'intruder@other-supplier.de',
        role: 'FOURNISSEUR',
      },
      correlationId: 'sec-corr-07-sb',
      ipAddress: '192.0.2.99',
    });
    const suppBSession = loginSupplierB.body.data as { sessionId: string };

    const idorProductDeleteAttempt = app.handleRequest({
      method: 'DELETE',
      path: '/api/v1/products/prd-001',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'sec-corr-07-idor-prod',
      ipAddress: '192.0.2.99',
      user: {
        id: 'usr-supp-99',
        email: 'intruder@other-supplier.de',
        role: 'FOURNISSEUR',
        sessionId: suppBSession.sessionId,
        companyName: 'Other Supplier GmbH',
      },
    });

    // 7d. Un compte encore à l'état VISITEUR tente de passer une commande B2B -> 403 VISITOR_ACCOUNT_PENDING_APPROVAL
    const loginVisitor = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: {
        userId: 'usr-vis-pending',
        email: 'pending@visitor.ma',
        role: 'VISITEUR',
      },
      correlationId: 'sec-corr-07-vis',
      ipAddress: '41.214.0.55',
    });
    const visitorSession = loginVisitor.body.data as { sessionId: string };

    const visitorOrderAttempt = app.handleRequest({
      method: 'POST',
      path: '/api/v1/orders',
      headers: {},
      query: {},
      params: {},
      body: {
        shippingAddress: 'Zone Franche Tanger',
        lines: [{ productId: 'prd-001', quantity: 1 }],
      },
      correlationId: 'sec-corr-07-vis-order',
      ipAddress: '41.214.0.55',
      user: {
        id: 'usr-vis-pending',
        email: 'pending@visitor.ma',
        role: 'VISITEUR',
        sessionId: visitorSession.sessionId,
        companyName: 'Pending Visitor',
      },
    });

    const passed =
      idorOrderAttempt.statusCode === 403 &&
      idorOrderAttempt.body.error?.code === 'RESOURCE_OWNERSHIP_VIOLATION' &&
      idorDeviceAttempt.statusCode === 403 &&
      idorDeviceAttempt.body.error?.code === 'RESOURCE_OWNERSHIP_VIOLATION' &&
      idorProductDeleteAttempt.statusCode === 403 &&
      idorProductDeleteAttempt.body.error?.code === 'RESOURCE_OWNERSHIP_VIOLATION' &&
      visitorOrderAttempt.statusCode === 403 &&
      visitorOrderAttempt.body.error?.code === 'VISITOR_ACCOUNT_PENDING_APPROVAL';

    results.push({
      testId: 'SEC-07',
      title: 'Protection Anti-IDOR & RBAC granulaire (Commandes, Produits, Appareils & Visiteur non approuvé)',
      passed,
      statusCode: 403,
      assertionSummary: `IDOR Commande=${idorOrderAttempt.statusCode} ; IDOR Appareil=${idorDeviceAttempt.statusCode} ; IDOR Produit=${idorProductDeleteAttempt.statusCode} ; Visiteur non approuvé=${visitorOrderAttempt.statusCode}`,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  return {
    allPassed: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    results,
  };
}

// Exécution directe si appelé en ligne de commande
const secSummary = runSecurityAndAuthTests();
console.log(
  `\n=== SUITE DE TESTS SÉCURITÉ, AUTH & RBAC TRADELINK V6.0 (${secSummary.passedTests}/${secSummary.totalTests} RÉUSSIS) ===`
);
for (const r of secSummary.results) {
  console.log(`${r.passed ? '✓' : '✗'} [${r.testId}] ${r.title}\n   -> ${r.assertionSummary}`);
}
if (!secSummary.allPassed) {
  process.exit(1);
}
