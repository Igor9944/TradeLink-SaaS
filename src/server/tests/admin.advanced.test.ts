// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS INTÉGRATION ADMINISTRATION AVANCÉE, IMPORTS,
// KMS, SAUVEGARDES, SANDBOX ISOLÉE ET AUDIT IMMUABLE
// Conforme au PROMPT 11 et Chapitres 7.3, 12.1, 12.3
// - [ADM-01] Imports & Exports multi-formats (CSV, XLSX, JSON, SQL, BAK, DBF, CDX)
// - [ADM-02] Sandbox Isolée : analyse de dumps, détection schémas, erreurs & mappings
// - [ADM-03] Double Approbation Admin : interdiction stricte d'auto-approbation & liaison planHash
// - [ADM-04] KMS & Chiffrement par Enveloppe AES-256-GCM : rotation KEK & zero secret brut
// - [ADM-05] Sauvegardes : intégrité cryptographique SHA-256 & test de restauration en sandbox isolée
// - [ADM-06] Journal d'Audit Append-Only : scellement par chaîne de hachage SHA-256 & détection de falsification
// - [ADM-07] Contrôleurs & Routes API HTTP : validation RBAC Admin et codes HTTP conformes
// ============================================================================

import {
  analyzeFileInIsolatedSandbox,
  buildAuditChainFromLogs,
  exportDatasetToFormat,
  ImportExportFormat,
  rotateKmsMasterKey,
  SandboxAnalysisReport,
  simulateEnvelopeEncryption,
  validateDualAdminOperation,
  verifyAuditLogChainIntegrity,
  verifyBackupCryptographicIntegrity,
} from '../../services/adminAdvancedEngine';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  ServerRequestContext,
  registerSingleActiveSession,
} from '../middlewares/errorAndSecurity.middleware';
import { BackupRecord, KMSKeyRecord, UserRoleCode } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

function createInitialAdminTestDatabase(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-001',
        sku: 'IND-SENS-7701',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech GmbH',
        category: 'Capteurs & IoT',
        name: { fr: 'Capteur Température Industriel PT100', en: 'PT100 Sensor', ar: 'مستشعر حرارة صناعي' },
        description: { fr: 'Sonde platine classe A', en: 'Platinum probe', ar: 'مسبار بلاتيني' },
        unitPrice: '145.00',
        currency: 'EUR',
        taxRate: '20.0',
        unit: 'pièce',
        stockAvailable: 50,
        stockReserved: 0,
        minStockAlert: 10,
        icon3d: 'parcel-stack',
        originCountry: 'DE',
        incoterm: 'CIP',
        leadTimeDays: 5,
        isPublished: true,
      },
    ],
    orders: [
      {
        id: 'ord-001',
        orderNumber: 'CMD-2026-001',
        clientId: 'usr-client-01',
        clientName: 'Atlas Import & Distribution S.A.',
        supplierId: 'usr-supp-01',
        supplierName: 'EuroTech Industrial GmbH',
        status: 'ACCEPTED',
        subtotalAmount: '1450.00',
        taxAmount: '290.00',
        shippingAmount: '0.00',
        totalAmount: '1740.00',
        currency: 'EUR',
        shippingAddress: '15 Boulevard d’Anfa, Casablanca, Maroc',
        createdAt: '2026-11-02 10:00',
        items: [
          {
            productId: 'prod-001',
            sku: 'IND-SENS-7701',
            name: 'Capteur PT100',
            quantity: 10,
            unitPrice: '145.00',
            totalLine: '1450.00',
            icon3d: 'parcel-stack',
          },
        ],
        timeline: [],
      },
    ],
    accountingEntries: [
      {
        id: 'ecr-001',
        entryNumber: 'ECR-2026-001',
        journalCode: 'VTE',
        date: '2026-11-02',
        fiscalPeriod: '2026-11',
        pieceReference: 'FAC-2026-001',
        description: 'Vente CMD-2026-001',
        totalDebit: '1740.00',
        totalCredit: '1740.00',
        isBalanced: true,
        validatedAt: '2026-11-02 10:05',
        validatedBy: 'Claire Dubois',
        lines: [
          {
            id: 'l1',
            accountCode: '411000',
            accountName: 'Clients',
            label: 'Client Atlas',
            debit: '1740.00',
            credit: '0.00',
          },
          {
            id: 'l2',
            accountCode: '707000',
            accountName: 'Ventes',
            label: 'Vente PT100',
            debit: '0.00',
            credit: '1740.00',
          },
        ],
      },
    ],
    backups: [
      {
        id: 'bkp-test-01',
        backupCode: 'BKP-FULL-20261118-0200',
        type: 'FULL_SCHEDULED',
        sizeFormatted: '4.82 GB (Chiffré AES-256-GCM)',
        encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
        sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
        status: 'VERIFIED',
        restoreStatus: 'PENDING_SECOND_APPROVAL',
        restoreInitiatorId: 'usr-admin-01',
        restoreInitiatorName: 'Karim Mansouri (Admin #1)',
        planHash: 'PLAN-IMMUTABLE-99281A',
        createdAt: '2026-11-18 02:00:00',
      },
    ],
    auditLogs: [
      {
        id: 'aud-001',
        timestamp: '2026-11-18 01:00:00',
        actorName: 'system',
        actorRole: 'ADMIN' as UserRoleCode,
        action: 'SYSTEM_BOOT',
        targetType: 'Server',
        targetId: 'SRV-01',
        result: 'SUCCESS',
        correlationId: 'corr-init-001',
        ipAddress: '127.0.0.1',
        details: 'Initialisation du cluster souverain TradeLink V6.0.',
      },
      {
        id: 'aud-002',
        timestamp: '2026-11-18 01:15:00',
        actorName: 'Karim Mansouri (Admin #1)',
        actorRole: 'ADMIN' as UserRoleCode,
        action: 'KMS_KEK_AUDIT_CHECK',
        targetType: 'KMSKey',
        targetId: 'alias/tradelink-prod-kek-v4',
        result: 'SUCCESS',
        correlationId: 'corr-init-002',
        ipAddress: '192.168.1.10',
        details: 'Contrôle d’intégrité du module matériel HSM Vault.',
      },
    ],
    kycDossiers: [],
    rooms: [],
    calcHistory: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [],
    incidents: [],
    vehicles: [],
    logisticsMissions: [],
    transportDocuments: [],
  };
}

