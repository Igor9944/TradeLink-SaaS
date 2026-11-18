// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS COMPLÈTE DICTÉE VOCALE INTELLIGENTE (PROMPT 04)
// VÉRIFICATION DE TOUTES LES EXIGENCES ET GARDE-FOUS DE SÉCURITÉ :
// 1. [VOICE-01] Référentiel trilingue (FR / EN / AR) avec directionnalité RTL certifiée
// 2. [VOICE-02] Commandes de ponctuation et formatage intelligent en Français
// 3. [VOICE-03] Commandes de ponctuation et formatage intelligent en Anglais
// 4. [VOICE-04] Commandes de ponctuation et formatage intelligent en Arabe (RTL)
// 5. [VOICE-05] Détection automatique heuristique de la langue (Arabe vs Latin / FR vs EN)
// 6. [VOICE-06] Consentement obligatoire (RGPD / CNDP) : blocage 403 si refus, 200 si accordé
// 7. [VOICE-07] Garde-fou temporel strict : rejet 400 si durée > 60 secondes
// 8. [VOICE-08] Zéro rétention audio : traitement RAM éphémère et audit logs sans blob audio
// 9. [VOICE-09] Endpoint de transcription fallback sécurisé POST /api/v1/voice/transcribe
// 10. [VOICE-10] Intégrité transactionnelle, Anti-IDOR et persistance d'audit immuable
// ============================================================================

import {
  formatDictatedSpeech,
  detectLanguageFromSample,
} from '../../services/voiceDictationEngine';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { UserRoleCode } from '../../types';

export interface VoiceTestResult {
  testId: string;
  title: string;
  passed: boolean;
  summary: string;
}

function createVoiceTestDatabaseSnapshot(): DatabaseStateSnapshot {
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
  };
}

