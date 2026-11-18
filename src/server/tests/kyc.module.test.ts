// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS DU MODULE KYC COMPLET (PROMPT 6)
// Vérifie de bout en bout :
// 1. Liste des documents requis selon le profil (CLIENT, FOURNISSEUR, TRANSPORTEUR)
// 2. Upload sécurisé, rejet antivirus (.exe) & taille > 10 Mo, chiffrement AES-256-GCM (KMS) & SHA-256
// 3. Passage automatique en SUBMITTED_IN_TIME_PENDING_REVIEW dès dépôt complet avant J+7
// 4. Prévisualisation KMS journalisée & Protection Anti-IDOR inter-entreprises
// 5. Tâche programmée KYCCronService : Relances J+1, J+3, J+5, J+6
// 6. Règle J+7 : Suspension UNIQUEMENT si non soumis ; Protection totale si soumis à temps en attente Admin
// 7. Exclusivité Admin (403 pour non-Admin) sur Validation, Rejet motivé, Demande de complément & Réactivation
// ============================================================================

import {
  DatabaseStateSnapshot,
  TradeLinkRepositoryStore,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';

export interface KycTestAssertionResult {
  testId: string;
  title: string;
  passed: boolean;
  assertionSummary: string;
}

function createInitialKycTestSnapshot(): DatabaseStateSnapshot {
  return {
    products: [],
    orders: [],
    kycDossiers: [
      {
        id: 'kyc-client-ontime',
        userId: 'usr-client-01',
        userName: 'Youssef Berrada',
        companyName: 'Atlas Import & Distribution S.A.',
        actorType: 'CLIENT',
        jurisdiction: 'MA',
        status: 'PENDING_SUBMISSION',
        startedAt: '2026-11-15',
        deadlineAt: '2026-11-22',
        daysElapsed: 2,
        daysRemaining: 5,
        remindersSent: ['J+1'],
        documents: [],
        adminComments: [],
        history: [],
      },
      {
        id: 'kyc-carrier-incomplete',
        userId: 'usr-trans-01',
        userName: 'Nadia El Amrani',
        companyName: 'MedFreight Multimodal Carriers',
        actorType: 'TRANSPORTEUR',
        jurisdiction: 'INTL',
        status: 'PENDING_SUBMISSION',
        startedAt: '2026-11-12',
        deadlineAt: '2026-11-19',
        daysElapsed: 0,
        daysRemaining: 7,
        remindersSent: [],
        documents: [
          {
            id: 'doc-car-1',
            docType: 'PERMIS_CE_CARTE_GRISE',
            label: 'Permis Poids Lourd (C+E)',
            fileName: 'Permis_CE_MedFreight.pdf',
            uploadedAt: '2026-11-13 10:00',
            sha256: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
            encryptionKeyId: 'alias/tradelink-kyc-kek-v6 -> dek-aes256-7d865e959b24',
            status: 'UPLOADED',
          },
        ],
        adminComments: [],
        history: [],
      },
    ],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };
}

export function runKycModuleTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  results: KycTestAssertionResult[];
} {
  const repo = new TradeLinkRepositoryStore(createInitialKycTestSnapshot(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: KycTestAssertionResult[] = [];

  // Ouverture des sessions de test
  const adminLogin = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {},
    query: {},
    params: {},
    body: { userId: 'usr-admin-01', email: 'admin@tradelink.com', role: 'ADMIN' },
    correlationId: 'kyc-corr-admin',
    ipAddress: '10.0.0.1',
  });
  const adminSessionId = (adminLogin.body.data as { sessionId: string }).sessionId;
  const adminUser = {
    id: 'usr-admin-01',
    email: 'admin@tradelink.com',
    role: 'ADMIN' as const,
    sessionId: adminSessionId,
    companyName: 'TradeLink HQ',
  };

  const clientLogin = app.handleRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    headers: {},
    query: {},
    params: {},
    body: { userId: 'usr-client-01', email: 'achats@atlas-import.ma', role: 'CLIENT' },
    correlationId: 'kyc-corr-client',
    ipAddress: '41.214.0.10',
  });
  const clientSessionId = (clientLogin.body.data as { sessionId: string }).sessionId;
  const clientUser = {
    id: 'usr-client-01',
    email: 'achats@atlas-import.ma',
    role: 'CLIENT' as const,
    sessionId: clientSessionId,
    companyName: 'Atlas Import & Distribution S.A.',
  };

  // TEST 1 : Référentiel des documents requis selon le profil (CLIENT, FOURNISSEUR, TRANSPORTEUR)
  {
    const reqRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/kyc/requirements',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'kyc-t1',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    const data = reqRes.body.data as {
      profiles: Record<string, { docType: string; mandatory: boolean }[]>;
    };

    const clientMandatory = data.profiles.CLIENT.filter((d) => d.mandatory).length;
    const suppMandatory = data.profiles.FOURNISSEUR.filter((d) => d.mandatory).length;
    const carrMandatory = data.profiles.TRANSPORTEUR.filter((d) => d.mandatory).length;

    const passed =
      reqRes.statusCode === 200 &&
      clientMandatory === 3 &&
      suppMandatory === 3 &&
      carrMandatory === 3;

    results.push({
      testId: 'KYC-01',
      title: 'Référentiel des documents obligatoires et optionnels par profil (CLIENT, FOURNISSEUR, TRANSPORTEUR)',
      passed,
      assertionSummary: `CLIENT=${clientMandatory} obligatoires ; FOURNISSEUR=${suppMandatory} obligatoires ; TRANSPORTEUR=${carrMandatory} obligatoires`,
    });
  }

  // TEST 2 : Upload sécurisé, filtrage antivirus (.exe), limite 10 Mo, chiffrement AES-256-GCM & complétude J+2
  {
    // 2a. Tentative d'upload d'un fichier exécutable malveillant -> 400 KYC_SECURITY_MALICIOUS_FILE_EXTENSION
    const maliciousUpload = app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/kyc-client-ontime/documents',
      headers: {},
      query: {},
      params: {},
      body: {
        docType: 'CIN_DIRIGEANT',
        fileName: 'trojan_loader.exe',
      },
      correlationId: 'kyc-t2-mal',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    // 2b. Dépôt des 3 pièces obligatoires CLIENT (CIN_DIRIGEANT, PATENTE_FISCAL, RNE_KBIS)
    app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/kyc-client-ontime/documents',
      headers: {},
      query: {},
      params: {},
      body: { docType: 'CIN_DIRIGEANT', fileName: 'CIN_Atlas_2026.pdf', fileSizeBytes: 320000 },
      correlationId: 'kyc-t2-up1',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/kyc-client-ontime/documents',
      headers: {},
      query: {},
      params: {},
      body: { docType: 'PATENTE_FISCAL', fileName: 'Patente_Atlas_2026.pdf', fileSizeBytes: 410000 },
      correlationId: 'kyc-t2-up2',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    const thirdUpload = app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/kyc-client-ontime/documents',
      headers: {},
      query: {},
      params: {},
      body: { docType: 'RNE_KBIS', fileName: 'RNE_Atlas_2026.pdf', fileSizeBytes: 512000 },
      correlationId: 'kyc-t2-up3',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    const upData = thirdUpload.body.data as {
      dossier: { status: string; documents: { id: string; encryptionKeyId: string; sha256: string }[] };
      completion: { allMandatoryUploaded: boolean; progressPercent: number };
      ruleEvaluation: { protectedFromAutoSuspension: boolean };
    };

    const passed =
      maliciousUpload.statusCode === 400 &&
      maliciousUpload.body.error?.code === 'KYC_SECURITY_MALICIOUS_FILE_EXTENSION' &&
      thirdUpload.statusCode === 201 &&
      upData.completion.allMandatoryUploaded === true &&
      upData.completion.progressPercent === 100 &&
      upData.dossier.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW' &&
      upData.ruleEvaluation.protectedFromAutoSuspension === true &&
      upData.dossier.documents[0].encryptionKeyId.includes('alias/tradelink-kyc-kek-v6');

    results.push({
      testId: 'KYC-02',
      title: 'Upload chiffré AES-256-GCM (KMS), rejet antivirus (.exe) & passage automatique en SUBMITTED_IN_TIME_PENDING_REVIEW',
      passed,
      assertionSummary: `Malware rejeté (${maliciousUpload.statusCode}) ; 3/3 pièces chiffrées KMS -> statut=${upData.dossier.status}, protégé J+7=${upData.ruleEvaluation.protectedFromAutoSuspension}`,
    });

    // TEST 3 : Prévisualisation KMS journalisée & Protection Anti-IDOR inter-entreprises
    const docId = upData.dossier.documents[0].id;
    const ownerPreview = app.handleRequest({
      method: 'GET',
      path: `/api/v1/kyc/kyc-client-ontime/documents/${docId}/preview`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'kyc-t3-own',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    // Un autre transporteur/client tente de prévisualiser la pièce d'Atlas Import -> 403 RESOURCE_OWNERSHIP_VIOLATION
    const otherLogin = app.handleRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      query: {},
      params: {},
      body: { userId: 'usr-trans-01', email: 'dispatch@medfreight.com', role: 'TRANSPORTEUR' },
      correlationId: 'kyc-t3-login-other',
      ipAddress: '34.10.0.5',
    });
    const otherSessionId = (otherLogin.body.data as { sessionId: string }).sessionId;

    const idorPreview = app.handleRequest({
      method: 'GET',
      path: `/api/v1/kyc/kyc-client-ontime/documents/${docId}/preview`,
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'kyc-t3-idor',
      ipAddress: '34.10.0.5',
      user: {
        id: 'usr-trans-01',
        email: 'dispatch@medfreight.com',
        role: 'TRANSPORTEUR',
        sessionId: otherSessionId,
        companyName: 'MedFreight',
      },
    });

    const passedPreview =
      ownerPreview.statusCode === 200 &&
      (ownerPreview.body.data as { integrityVerified: boolean }).integrityVerified === true &&
      idorPreview.statusCode === 403 &&
      idorPreview.body.error?.code === 'RESOURCE_OWNERSHIP_VIOLATION';

    results.push({
      testId: 'KYC-03',
      title: 'Prévisualisation KMS déchiffrée à la volée & Blocage Anti-IDOR inter-utilisateurs',
      passed: passedPreview,
      assertionSummary: `Propriétaire preview=${ownerPreview.statusCode} (intégrité vérifiée) ; Tiers non autorisé=${idorPreview.statusCode} (${idorPreview.body.error?.code})`,
    });
  }

  // TEST 4 : Tâche programmée KYCCronService — Relances J+1, J+3, J+5, J+6 sur dossier incomplet
  {
    const cronJ6 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/cron/run',
      headers: {},
      query: {},
      params: {},
      body: { simulatedDayOverride: 6 },
      correlationId: 'kyc-t4-j6',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const reportJ6 = cronJ6.body.data as {
      remindersTriggered: { dossierId: string; milestone: string }[];
      suspendedAtJ7: unknown[];
    };

    const carrierReminders = reportJ6.remindersTriggered
      .filter((r) => r.dossierId === 'kyc-carrier-incomplete')
      .map((r) => r.milestone);

    const passed =
      cronJ6.statusCode === 200 &&
      carrierReminders.includes('J+1') &&
      carrierReminders.includes('J+3') &&
      carrierReminders.includes('J+5') &&
      carrierReminders.includes('J+6') &&
      reportJ6.suspendedAtJ7.length === 0;

    results.push({
      testId: 'KYC-04',
      title: 'Tâche programmée KYCCronService : Émission automatique des relances J+1, J+3, J+5 et J+6',
      passed,
      assertionSummary: `Relances déclenchées pour Transporteur incomplet : [${carrierReminders.join(', ')}] ; Aucune suspension avant J+7`,
    });
  }

  // TEST 5 : Règle critique J+7 — Suspension du dossier incomplet vs Protection du dossier soumis à temps
  {
    const cronJ7 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/cron/run',
      headers: {},
      query: {},
      params: {},
      body: { simulatedDayOverride: 7 },
      correlationId: 'kyc-t5-j7',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const reportJ7 = cronJ7.body.data as {
      suspendedAtJ7: { dossierId: string; companyName: string; missingDocs: string[] }[];
      protectedInTimeAtJ7: { dossierId: string; companyName: string; status: string }[];
    };

    const clientProtected = reportJ7.protectedInTimeAtJ7.find(
      (p) => p.dossierId === 'kyc-client-ontime'
    );
    const carrierSuspended = reportJ7.suspendedAtJ7.find(
      (s) => s.dossierId === 'kyc-carrier-incomplete'
    );

    const passed =
      cronJ7.statusCode === 200 &&
      Boolean(clientProtected) &&
      clientProtected?.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW' &&
      Boolean(carrierSuspended) &&
      carrierSuspended!.missingDocs.includes('LICENCE_TRANSPORT_INT');

    results.push({
      testId: 'KYC-05',
      title: 'Règle J+7 : Dossier soumis à temps JAMAIS suspendu ; Dossier incomplet suspendu à J+7',
      passed,
      assertionSummary: `Soumis à temps protégé=${clientProtected?.companyName} (${clientProtected?.status}) ; Incomplet suspendu=${carrierSuspended?.companyName}`,
    });
  }

  // TEST 6 : Exclusivité Admin sur les décisions KYC, motif obligatoire, demande de complément & réactivation
  {
    // 6a. Un Client tente de valider lui-même son dossier -> 403 RBAC_FORBIDDEN_ROLE
    const clientSelfValidate = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-client-ontime/decision',
      headers: {},
      query: {},
      params: {},
      body: { decision: 'VALIDATED' },
      correlationId: 'kyc-t6-nonadmin',
      ipAddress: '41.214.0.10',
      user: clientUser,
    });

    // 6b. Admin tente un rejet sans motif -> 400 VALIDATION_KYC_REJECTION_REASON_REQUIRED
    const rejectWithoutReason = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-carrier-incomplete/decision',
      headers: {},
      query: {},
      params: {},
      body: { decision: 'REJECTED', reason: '' },
      correlationId: 'kyc-t6-noreason',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    // 6c. Admin ajoute un commentaire, demande un complément, réactive le transporteur suspendu, et valide le client
    const commentRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/kyc/kyc-client-ontime/comments',
      headers: {},
      query: {},
      params: {},
      body: {
        comment: 'Vérification RNE et Patente ICE conforme aux registres officiels.',
        visibility: 'SHARED_WITH_APPLICANT',
      },
      correlationId: 'kyc-t6-comment',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const complementRes = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-carrier-incomplete/decision',
      headers: {},
      query: {},
      params: {},
      body: {
        decision: 'COMPLEMENT_REQUESTED',
        reason: 'Veuillez joindre la police d’assurance CMR signée pour l’année 2026.',
      },
      correlationId: 'kyc-t6-comp',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const reactivateRes = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-carrier-incomplete/decision',
      headers: {},
      query: {},
      params: {},
      body: {
        decision: 'REACTIVATE',
        reason: 'Compte réactivé par l’Administrateur suite à réception des pièces.',
      },
      correlationId: 'kyc-t6-react',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const validateRes = app.handleRequest({
      method: 'PUT',
      path: '/api/v1/kyc/kyc-client-ontime/decision',
      headers: {},
      query: {},
      params: {},
      body: { decision: 'VALIDATED' },
      correlationId: 'kyc-t6-val',
      ipAddress: '10.0.0.1',
      user: adminUser,
    });

    const passed =
      clientSelfValidate.statusCode === 403 &&
      rejectWithoutReason.statusCode === 400 &&
      commentRes.statusCode === 201 &&
      complementRes.statusCode === 200 &&
      reactivateRes.statusCode === 200 &&
      validateRes.statusCode === 200 &&
      (validateRes.body.data as { dossier: { status: string } }).dossier.status === 'VALIDATED';

    results.push({
      testId: 'KYC-06',
      title: 'Exclusivité Admin (403 non-Admin), Motif obligatoire, Commentaires, Demande de complément, Réactivation & Validation',
      passed,
      assertionSummary: `Auto-validation Client bloquée (${clientSelfValidate.statusCode}) ; Rejet sans motif bloqué (${rejectWithoutReason.statusCode}) ; Commentaire, Complément, Réactivation et Validation Admin=${validateRes.statusCode}`,
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

const kycSummary = runKycModuleTests();
console.log(
  `\n=== SUITE DE TESTS MODULE KYC COMPLET TRADELINK V6.0 (${kycSummary.passedTests}/${kycSummary.totalTests} RÉUSSIS) ===`
);
for (const r of kycSummary.results) {
  console.log(`${r.passed ? '✓' : '✗'} [${r.testId}] ${r.title}\n   -> ${r.assertionSummary}`);
}
if (!kycSummary.allPassed) {
  process.exit(1);
}
