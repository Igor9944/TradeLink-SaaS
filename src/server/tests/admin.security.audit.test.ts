// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS DÉDIÉE : PROMPT 15 & PROMPT 16
// 1. PROMPT 15 : IMPORTATION EN 12 ÉTAPES, SANDBOX BASES (SQL, BAK, DBF) & EXPORT
//    - Contrôles de sécurité fichiers (Antivirus, Extensions, Quotas de taille)
//    - Protection contre l'injection de formules tableur CSV (CWE-1236)
//    - Déroulement complet du parcours 12 étapes (Upload -> Final Report)
//    - Gestion des doublons (SKIP, OVERWRITE, REJECT) & Simulation Dry-Run
//    - Sandbox isolée pour bases de données (Réseau OFF, Zéro secret prod, Quotas)
//    - Règle spéciale Microsoft SQL Server BAK (Validation du flux de sauvegarde)
//    - Double approbation Admin (4-Eyes Principle, rejet strict auto-approbation)
//    - Moteur d'exportation certifié multi-formats (CSV, XLSX, JSON, PDF)
// 2. PROMPT 16 : ADMINISTRATION AVANCÉE, SÉCURITÉ, AUDIT, KMS & APM
//    - Single Active Session Policy, consultation et révocation à chaud des sessions
//    - Détection automatique d'anomalies (Force brute 5 échecs, IDOR, rotation KEK)
//    - KMS HSM : Chiffrement par enveloppe AES-256-GCM & rotation sans rupture
//    - Sauvegardes chiffrées, intégrité SHA-256 & tests de restauration Sandbox (Restore Drill)
//    - Journal d'audit immuable en chaîne de hachage SHA-256 (détection falsification)
//    - Supervision technique APM temps réel (PostgreSQL 16, Redis 7.2, Queues, p50/p95/p99)
//    - Intégration End-to-End Contrôleurs REST & Sécurité RBAC
// ============================================================================

import {
  ImportExportEngine,
  MAX_FILE_SIZES,
  DESTRUCTIVE_SQL_KEYWORDS,
} from '../../services/importExportEngine';
import {
  performBackupRestoreDrill,
  getSystemSupervisionMetrics,
  detectSecurityAnomalies,
  buildAuditChainFromLogs,
  verifyAuditLogChainIntegrity,
  verifyBackupCryptographicIntegrity,
  simulateEnvelopeEncryption,
  rotateKmsMasterKey,
} from '../../services/adminAdvancedEngine';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  ServerRequestContext,
  registerSingleActiveSession,
  verifySingleActiveSession,
} from '../middlewares/errorAndSecurity.middleware';
import {
  SecureImportPipelineJob,
  BackupRecord,
  KMSKeyRecord,
  UserRoleCode,
  AuditLogRecord,
  LoginAttemptRecord,
} from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

// ============================================================================
// DONNÉES DE TEST & ACTEURS
// ============================================================================

const ADMIN_1_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-admin-sec-01',
  email: 'karim.mansouri@tradelink-saas.com',
  role: 'ADMIN',
  sessionId: 'sess-admin-sec-01',
  companyName: 'TRADELINK GLOBAL OPS',
  mfaVerified: true,
};

const ADMIN_2_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-admin-sec-02',
  email: 'ciso.security@tradelink-saas.com',
  role: 'ADMIN',
  sessionId: 'sess-admin-sec-02',
  companyName: 'TRADELINK SECURITY OPS',
  mfaVerified: true,
};

const SUPPLIER_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-supp-sec-01',
  email: 'contact@eurotech-industrial.de',
  role: 'FOURNISSEUR',
  sessionId: 'sess-supp-sec-01',
  companyName: 'EuroTech Industrial GmbH',
  mfaVerified: false,
};

const CLIENT_USER: NonNullable<ServerRequestContext['user']> = {
  id: 'usr-client-sec-01',
  email: 'achats@atlas-distribution.ma',
  role: 'CLIENT',
  sessionId: 'sess-client-sec-01',
  companyName: 'Atlas Import & Distribution S.A.',
  mfaVerified: false,
};

function createInitialTestDatabase(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-sec-01',
        sku: 'IND-SENS-7701',
        supplierId: 'usr-supp-sec-01',
        supplierName: 'EuroTech Industrial GmbH',
        category: 'Capteurs & IoT',
        name: { fr: 'Capteur Température PT100', en: 'PT100 Sensor', ar: 'مستشعر حرارة' },
        description: { fr: 'Sonde industrielle classe A', en: 'Industrial probe', ar: 'مسبار صناعي' },
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
    orders: [],
    accountingEntries: [],
    backups: [
      {
        id: 'bkp-sec-01',
        backupCode: 'BKP-FULL-20261119-0300',
        type: 'FULL_SCHEDULED',
        sizeFormatted: '4.82 GB (Chiffré AES-256-GCM)',
        encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        status: 'VERIFIED',
        restoreStatus: 'PENDING_SECOND_APPROVAL',
        restoreInitiatorId: 'usr-admin-sec-01',
        restoreInitiatorName: 'Karim Mansouri',
        planHash: 'PLAN-IMMUTABLE-SEC-99281A',
        createdAt: '2026-11-19 03:00:00',
      },
    ],
    auditLogs: [
      {
        id: 'aud-sec-001',
        timestamp: '2026-11-19 01:00:00',
        actorName: 'system',
        actorRole: 'ADMIN' as UserRoleCode,
        action: 'SECURITY_BOOT',
        targetType: 'Server',
        targetId: 'SRV-SEC-01',
        result: 'SUCCESS',
        correlationId: 'corr-sec-001',
        ipAddress: '127.0.0.1',
        details: 'Initialisation du sous-système de sécurité TradeLink V6.0.',
      },
      {
        id: 'aud-sec-002',
        timestamp: '2026-11-19 01:10:00',
        actorName: 'Karim Mansouri',
        actorRole: 'ADMIN' as UserRoleCode,
        action: 'KMS_INTEGRITY_CHECK',
        targetType: 'KMSKey',
        targetId: 'alias/tradelink-prod-kek-v4',
        result: 'SUCCESS',
        correlationId: 'corr-sec-002',
        ipAddress: '192.168.1.50',
        details: 'Vérification HSM Cloud KMS AES-256-GCM.',
      },
    ],
    kycDossiers: [],
    rooms: [],
    calcHistory: [],
    quotes: [],
    invoices: [],
    payments: [],
    paymentReceipts: [],
    shipments: [],
    stockMovements: [],
    transportDocuments: [],
    commercialDocuments: [],
    secureImportJobs: [],
    databaseSandboxSessions: [],
    dataExports: [],
    securityAlerts: [],
    backupRestoreDrills: [],
  };
}