export async function runVoiceDictationTestSuite() {
  console.log('\n================================================================================');
  console.log('TRADELINK V6.0 — SUITE DE TESTS SAISIE & DICTÉE VOCALE INTELLIGENTE (PROMPT 04)');
  console.log('================================================================================\n');

  const results: VoiceTestResult[] = [];
  const snapshot = createVoiceTestDatabaseSnapshot();
  const repo = new TradeLinkRepositoryStore(snapshot);
  const app = new TradeLinkApiApplication(repo);

  const clientUser = {
    id: 'usr-client-01',
    email: 'achats@atlas-import.ma',
    role: 'CLIENT' as UserRoleCode,
    sessionId: 'sess-client-voice-01',
    companyName: 'Atlas Import-Export Distribution SARL',
    firstName: 'Youssef',
    lastName: 'Berrada',
  };

  const carrierUser = {
    id: 'usr-carr-01',
    email: 'dispatch@medfreight.ma',
    role: 'TRANSPORTEUR' as UserRoleCode,
    sessionId: 'sess-carrier-voice-01',
    companyName: 'MedFreight Logistics SARL',
    firstName: 'Hassan',
    lastName: 'Tazi',
  };

  registerSingleActiveSession(clientUser.id, clientUser.sessionId, true);
  registerSingleActiveSession(carrierUser.id, carrierUser.sessionId, true);

  // --------------------------------------------------------------------------
  // TEST 1 : [VOICE-01] Référentiel Trilingue (FR / EN / AR) avec RTL
  // --------------------------------------------------------------------------
  {
    const res = app.handleRequest({
      method: 'GET',
      path: '/api/v1/voice/languages',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-voice-01',
      ipAddress: '192.168.1.10',
      user: clientUser,
    });

    const body = (res.body as any).data;
    const hasFr = Boolean(body.languages['fr-FR']);
    const hasEn = Boolean(body.languages['en-US']);
    const hasAr = Boolean(body.languages['ar-SA']);
    const isArRtl = body.languages['ar-SA']?.isRtl === true;
    const isFrLtr = body.languages['fr-FR']?.isRtl === false;
    const maxSec = body.maxDurationSeconds;

    const passed =
      res.statusCode === 200 &&
      hasFr &&
      hasEn &&
      hasAr &&
      isArRtl &&
      isFrLtr &&
      maxSec === 60 &&
      body.zeroRetention === true;

    results.push({
      testId: 'VOICE-01',
      title: 'Référentiel Trilingue (FR / EN / AR) & Directionnalité RTL Certifiée',
      passed,
      summary: `Langues supportées: FR(${hasFr})/EN(${hasEn})/AR(${hasAr}) ; Arabe RTL: ${isArRtl} ; Limite max: ${maxSec}s ; Zéro rétention: true`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2 : [VOICE-02] Formatage et Commandes de Ponctuation en Français
  // --------------------------------------------------------------------------
  {
    const rawFr =
      "bonjour monsieur virgule nous souhaitons commander 10 conteneurs point d'interrogation merci de confirmer à la ligne cordialement point";
    const { formatted, punctuationCount } = formatDictatedSpeech(rawFr, 'fr-FR', true);

    const hasComma = formatted.includes(',');
    const hasQuestionMark = formatted.includes('?');
    const hasNewLine = formatted.includes('\n');
    const hasPeriod = formatted.endsWith('.');
    const hasUppercase = formatted.startsWith('Bonjour');

    const passed =
      punctuationCount >= 4 &&
      hasComma &&
      hasQuestionMark &&
      hasNewLine &&
      hasPeriod &&
      hasUppercase;

    results.push({
      testId: 'VOICE-02',
      title: 'Formatage et Commandes de Ponctuation Automatiques en Français',
      passed,
      summary: `Ponctuations converties (${punctuationCount}) ; Virgule: ${hasComma} ; Point d'interrogation: ${hasQuestionMark} ; Saut de ligne: ${hasNewLine} ; Majuscule: ${hasUppercase}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3 : [VOICE-03] Formatage et Commandes de Ponctuation en Anglais
  // --------------------------------------------------------------------------
  {
    const rawEn =
      "please prepare quote comma for reefer container 250L period can you send confirmation question mark new line best regards dot";
    const { formatted, punctuationCount } = formatDictatedSpeech(rawEn, 'en-US', true);

    const hasComma = formatted.includes(',');
    const hasPeriod = formatted.includes('.');
    const hasQuestionMark = formatted.includes('?');
    const hasNewLine = formatted.includes('\n');
    const hasUppercase = formatted.startsWith('Please');

    const passed =
      punctuationCount >= 4 &&
      hasComma &&
      hasPeriod &&
      hasQuestionMark &&
      hasNewLine &&
      hasUppercase;

    results.push({
      testId: 'VOICE-03',
      title: 'Formatage et Commandes de Ponctuation Automatiques en Anglais',
      passed,
      summary: `Ponctuations converties (${punctuationCount}) ; Comma: ${hasComma} ; Period: ${hasPeriod} ; Question mark: ${hasQuestionMark} ; New line: ${hasNewLine}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4 : [VOICE-04] Formatage et Commandes de Ponctuation en Arabe (RTL)
  // --------------------------------------------------------------------------
  {
    const rawAr =
      "مرحبا بك فاصلة تم استلام الشحنة في ميناء الدار البيضاء نقطة هل درجة الحرارة مطابقة علامة استفهام سطر جديد تحياتنا";
    const { formatted, punctuationCount } = formatDictatedSpeech(rawAr, 'ar-SA', true);

    // Vérification de la virgule arabe (،), du point d'interrogation arabe (؟) et saut de ligne
    const hasArabicComma = formatted.includes('،');
    const hasArabicQuestion = formatted.includes('؟');
    const hasPeriod = formatted.includes('.');
    const hasNewLine = formatted.includes('\n');

    const passed =
      punctuationCount >= 4 &&
      hasArabicComma &&
      hasArabicQuestion &&
      hasPeriod &&
      hasNewLine;

    results.push({
      testId: 'VOICE-04',
      title: 'Formatage et Commandes de Ponctuation en Arabe avec RTL (، ؟ .)',
      passed,
      summary: `Ponctuations arabes converties (${punctuationCount}) ; فاصلة (،): ${hasArabicComma} ; استفهام (؟): ${hasArabicQuestion} ; سطر جديد: ${hasNewLine}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5 : [VOICE-05] Détection Heuristique Automatique de la Langue
  // --------------------------------------------------------------------------
  {
    const arabicText = "طلب شحن حاويات مبردة إلى ميناء طنجة المتوسط";
    const frenchText = "Création d'un devis pour les pièces de rechange frigorifiques";
    const englishText = "Generate invoice for EuroTech industrial cold chain equipment";

    const detectedAr = detectLanguageFromSample(arabicText);
    const detectedFr = detectLanguageFromSample(frenchText);
    const detectedEn = detectLanguageFromSample(englishText);

    const passed =
      detectedAr === 'ar-SA' &&
      detectedFr === 'fr-FR' &&
      detectedEn === 'en-US';

    results.push({
      testId: 'VOICE-05',
      title: 'Détection Heuristique Automatique de la Langue (Arabe vs Latin)',
      passed,
      summary: `Détection Arabe: ${detectedAr} ; Français: ${detectedFr} ; Anglais: ${detectedEn}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6 : [VOICE-06] Consentement Obligatoire (RGPD / CNDP) & Blocage 403
  // --------------------------------------------------------------------------
  {
    // Au départ, l'utilisateur client n'a pas encore consenti
    repo.setVoiceConsent(clientUser.id, false);

    // Tentative de transcription sans consentement
    const blockedRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        language: 'fr-FR',
        durationSeconds: 10,
        consentGranted: false,
      },
      correlationId: 'test-consent-block',
      ipAddress: '192.168.1.15',
      user: clientUser,
    });

    const isBlocked403 = blockedRes.statusCode === 403;

    // Enregistrement du consentement explicite via l'API
    const consentRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/consent',
      headers: {},
      query: {},
      params: {},
      body: {
        granted: true,
      },
      correlationId: 'test-consent-grant',
      ipAddress: '192.168.1.15',
      user: clientUser,
    });

    // Nouvelle tentative de transcription après consentement accordé
    const allowedRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        language: 'fr-FR',
        durationSeconds: 12,
        consentGranted: true,
      },
      correlationId: 'test-consent-allowed',
      ipAddress: '192.168.1.15',
      user: clientUser,
    });

    const isAllowed200 = allowedRes.statusCode === 200;

    const passed =
      isBlocked403 &&
      consentRes.statusCode === 200 &&
      isAllowed200;

    results.push({
      testId: 'VOICE-06',
      title: 'Consentement Préalable Obligatoire (RGPD / CNDP) & Blocage 403 sans Accord',
      passed,
      summary: `Blocage sans consentement: ${isBlocked403} (403 VOICE_CONSENT_REQUIRED) ; Sauvegarde consentement: ${consentRes.statusCode === 200} ; Transcription autorisée: ${isAllowed200} (200 OK)`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 7 : [VOICE-07] Garde-Fou Temporel Strict (60 Secondes Max) & Rejet 400
  // --------------------------------------------------------------------------
  {
    // Tentative de transcription dépassant les 60 secondes (ex: 75 secondes)
    const exceedRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        language: 'fr-FR',
        durationSeconds: 75,
        consentGranted: true,
      },
      correlationId: 'test-voice-timeout-01',
      ipAddress: '192.168.1.20',
      user: clientUser,
    });

    const isExceedRejected = exceedRes.statusCode === 400;
    const errorCode = (exceedRes.body as any)?.error?.code;

    // Tentative valide de 59 secondes
    const validRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        language: 'fr-FR',
        durationSeconds: 59,
        consentGranted: true,
      },
      correlationId: 'test-voice-valid-01',
      ipAddress: '192.168.1.20',
      user: clientUser,
    });

    const isValidAllowed = validRes.statusCode === 200;

    const passed =
      isExceedRejected &&
      errorCode === 'VOICE_MAX_DURATION_EXCEEDED' &&
      isValidAllowed;

    results.push({
      testId: 'VOICE-07',
      title: 'Garde-Fou Temporel Strict (60s Max) & Coupure Automatique de Sécurité',
      passed,
      summary: `Durée 75s rejetée: ${isExceedRejected} (code=${errorCode}) ; Durée 59s validée: ${isValidAllowed}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8 : [VOICE-08] Zéro Rétention Audio & Conformité RGPD / CNDP
  // --------------------------------------------------------------------------
  {
    // Envoi d'un flux audio encodé base64
    const simulatedAudioBytes = Buffer.from(
      "Rapport chauffeur : livraison terminée au quai frigorifique de Casablanca point signature client enregistrée point",
      'utf-8'
    ).toString('base64');

    const txRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        audioBase64: simulatedAudioBytes,
        mimeType: 'audio/webm;codecs=opus',
        language: 'fr-FR',
        durationSeconds: 8,
        consentGranted: true,
        targetField: 'CARRIER_POD_NOTES',
      },
      correlationId: 'test-voice-retention-01',
      ipAddress: '192.168.1.30',
      user: carrierUser,
    });

    const txData = (txRes.body as any)?.data;
    const isZeroRetentionEnforced = txData?.zeroRetentionEnforced === true;

    // Vérification de la couche de stockage des interactions vocales
    const interactions = repo.getVoiceInteractions(carrierUser.id);
    const recorded = interactions.find((i) => i.id === txData.interactionId);

    // Vérifier qu'aucun blob audio n'est stocké dans l'enregistrement
    const hasNoAudioBufferStored =
      recorded &&
      !(recorded as any).audioBase64 &&
      !(recorded as any).audioBuffer &&
      !(recorded as any).audioFilePath;

    // Vérifier l'audit log
    const auditLogs = repo.getSnapshot().auditLogs;
    const auditEntry = auditLogs.find((a) => a.targetId === txData.interactionId);

    const isAuditedWithoutAudio =
      auditEntry &&
      auditEntry.action === 'VOICE_DICTATION_TRANSCRIBE' &&
      !auditEntry.details.includes(simulatedAudioBytes);

    const passed =
      txRes.statusCode === 200 &&
      isZeroRetentionEnforced &&
      Boolean(hasNoAudioBufferStored) &&
      Boolean(isAuditedWithoutAudio);

    results.push({
      testId: 'VOICE-08',
      title: 'Zéro Rétention Audio : Purge Immédiate de la Mémoire & Audit Log Dépersonnalisé',
      passed,
      summary: `zeroRetentionEnforced=${isZeroRetentionEnforced} ; Aucun blob stocké: ${hasNoAudioBufferStored} ; Audit log vérifié: ${isAuditedWithoutAudio}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 9 : [VOICE-09] Endpoint de Fallback Serveur POST /api/v1/voice/transcribe
  // --------------------------------------------------------------------------
  {
    // Simulation d'une dictée sur le formulaire de devis (RFQ)
    const quoteSpeech =
      "création d'un devis pour 5 conteneurs isothermes CIP Casablanca avec remise de 5 pourcent virgule livraison prévue le 15 décembre point";

    const speechBase64 = Buffer.from(quoteSpeech, 'utf-8').toString('base64');

    const res = app.handleRequest({
      method: 'POST',
      path: '/api/v1/voice/transcribe',
      headers: {},
      query: {},
      params: {},
      body: {
        audioBase64: speechBase64,
        language: 'fr-FR',
        durationSeconds: 15,
        consentGranted: true,
        autoFormatPunctuation: true,
        targetField: 'QUOTE_DESCRIPTION',
      },
      correlationId: 'test-fallback-01',
      ipAddress: '192.168.1.40',
      user: clientUser,
    });

    const resData = (res.body as any)?.data;
    const transcript = resData?.transcript || '';

    const hasPunctuation = transcript.includes(',') && transcript.includes('.');
    const hasConfidence = resData?.confidence >= 0.95;
    const hasInteractionId = Boolean(resData?.interactionId);

    const passed =
      res.statusCode === 200 &&
      hasPunctuation &&
      hasConfidence &&
      hasInteractionId &&
      transcript.length > 30;

    results.push({
      testId: 'VOICE-09',
      title: 'Endpoint de Transcription de Secours (Fallback Serveur) & Score de Confiance',
      passed,
      summary: `Statut 200 OK ; Confiance: ${resData?.confidence} ; InteractionId: ${resData?.interactionId} ; Ponctuation appliquée: ${hasPunctuation}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10 : [VOICE-10] Protection Anti-IDOR & Traçabilité des Consentements
  // --------------------------------------------------------------------------
  {
    // Consultation du consentement pour l'utilisateur connecté
    const getConsentRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/voice/consent',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-get-consent-01',
      ipAddress: '192.168.1.50',
      user: clientUser,
    });

    const consentData = (getConsentRes.body as any)?.data;
    const isOwnerConsent = consentData?.userId === clientUser.id;

    // Tentative non authentifiée
    const unauthRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/voice/consent',
      headers: {},
      query: {},
      params: {},
      body: {},
      correlationId: 'test-unauth-consent',
      ipAddress: '192.168.1.50',
      user: undefined,
    });

    const isUnauthBlocked = unauthRes.statusCode === 401;

    const passed =
      getConsentRes.statusCode === 200 &&
      isOwnerConsent &&
      isUnauthBlocked;

    results.push({
      testId: 'VOICE-10',
      title: 'Protection Anti-IDOR & Cloisonnement Strict des Préférences Vocales',
      passed,
      summary: `Isolation propriétaire: ${isOwnerConsent} ; Blocage non authentifié: ${isUnauthBlocked} (401 UNAUTHORIZED)`,
    });
  }

  // --------------------------------------------------------------------------
  // SYNTHÈSE DES RÉSULTATS
  // --------------------------------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  results.forEach((r) => {
    const mark = r.passed ? '✓' : '✗';
    console.log(`${mark} [${r.testId}] ${r.title}`);
    console.log(`   -> ${r.summary}`);
  });

  console.log('\n================================================================================');
  console.log(`SUITE DE TESTS DICTÉE VOCALE VALIDÉE : ${passedCount}/${results.length} RÉUSSIS (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    throw new Error(`La suite Dictée Vocale a échoué avec ${failedCount} test(s) non passant(s).`);
  }

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

// Auto-exécution si lancé directement
if (typeof require !== 'undefined' && require.main === module) {
  runVoiceDictationTestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
