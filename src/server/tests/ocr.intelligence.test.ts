// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS COMPLÈTE OCR & INTELLIGENCE DOCUMENTAIRE (PROMPT 05)
// VÉRIFICATION DE TOUTES LES EXIGENCES ET GARDE-FOUS DE SÉCURITÉ :
// 1. [OCR-01] Validation stricte des Magic Bytes (Anti-malware & Rejet exécutables)
// 2. [OCR-02] Limite de taille stricte de 15 Mo (Rejet 400 si fichier > 15 Mo)
// 3. [OCR-03] Détection des doublons par hachage cryptographique SHA-256 (Rejet 409)
// 4. [OCR-04] Extraction structurée multilingue (Français, Anglais, Arabe RTL)
// 5. [OCR-05] Prise en charge des 7 profils documentaires métiers
// 6. [OCR-06] Contrôle arithmétique déterministe (HT + TVA = TTC)
// 7. [OCR-07] Validation humaine obligatoire & blocage validation aveugle
// 8. [OCR-08] Traçabilité des corrections manuelles dans le journal d'audit immuable
// 9. [OCR-09] URLs présignées temporaires (Expiration 15 min / 900s HMAC)
// 10. [OCR-10] File d'attente asynchrone pour documents volumineux & Soft Delete avec Anti-IDOR
// ============================================================================

import {
  validateFileMagicBytes,
  calculateDocumentSha256,
  generateOcrPresignedUrl,
  extractDocumentFieldsWithProfile,
  verifyDocumentArithmeticConsistency,
  commitHumanReviewValidation,
  OCR_MAX_FILE_SIZE_BYTES,
  OCR_PRESIGNED_EXPIRATION_SECONDS,
} from '../../services/ocrDocumentEngine';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { UserRoleCode, OcrDocumentProfile, OcrExtractedField } from '../../types';

export interface OcrTestResult {
  testId: string;
  title: string;
  passed: boolean;
  summary: string;
}

function createOcrTestDatabaseSnapshot(): DatabaseStateSnapshot {
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
    logisticsMissions: [],
    vehicles: [],
    transportDocuments: [],
    kycJurisdictions: [],
    kycDecisions: [],
    kycReminders: [],
    copilotThreads: [],
    voiceInteractions: [],
    ocrDocuments: [],
    ocrQueueJobs: [],
  };
}

