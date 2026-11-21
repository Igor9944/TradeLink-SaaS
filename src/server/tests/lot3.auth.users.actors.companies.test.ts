// ============================================================================
// TRADELINK V6.1 — SUITE DE TESTS LOT 3 : AUTHENTIFICATION, UTILISATEURS,
// ACTEURS, ENTREPRISES B2B, PERMISSIONS INTERNES, KYC & ESPACES (MISSIONS 3.1 À 3.5)
// ============================================================================

import assert from 'assert';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';

function buildTestContext(
  opts: Partial<ServerRequestContext> & { method: string; path: string }
): ServerRequestContext {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    correlationId: `corr-lot3-${Date.now()}`,
    ipAddress: '127.0.0.1',
    ...opts,
  };
}

async function runLot3AuthUsersActorsCompaniesTests() {
  console.log('================================================================================');
  console.log('🏢 TRADELINK V6.1 — DÉMARRAGE SUITE DE TESTS LOT 3 (COMPTES, ACTEURS & ENTREPRISES)');
  console.log('================================================================================\n');

  const initialSnapshot: DatabaseStateSnapshot = {
    products: [],
    orders: [
      {
        id: 'ord-active-lot3-01',
        orderNumber: 'CMD-2026-LOT3-ACTIVE',
        clientId: 'usr-client-01',
        clientName: 'Atlas Import & Distribution SARL',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial GmbH',
        status: 'IN_TRANSIT',
        subtotalAmount: '10000.0000',
        taxAmount: '2000.0000',
        shippingAmount: '500.0000',
        totalAmount: '12500.0000',
        currency: 'EUR',
        shippingAddress: 'Tanger Med Logistics Zone',
        createdAt: '2026-11-21',
        items: [],
        timeline: [],
      },
    ],
    kycDossiers: [
      {
        id: 'kyc-client-01',
        userId: 'usr-client-01',
        userName: 'Sofia Mansouri',
        companyName: 'Atlas Import & Distribution SARL',
        actorType: 'CLIENT',
        jurisdiction: 'MA',
        status: 'VALIDATED',
        startedAt: '2026-11-15',
        deadlineAt: '2026-11-22',
        daysElapsed: 3,
        daysRemaining: 4,
        remindersSent: [],
        documents: [],
      },
    ],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };

  const repo = new TradeLinkRepositoryStore(initialSnapshot, true);
  const app = new TradeLinkApiApplication(repo);

  const adminActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-admin-01',
    email: 'k.benali@tradelink-global.com',
    role: 'ADMIN',
    sessionId: 'sess-lot3-admin-01',
    companyName: 'TradeLink Global HQ',
    mfaVerified: true,
  };
  registerSingleActiveSession(adminActor.id, adminActor.sessionId, true);

  const clientActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-01',
    email: 's.mansouri@atlas-import.ma',
    role: 'CLIENT',
    sessionId: 'sess-lot3-client-01',
    companyName: 'Atlas Import & Distribution SARL',
    mfaVerified: true,
  };
  registerSingleActiveSession(clientActor.id, clientActor.sessionId, true);

  const supplierActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-01',
    email: 'h.weber@eurotech-supply.de',
    role: 'FOURNISSEUR',
    sessionId: 'sess-lot3-supp-01',
    companyName: 'EuroTech Industrial & ColdChain GmbH',
    mfaVerified: true,
  };
  registerSingleActiveSession(supplierActor.id, supplierActor.sessionId, true);

  const accountantActor: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-compt-01',
    email: 'c.dupont@tradelink-audit.fr',
    role: 'COMPTABLE',
    sessionId: 'sess-lot3-compt-01',
    companyName: 'TradeLink Finance & Audit',
    mfaVerified: true,
  };
  registerSingleActiveSession(accountantActor.id, accountantActor.sessionId, true);

  // ==========================================================================
  // TEST 1 (MISSION 3.1) : CYCLE DE VIE DU COMPTE, PROFIL, APPAREILS & MFA SECOURS
  // ==========================================================================
  console.log('🔹 [LOT3-01] Cycle de vie des comptes : Profil, Anti-IDOR, Appareils & Codes de secours MFA...');
  {
    // 1.1 Consultation de son propre profil
    const getOwnProfile = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/users/usr-client-01',
        user: clientActor,
      })
    );
    assert.strictEqual(getOwnProfile.statusCode, 200);
    assert.strictEqual((getOwnProfile.body.data as any).profile.email, 's.mansouri@atlas-import.ma');

    // 1.2 Blocage Anti-IDOR : le Fournisseur tente de lire ou modifier le profil du Client -> 403
    const idorReadProfile = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/users/usr-client-01',
        user: supplierActor,
      })
    );
    assert.strictEqual(idorReadProfile.statusCode, 403);
    assert.strictEqual(idorReadProfile.body.error?.code, 'RESOURCE_OWNERSHIP_VIOLATION');

    const idorUpdateProfile = app.handleRequest(
      buildTestContext({
        method: 'PUT',
        path: '/api/v1/users/usr-client-01/profile',
        user: supplierActor,
        body: { firstName: 'Pirate' },
      })
    );
    assert.strictEqual(idorUpdateProfile.statusCode, 403);

    // 1.3 Mise à jour légitime du profil & préférence linguistique (FR -> AR RTL)
    const updateProfileRes = app.handleRequest(
      buildTestContext({
        method: 'PUT',
        path: '/api/v1/users/usr-client-01/profile',
        user: clientActor,
        body: {
          firstName: 'Sofia',
          lastName: 'Mansouri-Alami',
          phone: '+212661998877',
          city: 'Rabat',
          locale: 'ar',
          themePreference: 'dark',
        },
      })
    );
    assert.strictEqual(updateProfileRes.statusCode, 200);
    assert.strictEqual((updateProfileRes.body.data as any).lastName, 'Mansouri-Alami');
    assert.strictEqual((updateProfileRes.body.data as any).locale, 'ar');

    // 1.4 Codes de récupération MFA à usage unique (génération, consommation et rejet du rejeu)
    const genRecoveryRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/auth/mfa/recovery-codes',
        user: adminActor,
      })
    );
    assert.strictEqual(genRecoveryRes.statusCode, 200);
    const recoveryCodes: string[] = (genRecoveryRes.body.data as any).recoveryCodes;
    assert.strictEqual(recoveryCodes.length, 8);

    // Utilisation du premier code de secours MFA
    const useCode1 = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/auth/mfa/verify-recovery',
        user: adminActor,
        body: { recoveryCode: recoveryCodes[0] },
      })
    );
    assert.strictEqual(useCode1.statusCode, 200);
    assert.strictEqual((useCode1.body.data as any).mfaVerified, true);

    // Tentative de rejeu du même code de secours -> rejeté 401
    const replayCode1 = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/auth/mfa/verify-recovery',
        user: adminActor,
        body: { recoveryCode: recoveryCodes[0] },
      })
    );
    assert.strictEqual(replayCode1.statusCode, 401);
    assert.strictEqual(replayCode1.body.error?.code, 'MFA_RECOVERY_CODE_INVALID_OR_USED');

    console.log('  ✅ [LOT3-01] Profil utilisateur, Anti-IDOR et codes de secours MFA à usage unique validés.');
  }

  // ==========================================================================
  // TEST 2 (MISSION 3.1) : DÉSACTIVATION & SUPPRESSION CONTRÔLÉE DE COMPTE
  // ==========================================================================
  console.log('🔹 [LOT3-02] Désactivation et suppression contrôlée (blocage si commande active)...');
  {
    // 2.1 Tentative de suppression du compte Client ayant une commande IN_TRANSIT -> Bloqué 409
    const deleteBlocked = app.handleRequest(
      buildTestContext({
        method: 'DELETE',
        path: '/api/v1/users/usr-client-01',
        user: clientActor,
      })
    );
    assert.strictEqual(deleteBlocked.statusCode, 409, 'Un compte avec commande en transit ne peut pas être supprimé');
    assert.strictEqual(deleteBlocked.body.error?.code, 'ACCOUNT_HAS_ACTIVE_OBLIGATIONS');

    // 2.2 Inscription d'un nouveau compte B2B sans commande active, puis désactivation et suppression contrôlée
    const regRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/auth/register',
        body: {
          email: 'ephemeral.buyer@maghreb-trade.ma',
          password: 'EphemeralPassword!2026',
          firstName: 'Karim',
          lastName: 'Tazi',
          companyName: 'Maghreb Trade SARL',
          country: 'Maroc',
          requestedRole: 'CLIENT',
          termsAccepted: true,
          privacyAccepted: true,
        },
      })
    );
    assert.strictEqual(regRes.statusCode, 201);
    const ephUserId = (regRes.body.data as any).userId;
    const ephActor: NonNullable<ServerRequestContext['user']> = {
      id: ephUserId,
      email: 'ephemeral.buyer@maghreb-trade.ma',
      role: 'CLIENT',
      sessionId: 'sess-lot3-eph-01',
      companyName: 'Maghreb Trade SARL',
      mfaVerified: true,
    };
    registerSingleActiveSession(ephActor.id, ephActor.sessionId, true);

    // Désactivation volontaire -> révoque immédiatement la session Redis
    const deactRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: `/api/v1/users/${ephUserId}/deactivate`,
        user: ephActor,
        body: { reason: 'Clôture temporaire de filiale.' },
      })
    );
    assert.strictEqual(deactRes.statusCode, 200);
    assert.strictEqual((deactRes.body.data as any).sessionsRevoked, true);

    // Toute requête ultérieure avec l'ancienne session de ephActor doit échouer en 401
    const afterDeactReq = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: `/api/v1/users/${ephUserId}`,
        user: ephActor,
      })
    );
    assert.strictEqual(afterDeactReq.statusCode, 401, 'La session du compte désactivé est immédiatement révoquée dans Redis');

    // Suppression contrôlée par l'Administrateur -> 200
    const delRes = app.handleRequest(
      buildTestContext({
        method: 'DELETE',
        path: `/api/v1/users/${ephUserId}`,
        user: adminActor,
        body: { reason: 'Clôture définitive validée.' },
      })
    );
    assert.strictEqual(delRes.statusCode, 200);
    assert.strictEqual((delRes.body.data as any).deleted, true);

    console.log('  ✅ [LOT3-02] Blocage de suppression sur commande active (409) et révocation Redis validés.');
  }

  // ==========================================================================
  // TEST 3 (MISSION 3.2) : GOUVERNANCE DES 7 ACTEURS & PERMISSIONS SERVEUR
  // ==========================================================================
  console.log('🔹 [LOT3-03] Vérification de la matrice des 7 acteurs TRADELINK...');
  {
    const rolesRes = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/actors/roles',
        user: clientActor,
      })
    );
    assert.strictEqual(rolesRes.statusCode, 200);
    const specs = rolesRes.body.data as any[];
    assert.strictEqual(specs.length, 7, 'Les 7 rôles du cahier des charges doivent être définis');

    const clientSpec = specs.find((s) => s.role === 'CLIENT');
    const comptableSpec = specs.find((s) => s.role === 'COMPTABLE');
    const adminSpec = specs.find((s) => s.role === 'ADMIN');
    const supportSpec = specs.find((s) => s.role === 'SUPPORT');

    assert.strictEqual(clientSpec.canCreateRoomLive, false, 'Le Client ne peut jamais créer une Room Live');
    assert.strictEqual(clientSpec.canJoinInvitedRoomLive, true);
    assert.strictEqual(comptableSpec.sourceCommercialDataAccess, 'READ_ONLY_AUDIT', 'Le Comptable est en lecture seule sur les données sources');
    assert.strictEqual(adminSpec.mfaMandatory, true, 'Le MFA est obligatoire pour l’Administrateur');
    assert.strictEqual(supportSpec.publicRegistrationAllowed, false);

    console.log('  ✅ [LOT3-03] Matrice de gouvernance des 7 acteurs vérifiée côté serveur.');
  }

  // ==========================================================================
  // TEST 4 (MISSION 3.3) : ENTREPRISES B2B, ISOLATION ANTI-IDOR, MEMBRES & INVITATIONS
  // ==========================================================================
  console.log('🔹 [LOT3-04] Entreprises B2B : Création, Isolation Anti-IDOR, Invitations HMAC & Permissions...');
  {
    // 4.1 Le Client consulte son entreprise (comp-atlas-01) -> 200
    const getOwnComp = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/companies/comp-atlas-01',
        user: clientActor,
      })
    );
    assert.strictEqual(getOwnComp.statusCode, 200);
    assert.strictEqual((getOwnComp.body.data as any).legalName, 'Atlas Import & Distribution SARL');

    // 4.2 ISOLATION INTER-ENTREPRISES (Anti-IDOR) : Le Fournisseur (EuroTech) tente d'accéder à l'entreprise du Client (Atlas) -> 403
    const idorCompanyRead = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/companies/comp-atlas-01',
        user: supplierActor,
      })
    );
    assert.strictEqual(idorCompanyRead.statusCode, 403, 'Isolation inter-entreprises : EuroTech ne peut pas lire Atlas');
    assert.strictEqual(idorCompanyRead.body.error?.code, 'COMPANY_ISOLATION_IDOR_VIOLATION');

    const idorCompanyEdit = app.handleRequest(
      buildTestContext({
        method: 'PUT',
        path: '/api/v1/companies/comp-atlas-01',
        user: supplierActor,
        body: { legalName: 'Tentative Sabotage' },
      })
    );
    assert.strictEqual(idorCompanyEdit.statusCode, 403);

    // 4.3 Le Comptable peut consulter en lecture seule (200) mais ne peut JAMAIS modifier (403)
    const comptableReadComp = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/companies/comp-atlas-01',
        user: accountantActor,
      })
    );
    assert.strictEqual(comptableReadComp.statusCode, 200);

    const comptableEditComp = app.handleRequest(
      buildTestContext({
        method: 'PUT',
        path: '/api/v1/companies/comp-atlas-01',
        user: accountantActor,
        body: { legalCapital: '9999999' },
      })
    );
    assert.strictEqual(comptableEditComp.statusCode, 403, 'Le Comptable ne peut pas modifier une entreprise');

    // 4.4 Dépôt d'un document justificatif d'entreprise : rejet si QUARANTINED (400), succès si CLEAN (201)
    const docQuarantinedRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/companies/comp-atlas-01/documents',
        user: clientActor,
        body: {
          docType: 'RNE_KBIS',
          title: 'Extrait RNE non scanné',
          fileName: 'rne_unscanned.pdf',
          fileSizeBytes: 150000,
          mimeType: 'application/pdf',
          virusScanStatus: 'QUARANTINED',
        },
      })
    );
    assert.strictEqual(docQuarantinedRes.statusCode, 400);
    assert.strictEqual(docQuarantinedRes.body.error?.code, 'COMPANY_DOCUMENT_NOT_CLEAN');

    const docCleanRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/companies/comp-atlas-01/documents',
        user: clientActor,
        body: {
          docType: 'RNE_KBIS',
          title: 'Extrait RNE Certifié 2026',
          fileName: 'rne_certifie_2026.pdf',
          fileSizeBytes: 150000,
          mimeType: 'application/pdf',
          virusScanStatus: 'CLEAN',
        },
      })
    );
    assert.strictEqual(docCleanRes.statusCode, 201);

    // 4.5 Invitation d'un nouveau membre (COMPANY_BUYER) avec jeton signé HMAC
    const inviteRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: '/api/v1/companies/comp-atlas-01/invitations',
        user: clientActor,
        body: {
          invitedEmail: 'a.berrada@atlas-import.ma',
          targetInternalRole: 'COMPANY_BUYER',
        },
      })
    );
    assert.strictEqual(inviteRes.statusCode, 201);
    const { invitation, rawInvitationToken } = inviteRes.body.data as any;

    // Tentative d'acceptation de l'invitation par un mauvais utilisateur (h.weber@eurotech-supply.de) -> 403
    const hijackInviteRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: `/api/v1/companies/comp-atlas-01/invitations/${invitation.id}/accept`,
        user: supplierActor,
        body: { token: rawInvitationToken },
      })
    );
    assert.strictEqual(hijackInviteRes.statusCode, 403);
    assert.strictEqual(hijackInviteRes.body.error?.code, 'COMPANY_INVITATION_EMAIL_MISMATCH');

    // Acceptation légitime par a.berrada@atlas-import.ma
    const buyerMemberActor: NonNullable<ServerRequestContext['user']> = {
      id: 'usr-atlas-buyer-02',
      email: 'a.berrada@atlas-import.ma',
      role: 'CLIENT',
      sessionId: 'sess-lot3-buyer-02',
      companyName: 'Atlas Import & Distribution SARL',
      mfaVerified: true,
    };
    registerSingleActiveSession(buyerMemberActor.id, buyerMemberActor.sessionId, true);

    const acceptInviteRes = app.handleRequest(
      buildTestContext({
        method: 'POST',
        path: `/api/v1/companies/comp-atlas-01/invitations/${invitation.id}/accept`,
        user: buyerMemberActor,
        body: { token: rawInvitationToken },
      })
    );
    assert.strictEqual(acceptInviteRes.statusCode, 200);
    const createdMember = acceptInviteRes.body.data as any;
    assert.strictEqual(createdMember.internalRole, 'COMPANY_BUYER');

    // 4.6 Contrôle des permissions internes : le membre COMPANY_BUYER peut lire l'entreprise (200)
    // mais ne peut PAS modifier le profil légal de l'entreprise (403 COMPANY_INTERNAL_PERMISSION_DENIED)
    const buyerReadComp = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/companies/comp-atlas-01',
        user: buyerMemberActor,
      })
    );
    assert.strictEqual(buyerReadComp.statusCode, 200);

    const buyerEditComp = app.handleRequest(
      buildTestContext({
        method: 'PUT',
        path: '/api/v1/companies/comp-atlas-01',
        user: buyerMemberActor,
        body: { city: 'Marrakech' },
      })
    );
    assert.strictEqual(buyerEditComp.statusCode, 403);
    assert.strictEqual(buyerEditComp.body.error?.code, 'COMPANY_INTERNAL_PERMISSION_DENIED');

    // 4.7 Protection du dernier propriétaire légal (COMPANY_OWNER) contre l'auto-suppression -> 400
    const removeOwnerAttempt = app.handleRequest(
      buildTestContext({
        method: 'DELETE',
        path: '/api/v1/companies/comp-atlas-01/members/mem-atlas-01',
        user: clientActor,
      })
    );
    assert.strictEqual(removeOwnerAttempt.statusCode, 400);
    assert.strictEqual(removeOwnerAttempt.body.error?.code, 'CANNOT_REMOVE_LAST_COMPANY_OWNER');

    // Vérification de l'historique immuable de l'entreprise
    const historyRes = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/companies/comp-atlas-01/history',
        user: clientActor,
      })
    );
    assert.strictEqual(historyRes.statusCode, 200);
    assert.ok((historyRes.body.data as any[]).length >= 4);

    console.log('  ✅ [LOT3-04] Entreprises B2B, isolation Anti-IDOR, invitations HMAC et permissions internes validées.');
  }

  // ==========================================================================
  // TEST 5 (MISSION 3.4 & 3.5) : ESPACE UTILISATEUR PAR ACTEUR & SYNC POSTGRESQL
  // ==========================================================================
  console.log('🔹 [LOT3-05] Espaces utilisateurs par acteur (/api/v1/workspace/me) & Sync PostgreSQL 16...');
  {
    const clientWsRes = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/workspace/me',
        user: clientActor,
      })
    );
    assert.strictEqual(clientWsRes.statusCode, 200);
    const clientWs = clientWsRes.body.data as any;
    assert.strictEqual(clientWs.role, 'CLIENT');
    assert.strictEqual(clientWs.workspacePath, '/client');
    assert.strictEqual(clientWs.dashboardSummary.canCreateRoomLive, false);
    assert.strictEqual(clientWs.company.id, 'comp-atlas-01');

    const supplierWsRes = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/workspace/me',
        user: supplierActor,
      })
    );
    assert.strictEqual(supplierWsRes.statusCode, 200);
    const supplierWs = supplierWsRes.body.data as any;
    assert.strictEqual(supplierWs.role, 'FOURNISSEUR');
    assert.strictEqual(supplierWs.dashboardSummary.canCreateRoomLive, true);
    assert.strictEqual(supplierWs.company.id, 'comp-eurotech-01');

    // Blocage Anti-IDOR sur /api/v1/users/:id/workspace
    const idorWsRes = app.handleRequest(
      buildTestContext({
        method: 'GET',
        path: '/api/v1/users/usr-client-01/workspace',
        user: supplierActor,
      })
    );
    assert.strictEqual(idorWsRes.statusCode, 403);

    // Synchronisation relationnelle PostgreSQL 16
    const syncRes = await repo.syncToPostgresRelationalTables();
    assert.ok(syncRes.totalRowsSynced >= 5);

    console.log('  ✅ [LOT3-05] Espaces utilisateurs adaptés par acteur et synchronisation PostgreSQL 16 validés.');
  }

  console.log('\n================================================================================');
  console.log('🎉 SUITE DE TESTS LOT 3 (COMPTES, ACTEURS & ENTREPRISES B2B) : 5/5 BLOCS RÉUSSIS !');
  console.log('================================================================================\n');
}

runLot3AuthUsersActorsCompaniesTests().catch((err) => {
  console.error('\n❌ ÉCHEC DANS LA SUITE DE TESTS LOT 3 :', err);
  process.exit(1);
});
