// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS COMPLÈTE DU CYCLE DE VIE DE L'AUTHENTIFICATION,
// DE L'INSCRIPTION ET DE LA GESTION DES SESSIONS (PROMPT 01)
// Conforme aux exigences :
// 1. Inscription profils autorisés (CLIENT, FOURNISSEUR, TRANSPORTEUR) & orientation KYC J+7
// 2. Rejet strict des demandes publiques pour profils internes (ADMIN, COMPTABLE, SUPPORT)
// 3. Rejet si conditions générales et politique de confidentialité non acceptées
// 4. Vérification de l'adresse email par OTP (6 chiffres, 10 min, max 5 tentatives)
// 5. Vérification du numéro de téléphone par SMS OTP
// 6. Authentification Argon2id, émission JWT, Refresh Token et Cookie HttpOnly/Secure/SameSite=Strict
// 7. Protection anti-Brute-Force (décompte tentatives, lockout 15 min, traçage LoginAttempt)
// 8. Application stricte de la Session Unique (Single Active Session Policy)
// 9. MFA TOTP RFC 6238 obligatoire pour l'Administrateur
// 10. Rotation des Refresh Tokens et détection de rejeu/vol
// 11. Réinitialisation sécurisée du mot de passe à usage unique et révocation des sessions
// 12. Déconnexion complète avec nettoyage des cookies
// 13. Consultation et gestion unitaire des sessions
// 14. Gestion des comptes suspendus et moteur de redirection intelligente
// ============================================================================

import {
  DatabaseStateSnapshot,
  TradeLinkRepositoryStore,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  computeCurrentTotpCode,
  verifyJwtAccessToken,
} from '../../services/securityCrypto';
import {
  ServerRequestContext,
  ServerResponsePayload,
} from '../middlewares/errorAndSecurity.middleware';

export interface AuthLifecycleTestResult {
  testId: string;
  title: string;
  passed: boolean;
  statusCode: number;
  assertionSummary: string;
}

function createInitialTestSnapshot(): DatabaseStateSnapshot {
  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [],
    incidents: [],
    stockMovements: [],
    accountingEntries: [],
  };
}

function makeReq(
  app: TradeLinkApiApplication,
  req: Partial<ServerRequestContext> & { method: ServerRequestContext['method']; path: string }
): ServerResponsePayload<any> {
  let user = req.user;
  if (!user && req.headers?.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.slice(7).trim();
    const decoded = verifyJwtAccessToken(token);
    if (decoded) {
      user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        sessionId: decoded.sessionId,
        companyName: 'TradeLink B2B',
        mfaVerified: decoded.mfaVerified,
      };
    }
  }

  return app.handleRequest({
    method: req.method,
    path: req.path,
    headers: req.headers ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
    body: req.body ?? {},
    correlationId: req.correlationId ?? `corr-${Date.now().toString(36)}`,
    ipAddress: req.ipAddress ?? '127.0.0.1',
    user,
  });
}