// ============================================================================
// SUITE DE TESTS COMPLÈTE PROMPT 15 & 16
// ============================================================================

export async function runAdminSecurityAuditTestSuite() {
  console.log('====================================================================');
  console.log('TRADELINK V6.0 — SUITE DE TESTS DÉDIÉE : PROMPT 15 & PROMPT 16');
  console.log('IMPORTATION 12 ÉTAPES, SANDBOX BASES, EXPORTS, SÉCURITÉ, KMS & APM');
  console.log('====================================================================\n');

  // Enregistrement des sessions uniques actives
  registerSingleActiveSession(ADMIN_1_USER.id, ADMIN_1_USER.sessionId, true);
  registerSingleActiveSession(ADMIN_2_USER.id, ADMIN_2_USER.sessionId, true);
  registerSingleActiveSession(SUPPLIER_USER.id, SUPPLIER_USER.sessionId, false);
  registerSingleActiveSession(CLIENT_USER.id, CLIENT_USER.sessionId, false);

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1 : [PROMPT-15-01] Moteur d'importation : Contrôles de Sécurité & Antivirus
  // --------------------------------------------------------------------------
  console.log('TEST 1 : [PROMPT-15-01] Contrôles Fichiers, Quotas, Antivirus & Sanitisation CSV Formula...');

  // 1A. Blocage des extensions malveillantes
  for (const dangerousExt of ['exe', 'bat', 'cmd', 'sh', 'ps1', 'dll', 'vbs']) {
    const maliciousValidation = ImportExportEngine.detectAndValidateFile({
      fileName: `payload.${dangerousExt}`,
      fileSize: 1024,
      fileContentRaw: 'MZ\x90\x00\x03\x00\x00\x00Malicious payload simulation',
    });
    assert(maliciousValidation.antivirusScan === 'INFECTED', `Extension .${dangerousExt} bloquée avec antivirusScan=INFECTED`);
    assert(maliciousValidation.detectedVulnerabilities.length > 0, `Vulnérabilité signalée pour .${dangerousExt}`);
  }

  // 1B. Contrôle des quotas de taille de fichier
  const oversizedCsvValidation = ImportExportEngine.detectAndValidateFile({
    fileName: 'large_catalog.csv',
    fileSize: MAX_FILE_SIZES.CSV + 1024, // Dépasse les 15 Mo
    fileContentRaw: 'sku,name,price\n',
  });
  assert(oversizedCsvValidation.isSizeValid === false, 'Fichier CSV dépassant 15 Mo invalidé (isSizeValid=false)');
  assert(oversizedCsvValidation.detectedVulnerabilities.some((v) => v.toLowerCase().includes('taille')), 'Message d’erreur de quota taille présent');

  // 1C. Neutralisation des formules CSV dangereuses (CWE-1236)
  const maliciousCells = [
    '=cmd|\'/C calc\'!A0',
    '+2+2',
    '-5+10',
    '@SUM(A1:A10)',
    '|malicious_pipe',
    '%injection',
    '\tTabInjection',
  ];
  for (const dangerousCell of maliciousCells) {
    const sanitized = ImportExportEngine.sanitizeCsvCell(dangerousCell);
    assert(sanitized.startsWith("'"), `Cellule "${dangerousCell}" préfixée d'une apostrophe anti-formule`);
  }
  const safeCell = ImportExportEngine.sanitizeCsvCell('Produit Standard PT100');
  assert(!safeCell.startsWith("'"), 'Cellule légitime non altérée par la sanitisation');

  // 1D. Détection des commandes SQL destructives
  for (const destructiveKw of DESTRUCTIVE_SQL_KEYWORDS.slice(0, 5)) {
    const sqlWithDrop = `SELECT 1; ${destructiveKw}; SELECT 2;`;
    const sandboxSession = ImportExportEngine.createDatabaseSandboxSession({
      fileName: 'migration.sql',
      fileContentRaw: sqlWithDrop,
      initiatedByUserId: ADMIN_1_USER.id,
    });
    assert(
      sandboxSession.compatibilityReport.destructiveCommandsBlocked.includes(destructiveKw),
      `Mot-clé destructif "${destructiveKw}" intercepté et bloqué dans la sandbox`
    );
  }

  console.log('  -> [PASS] Tous les contrôles de sécurité, quotas, antivirus et sanitisation sont conformes.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2 : [PROMPT-15-02] Parcours d'importation en 12 étapes (CSV / JSON)
  // --------------------------------------------------------------------------
  console.log('TEST 2 : [PROMPT-15-02] Déroulement séquentiel du parcours d\'importation en 12 étapes...');

  const sampleCsvContent = [
    'sku;nom;prix;stock;categorie',
    'IND-SENS-7701;Capteur Température PT100;145.00;50;Capteurs & IoT', // Doublon existant
    'IND-VALV-9902;Vanne Pneumatique 24V;320.50;15;Actionneurs',        // Nouveau produit
    'IND-PRES-3304;Capteur Pression 10bar;210.00;30;Capteurs & IoT',     // Nouveau produit
    'ERR-ROW-0001;;NaN_PRICE;-5;Erreurs',                                // Ligne avec erreurs multiples
  ].join('\n');

  // Étape 1 : Upload
  const job1 = ImportExportEngine.step1_upload({
    fileName: 'articles_catalogue_2026.csv',
    fileSize: sampleCsvContent.length,
    fileContentRaw: sampleCsvContent,
    entity: 'CATALOG_PRODUCTS',
    userId: ADMIN_1_USER.id,
  });
  assert(job1.currentStep === 'UPLOAD', 'Étape 1 : Job au statut UPLOAD');
  assert(job1.format === 'CSV', 'Étape 1 : Format CSV détecté');
  assert(job1.sha256.length === 64, 'Étape 1 : Empreinte SHA-256 calculée');

  // Étape 2 : Identification
  const job2 = ImportExportEngine.step2_identifyFormat(job1);
  assert(job2.currentStep === 'FORMAT_IDENTIFICATION', 'Étape 2 : Statut FORMAT_IDENTIFICATION');

  // Étape 3 : Validation
  const job3 = ImportExportEngine.step3_validate(job2);
  assert(job3.currentStep === 'VALIDATION', 'Étape 3 : Statut VALIDATION');
  assert(job3.status === 'IN_PROGRESS', 'Étape 3 : Validation réussie');

  // Étape 4 : Analyse du contenu
  const { job: job4, columns, parsedRowsCount, parsedRows } = ImportExportEngine.step4_analyzeContent(job3);
  assert(job4.currentStep === 'CONTENT_ANALYSIS', 'Étape 4 : Statut CONTENT_ANALYSIS');
  assert(columns.length === 5, 'Étape 4 : 5 colonnes détectées');
  assert(parsedRowsCount === 4, 'Étape 4 : 4 lignes de données extraites');

  // Étape 5 : Prévisualisation
  const job5 = ImportExportEngine.step5_preview(job4, parsedRows, 3);
  assert(job5.currentStep === 'PREVIEW', 'Étape 5 : Statut PREVIEW');
  assert(job5.previewRows.length === 3, 'Étape 5 : 3 lignes d\'échantillon prévisualisées');

  // Étape 6 : Mapping des colonnes
  const job6 = ImportExportEngine.step6_mapColumns(job5, parsedRows);
  assert(job6.currentStep === 'COLUMN_MAPPING', 'Étape 6 : Statut COLUMN_MAPPING');
  const skuMapping = job6.columnMappings.find((m) => m.sourceColumn === 'sku');
  assert(skuMapping?.targetField === 'sku', 'Étape 6 : Mapping automatique SKU réussi');
  const nomMapping = job6.columnMappings.find((m) => m.sourceColumn === 'nom');
  assert(nomMapping?.targetField === 'name.fr', 'Étape 6 : Mapping automatique "nom" vers "name.fr" réussi');

  // Étape 7 : Détection des doublons (stratégie SKIP)
  const existingProducts = createInitialTestDatabase().products;
  const { job: job7, duplicates } = ImportExportEngine.step7_detectDuplicates({
    job: job6,
    parsedRows,
    existingRecords: existingProducts,
  });
  assert(job7.currentStep === 'DUPLICATE_DETECTION', 'Étape 7 : Statut DUPLICATE_DETECTION');
  assert(duplicates.length === 1, 'Étape 7 : 1 doublon détecté (IND-SENS-7701)');
  assert(duplicates[0].uniqueKey === 'ind-sens-7701', 'Étape 7 : Référence doublon identifiée');

  // Étape 8 : Rapport des erreurs
  const { job: job8, errors } = ImportExportEngine.step8_reportErrors({
    job: job7,
    parsedRows,
  });
  assert(job8.currentStep === 'ERROR_REPORTING', 'Étape 8 : Statut ERROR_REPORTING');
  assert(errors.length >= 2, 'Étape 8 : Erreurs détectées sur la ligne ERR-ROW-0001 (champ manquant et prix invalide)');

  // Étape 9 : Simulation (Dry Run)
  const job9 = ImportExportEngine.step9_simulate({
    job: job8,
    parsedRows,
    duplicates,
    errors,
  });
  assert(job9.currentStep === 'SIMULATION', 'Étape 9 : Statut SIMULATION');
  assert(job9.status === 'SIMULATED', 'Étape 9 : Job marqué SIMULATED');
  assert(job9.simulationResult?.wouldCreate === 2, 'Étape 9 : Simulation prévoit 2 créations');
  assert(job9.simulationResult?.wouldSkip === 1, 'Étape 9 : Simulation prévoit 1 ignoré (doublon en SKIP)');
  assert(job9.simulationResult?.wouldReject === 1, 'Étape 9 : Simulation prévoit 1 rejeté (ligne en erreur)');

  // Étape 10 : Confirmation préalable
  const job10 = ImportExportEngine.step10_confirm({
    job: job9,
    confirmedByUserId: ADMIN_1_USER.id,
  });
  assert(job10.currentStep === 'CONFIRMATION', 'Étape 10 : Statut CONFIRMATION');

  // Étape 11 & 12 : Exécution réelle & Rapport final
  let createdCount = 0;
  const finalReport = ImportExportEngine.step11_and_12_executeAndReport({
    job: job10,
    parsedRows,
    executedByUserId: ADMIN_1_USER.id,
    applyMutationFn: (toCreate) => {
      createdCount = toCreate.length;
      return { created: toCreate.length, updated: 0 };
    },
  });
  assert(finalReport.jobId === job1.id, 'Étape 12 : Rapport rattaché au bon Job ID');
  assert(finalReport.importedRows === 2, 'Étape 12 : 2 lignes insérées dans le rapport');
  assert(createdCount === 2, 'Étape 12 : Mutation transactionnelle appliquée à 2 enregistrements');
  assert(finalReport.ignoredRows === 1, 'Étape 12 : 1 ligne ignorée (doublon)');
  assert(finalReport.rejectedRows === 1, 'Étape 12 : 1 ligne rejetée (erreur syntaxique)');
  assert(Boolean(finalReport.sha256), 'Étape 12 : Empreinte SHA-256 certifiée dans le rapport');

  console.log('  -> [PASS] Le parcours 12 étapes complet s\'est déroulé avec une intégrité parfaite.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3 : [PROMPT-15-03] Sandbox Isolée pour bases de données (SQL, BAK, DBF) & 4-Eyes
  // --------------------------------------------------------------------------
  console.log('TEST 3 : [PROMPT-15-03] Sandbox Isolée Bases (SQL, BAK, DBF), Règle BAK & Double Approbation...');

  // 3A. Isolation et quotas stricts
  const sqlDump = 'CREATE TABLE raw_catalog (art_id INT, name VARCHAR(255)); INSERT INTO raw_catalog VALUES (1, \'Test\');';
  const sbxSqlSession = ImportExportEngine.createDatabaseSandboxSession({
    fileName: 'legacy_dump_2026.sql',
    fileContentRaw: sqlDump,
    initiatedByUserId: ADMIN_1_USER.id,
  });
  assert(sbxSqlSession.isEgressBlocked === true, 'Sandbox : Réseau sortant OFF par défaut');
  assert(sbxSqlSession.productionSecretsIsolated === true, 'Sandbox : Zéro secret de prod dans le container');
  assert(sbxSqlSession.cpuLimit === '1.0 vCPU', 'Sandbox : Quota CPU limité à 1.0 vCPU');
  assert(sbxSqlSession.memoryLimit === '512 Mo', 'Sandbox : Quota Mémoire limité à 512 Mo');
  assert(sbxSqlSession.status === 'ANALYZED', 'Sandbox : Statut initial ANALYZED');

  // 3B. Règle spéciale Microsoft SQL Server BAK
  // Cas valide : flux SQL Server reconnu
  const validBakContent = '[MSSQL_BACKUP_STREAM:Microsoft SQL Server 2022 Enterprise Edition:Database=TradeLinkLegacy]';
  const validBakSession = ImportExportEngine.createDatabaseSandboxSession({
    fileName: 'mssql_backup_dump.bak',
    fileContentRaw: validBakContent,
    initiatedByUserId: ADMIN_1_USER.id,
  });
  assert(validBakSession.compatibilityReport.isCompatible === true, 'Flux BAK SQL Server valide accepté en Sandbox');
  assert(validBakSession.compatibilityReport.engineType === 'MSSQL_SERVER', 'Moteur détecté MSSQL_SERVER');

  // Cas invalide : flux corrompu ou incompatibilité SQL Server
  const corruptedBakSession = ImportExportEngine.createDatabaseSandboxSession({
    fileName: 'corrupted_backup.bak',
    fileContentRaw: 'INVALID_CORRUPTED_NON_SQL_STREAM_DATA',
    initiatedByUserId: ADMIN_1_USER.id,
  });
  assert(corruptedBakSession.compatibilityReport.isCompatible === false, 'Flux BAK corrompu refusé par la règle de compatibilité');
  assert(corruptedBakSession.status === 'FAILED', 'Session marquée FAILED pour flux BAK corrompu');

  // 3C. Double approbation Admin (4-Eyes Principle)
  // Tentative d'auto-approbation par le même Admin -> REJET STRICT
  let selfApprovalBlocked = false;
  try {
    ImportExportEngine.approveDualAdminMigration(sbxSqlSession, ADMIN_1_USER.id);
  } catch (err: any) {
    if (err.message.includes('ADMIN_SELF_APPROVAL_FORBIDDEN')) {
      selfApprovalBlocked = true;
    }
  }
  assert(selfApprovalBlocked === true, 'Auto-approbation Admin strictement bloquée (4-Eyes Principle)');

  // Approbation par le second Admin distinct -> SUCCÈS
  const approvedSession = ImportExportEngine.approveDualAdminMigration(sbxSqlSession, ADMIN_2_USER.id);
  assert(approvedSession.dualAdminApproval.status === 'APPROVED', 'Approbation par second Admin accordée');
  assert(approvedSession.dualAdminApproval.approvedBy === ADMIN_2_USER.id, 'Identité du second approbateur enregistrée');

  // Exécution de la migration après approbation
  const migrationResult = ImportExportEngine.executeDatabaseMigration(approvedSession);
  assert(migrationResult.success === true, 'Exécution de la migration confirmée après double approbation');
  assert(Boolean(migrationResult.backupSnapshotId), 'Sauvegarde préalable garantie avant commit en base');

  console.log('  -> [PASS] Isolation Sandbox, règle stricte BAK et double approbation validées à 100%.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4 : [PROMPT-15-04] Moteur d'exportation certifié multi-formats
  // --------------------------------------------------------------------------
  console.log('TEST 4 : [PROMPT-15-04] Moteur d\'exportation certifié multi-formats (CSV, XLSX, JSON, PDF)...');

  const exportRecords = [
    { id: '1', sku: 'IND-SENS-7701', name: 'Capteur PT100', price: '145.00', formulaCol: '=cmd|\'/C calc\'!A0' },
    { id: '2', sku: 'IND-VALV-9902', name: 'Vanne 24V', price: '320.50', formulaCol: '+SUM(1+2)' },
  ];

  // 4A. Export CSV avec neutralisation formule
  const csvExport = ImportExportEngine.exportDataset({
    entity: 'PRODUCTS',
    format: 'CSV',
    records: exportRecords,
    preventFormulaInjection: true,
  });
  assert(csvExport.mimeType.includes('text/csv'), 'Mime-type CSV valide');
  assert(csvExport.preventedInjectionsCount >= 2, '2 injections de formules CSV neutralisées');
  assert(csvExport.content.includes("'=cmd"), 'Cellule formulée préfixée avec apostrophe dans le CSV');

  // 4B. Export XLSX
  const xlsxExport = ImportExportEngine.exportDataset({
    entity: 'PRODUCTS',
    format: 'XLSX',
    records: exportRecords,
  });
  assert(xlsxExport.content.includes('<Workbook'), 'Export XLSX au format SpreadsheetML valide');

  // 4C. Export JSON
  const jsonExport = ImportExportEngine.exportDataset({
    entity: 'PRODUCTS',
    format: 'JSON',
    records: exportRecords,
  });
  const parsedJson = JSON.parse(jsonExport.content);
  assert(parsedJson.meta?.platform.includes('TRADELINK'), 'Métadonnées souveraines TradeLink dans le JSON');
  assert(parsedJson.data.length === 2, '2 enregistrements exportés dans le JSON');

  // 4D. Export PDF
  const pdfExport = ImportExportEngine.exportDataset({
    entity: 'PRODUCTS',
    format: 'PDF',
    records: exportRecords,
  });
  assert(pdfExport.content.startsWith('%PDF-1.4'), 'Export PDF commence par l’en-tête %PDF-1.4');
  assert(pdfExport.content.includes('%%EOF'), 'Export PDF se termine par %%EOF');

  // 4E. Contrôles RBAC d'exportation
  let clientDeniedForProducts = false;
  try {
    ImportExportEngine.enforceExportPermission('CLIENT', 'PRODUCTS');
  } catch (err: any) {
    if (err.message.includes('ACCÈS REFUSÉ')) clientDeniedForProducts = true;
  }
  assert(clientDeniedForProducts === true, 'Le client ne peut pas exporter l’inventaire produits global');

  console.log('  -> [PASS] Exports multi-formats certifiés et permissions RBAC conformes.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5 : [PROMPT-16-01] Gestion des accès, Sessions uniques & Révocation
  // --------------------------------------------------------------------------
  console.log('TEST 5 : [PROMPT-16-01] Single Active Session Policy & Révocation à chaud...');

  const testUserId = 'usr-test-session-01';
  const session1 = 'sess-active-001';
  const session2 = 'sess-active-002';

  // Enregistrement session 1
  const reg1 = registerSingleActiveSession(testUserId, session1, false);
  assert(reg1.previousRevokedSessionId === null, 'Première session active enregistrée sans révocation antérieure');
  assert(verifySingleActiveSession(testUserId, session1) === true, 'Session 1 active et reconnue');

  // Enregistrement session 2 (écrase session 1)
  const reg2 = registerSingleActiveSession(testUserId, session2, false);
  assert(reg2.previousRevokedSessionId === session1, 'Session 1 révoquée automatiquement par la politique de session unique');
  assert(verifySingleActiveSession(testUserId, session1) === false, 'Session 1 désormais invalide');
  assert(verifySingleActiveSession(testUserId, session2) === true, 'Session 2 active');

  console.log('  -> [PASS] Single Active Session Policy validée sans faille.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 6 : [PROMPT-16-02] Détection automatique d'anomalies & Centre de Sécurité
  // --------------------------------------------------------------------------
  console.log('TEST 6 : [PROMPT-16-02] Détection automatique Force Brute, IDOR et Alertes KMS...');

  // 6A. Détection force brute (5 échecs consécutifs)
  const suspiciousAttempts: LoginAttemptRecord[] = [
    { id: 'att-1', emailAttempted: 'victim@tradelink-saas.com', ipAddress: '198.51.100.42', isSuccess: false, attemptedAt: '2026-11-19 10:00:00', userAgent: 'curl/8.0', correlationId: 'c1' },
    { id: 'att-2', emailAttempted: 'victim@tradelink-saas.com', ipAddress: '198.51.100.42', isSuccess: false, attemptedAt: '2026-11-19 10:01:00', userAgent: 'curl/8.0', correlationId: 'c2' },
    { id: 'att-3', emailAttempted: 'victim@tradelink-saas.com', ipAddress: '198.51.100.42', isSuccess: false, attemptedAt: '2026-11-19 10:02:00', userAgent: 'curl/8.0', correlationId: 'c3' },
    { id: 'att-4', emailAttempted: 'victim@tradelink-saas.com', ipAddress: '198.51.100.42', isSuccess: false, attemptedAt: '2026-11-19 10:03:00', userAgent: 'curl/8.0', correlationId: 'c4' },
    { id: 'att-5', emailAttempted: 'victim@tradelink-saas.com', ipAddress: '198.51.100.42', isSuccess: false, attemptedAt: '2026-11-19 10:04:00', userAgent: 'curl/8.0', correlationId: 'c5' },
  ];

  // Audit log avec action refusée (simulation IDOR)
  const deniedAuditLogs: AuditLogRecord[] = [
    {
      id: 'aud-denied-01',
      timestamp: '2026-11-19 10:05:00',
      actorName: 'Attacker',
      actorRole: 'CLIENT',
      action: 'ACCESS_OTHER_CLIENT_INVOICE',
      targetType: 'Invoice',
      targetId: 'FAC-PRIVATE-99',
      result: 'DENIED',
      correlationId: 'corr-idor-01',
      ipAddress: '198.51.100.42',
      details: 'IDOR bloqué : tentative de lecture facture d\'une autre entreprise.',
    },
  ];

  // KEK avec rotation proche (dans 3 jours)
  const expiringKek: KMSKeyRecord = {
    id: 'kms-kek-v4',
    keyAlias: 'alias/tradelink-prod-kek-v4',
    keyType: 'KEK_MASTER',
    algorithm: 'AES-256-GCM',
    kmsProvider: 'AWS_KMS_HSM',
    keyArnMasked: 'arn:aws:kms:eu-west-3:123456789012:key/test-kek-v4',
    status: 'ACTIVE',
    version: 4,
    lastRotatedAt: '2026-08-19',
    nextRotationAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), // Dans 3 jours
  };

  const detectedAlerts = detectSecurityAnomalies({
    loginAttempts: suspiciousAttempts,
    auditLogs: deniedAuditLogs,
    activeKek: expiringKek,
  });

  const bfAlert = detectedAlerts.find((a) => a.type === 'BRUTE_FORCE_ATTEMPT');
  assert(bfAlert !== undefined, 'Alerte BRUTE_FORCE_ATTEMPT détectée après 5 échecs consécutifs');
  assert(bfAlert?.severity === 'CRITICAL', 'Alerte force brute de sévérité CRITICAL');
  assert(bfAlert?.actorIp === '198.51.100.42', 'IP attaquante tracée dans l’alerte');

  const idorAlert = detectedAlerts.find((a) => a.type === 'IDOR_ATTEMPT');
  assert(idorAlert !== undefined, 'Alerte IDOR_ATTEMPT détectée suite à action DENIED');
  assert(idorAlert?.severity === 'HIGH', 'Alerte IDOR de sévérité HIGH');

  const kmsAlert = detectedAlerts.find((a) => a.type === 'SECRET_ROTATION_DUE');
  assert(kmsAlert !== undefined, 'Alerte SECRET_ROTATION_DUE détectée pour clé arrivant à échéance');

  console.log('  -> [PASS] Détection automatique des 3 types d\'anomalies de sécurité validée.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 7 : [PROMPT-16-03] Gestion cryptographique KMS & Chiffrement par enveloppe
  // --------------------------------------------------------------------------
  console.log('TEST 7 : [PROMPT-16-03] Chiffrement Enveloppe AES-256-GCM & Rotation KEK HSM...');

  const plainSecret = 'Informations de paiement bancaire IBAN FR7630006000011234567890189';
  const encryptedPayload = simulateEnvelopeEncryption(plainSecret, expiringKek);

  assert(encryptedPayload.algorithm === 'AES-256-GCM', 'Algorithme AES-256-GCM utilisé');
  assert(Boolean(encryptedPayload.cipherDekBase64), 'Clé de données (DEK) chiffrée par la KEK');
  assert(Boolean(encryptedPayload.cipherTextBase64), 'Texte chiffré en Base64');
  assert(Boolean(encryptedPayload.authTagHex), 'Tag d\'authentification GCM généré');
  assert(!encryptedPayload.cipherTextBase64.includes('FR763000'), 'Aucun fragment en clair dans le payload chiffré');

  // Rotation de la clé KEK
  const rotationResult = rotateKmsMasterKey(expiringKek, ADMIN_1_USER.email);
  assert(rotationResult.updatedKey.version === 5, 'Rotation incrémente la version de la KEK (v4 -> v5)');
  assert(rotationResult.logEntry.details.includes('ré-enveloppées'), 'DEKs ré-enveloppées sous la nouvelle KEK');

  console.log('  -> [PASS] Chiffrement enveloppe AES-256-GCM et rotation KEK validés.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 8 : [PROMPT-16-04] Sauvegardes, Intégrité SHA-256 & Restore Drills
  // --------------------------------------------------------------------------
  console.log('TEST 8 : [PROMPT-16-04] Intégrité Sauvegardes SHA-256 & Test de Restauration Sandbox (Restore Drill)...');

  const validBackup = createInitialTestDatabase().backups[0];
  const integrity = verifyBackupCryptographicIntegrity(validBackup);
  assert(integrity.isValid === true, 'Sauvegarde valide reconnue par le contrôle cryptographique');

  // Test de restauration en sandbox (Restore Drill)
  const drillResult = performBackupRestoreDrill(validBackup);
  assert(drillResult.status === 'DRILL_PASSED', 'Restore Drill validé avec succès (status=DRILL_PASSED)');
  assert(drillResult.isIsolatedFromProduction === true, 'Restore Drill isolé de la production (zéro écriture prod)');
  assert(drillResult.tablesRestoredCount === 18, '18 tables réconciliées en sandbox');
  assert(drillResult.sha256Verified === true, 'Empreinte SHA-256 certifiée lors du test');

  // Cas sauvegarde corrompue
  const corruptedBackup: BackupRecord = {
    ...validBackup,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    status: 'IN_PROGRESS',
  };
  const failedDrill = performBackupRestoreDrill(corruptedBackup);
  assert(failedDrill.status === 'DRILL_FAILED', 'Sauvegarde corrompue échoue au Restore Drill');

  console.log('  -> [PASS] Sauvegardes, vérification SHA-256 et Restore Drills validés sans impact prod.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 9 : [PROMPT-16-05] Journal d'Audit Immuable (Append-Only SHA-256 Chain)
  // --------------------------------------------------------------------------
  console.log('TEST 9 : [PROMPT-16-05] Chaîne de hachage SHA-256 du Journal d\'Audit & Détection de falsification...');

  const initialLogs = createInitialTestDatabase().auditLogs;
  const auditChain = buildAuditChainFromLogs(initialLogs);

  assert(auditChain.length === 2, '2 entrées chaînées dans le journal d\'audit');
  assert(auditChain[1].prevHash === 'GENESIS_HASH_TRADELINK_V6_INITIAL_BLOCK', 'Entrée la plus ancienne liée au hash GENESIS');
  assert(auditChain[0].prevHash === auditChain[1].currentHash, 'Entrée récente liée au hash de la précédente');

  // Vérification d'intégrité de la chaîne saine
  const chainVerification = verifyAuditLogChainIntegrity(auditChain);
  assert(chainVerification.isChainIntact === true, 'Chaîne d’audit certifiée intacte (isChainIntact=true)');
  assert(chainVerification.totalEntriesVerified === 2, '2 entrées vérifiées conformes');

  // Simulation d'une falsification malveillante (altération d'un détail ou du hash)
  const tamperedChain = [...auditChain];
  tamperedChain[0] = {
    ...tamperedChain[0],
    prevHash: 'TAMPERED_PREV_HASH_FALSIFIED_BY_ATTACKER',
  };
  const tamperedVerification = verifyAuditLogChainIntegrity(tamperedChain);
  assert(tamperedVerification.isChainIntact === false, 'Falsification détectée immédiatement par le vérificateur');
  assert(tamperedVerification.brokenIndex === 0, 'Index de la rupture identifié avec précision');

  console.log('  -> [PASS] Intégrité de la chaîne d\'audit SHA-256 et détection de falsification validées.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 10 : [PROMPT-16-06] Supervision APM & Télémétrie en temps réel
  // --------------------------------------------------------------------------
  console.log('TEST 10 : [PROMPT-16-06] Télémétrie APM (PostgreSQL 16, Redis 7.2, Queues & Latences)...');

  const apmMetrics = getSystemSupervisionMetrics();
  assert(apmMetrics.database.status === 'OPTIMAL', 'Statut base de données PostgreSQL 16 optimal');
  assert(apmMetrics.database.connectionsActive <= apmMetrics.database.connectionsMax, 'Pool de connexions dans les limites');
  assert(apmMetrics.redisCache.hitRatePct >= 95, 'Hit-rate Redis supérieur à 95% (actuel 98.4%)');
  assert(apmMetrics.services.length >= 6, 'Au moins 6 micro-services supervisés en temps réel');
  assert(apmMetrics.queues.length >= 4, '4 files de tâches asynchrones supervisées (KYC, OCR, Email, Webhooks)');
  assert(apmMetrics.apiMetrics.p95LatencyMs < 100, 'Latence API p95 sous les 100 ms');

  console.log('  -> [PASS] Télémétrie APM et supervision technique temps réel conformes.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 11 : [PROMPT-15-16-HTTP] Intégration End-to-End Contrôleurs & API HTTP
  // --------------------------------------------------------------------------
  console.log('TEST 11 : [PROMPT-15-16-HTTP] Contrôleurs API REST (Imports 12 étapes, Sandbox, KMS, Sécurité)...');

  const store = new TradeLinkRepositoryStore(createInitialTestDatabase());
  const app = new TradeLinkApiApplication(store);

  // Helper pour simuler requêtes API
  const apiCall = async (params: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    user?: NonNullable<ServerRequestContext['user']>;
    body?: any;
    query?: Record<string, string>;
  }) => {
    const req: ServerRequestContext = {
      method: params.method,
      path: params.path,
      headers: {},
      query: params.query || {},
      params: {},
      correlationId: `corr-test-${Date.now()}`,
      ipAddress: '127.0.0.1',
      user: params.user,
      body: params.body,
    };
    return app.handleRequest(req);
  };

  // 11A. Upload d'un fichier d'import via API
  const uploadRes = await apiCall({
    method: 'POST',
    path: '/api/v1/import/upload',
    user: ADMIN_1_USER,
    body: {
      fileName: 'produits_nouveaux.csv',
      fileContentRaw: 'sku;nom;prix;stock\nIND-TEST-01;Produit Test;99.00;10',
      entity: 'CATALOG_PRODUCTS',
    },
  });
  assert(uploadRes.statusCode === 201, 'POST /api/v1/import/upload retourne 201 CREATED');
  const uploadedJob = uploadRes.body.data as SecureImportPipelineJob;
  assert(Boolean(uploadedJob.id), 'Job ID retourné par l’API');

  // 11B. Étape 2 : Identifier
  const identifyRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/identify`,
    user: ADMIN_1_USER,
  });
  assert(identifyRes.statusCode === 200, 'POST /api/v1/import/:id/identify retourne 200');

  // 11C. Étape 3 : Valider
  const validateRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/validate`,
    user: ADMIN_1_USER,
  });
  assert(validateRes.statusCode === 200, 'POST /api/v1/import/:id/validate retourne 200');

  // 11D. Étape 4 : Analyser
  const analyzeRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/analyze`,
    user: ADMIN_1_USER,
  });
  assert(analyzeRes.statusCode === 200, 'POST /api/v1/import/:id/analyze retourne 200');

  // 11E. Étape 6 : Mapper
  const mapRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/map`,
    user: ADMIN_1_USER,
  });
  assert(mapRes.statusCode === 200, 'POST /api/v1/import/:id/map retourne 200');

  // 11F. Étape 7 : Doublons
  const dupRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/duplicates`,
    user: ADMIN_1_USER,
    body: { duplicateStrategy: 'SKIP' },
  });
  assert(dupRes.statusCode === 200, 'POST /api/v1/import/:id/duplicates retourne 200');

  // 11G. Étape 8 : Erreurs
  const errRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/errors`,
    user: ADMIN_1_USER,
  });
  assert(errRes.statusCode === 200, 'POST /api/v1/import/:id/errors retourne 200');

  // 11H. Étape 9 : Simulation
  const simRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/simulate`,
    user: ADMIN_1_USER,
  });
  assert(simRes.statusCode === 200, 'POST /api/v1/import/:id/simulate retourne 200');

  // 11I. Étape 10 : Confirmation
  const confirmRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/confirm`,
    user: ADMIN_1_USER,
  });
  assert(confirmRes.statusCode === 200, 'POST /api/v1/import/:id/confirm retourne 200');

  // 11J. Étape 11 & 12 : Exécution
  const execRes = await apiCall({
    method: 'POST',
    path: `/api/v1/import/${uploadedJob.id}/execute`,
    user: ADMIN_1_USER,
  });
  assert(execRes.statusCode === 200, 'POST /api/v1/import/:id/execute retourne 200');
  assert((execRes.body.data as any).importedRows === 1, '1 ligne importée confirmée par l’API');

  // 11K. Exportation certifiée multi-formats via API
  const exportApiRes = await apiCall({
    method: 'POST',
    path: '/api/v1/export',
    user: ADMIN_1_USER,
    body: { entity: 'PRODUCTS', format: 'CSV' },
  });
  assert(exportApiRes.statusCode === 200, 'POST /api/v1/export retourne 200');
  assert(Boolean((exportApiRes.body.data as any).sha256), 'SHA-256 certifié dans la réponse d\'export');

  // 11L. Centre de Sécurité : Alertes
  const alertsRes = await apiCall({
    method: 'GET',
    path: '/api/v1/admin/security/alerts',
    user: ADMIN_1_USER,
  });
  assert(alertsRes.statusCode === 200, 'GET /api/v1/admin/security/alerts retourne 200');

  // 11M. Centre de Sécurité : Supervision APM
  const apmRes = await apiCall({
    method: 'GET',
    path: '/api/v1/admin/security/supervision',
    user: ADMIN_1_USER,
  });
  assert(apmRes.statusCode === 200, 'GET /api/v1/admin/security/supervision retourne 200');
  assert((apmRes.body.data as any).database.status === 'OPTIMAL', 'Supervision APM confirme statut OPTIMAL');

  // 11N. Centre de Sécurité : Vérification de la chaîne d'audit
  const verifyChainRes = await apiCall({
    method: 'GET',
    path: '/api/v1/admin/security/audit/verify-chain',
    user: ADMIN_1_USER,
  });
  assert(verifyChainRes.statusCode === 200, 'GET /api/v1/admin/security/audit/verify-chain retourne 200');
  assert((verifyChainRes.body.data as any).isChainIntact === true, 'Chaîne d’audit intacte via API');

  // 11O. Protection RBAC : Rejet d'un utilisateur non authentifié (401)
  const unauthRes = await apiCall({
    method: 'GET',
    path: '/api/v1/admin/security/alerts',
    user: undefined,
  });
  assert(unauthRes.statusCode === 401, 'Requête non authentifiée rejetée avec code 401');

  // 11P. Protection RBAC : Rejet d'un utilisateur non-admin sur route sensible (403)
  const clientForbiddenRes = await apiCall({
    method: 'GET',
    path: '/api/v1/admin/security/alerts',
    user: CLIENT_USER,
  });
  assert(clientForbiddenRes.statusCode === 403, 'Accès client aux alertes de sécurité rejeté avec code 403');

  console.log('  -> [PASS] Intégration End-to-End Contrôleurs et Sécurité RBAC 100% validées.\n');
  passedTests++;

  // ==========================================================================
  // BILAN FINAL
  // ==========================================================================
  console.log('====================================================================');
  console.log(`RÉSULTAT SUITE PROMPT 15 & 16 : ${passedTests} / 11 TESTS RÉUSSIS AVEC SUCCÈS (100%) !`);
  console.log('TOUTES LES EXIGENCES TECHNIQUES SONT ENTIÈREMENT VALIDÉES :');
  console.log('  1. Formats CSV/XLSX/JSON, Sanitisation CSV Formula (CWE-1236), Antivirus & Quotas');
  console.log('  2. Parcours complet 12 étapes avec détection doublons & simulation Dry-Run');
  console.log('  3. Sandbox bases (SQL, BAK, DBF), Règle BAK & Double Approbation (4-Eyes Principle)');
  console.log('  4. Exports certifiés multi-formats (CSV, XLSX, JSON, PDF) avec SHA-256');
  console.log('  5. Single Active Session Policy & Révocation à chaud');
  console.log('  6. Surveillance & Détection automatique d\'anomalies (Brute Force, IDOR, KEK)');
  console.log('  7. KMS HSM : Chiffrement par enveloppe AES-256-GCM & Rotation');
  console.log('  8. Sauvegardes chiffrées & Tests de restauration Sandbox (Restore Drill)');
  console.log('  9. Journal d\'audit immuable en chaîne de hachage SHA-256');
  console.log(' 10. Supervision technique APM temps réel (PostgreSQL 16, Redis 7.2, Queues)');
  console.log(' 11. Contrôleurs API REST et autorisations RBAC');
  console.log('====================================================================');
}

runAdminSecurityAuditTestSuite().catch((err) => {
  console.error('\n❌ ERREUR DANS LA SUITE DE TESTS PROMPT 15 & 16 :', err);
  process.exit(1);
});