export async function runOcrIntelligenceTestSuite() {
  console.log('\n================================================================================');
  console.log('TRADELINK V6.0 — SUITE DE TESTS OCR & INTELLIGENCE DOCUMENTAIRE IDP (PROMPT 05)');
  console.log('================================================================================\n');

  const results: OcrTestResult[] = [];
  const snapshot = createOcrTestDatabaseSnapshot();
  const repo = new TradeLinkRepositoryStore(snapshot);
  const app = new TradeLinkApiApplication(repo);

  const adminUser = {
    id: 'usr-admin-ocr',
    email: 'admin.securite@tradelink.ma',
    role: 'ADMIN' as UserRoleCode,
    sessionId: 'sess-admin-ocr-01',
    companyName: 'TRADELINK Platform Authority',
    firstName: 'Amine',
    lastName: 'Directeur',
  };

  const clientUser = {
    id: 'usr-client-ocr',
    email: 'directeur.achats@atlas-tech.ma',
    role: 'CLIENT' as UserRoleCode,
    sessionId: 'sess-client-ocr-01',
    companyName: 'Atlas Technologies SARL',
    firstName: 'Reda',
    lastName: 'El Fassi',
  };

  const outsiderUser = {
    id: 'usr-outsider-ocr',
    email: 'hacker@competitor.com',
    role: 'CLIENT' as UserRoleCode,
    sessionId: 'sess-outsider-ocr-01',
    companyName: 'Competitor Corp',
    firstName: 'Anonymous',
    lastName: 'Intruder',
  };

  registerSingleActiveSession(adminUser.id, adminUser.sessionId, true);
  registerSingleActiveSession(clientUser.id, clientUser.sessionId, true);
  registerSingleActiveSession(outsiderUser.id, outsiderUser.sessionId, true);

  // --------------------------------------------------------------------------
  // TEST 1 : [OCR-01] Validation stricte des Magic Bytes (Anti-malware & Rejet exécutables)
  // --------------------------------------------------------------------------
  {
    // 1. Exécutable Windows PE / DOS (MZ = 0x4D, 0x5A)
    const mzExecutableBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const mzCheck = validateFileMagicBytes(mzExecutableBuffer);

    // 2. Binaire Linux ELF (0x7F, 0x45, 0x4C, 0x46)
    const elfExecutableBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
    const elfCheck = validateFileMagicBytes(elfExecutableBuffer);

    // 3. Script Shell bash camouflé
    const scriptBuffer = Buffer.from('#!/bin/bash\nrm -rf /', 'utf-8');
    const scriptCheck = validateFileMagicBytes(scriptBuffer);

    // 4. Formats authentiques autorisés : PDF, JPEG, PNG, WebP
    const validPdfBuffer = Buffer.from('%PDF-1.7\n%Test TradeLink Invoice', 'utf-8');
    const pdfCheck = validateFileMagicBytes(validPdfBuffer);

    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const jpegCheck = validateFileMagicBytes(validJpegBuffer);

    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const pngCheck = validateFileMagicBytes(validPngBuffer);

    const isProtectionEffective =
      !mzCheck.isValid &&
      mzCheck.error?.includes('MZ') &&
      !elfCheck.isValid &&
      elfCheck.error?.includes('ELF') &&
      !scriptCheck.isValid &&
      pdfCheck.isValid &&
      pdfCheck.detectedMimeType === 'application/pdf' &&
      jpegCheck.isValid &&
      jpegCheck.detectedMimeType === 'image/jpeg' &&
      pngCheck.isValid &&
      pngCheck.detectedMimeType === 'image/png';

    results.push({
      testId: 'OCR-01',
      title: 'Validation Stricte des Magic Bytes (Rejet Malwares MZ/ELF & Acceptation PDF/JPG/PNG)',
      passed: Boolean(isProtectionEffective),
      summary: `MZ bloqué: ${!mzCheck.isValid} ; ELF bloqué: ${!elfCheck.isValid} ; Script bloqué: ${!scriptCheck.isValid} ; PDF validé: ${pdfCheck.isValid} ; JPG validé: ${jpegCheck.isValid}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2 : [OCR-02] Limite de taille stricte de 15 Mo
  // --------------------------------------------------------------------------
  {
    const oversizedBytes = 16 * 1024 * 1024; // 16 Mo (> 15 Mo)

    const oversizeRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/ocr/upload',
      headers: {},
      query: {},
      params: {},
      body: {
        fileName: 'Heavy_Archive_Payload.pdf',
        fileSizeBytes: oversizedBytes,
        mimeType: 'application/pdf',
        profile: 'INVOICE',
      },
      correlationId: 'test-ocr-02-oversize',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const isLimitEnforced =
      oversizeRes.statusCode === 400 &&
      (oversizeRes.body as any).error?.code === 'FILE_TOO_LARGE' &&
      OCR_MAX_FILE_SIZE_BYTES === 15 * 1024 * 1024;

    results.push({
      testId: 'OCR-02',
      title: 'Limite de Taille Stricte de 15 Mo (Rejet HTTP 400 FILE_TOO_LARGE)',
      passed: isLimitEnforced,
      summary: `Fichier 16 Mo rejeté: ${oversizeRes.statusCode === 400} (${(oversizeRes.body as any).error?.code}) ; Limite max: 15 Mo (${OCR_MAX_FILE_SIZE_BYTES} octets)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3 : [OCR-03] Détection des doublons par hachage SHA-256 (Rejet 409)
  // --------------------------------------------------------------------------
  let uploadedInvoiceDocId = '';
  {
    const invoiceContent = `%PDF-1.7\nFACTURE COMMERCIALE N° FAC-2026-CASABLANCA-01\nTotal HT: 10000.00 EUR\nTVA: 2000.00 EUR\nTotal TTC: 12000.00 EUR\nICE: 001827364000029`;
    const invoiceBuffer = Buffer.from(invoiceContent, 'utf-8');
    const expectedHash = calculateDocumentSha256(invoiceBuffer);
    const invoiceBase64 = invoiceBuffer.toString('base64');

    // 1ère soumission
    const firstUploadRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/ocr/upload',
      headers: {},
      query: {},
      params: {},
      body: {
        fileName: 'Facture_Atlas_FAC-01.pdf',
        fileBytesBase64: invoiceBase64,
        fileSizeBytes: invoiceContent.length,
        mimeType: 'application/pdf',
        profile: 'INVOICE',
      },
      correlationId: 'test-ocr-03-first',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    uploadedInvoiceDocId = (firstUploadRes.body as any).data?.document?.id;

    // 2ème soumission (même contenu exact)
    const duplicateUploadRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/ocr/upload',
      headers: {},
      query: {},
      params: {},
      body: {
        fileName: 'Facture_Atlas_FAC-01_Copie.pdf',
        fileBytesBase64: invoiceBase64,
        fileSizeBytes: invoiceContent.length,
        mimeType: 'application/pdf',
        profile: 'INVOICE',
      },
      correlationId: 'test-ocr-03-duplicate',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const isDuplicateBlocked =
      firstUploadRes.statusCode === 201 &&
      Boolean(expectedHash) &&
      duplicateUploadRes.statusCode === 409 &&
      (duplicateUploadRes.body as any).error?.code === 'DOCUMENT_DUPLICATE_DETECTED';

    results.push({
      testId: 'OCR-03',
      title: 'Détection d\'Empreinte SHA-256 Anti-Doublon (Rejet HTTP 409 DOCUMENT_DUPLICATE_DETECTED)',
      passed: isDuplicateBlocked,
      summary: `Premier upload: 201 (ID: ${uploadedInvoiceDocId}) ; Tentative doublon: ${duplicateUploadRes.statusCode} (${(duplicateUploadRes.body as any).error?.code})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4 : [OCR-04] Extraction Structurée Multilingue (Français, Anglais, Arabe RTL)
  // --------------------------------------------------------------------------
  {
    // Document Arabe
    const arabicText = `فاتورة تجارية رقم: فات-2026-9041
تاريخ الإصدار: 18/11/2026
المورد: شركة الأطلس للتوزيع التجاري
العميل: مؤسسة التوريد الدولية
المجموع الصافي: 50000.00 درهم
مبلغ الضريبة (20%): 10000.00 درهم
المجموع الإجمالي: 60000.00 درهم
العملة: MAD
شروط التجارة الدولية: CIF ميناء الدار البيضاء`;

    const arabicExtraction = extractDocumentFieldsWithProfile(arabicText, 'INVOICE', 'Facture_Arabe.pdf');

    // Document Anglais
    const englishText = `COMMERCIAL INVOICE # INV-USA-2026-88
Date: 2026-11-18
Vendor: Global Microchips Silicon Valley Inc.
Customer: EuroTech Systems Ltd
Subtotal Amount: 24000.00 USD
VAT / Tax (10%): 2400.00 USD
Total Amount Due: 26400.00 USD
Currency: USD
Incoterm: FOB New York Airport`;

    const englishExtraction = extractDocumentFieldsWithProfile(englishText, 'INVOICE', 'Invoice_English.pdf');

    const passed =
      arabicExtraction.detectedLanguage === 'ar' &&
      arabicExtraction.fields.some((f) => f.key === 'amountTtc' && f.value === '60000.00') &&
      arabicExtraction.fields.some((f) => f.key === 'currency' && f.value === 'MAD') &&
      englishExtraction.detectedLanguage === 'en' &&
      englishExtraction.fields.some((f) => f.key === 'amountTtc' && f.value === '26400.00') &&
      englishExtraction.fields.some((f) => f.key === 'currency' && f.value === 'USD');

    results.push({
      testId: 'OCR-04',
      title: 'Extraction Structurée Multilingue & Détection Automatique (Arabe RTL, Anglais, Français)',
      passed,
      summary: `Arabe détecté: ${arabicExtraction.detectedLanguage} (TTC: 60000 MAD) ; Anglais détecté: ${englishExtraction.detectedLanguage} (TTC: 26400 USD)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5 : [OCR-05] Prise en charge des 7 Profils Documentaires Métiers
  // --------------------------------------------------------------------------
  {
    const profilesToTest: OcrDocumentProfile[] = [
      'KYC',
      'INVOICE',
      'QUOTE',
      'PURCHASE_ORDER',
      'DELIVERY_NOTE',
      'TRANSPORT_CMR',
      'ACCOUNTING',
    ];

    const profileSamples: Record<OcrDocumentProfile, string> = {
      KYC: '%PDF-1.7\nREGISTRE DE COMMERCE DU MAROC\nNuméro RC: 98402 Casablanca\nICE: 001928374000018\nForme juridique: SARL',
      INVOICE: '%PDF-1.7\nFACTURE COMMERCIALE N° FAC-44\nTotal HT: 1000.00 EUR\nTVA: 200.00 EUR\nTotal TTC: 1200.00 EUR',
      QUOTE: '%PDF-1.7\nDEVIS ESTIMATIF B2B N° DEV-8801\nMontant estimé: 15400.00 EUR\nValidité du devis: 30 jours',
      PURCHASE_ORDER: '%PDF-1.7\nBON DE COMMANDE N° PO-7721\nAcheteur: Atlas Industrial\nConditions de paiement: 60 jours',
      DELIVERY_NOTE: '%PDF-1.7\nBON DE LIVRAISON N° BL-6602\nQuai de chargement: Quai 4 Zenata\nNombre de colis: 120 palettes',
      TRANSPORT_CMR: '%PDF-1.7\nLETTRE DE VOITURE INTERNATIONALE e-CMR N° CMR-9901\nPlaque remorque: 44-A-9921\nCertificat EUR.1',
      ACCOUNTING: '%PDF-1.7\nRELEVE BANCAIRE MENSUEL\nIBAN: MA64011520000001234567890123\nSolde créditeur: 849200.00 MAD',
    };

    let allProfilesSuccessful = true;
    for (const prof of profilesToTest) {
      const ext = extractDocumentFieldsWithProfile(profileSamples[prof], prof, `doc_${prof}.pdf`);
      if (ext.fields.length === 0 || ext.globalConfidence < 0.7) {
        allProfilesSuccessful = false;
      }
    }

    results.push({
      testId: 'OCR-05',
      title: 'Prise en Charge Exhaustive des 7 Profils Documentaires Métiers TRADELINK',
      passed: allProfilesSuccessful,
      summary: `7 profils vérifiés avec succès: ${profilesToTest.join(', ')}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6 : [OCR-06] Contrôle Arithmétique Déterministe (HT + TVA = TTC)
  // --------------------------------------------------------------------------
  {
    const consistentFields: OcrExtractedField[] = [
      { key: 'amountHt', label: 'Montant HT', value: '3450.00', confidence: 0.98 },
      { key: 'vatAmount', label: 'TVA', value: '690.00', confidence: 0.98 },
      { key: 'amountTtc', label: 'Montant TTC', value: '4140.00', confidence: 0.98 },
    ];
    const consistentCheck = verifyDocumentArithmeticConsistency(consistentFields);

    // Incohérence intentionnelle : 3450 + 690 ≠ 4999.00
    const inconsistentFields: OcrExtractedField[] = [
      { key: 'amountHt', label: 'Montant HT', value: '3450.00', confidence: 0.98 },
      { key: 'vatAmount', label: 'TVA', value: '690.00', confidence: 0.98 },
      { key: 'amountTtc', label: 'Montant TTC', value: '4999.00', confidence: 0.98 },
    ];
    const inconsistentCheck = verifyDocumentArithmeticConsistency(inconsistentFields);

    const passed =
      consistentCheck.isConsistent === true &&
      inconsistentCheck.isConsistent === false &&
      Boolean(inconsistentCheck.errorMessage?.includes('Incohérence'));

    results.push({
      testId: 'OCR-06',
      title: 'Contrôle Arithmétique Déterministe Détectant les Altérations (HT + TVA = TTC)',
      passed,
      summary: `Calcul exact validé: ${consistentCheck.isConsistent} ; Fraude arithmétique bloquée: ${!inconsistentCheck.isConsistent} (${inconsistentCheck.errorMessage})`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 7 : [OCR-07] Validation Humaine Obligatoire & Blocage Validation Aveugle
  // --------------------------------------------------------------------------
  {
    const targetDoc = repo.getOcrDocumentById(uploadedInvoiceDocId);
    let blindValidationBlocked = false;

    // Tentative 1 : Passer en validation sans utilisateur (Validation aveugle IA) -> doit lever une exception
    try {
      commitHumanReviewValidation(
        targetDoc!,
        null as any, // Absence d'humain
        {}
      );
    } catch {
      blindValidationBlocked = true;
    }

    // Tentative 2 : Validation humaine officielle par l'Administrateur
    const validationRes = app.handleRequest({
      method: 'POST',
      path: `/api/v1/ocr/documents/${uploadedInvoiceDocId}/validate`,
      headers: {},
      query: {},
      params: { id: uploadedInvoiceDocId },
      body: {
        confirmedFields: {
          amountTtc: '12000.00',
        },
        notes: 'Certifié conforme après pointage avec le bon de commande #PO-4410.',
      },
      correlationId: 'test-ocr-07-validation',
      ipAddress: '192.168.1.10',
      user: adminUser,
    });

    const validatedDoc = (validationRes.body as any).data?.document;

    const passed =
      blindValidationBlocked &&
      validationRes.statusCode === 200 &&
      validatedDoc?.status === 'VALIDATED' &&
      validatedDoc?.processingStatus === 'VALIDATED' &&
      validatedDoc?.validatedBy === adminUser.email;

    results.push({
      testId: 'OCR-07',
      title: 'Validation Humaine Obligatoire & Interdiction Formelle des Validations Aveugles IA',
      passed,
      summary: `Validation aveugle bloquée: ${blindValidationBlocked} ; Validation humaine réussie: status=${validatedDoc?.status} par ${validatedDoc?.validatedBy}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8 : [OCR-08] Traçabilité des Corrections Manuelles dans le Journal d'Audit
  // --------------------------------------------------------------------------
  {
    // Créer un document avec champ à corriger
    const textSample = `%PDF-1.7\nFACTURE N° FAC-ERRONEE-99\nTotal HT: 500.00 EUR`;
    const b64 = Buffer.from(textSample, 'utf-8').toString('base64');

    const upRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/ocr/upload',
      headers: {},
      query: {},
      params: {},
      body: {
        fileName: 'Facture_Avec_Erreur.pdf',
        fileBytesBase64: b64,
        fileSizeBytes: textSample.length,
        mimeType: 'application/pdf',
        profile: 'INVOICE',
      },
      correlationId: 'test-ocr-08-up',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const docId = (upRes.body as any).data?.document?.id;

    // Correction manuelle d'un champ par un utilisateur
    const correctRes = app.handleRequest({
      method: 'PATCH',
      path: `/api/v1/ocr/documents/${docId}/fields`,
      headers: {},
      query: {},
      params: { id: docId },
      body: {
        fieldKey: 'invoiceNumber',
        newValue: 'FAC-CORRIGEE-2026-001',
        reason: 'Correction OCR d\'un caractère mal reconnu sur scan 200 DPI',
      },
      correlationId: 'test-ocr-08-patch',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const correctedDoc = (correctRes.body as any).data?.document || (correctRes.body as any).data;
    const hasCorrectionLog = correctedDoc?.corrections?.some(
      (c: any) => c.fieldKey === 'invoiceNumber' && c.correctedValue === 'FAC-CORRIGEE-2026-001'
    );

    const passed =
      correctRes.statusCode === 200 &&
      hasCorrectionLog &&
      correctedDoc?.fields.find((f: any) => f.key === 'invoiceNumber')?.value === 'FAC-CORRIGEE-2026-001';

    results.push({
      testId: 'OCR-08',
      title: 'Traçabilité et Journalisation Immuable des Corrections Humaines',
      passed,
      summary: `Correction HTTP: ${correctRes.statusCode} ; Champ mis à jour: ${correctedDoc?.fields.find((f: any) => f.key === 'invoiceNumber')?.value} ; Log audit consigné: ${hasCorrectionLog}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 9 : [OCR-09] URLs Présignées Temporaires (Expiration 15 min / 900s HMAC)
  // --------------------------------------------------------------------------
  {
    const presigned = generateOcrPresignedUrl('doc-test-presigned-001', 'Facture_Presign.pdf');

    const url = new URL(presigned.url);
    const expiresMs = parseInt(url.searchParams.get('expires') || '0', 10);
    const signature = url.searchParams.get('sig');

    const nowMs = Date.now();
    const expectedExpirationMs = nowMs + OCR_PRESIGNED_EXPIRATION_SECONDS * 1000;
    const expirationDiffSeconds = Math.abs(expiresMs - expectedExpirationMs) / 1000;

    const passed =
      Boolean(signature) &&
      expirationDiffSeconds <= 5 &&
      OCR_PRESIGNED_EXPIRATION_SECONDS === 900;

    results.push({
      testId: 'OCR-09',
      title: 'URLs Présignées Temporaires Signées HMAC (Durée de Validité Stricte 15 min / 900s)',
      passed,
      summary: `Signature HMAC: ${signature?.substring(0, 10)}... ; Expiration: ${OCR_PRESIGNED_EXPIRATION_SECONDS}s (diff: ${expirationDiffSeconds.toFixed(1)}s)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10 : [OCR-10] File d'Attente Asynchrone, Soft Delete & Cloisonnement Anti-IDOR
  // --------------------------------------------------------------------------
  {
    // 1. Simulation d'un fichier lourd (> 5 Mo) déclenchant la file d'attente asynchrone
    const heavySize = 8 * 1024 * 1024; // 8 Mo
    const heavyUploadRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/ocr/upload',
      headers: {},
      query: {},
      params: {},
      body: {
        fileName: 'Catalogue_Douanier_Grand_Volume.pdf',
        fileSizeBytes: heavySize,
        mimeType: 'application/pdf',
        profile: 'TRANSPORT_CMR',
      },
      correlationId: 'test-ocr-10-heavy',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const heavyDocId = (heavyUploadRes.body as any).data?.document?.id;
    const queueStatusRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/ocr/queue',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-ocr-10-queue',
      ipAddress: '192.168.1.10',
      user: adminUser,
    });

    const queueCount = (queueStatusRes.body as any).data?.queue?.length || 0;

    // 2. Cloisonnement Anti-IDOR : un intrus tente d'accéder au document d'Atlas Technologies
    const idorAttackRes = app.handleRequest({
      method: 'GET',
      path: `/api/v1/ocr/documents/${heavyDocId}`,
      headers: {},
      query: {},
      params: { id: heavyDocId },
      body: {},
      correlationId: 'test-ocr-10-idor',
      ipAddress: '185.220.101.5',
      user: outsiderUser,
    });

    // 3. Soft Delete du document par son propriétaire
    const deleteRes = app.handleRequest({
      method: 'DELETE',
      path: `/api/v1/ocr/documents/${heavyDocId}`,
      headers: {},
      query: {},
      params: { id: heavyDocId },
      body: {},
      correlationId: 'test-ocr-10-delete',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const isSoftDeleted = (deleteRes.body as any).data?.success === true;

    const passed =
      heavyUploadRes.statusCode === 201 &&
      queueCount >= 1 &&
      idorAttackRes.statusCode === 403 &&
      (idorAttackRes.body as any).error?.code === 'FORBIDDEN_IDOR_DOCUMENT_ACCESS' &&
      deleteRes.statusCode === 200 &&
      isSoftDeleted;

    results.push({
      testId: 'OCR-10',
      title: 'File d\'Attente Asynchrone, Soft Delete & Cloisonnement Strict Anti-IDOR',
      passed,
      summary: `Queue asynchrone: ${queueCount} job(s) ; Tentative IDOR bloquée: ${idorAttackRes.statusCode} (${(idorAttackRes.body as any).error?.code}) ; Soft Delete: ${isSoftDeleted}`,
    });
  }

  // --------------------------------------------------------------------------
  // SYNTHÈSE GLOBALE DES TESTS OCR
  // --------------------------------------------------------------------------
  console.log('Résultats détaillés des 10 tests OCR & Intelligence Documentaire :');
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`  ${symbol} [${r.testId}] ${r.title}`);
    console.log(`     └─ ${r.summary}`);
    if (!r.passed) allPassed = false;
  }

  console.log('\n--------------------------------------------------------------------------------');
  if (allPassed) {
    console.log(`✨ RÉSULTAT FINAL : 10/10 TESTS RÉUSSIS AVEC SUCCÈS ! (100% CONFORME PROMPT 05)`);
  } else {
    console.error(`⚠️ CERTAINS TESTS ONT ÉCHOUÉ.`);
  }
  console.log('--------------------------------------------------------------------------------\n');

  return { allPassed, results };
}

// Exécution directe si exécuté par script Node
if (process.argv[1]?.includes('ocr.intelligence.test')) {
  runOcrIntelligenceTestSuite().then(({ allPassed }) => {
    if (!allPassed) process.exit(1);
  });
}