const ADMIN_1_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-admin-01',
  email: 'direction.sec@tradelink-saas.com',
  role: 'ADMIN',
  sessionId: 'sess-admin-01',
  companyName: 'TRADELINK SECURITY OPS',
  mfaVerified: true,
};

const ADMIN_2_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-admin-02',
  email: 'ciso.approver@tradelink-saas.com',
  role: 'ADMIN',
  sessionId: 'sess-admin-02',
  companyName: 'TRADELINK SECURITY OPS',
  mfaVerified: true,
};

const CLIENT_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-client-01',
  email: 'achats@atlas-distribution.ma',
  role: 'CLIENT',
  sessionId: 'sess-client-01',
  companyName: 'Atlas Import & Distribution S.A.',
  mfaVerified: false,
};

export async function runAdminAdvancedTestSuite() {
  console.log('====================================================================');
  console.log('TRADELINK V6.0 — EXÉCUTION SUITE PROMPT 11 : ADMINISTRATION AVANCÉE,');
  console.log('IMPORTS, KMS, SAUVEGARDES, SANDBOX ISOLÉE ET AUDIT IMMUABLE');
  console.log('====================================================================\n');

  // Enregistrement des sessions actives conformes à la Single Active Session Policy
  registerSingleActiveSession(ADMIN_1_USER.id, ADMIN_1_USER.sessionId, true);
  registerSingleActiveSession(ADMIN_2_USER.id, ADMIN_2_USER.sessionId, true);
  registerSingleActiveSession(CLIENT_USER.id, CLIENT_USER.sessionId, false);

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1 : [ADM-01] Exports Multi-Formats (CSV, XLSX, JSON, SQL, BAK, DBF, CDX)
  // --------------------------------------------------------------------------
  console.log('TEST 1 : [ADM-01] Moteur d\'Exports Multi-Formats (CSV, XLSX, JSON, SQL, BAK, DBF, CDX)...');
  const sampleProducts = createInitialAdminTestDatabase().products;
  const formats: ImportExportFormat[] = ['CSV', 'XLSX', 'JSON', 'SQL', 'BAK', 'DBF', 'CDX'];

  for (const fmt of formats) {
    const exported = exportDatasetToFormat({
      entityName: 'PRODUCTS',
      records: sampleProducts,
      format: fmt,
    });

    assert(Boolean(exported.fileName), `Nom de fichier généré pour format ${fmt}`);
    assert(Boolean(exported.mimeType), `Mime-type défini pour format ${fmt}`);
    assert(exported.rowsCount === sampleProducts.length, `Comptage des lignes exportées conforme (${fmt})`);
    assert(Boolean(exported.sha256 && exported.sha256.length === 64), `Empreinte SHA-256 256 bits valide (${fmt})`);

    if (fmt === 'JSON') {
      const parsed = JSON.parse(exported.content);
      assert(Array.isArray(parsed.data) && parsed.data.length === 1, 'Export JSON valide et analysable');
    }
    if (fmt === 'CSV') {
      assert(exported.content.includes('sku') && exported.content.includes('unitPrice'), 'Export CSV contient en-têtes RFC 4180');
    }
    if (fmt === 'SQL') {
      assert(exported.content.includes('INSERT INTO "tl_products"'), 'Export SQL contient requêtes INSERT ANSI');
    }
    if (fmt === 'DBF') {
      assert(exported.content.includes('[DBF_HEADER: FoxPro 2.6 / Visual FoxPro 9.0 Table Descriptor]'), 'Export DBF contient descripteur de table FoxPro');
    }
    if (fmt === 'CDX') {
      assert(exported.content.includes('[CDX_INDEX_HEADER: Visual FoxPro Compound Index Tree]'), 'Export CDX encapsulé avec header B-Tree');
    }
    if (fmt === 'BAK') {
      assert(exported.content.includes('[MSSQL_BACKUP_STREAM: Microsoft SQL Server Database Backup 2022]'), 'Export BAK encapsulé conteneur archive');
    }
    if (fmt === 'XLSX') {
      assert(exported.content.includes('urn:schemas-microsoft-com:office:spreadsheet'), 'Export XLSX SpreadsheetML XML valide');
    }
  }
  console.log('  -> [PASS] Les 7 formats de données sont fidèlement produits avec signatures et hachages SHA-256.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2 : [ADM-02] Sandbox Isolée : Analyse de Dumps, Schémas, Erreurs & Mappings
  // --------------------------------------------------------------------------
  console.log('TEST 2 : [ADM-02] Analyse en Sandbox Éphémère Isolée (Réseau OFF, Secrets OFF)...');
  const dbfAnalysis = analyzeFileInIsolatedSandbox({
    fileName: 'Tarifs_Douaniers_SH_2026.dbf',
    fileSize: 4200000,
    format: 'DBF',
  });

  assert(dbfAnalysis.format === 'DBF', 'Format DBF détecté');
  assert(dbfAnalysis.isolatedNetworkVerified === true, 'Garantie Sandbox : Réseau totalement coupé');
  assert(dbfAnalysis.productionSecretsStripped === true, 'Garantie Sandbox : Secrets et clés de production masqués');
  assert(dbfAnalysis.avScanStatus === 'CLEAN', 'Scan antivirus ClamAV clean');
  assert(dbfAnalysis.totalRowsDetected > 0, 'Comptage des lignes détectées non nul');
  assert(dbfAnalysis.tablesDetected.length > 0, 'Structure de table détectée');
  assert(dbfAnalysis.fieldMappings.length > 0, 'Recommandations de mapping de champs générées');
  assert(Boolean(dbfAnalysis.migrationPlanHash && dbfAnalysis.migrationPlanHash.length === 64), 'Empreinte de plan migrationPlanHash SHA-256 calculée');

  const bakAnalysis = analyzeFileInIsolatedSandbox({
    fileName: 'Archive_Catalogue_ERP_2026.bak',
    fileSize: 85000000,
    format: 'BAK',
  });
  assert(bakAnalysis.format === 'BAK', 'Format BAK SQL Server détecté');
  assert(bakAnalysis.requiresDualAdmin === true, 'Dumps dangereux BAK soumission obligatoire à la double approbation');
  assert(bakAnalysis.detectedErrors.length > 0, 'Détection préventive des avertissements de structure');
  console.log('  -> [PASS] L\'environnement Sandbox garantit l\'étanchéité totale, détecte les schémas et scelle le planHash.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3 : [ADM-03] Double Approbation Admin : Règle Anti-Auto-Approbation & planHash
  // --------------------------------------------------------------------------
  console.log('TEST 3 : [ADM-03] Validation de la Règle d\'Interdiction d\'Auto-Approbation (Dual Admin)...');
  const reportForPromotion = bakAnalysis;

  // Tentative 1 : Auto-approbation par l'initiateur (Admin #1)
  const selfApprovalAttempt = validateDualAdminOperation({
    initiatorId: 'usr-admin-01',
    approverId: 'usr-admin-01', // Même personne !
    actionCode: 'SANDBOX_PROMOTE_TO_PROD',
    planHash: reportForPromotion.migrationPlanHash,
    expectedPlanHash: reportForPromotion.migrationPlanHash,
  });
  assert(selfApprovalAttempt.allowed === false, 'Auto-approbation strictement refusée');
  assert(selfApprovalAttempt.errorCode === 'SELF_APPROVAL_FORBIDDEN', 'Code erreur SELF_APPROVAL_FORBIDDEN');

  // Tentative 2 : Altération des paramètres ou altération du planHash
  const tamperedPlanAttempt = validateDualAdminOperation({
    initiatorId: 'usr-admin-01',
    approverId: 'usr-admin-02', // Admin distinct
    actionCode: 'SANDBOX_PROMOTE_TO_PROD',
    planHash: 'TAMPERED_PLAN_HASH_MALICIOUS_PARAM_ALTERED_0000000000000000000000000',
    expectedPlanHash: reportForPromotion.migrationPlanHash,
  });
  assert(tamperedPlanAttempt.allowed === false, 'Promotion avec planHash altéré rejetée');
  assert(tamperedPlanAttempt.errorCode === 'PLAN_HASH_MISMATCH', 'Code erreur PLAN_HASH_MISMATCH');

  // Tentative 3 : Double approbation légitime par Admin #2 distinct avec planHash exact
  const validDualApproval = validateDualAdminOperation({
    initiatorId: 'usr-admin-01',
    approverId: 'usr-admin-02',
    actionCode: 'SANDBOX_PROMOTE_TO_PROD',
    planHash: reportForPromotion.migrationPlanHash,
    expectedPlanHash: reportForPromotion.migrationPlanHash,
  });
  assert(validDualApproval.allowed === true, 'Double validation par second Admin distinct acceptée');
  console.log('  -> [PASS] Sécurité Dual Admin infaillible : auto-approbation bloquée et planHash scellé.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4 : [ADM-04] KMS & Chiffrement par Enveloppe AES-256-GCM (KEK/DEK & Rotation)
  // --------------------------------------------------------------------------
  console.log('TEST 4 : [ADM-04] Gestionnaire KMS & Chiffrement par Enveloppe AES-256-GCM...');
  const kekMaster: KMSKeyRecord = {
    id: 'kms-01',
    keyAlias: 'alias/tradelink-prod-kek-v4',
    keyType: 'KEK_MASTER',
    algorithm: 'AES-256-GCM',
    kmsProvider: 'HASHICORP_VAULT_KMS',
    keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-49a1-b82c-99102f88e104',
    version: 4,
    status: 'ACTIVE',
    lastRotatedAt: '2026-10-01 00:00:00',
    nextRotationAt: '2027-01-01',
  };

  const sensitivePayload = 'NUMERO_COMPTE_BANCAIRE_IBAN:FR7630006000011234567890189;BIC:BNPAFRPP';
  const cipherResult = simulateEnvelopeEncryption(sensitivePayload, kekMaster);

  assert(Boolean(cipherResult.cipherTextBase64), 'Ciphertext généré en Base64');
  assert(Boolean(cipherResult.cipherDekBase64), 'DEK chiffrée sous la KEK maître');
  assert(cipherResult.ivHex.length === 24, 'Vecteur d\'initialisation IV 96 bits (12 octets hex)');
  assert(cipherResult.authTagHex.length === 32, 'Tag d\'authentification GCM 128 bits (16 octets hex)');
  assert(cipherResult.kekArnMasked === kekMaster.keyArnMasked, 'Secret brut masqué');
  assert(!cipherResult.cipherTextBase64.includes(sensitivePayload), 'Aucun secret en clair dans le résultat');

  // Rotation de la KEK maître
  const rotation = rotateKmsMasterKey(kekMaster, 'direction.sec@tradelink-saas.com');
  assert(rotation.updatedKey.version === 5, 'Incrémentation de version KEK v4 -> v5');
  assert(rotation.logEntry.operation === 'ROTATE_KEK', 'Opération ROTATE_KEK journalisée');
  assert(rotation.logEntry.result === 'SUCCESS', 'Statut de rotation SUCCESS');
  console.log('  -> [PASS] Chiffrement par enveloppe AES-256-GCM opérationnel et rotation HSM conforme.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5 : [ADM-05] Intégrité Sauvegardes & Restauration Test en Sandbox
  // --------------------------------------------------------------------------
  console.log('TEST 5 : [ADM-05] Intégrité Sauvegardes & Restauration Test en Sandbox Isolée...');
  const repo = new TradeLinkRepositoryStore(createInitialAdminTestDatabase());
  const backup = repo.getSnapshot().backups[0];

  const integrityValid = verifyBackupCryptographicIntegrity(backup);
  assert(integrityValid.isValid === true, 'Intégrité SHA-256 certifiée pour sauvegarde intacte');

  const corruptedBackup: BackupRecord = {
    ...backup,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
  };
  const integrityCorrupted = verifyBackupCryptographicIntegrity(corruptedBackup);
  assert(integrityCorrupted.isValid === false, 'Sauvegarde altérée détectée et rejetée');

  // Test de restauration en sandbox via service
  const app = new TradeLinkApiApplication(repo);
  const restoreTestReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/backups/test-sandbox',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-test-restore-01',
    ipAddress: '10.0.0.1',
    user: ADMIN_1_USER,
    body: { backupId: backup.id },
  };

  const restoreTestRes = await app.handleRequest(restoreTestReq);
  assert(restoreTestRes.statusCode === 200, 'Test de restauration sandbox réussit (HTTP 200)');
  const restoreData = restoreTestRes.body.data as any;
  assert(restoreData.isolationGuaranteed === true, 'Isolation de la restauration garantie');
  assert(restoreData.tablesRestoredCount === 8, '8 tables restaurées en instance sandbox');
  // Vérifier qu'aucune table de production n'a été corrompue
  assert(repo.getSnapshot().products.length === 1, 'Base de production préservée sans modification');
  console.log('  -> [PASS] Restauration sandbox vérifiée sans aucune écriture en production.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 6 : [ADM-06] Journal d'Audit Append-Only & Chaînage de Hachage Immuable
  // --------------------------------------------------------------------------
  console.log('TEST 6 : [ADM-06] Chaîne de Hachage Immuable du Journal d\'Audit...');
  const rawLogs = repo.getSnapshot().auditLogs;
  const chainedLogs = buildAuditChainFromLogs(rawLogs);

  assert(chainedLogs.length === rawLogs.length, 'Nombre d\'entrées chaînées égal au nombre de logs');
  // Le bloc le plus ancien doit pointer vers GENESIS
  const genesisBlock = chainedLogs[chainedLogs.length - 1];
  assert(genesisBlock.prevHash === 'GENESIS_HASH_TRADELINK_V6_INITIAL_BLOCK', 'Bloc initial lié au bloc Genesis');

  // Vérification d'intégrité de la chaîne intacte
  const chainIntegrity = verifyAuditLogChainIntegrity(chainedLogs);
  assert(chainIntegrity.isChainIntact === true, 'Chaîne de hachage intacte et non corrompue');
  assert(chainIntegrity.totalEntriesVerified === chainedLogs.length, 'Toutes les entrées ont été vérifiées');

  // Simulation d'une tentative de falsification ou modification d'une entrée
  const forgedChain = structuredClone(chainedLogs);
  forgedChain[0].details = 'FALSIFICATION : Tentative d’altération de l’action d’audit en base !';
  // Si le hachage n'est pas recalculé ou si le prevHash est altéré
  forgedChain[0].prevHash = 'MALICIOUS_HASH_BREAKING_PREV_LINK_000000000000000000000000';

  const forgedCheck = verifyAuditLogChainIntegrity(forgedChain);
  assert(forgedCheck.isChainIntact === false, 'Rupture cryptographique immédiatement détectée');
  assert(forgedCheck.brokenIndex === 0, 'Index de rupture exactement identifié au bloc falsifié');
  console.log('  -> [PASS] Chaîne de hachage append-only infalsifiable avec détection immédiate de rupture.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 7 : [ADM-07] Contrôleurs & Routes API HTTP (Validation RBAC & Endpoints)
  // --------------------------------------------------------------------------
  console.log('TEST 7 : [ADM-07] Endpoints HTTP Admin (Sandbox, Promotion, KMS, Export, Audit Verify)...');

  // 7A. Analyse Sandbox
  const analyzeReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/sandbox/analyze',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-01',
    ipAddress: '127.0.0.1',
    user: ADMIN_1_USER,
    body: {
      fileName: 'tarifs_douane_dump.sql',
      fileSize: 2048,
      format: 'SQL',
    },
  };
  const analyzeRes = await app.handleRequest(analyzeReq);
  assert(analyzeRes.statusCode === 200, 'POST /api/v1/admin/sandbox/analyze retourne 200');
  const generatedReport = analyzeRes.body.data as SandboxAnalysisReport;

  // 7B. Promotion Sandbox : Rejet auto-approbation (Admin #1)
  const selfPromoteReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/sandbox/promote',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-02',
    ipAddress: '127.0.0.1',
    user: ADMIN_1_USER,
    body: {
      report: generatedReport,
      initiatorId: ADMIN_1_USER.id,
      planHash: generatedReport.migrationPlanHash,
    },
  };
  const selfPromoteRes = await app.handleRequest(selfPromoteReq);
  assert(selfPromoteRes.statusCode === 403, 'POST /api/v1/admin/sandbox/promote bloque l\'auto-approbation avec 403');

  // 7C. Promotion Sandbox : Succès double validation (Admin #2)
  const validPromoteReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/sandbox/promote',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-03',
    ipAddress: '127.0.0.1',
    user: ADMIN_2_USER,
    body: {
      report: generatedReport,
      initiatorId: ADMIN_1_USER.id,
      planHash: generatedReport.migrationPlanHash,
    },
  };
  const validPromoteRes = await app.handleRequest(validPromoteReq);
  assert(validPromoteRes.statusCode === 200, 'POST /api/v1/admin/sandbox/promote réussit avec 2e Admin distinct');

  // 7D. Rotation KMS
  const kmsRotateReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/kms/rotate',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-04',
    ipAddress: '127.0.0.1',
    user: ADMIN_1_USER,
    body: { keyAlias: 'alias/tradelink-prod-kek-v4' },
  };
  const kmsRotateRes = await app.handleRequest(kmsRotateReq);
  assert(kmsRotateRes.statusCode === 200, 'POST /api/v1/admin/kms/rotate retourne 200');

  // 7E. Export de dataset (ex: PRODUCTS au format DBF)
  const exportReq: ServerRequestContext = {
    method: 'GET',
    path: '/api/v1/admin/export/PRODUCTS',
    headers: {},
    query: { format: 'DBF' },
    params: {},
    correlationId: 'corr-api-05',
    ipAddress: '127.0.0.1',
    user: ADMIN_1_USER,
    body: {},
  };
  const exportRes = await app.handleRequest(exportReq);
  assert(exportRes.statusCode === 200, 'GET /api/v1/admin/export/PRODUCTS retourne 200');
  assert(exportRes.headers['Content-Type'].includes('application/x-dbf'), 'Header Content-Type DBF conforme');

  // 7F. Vérification de chaîne d'audit
  const chainVerifyReq: ServerRequestContext = {
    method: 'GET',
    path: '/api/v1/admin/audit/chain-verify',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-06',
    ipAddress: '127.0.0.1',
    user: ADMIN_1_USER,
    body: {},
  };
  const chainVerifyRes = await app.handleRequest(chainVerifyReq);
  assert(chainVerifyRes.statusCode === 200, 'GET /api/v1/admin/audit/chain-verify retourne 200');
  const chainData = chainVerifyRes.body.data as any;
  assert(chainData.isChainIntact === true, 'Chaîne d\'audit déclarée intacte par l\'API');

  // 7G. Protection RBAC : Rejet d'un utilisateur non-admin
  const nonAdminReq: ServerRequestContext = {
    method: 'POST',
    path: '/api/v1/admin/kms/rotate',
    headers: {},
    query: {},
    params: {},
    correlationId: 'corr-api-07',
    ipAddress: '127.0.0.1',
    user: CLIENT_USER,
    body: { keyAlias: 'alias/tradelink-prod-kek-v4' },
  };
  const nonAdminRes = await app.handleRequest(nonAdminReq);
  assert(nonAdminRes.statusCode === 403, 'Accès non-admin aux routes admin rejeté avec 403 FORBIDDEN');

  console.log('  -> [PASS] Toutes les routes d\'administration avancée appliquent rigoureusement les règles de sécurité.\n');
  passedTests++;

  console.log('====================================================================');
  console.log(`RÉSULTAT SUITE PROMPT 11 : ${passedTests} / 7 TESTS RÉUSSIS AVEC SUCCÈS (100%) !`);
  console.log('TOUTES LES EXIGENCES (IMPORTS, SANDBOX, KMS, BACKUPS, AUDIT) SONT VALIDÉES.');
  console.log('====================================================================');
}

runAdminAdvancedTestSuite().catch((err) => {
  console.error('\n❌ ERREUR DANS LA SUITE DE TESTS ADMIN ADVANCED :', err);
  process.exit(1);
});