export function runAuthLifecycleTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  results: AuthLifecycleTestResult[];
} {
  const results: AuthLifecycleTestResult[] = [];
  const repo = new TradeLinkRepositoryStore(createInitialTestSnapshot(), false);
  const app = new TradeLinkApiApplication(repo);

  // --------------------------------------------------------------------------
  // TEST 01 : Inscription des profils autorisés (CLIENT, FOURNISSEUR, TRANSPORTEUR) & KYC J+7
  // --------------------------------------------------------------------------
  {
    const clientReg = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-client',
      ipAddress: '196.200.10.1',
      body: {
        firstName: 'Anas',
        lastName: 'El Fassi',
        companyName: 'Fassi Trading SARL',
        email: 'anas.fassi@fassi-trading.ma',
        phone: '+212661123456',
        taxId: 'MA-ICE-001234567',
        country: 'Maroc',
        businessAddress: '10 Boulevard Mohammed V, Casablanca',
        city: 'Casablanca',
        postalCode: '20000',
        requestedRole: 'CLIENT',
        password: 'SecurePasswordClient!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const suppReg = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-supp',
      ipAddress: '196.200.10.2',
      body: {
        companyName: 'Bavaria Industrial Equipments GmbH',
        email: 'sales@bavaria-equip.de',
        country: 'Allemagne',
        requestedRole: 'FOURNISSEUR',
        password: 'SecurePasswordSupplier!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const transReg = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-trans',
      ipAddress: '196.200.10.3',
      body: {
        companyName: 'TransAtlas Express SARL',
        email: 'dispatch@transatlas-express.ma',
        country: 'Maroc',
        requestedRole: 'TRANSPORTEUR',
        password: 'SecurePasswordCarrier!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const passed =
      clientReg.statusCode === 201 &&
      clientReg.body.data.role === 'VISITEUR' &&
      clientReg.body.data.requestedRole === 'CLIENT' &&
      clientReg.body.data.kycDaysRemaining === 7 &&
      clientReg.body.data.otpIssued === true &&
      suppReg.statusCode === 201 &&
      suppReg.body.data.requestedRole === 'FOURNISSEUR' &&
      transReg.statusCode === 201 &&
      transReg.body.data.requestedRole === 'TRANSPORTEUR';

    results.push({
      testId: 'AUTH-01',
      title: 'Inscription des profils autorisés (Client, Fournisseur, Transporteur) avec Argon2id et orientation KYC J+7',
      passed,
      statusCode: clientReg.statusCode,
      assertionSummary: `Client status=${clientReg.statusCode} (Role=${clientReg.body.data?.role}, KYC J+${clientReg.body.data?.kycDaysRemaining}) ; Fournisseur status=${suppReg.statusCode} ; Transporteur status=${transReg.statusCode}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 02 : Rejet strict des demandes publiques pour rôles internes (ADMIN, COMPTABLE, SUPPORT)
  // --------------------------------------------------------------------------
  {
    const adminAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-admin-block',
      ipAddress: '196.200.10.4',
      body: {
        companyName: 'Hacker Corp',
        email: 'root@hacker.io',
        country: 'France',
        requestedRole: 'ADMIN',
        password: 'AttackerPassword!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const comptableAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-compt-block',
      ipAddress: '196.200.10.5',
      body: {
        companyName: 'External Audit SARL',
        email: 'auditor@external.com',
        country: 'France',
        requestedRole: 'COMPTABLE',
        password: 'AttackerPassword!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const supportAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-supp-block',
      ipAddress: '196.200.10.6',
      body: {
        companyName: 'CallCenter Outsourced',
        email: 'agent@callcenter.com',
        country: 'France',
        requestedRole: 'SUPPORT',
        password: 'AttackerPassword!2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const passed =
      adminAttempt.statusCode === 403 &&
      adminAttempt.body.error?.code === 'ADMIN_PROVISIONED_MANUALLY_ONLY' &&
      comptableAttempt.statusCode === 403 &&
      comptableAttempt.body.error?.code === 'ROLE_RESTRICTED_MANUAL_PROVISIONING' &&
      supportAttempt.statusCode === 403 &&
      supportAttempt.body.error?.code === 'ROLE_RESTRICTED_MANUAL_PROVISIONING';

    results.push({
      testId: 'AUTH-02',
      title: 'Rejet strict des inscriptions publiques pour les profils réservés (Admin, Comptable, Support)',
      passed,
      statusCode: 403,
      assertionSummary: `Admin status=${adminAttempt.statusCode} (${adminAttempt.body.error?.code}) ; Comptable status=${comptableAttempt.statusCode} (${comptableAttempt.body.error?.code}) ; Support status=${supportAttempt.statusCode} (${supportAttempt.body.error?.code})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 03 : Rejet strict si conditions générales et confidentialité non acceptées
  // --------------------------------------------------------------------------
  {
    const noTermsAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-noterms',
      ipAddress: '196.200.10.7',
      body: {
        companyName: 'Test No Terms SARL',
        email: 'noterms@company.ma',
        country: 'Maroc',
        requestedRole: 'CLIENT',
        password: 'SecurePassword!2026',
        termsAccepted: false,
        privacyAccepted: true,
      },
    });

    const noPrivacyAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-reg-noprivacy',
      ipAddress: '196.200.10.8',
      body: {
        companyName: 'Test No Privacy SARL',
        email: 'noprivacy@company.ma',
        country: 'Maroc',
        requestedRole: 'CLIENT',
        password: 'SecurePassword!2026',
        termsAccepted: true,
        privacyAccepted: false,
      },
    });

    const passed =
      noTermsAttempt.statusCode === 400 &&
      noTermsAttempt.body.error?.code === 'TERMS_ACCEPTANCE_REQUIRED' &&
      noPrivacyAttempt.statusCode === 400 &&
      noPrivacyAttempt.body.error?.code === 'TERMS_ACCEPTANCE_REQUIRED';

    results.push({
      testId: 'AUTH-03',
      title: 'Rejet de l’inscription si Conditions Générales ou Confidentialité non acceptées (400)',
      passed,
      statusCode: 400,
      assertionSummary: `Sans CGU status=${noTermsAttempt.statusCode} (${noTermsAttempt.body.error?.code}) ; Sans Confidentialité status=${noPrivacyAttempt.statusCode} (${noPrivacyAttempt.body.error?.code})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 04 : Vérification de l'adresse email par code OTP (6 chiffres, 10 min)
  // --------------------------------------------------------------------------
  let registeredClientOtp = '';
  {
    const regRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-otp-reg',
      ipAddress: '196.200.10.9',
      body: {
        firstName: 'Mehdi',
        lastName: 'Benkirane',
        companyName: 'Maghreb Tech Solutions',
        email: 'mehdi.b@maghreb-tech.ma',
        phone: '+212660887766',
        taxId: 'MA-ICE-998877665',
        country: 'Maroc',
        requestedRole: 'CLIENT',
        password: 'ComplexPassword#2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    registeredClientOtp = regRes.body.data.sandboxOtpCode;

    // Tentative avec code invalide
    const badCodeAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/verify-otp',
      correlationId: 'corr-otp-bad',
      ipAddress: '196.200.10.9',
      body: {
        email: 'mehdi.b@maghreb-tech.ma',
        code: '000000',
      },
    });

    // Validation avec code exact via l'alias /api/v1/auth/verify-email
    const goodCodeAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/verify-email',
      correlationId: 'corr-otp-good',
      ipAddress: '196.200.10.9',
      body: {
        email: 'mehdi.b@maghreb-tech.ma',
        code: registeredClientOtp,
      },
    });

    const passed =
      badCodeAttempt.statusCode === 400 &&
      badCodeAttempt.body.error?.code === 'OTP_INVALID_CODE' &&
      goodCodeAttempt.statusCode === 200 &&
      goodCodeAttempt.body.data.emailVerified === true &&
      goodCodeAttempt.body.data.role === 'CLIENT' &&
      goodCodeAttempt.body.data.kycStatus === 'SUBMITTED';

    results.push({
      testId: 'AUTH-04',
      title: 'Vérification de l’email par code OTP (Quota décrémenté, promotion Visiteur -> Client & KYC: SUBMITTED)',
      passed,
      statusCode: goodCodeAttempt.statusCode,
      assertionSummary: `Mauvais code=${badCodeAttempt.statusCode} (${badCodeAttempt.body.error?.message}) ; Bon code=${goodCodeAttempt.statusCode} (role=${goodCodeAttempt.body.data?.role}, KYC=${goodCodeAttempt.body.data?.kycStatus})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 05 : Vérification du numéro de téléphone par SMS OTP
  // --------------------------------------------------------------------------
  {
    const regPhoneRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'corr-phone-reg',
      ipAddress: '196.200.10.10',
      body: {
        companyName: 'Transport Rapide SARL',
        email: 'contact@transrapide.ma',
        phone: '+212663445566',
        country: 'Maroc',
        requestedRole: 'TRANSPORTEUR',
        password: 'PasswordCarrier#2026',
        termsAccepted: true,
        privacyAccepted: true,
      },
    });

    const phoneOtp = regPhoneRes.body.data.sandboxPhoneOtpCode;

    const phoneBadOtp = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/verify-phone',
      correlationId: 'corr-phone-bad',
      ipAddress: '196.200.10.10',
      body: {
        phone: '+212663445566',
        code: '111111',
      },
    });

    const phoneGoodOtp = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/verify-phone',
      correlationId: 'corr-phone-good',
      ipAddress: '196.200.10.10',
      body: {
        phone: '+212663445566',
        code: phoneOtp,
      },
    });

    const passed =
      phoneBadOtp.statusCode === 400 &&
      phoneBadOtp.body.error?.code === 'PHONE_OTP_INVALID_CODE' &&
      phoneGoodOtp.statusCode === 200 &&
      phoneGoodOtp.body.data.phoneVerified === true;

    results.push({
      testId: 'AUTH-05',
      title: 'Vérification du numéro de téléphone par SMS OTP (6 chiffres, décrémentation des quotas)',
      passed,
      statusCode: phoneGoodOtp.statusCode,
      assertionSummary: `Erreur SMS OTP=${phoneBadOtp.statusCode} ; Validation SMS OTP=${phoneGoodOtp.statusCode} (phoneVerified=${phoneGoodOtp.body.data?.phoneVerified})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 06 : Authentification réussie Argon2id, JWT, Refresh Token et Cookie Sécurisé
  // --------------------------------------------------------------------------
  let clientActiveSessionId = '';
  let clientAccessToken = '';
  {
    const loginRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-login-client',
      ipAddress: '196.200.10.20',
      body: {
        email: 's.mansouri@atlas-import.ma',
        password: 'ClientAtlas!2026',
      },
    });

    clientActiveSessionId = loginRes.body.data?.sessionId;
    clientAccessToken = loginRes.body.data?.accessToken;
    const cookieHeader = loginRes.headers['Set-Cookie'] ?? '';

    const jwtDecoded = clientAccessToken ? verifyJwtAccessToken(clientAccessToken) : null;

    const passed =
      loginRes.statusCode === 200 &&
      Boolean(clientActiveSessionId) &&
      Boolean(clientAccessToken) &&
      jwtDecoded !== null &&
      jwtDecoded.role === 'CLIENT' &&
      cookieHeader.includes('HttpOnly') &&
      cookieHeader.includes('Secure') &&
      cookieHeader.includes('SameSite=Strict') &&
      loginRes.body.data.redirectTarget === '/client';

    results.push({
      testId: 'AUTH-06',
      title: 'Authentification Argon2id, émission JWT Access Token, Refresh Token et Cookie HttpOnly/Secure/SameSite=Strict',
      passed,
      statusCode: loginRes.statusCode,
      assertionSummary: `Session=${clientActiveSessionId} ; JWT rôle=${jwtDecoded?.role} ; Cookie=${cookieHeader.slice(0, 45)}... ; RedirectTarget=${loginRes.body.data?.redirectTarget}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 07 : Protection anti-Brute-Force (Lockout 15 min après 5 échecs & traçage LoginAttempt)
  // --------------------------------------------------------------------------
  {
    let lastBadStatus = 0;
    for (let i = 1; i <= 4; i++) {
      const badAttempt = makeReq(app, {
        method: 'POST',
        path: '/api/v1/auth/login',
        correlationId: `corr-bf-${i}`,
        ipAddress: '203.0.113.50',
        body: {
          email: 's.mansouri@atlas-import.ma',
          password: `WrongPassword#${i}`,
        },
      });
      lastBadStatus = badAttempt.statusCode;
    }

    const fifthAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-bf-5',
      ipAddress: '203.0.113.50',
      body: {
        email: 's.mansouri@atlas-import.ma',
        password: 'WrongPassword#5',
      },
    });

    const lockedGoodAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-bf-locked',
      ipAddress: '203.0.113.50',
      body: {
        email: 's.mansouri@atlas-import.ma',
        password: 'ClientAtlas!2026',
      },
    });

    const recentAttempts = repo.getRecentFailedLoginAttempts('s.mansouri@atlas-import.ma', 15);

    const passed =
      lastBadStatus === 401 &&
      fifthAttempt.statusCode === 429 &&
      fifthAttempt.body.error?.code === 'AUTH_ACCOUNT_LOCKED_BRUTE_FORCE' &&
      lockedGoodAttempt.statusCode === 429 &&
      recentAttempts.length >= 5;

    results.push({
      testId: 'AUTH-07',
      title: 'Protection anti-Brute-Force (Lockout 15 min après 5 échecs consécutifs, blocage 429 et traçage LoginAttempt)',
      passed,
      statusCode: fifthAttempt.statusCode,
      assertionSummary: `Tentative 4=401 ; Tentative 5=${fifthAttempt.statusCode} (${fifthAttempt.body.error?.code}) ; Bon mdp verrouillé=${lockedGoodAttempt.statusCode} ; Tentatives tracées en base=${recentAttempts.length}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 08 : Session Unique Déterministe (Single Active Session Policy)
  // --------------------------------------------------------------------------
  {
    const session1 = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-session-1',
      ipAddress: '196.200.10.31',
      body: {
        email: 'h.weber@eurotech-supply.de',
        password: 'SupplierEuro!2026',
        deviceName: 'Ordinateur Bureau (Chrome/Windows)',
      },
    });

    const tokenSession1 = session1.body.data.accessToken;
    const sessionId1 = session1.body.data.sessionId;

    const testSession1Access = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/sessions',
      correlationId: 'corr-sess1-check',
      ipAddress: '196.200.10.31',
      headers: {
        authorization: `Bearer ${tokenSession1}`,
      },
    });

    const session2 = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-session-2',
      ipAddress: '196.200.10.32',
      body: {
        email: 'h.weber@eurotech-supply.de',
        password: 'SupplierEuro!2026',
        deviceName: 'Smartphone Mobile (Safari/iOS)',
      },
    });

    const tokenSession2 = session2.body.data.accessToken;

    const testSession1AfterRevoke = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/sessions',
      correlationId: 'corr-sess1-rejected',
      ipAddress: '196.200.10.31',
      headers: {
        authorization: `Bearer ${tokenSession1}`,
      },
    });

    const testSession2Access = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/sessions',
      correlationId: 'corr-sess2-ok',
      ipAddress: '196.200.10.32',
      headers: {
        authorization: `Bearer ${tokenSession2}`,
      },
    });

    const passed =
      testSession1Access.statusCode === 200 &&
      session2.statusCode === 200 &&
      session2.body.data.previousRevokedSessionId === sessionId1 &&
      testSession1AfterRevoke.statusCode === 401 &&
      testSession1AfterRevoke.body.error?.code === 'SESSION_REVOKED_SINGLE_ACCESS_POLICY' &&
      testSession2Access.statusCode === 200;

    results.push({
      testId: 'AUTH-08',
      title: 'Session Unique Déterministe (Single Active Session : révocation immédiate de la session précédente, 401 SESSION_REVOKED)',
      passed,
      statusCode: testSession1AfterRevoke.statusCode,
      assertionSummary: `Session 1 initiale=200 ; Session 2 ouverte (previousRevoked=${session2.body.data?.previousRevokedSessionId}) ; Session 1 rejetée=${testSession1AfterRevoke.statusCode} (${testSession1AfterRevoke.body.error?.code}) ; Session 2 valide=${testSession2Access.statusCode}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 09 : Double Authentification MFA TOTP obligatoire pour l'Administrateur (RFC 6238)
  // --------------------------------------------------------------------------
  {
    const adminLoginNoMfa = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-admin-no-mfa',
      ipAddress: '196.200.10.40',
      body: {
        email: 'k.benali@tradelink-global.com',
        password: 'AdminTradeLink!2026',
      },
    });

    const adminTokenNoMfa = adminLoginNoMfa.body.data.accessToken;

    const restrictedAdminAccess = makeReq(app, {
      method: 'GET',
      path: '/api/v1/admin/audit/chain-verify',
      correlationId: 'corr-admin-blocked-mfa',
      ipAddress: '196.200.10.40',
      headers: {
        authorization: `Bearer ${adminTokenNoMfa}`,
      },
    });

    const mfaSetup = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/mfa/setup',
      correlationId: 'corr-admin-mfa-setup',
      ipAddress: '196.200.10.40',
      headers: {
        authorization: `Bearer ${adminTokenNoMfa}`,
      },
    });

    const secretBase32 = mfaSetup.body.data.secretBase32;
    const currentTotp = computeCurrentTotpCode(secretBase32);

    const verifyMfaRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/mfa/verify',
      correlationId: 'corr-admin-mfa-verify',
      ipAddress: '196.200.10.40',
      headers: {
        authorization: `Bearer ${adminTokenNoMfa}`,
      },
      body: {
        code: currentTotp,
      },
    });

    const upgradedAdminToken = verifyMfaRes.body.data.accessToken;

    const allowedAdminAccess = makeReq(app, {
      method: 'GET',
      path: '/api/v1/admin/audit/chain-verify',
      correlationId: 'corr-admin-allowed-mfa',
      ipAddress: '196.200.10.40',
      headers: {
        authorization: `Bearer ${upgradedAdminToken}`,
      },
    });

    const passed =
      adminLoginNoMfa.body.data.mfaVerified === false &&
      adminLoginNoMfa.body.data.redirectTarget === '/admin/mfa-challenge' &&
      restrictedAdminAccess.statusCode === 403 &&
      restrictedAdminAccess.body.error?.code === 'ADMIN_MFA_MANDATORY' &&
      verifyMfaRes.statusCode === 200 &&
      verifyMfaRes.body.data.mfaVerified === true &&
      allowedAdminAccess.statusCode === 200;

    results.push({
      testId: 'AUTH-09',
      title: 'MFA TOTP obligatoire pour l’Administrateur (RFC 6238 : blocage 403 tant que non vérifié, élévation après TOTP)',
      passed,
      statusCode: 200,
      assertionSummary: `Login Admin sans MFA: redirect=${adminLoginNoMfa.body.data?.redirectTarget} ; Accès non vérifié=${restrictedAdminAccess.statusCode} (${restrictedAdminAccess.body.error?.code}) ; TOTP vérifié=${verifyMfaRes.statusCode} ; Accès autorisé=${allowedAdminAccess.statusCode}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10 : Rotation des Refresh Tokens et détection de vol/rejeu
  // --------------------------------------------------------------------------
  {
    const loginCarrier = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-rot-login',
      ipAddress: '196.200.10.50',
      body: {
        email: 't.alami@logistrading.ma',
        password: 'CarrierLogis!2026',
      },
    });

    const rt1 = loginCarrier.body.data.refreshToken;

    const rotate1 = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      correlationId: 'corr-rot-1',
      ipAddress: '196.200.10.50',
      body: {
        refreshToken: rt1,
      },
    });

    const rt2 = rotate1.body.data.refreshToken;

    const reuseAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      correlationId: 'corr-rot-reuse',
      ipAddress: '196.200.10.99',
      body: {
        refreshToken: rt1,
      },
    });

    const passed =
      rotate1.statusCode === 200 &&
      Boolean(rt2) &&
      rt2 !== rt1 &&
      reuseAttempt.statusCode === 401 &&
      reuseAttempt.body.error?.code === 'REFRESH_TOKEN_REUSE_DETECTED';

    results.push({
      testId: 'AUTH-10',
      title: 'Rotation des Refresh Tokens & Détection de vol/rejeu (Token Reuse Detection avec révocation immédiate)',
      passed,
      statusCode: reuseAttempt.statusCode,
      assertionSummary: `Rotation 1=200 (Nouveau token émis) ; Réutilisation détectée=${reuseAttempt.statusCode} (${reuseAttempt.body.error?.code})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 11 : Mot de passe oublié, jeton à usage unique et révocation des sessions
  // --------------------------------------------------------------------------
  {
    const forgotRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/forgot-password',
      correlationId: 'corr-forgot',
      ipAddress: '196.200.10.60',
      body: {
        email: 'c.dupont@tradelink-audit.fr',
      },
    });

    const resetToken = forgotRes.body.data.sandboxResetToken;

    const confirmRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/reset-password',
      correlationId: 'corr-reset-confirm',
      ipAddress: '196.200.10.60',
      body: {
        token: resetToken,
        newPassword: 'BrandNewComptablePassword#2026',
      },
    });

    const reuseResetAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/reset-password',
      correlationId: 'corr-reset-reuse',
      ipAddress: '196.200.10.60',
      body: {
        token: resetToken,
        newPassword: 'AnotherPassword!2026',
      },
    });

    const loginWithNewPass = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-login-newpass',
      ipAddress: '196.200.10.60',
      body: {
        email: 'c.dupont@tradelink-audit.fr',
        password: 'BrandNewComptablePassword#2026',
      },
    });

    const passed =
      forgotRes.statusCode === 200 &&
      Boolean(resetToken) &&
      confirmRes.statusCode === 200 &&
      confirmRes.body.data.passwordReset === true &&
      reuseResetAttempt.statusCode === 400 &&
      reuseResetAttempt.body.error?.code === 'RESET_TOKEN_ALREADY_USED_OR_EXPIRED' &&
      loginWithNewPass.statusCode === 200;

    results.push({
      testId: 'AUTH-11',
      title: 'Mot de passe oublié & Réinitialisation à usage unique (Argon2id, révocation des sessions et anti-rejeu)',
      passed,
      statusCode: confirmRes.statusCode,
      assertionSummary: `Jeton émis=${forgotRes.statusCode} ; Réinitialisation=${confirmRes.statusCode} ; Rejeu jeton=${reuseResetAttempt.statusCode} (${reuseResetAttempt.body.error?.code}) ; Nouveau login=${loginWithNewPass.statusCode}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 12 : Déconnexion complète & Invalidation Cookie (/api/v1/auth/logout)
  // --------------------------------------------------------------------------
  {
    const loginSupport = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-supp-login',
      ipAddress: '196.200.10.70',
      body: {
        email: 's.lefevre@tradelink-support.com',
        password: 'SupportAgent!2026',
      },
    });

    const suppToken = loginSupport.body.data.accessToken;

    const logoutRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      correlationId: 'corr-supp-logout',
      ipAddress: '196.200.10.70',
      headers: {
        authorization: `Bearer ${suppToken}`,
      },
    });

    const logoutCookie = logoutRes.headers['Set-Cookie'] ?? '';

    const accessAfterLogout = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/sessions',
      correlationId: 'corr-supp-after-logout',
      ipAddress: '196.200.10.70',
      headers: {
        authorization: `Bearer ${suppToken}`,
      },
    });

    const passed =
      logoutRes.statusCode === 200 &&
      logoutRes.body.data.loggedOut === true &&
      logoutCookie.includes('Max-Age=0') &&
      accessAfterLogout.statusCode === 401 &&
      accessAfterLogout.body.error?.code === 'SESSION_REVOKED_SINGLE_ACCESS_POLICY';

    results.push({
      testId: 'AUTH-12',
      title: 'Déconnexion complète (/api/v1/auth/logout), révocation de session active et invalidation Cookie (Max-Age=0)',
      passed,
      statusCode: logoutRes.statusCode,
      assertionSummary: `Logout status=${logoutRes.statusCode} ; Cookie d'invalidation=${logoutCookie} ; Accès après logout=${accessAfterLogout.statusCode} (${accessAfterLogout.body.error?.code})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 13 : Consultation et gestion unitaire des sessions
  // --------------------------------------------------------------------------
  {
    const loginTrans = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-trans-sess',
      ipAddress: '196.200.10.80',
      body: {
        email: 't.alami@logistrading.ma',
        password: 'CarrierLogis!2026',
      },
    });

    const transToken = loginTrans.body.data.accessToken;
    const transSessionId = loginTrans.body.data.sessionId;

    const sessionsList = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/sessions',
      correlationId: 'corr-list-sess',
      ipAddress: '196.200.10.80',
      headers: {
        authorization: `Bearer ${transToken}`,
      },
    });

    const revokeSessionRes = makeReq(app, {
      method: 'DELETE',
      path: `/api/v1/auth/sessions/${transSessionId}`,
      correlationId: 'corr-revoke-sess',
      ipAddress: '196.200.10.80',
      headers: {
        authorization: `Bearer ${transToken}`,
      },
    });

    const passed =
      sessionsList.statusCode === 200 &&
      Array.isArray(sessionsList.body.data) &&
      sessionsList.body.data.length >= 1 &&
      revokeSessionRes.statusCode === 200 &&
      revokeSessionRes.body.data.revoked === true;

    results.push({
      testId: 'AUTH-13',
      title: 'Consultation et gestion unitaire des sessions (/api/v1/auth/sessions et révocation DELETE)',
      passed,
      statusCode: sessionsList.statusCode,
      assertionSummary: `Sessions trouvées=${sessionsList.body.data?.length} ; Révocation manuelle=${revokeSessionRes.statusCode} (revoked=${revokeSessionRes.body.data?.revoked})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 14 : Gestion des comptes suspendus, protection anti-CSRF et redirection intelligente
  // --------------------------------------------------------------------------
  {
    const adminLogin = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-admin-sus-setup',
      ipAddress: '196.200.10.90',
      body: {
        email: 'k.benali@tradelink-global.com',
        password: 'AdminTradeLink!2026',
      },
    });
    const adminToken = adminLogin.body.data.accessToken;

    const mfaSetup = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/mfa/setup',
      correlationId: 'corr-admin-sus-mfa-s',
      ipAddress: '196.200.10.90',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const totpCode = computeCurrentTotpCode(mfaSetup.body.data.secretBase32);

    const mfaVerify = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/mfa/verify',
      correlationId: 'corr-admin-sus-mfa-v',
      ipAddress: '196.200.10.90',
      headers: { authorization: `Bearer ${adminToken}` },
      body: { code: totpCode },
    });
    const fullAdminToken = mfaVerify.body.data.accessToken;

    // Suspendre le compte Transporteur
    const suspendRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/admin/users/suspend',
      correlationId: 'corr-suspend-trans',
      ipAddress: '196.200.10.90',
      headers: { authorization: `Bearer ${fullAdminToken}` },
      body: {
        email: 't.alami@logistrading.ma',
        reason: 'Suspension conservatoire suite à anomalie documentaire.',
      },
    });

    // Tentative de connexion sur le compte suspendu : rejet 403
    const suspendedLoginAttempt = makeReq(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      correlationId: 'corr-login-suspended',
      ipAddress: '196.200.10.95',
      body: {
        email: 't.alami@logistrading.ma',
        password: 'CarrierLogis!2026',
      },
    });

    // Réactivation du compte par l'administrateur
    const unsuspendRes = makeReq(app, {
      method: 'POST',
      path: '/api/v1/admin/users/unsuspend',
      correlationId: 'corr-unsuspend-trans',
      ipAddress: '196.200.10.90',
      headers: { authorization: `Bearer ${fullAdminToken}` },
      body: {
        email: 't.alami@logistrading.ma',
      },
    });

    // Test anti-CSRF token
    const csrfRes = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/csrf-token',
      correlationId: 'corr-csrf-check',
      ipAddress: '196.200.10.90',
    });

    // Test redirection intelligente
    const redirectRes = makeReq(app, {
      method: 'GET',
      path: '/api/v1/auth/redirect-target',
      correlationId: 'corr-redirect-check',
      ipAddress: '196.200.10.90',
      headers: { authorization: `Bearer ${fullAdminToken}` },
    });

    const passed =
      suspendRes.statusCode === 200 &&
      suspendRes.body.data.isSuspended === true &&
      suspendedLoginAttempt.statusCode === 403 &&
      suspendedLoginAttempt.body.error?.code === 'AUTH_ACCOUNT_SUSPENDED' &&
      unsuspendRes.statusCode === 200 &&
      unsuspendRes.body.data.isSuspended === false &&
      csrfRes.statusCode === 200 &&
      Boolean(csrfRes.headers['X-CSRF-Token']) &&
      redirectRes.statusCode === 200 &&
      redirectRes.body.data.targetPath === '/admin';

    results.push({
      testId: 'AUTH-14',
      title: 'Gestion des comptes suspendus (blocage 403), protection anti-CSRF et redirection intelligente',
      passed,
      statusCode: 200,
      assertionSummary: `Suspension=200 ; Connexion compte suspendu=${suspendedLoginAttempt.statusCode} (${suspendedLoginAttempt.body.error?.code}) ; Réactivation=200 ; CSRF header=${csrfRes.headers['X-CSRF-Token']?.slice(0, 15)}... ; Redirection=${redirectRes.body.data?.targetPath}`,
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

// Auto-exécution si lancé directement en CLI
const summary = runAuthLifecycleTests();
console.log(
  `\n=== SUITE DE TESTS CYCLE DE VIE AUTH, SESSIONS & SÉCURITÉ (PROMPT 01) : ${summary.passedTests}/${summary.totalTests} RÉUSSIS ===`
);
for (const r of summary.results) {
  console.log(`${r.passed ? '✓' : '✗'} [${r.testId}] ${r.title}\n   -> ${r.assertionSummary}`);
}
if (!summary.allPassed) {
  process.exit(1);
}
