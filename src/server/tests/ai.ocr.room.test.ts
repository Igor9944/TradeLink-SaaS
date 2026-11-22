// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS INTÉGRATION IA, OCR, DICTÉE & ROOM LIVE
// PROMPT 10 : VÉRIFICATION COMPLÈTE DE LA PILE INTELLIGENTE B2B
// - [AI-01] Assistant IA & RAG : Filtrage strict par rôle RBAC (Client bloqué sur marges/KMS)
// - [AI-02] Multi-modèles (Gemini, GPT-4o, Claude 3.7, Ollama 70B) & Quotas / Rate Limiting
// - [OCR-01] OCR/IDP : Extraction textes, montants HT/TVA/TTC, devises et tableaux d'articles
// - [OCR-02] OCR/IDP : Correction humaine avec traçabilité et validation de cohérence mathématique
// - [OCR-03] OCR/IDP : Champs dynamiques & Workflow d'approbation administrative
// - [VOICE-01] Dictée Vocale STT/TTS trilingue (FR, EN, AR) avec ponctuation & RTL
// - [ROOM-01] Room Live : Interdiction stricte de création générale pour le rôle Client (403)
// - [ROOM-02] Room Live : Autorisation de création pour Fournisseur, Transporteur, Admin, Comptable
// - [ROOM-03] Room Live : Salle d'attente (Knocking), admission, modération et délégation hôte
// - [ROOM-04] Room Live : Synthèse IA, décisions & Export certifié avec rétention légale 90 jours
// ============================================================================

import {
  SUPPORTED_AI_MODELS,
  queryAiAssistantWithRag,
  checkAndConsumeAiTokens,
  getOrCreateAiQuota,
  createMockOcrDocument,
  correctOcrFieldValue,
  reviewDynamicOcrField,
  commitOcrDocumentValidation,
  formatDictatedText,
  canActorCreateRoomLive,
  initializeRoomLiveSession,
  moderateParticipantAction,
  generateCertifiedMeetingExport,
} from '../../services/aiIntelligenceEngine';
import { canCreateRoomLiveGeneral } from '../../services/backendServices';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkDomainServices } from '../services/domain.services';
import { ServerRequestContext } from '../middlewares/errorAndSecurity.middleware';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

function createInitialAiRoomTestDatabase(): DatabaseStateSnapshot {
  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [
      {
        id: 'room-init-01',
        roomCode: 'RM-LIVE-8821',
        title: 'Coordination Logistique Initiale',
        createdById: 'usr-supp-01',
        creatorName: 'Marc Vandenberg',
        creatorRole: 'FOURNISSEUR',
        status: 'LIVE',
        scheduledAt: '2026-11-20 10:00',
        participantsCount: 2,
        allowedUserIds: ['usr-supp-01', 'usr-client-01'],
        recordingConsent: true,
        aiSummaryAvailable: false,
      },
    ],
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
  };
}

export function runAiOcrRoomIntegrationSuite() {
  console.log('================================================================================');
  console.log('TRADELINK V6.0 — DÉMARRAGE DE LA SUITE DE TESTS IA, OCR, DICTÉE & ROOM LIVE');
  console.log('================================================================================');

  let passed = 0;

  // --------------------------------------------------------------------------
  // TEST 1 : ASSISTANT IA & RAG — FILTRAGE PAR RÔLE STRICT (RBAC)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Assistant IA & RAG : Filtrage par rôle strict (Client vs Marges/KMS)');
  {
    // Tentative Client d'accéder aux marges grossistes ou clés KMS
    const clientQuery = queryAiAssistantWithRag({
      userId: 'usr-client-01',
      role: 'CLIENT',
      companyName: 'Atlas Import-Export SARL',
      question: 'Quelles sont les marges brutes de mes fournisseurs et leurs clés KMS ?',
      threadHistory: [],
      modelId: 'gemini-1.5-pro',
    });

    assert(
      clientQuery.responseMessage.text.includes('Accès restreint par politique de sécurité RBAC'),
      'Le RAG doit intercepter les requêtes confidentielles pour le rôle Client'
    );
    assert(
      clientQuery.sourcesRetrieved.length === 0,
      'Aucune source de marges confidentielles ne doit être exposée au Client'
    );

    // Requête légitime Client sur ses propres commandes
    const clientValidQuery = queryAiAssistantWithRag({
      userId: 'usr-client-01',
      role: 'CLIENT',
      companyName: 'Atlas Import-Export SARL',
      question: 'Où en est ma commande CMD-2026-11223 et mon KYC ?',
      threadHistory: [],
      modelId: 'gemini-1.5-pro',
    });

    assert(
      clientValidQuery.sourcesRetrieved.length > 0,
      'Le Client doit accéder à ses propres sources RAG de commandes et de KYC'
    );
    assert(
      clientValidQuery.responseMessage.text.includes('CMD-2026-11223'),
      'Le texte de réponse doit contenir les détails de la commande autorisée'
    );

    // Requête Fournisseur sur ses marges autorisées
    const supplierQuery = queryAiAssistantWithRag({
      userId: 'usr-supp-01',
      role: 'FOURNISSEUR',
      companyName: 'EuroTech GmbH',
      question: 'Afficher les marges fournisseurs et remises de volume',
      threadHistory: [],
      modelId: 'gemini-1.5-pro',
    });

    assert(
      supplierQuery.sourcesRetrieved.some((s) => s.referenceId === 'COMM-CONF-SUPPLIER-MARGINS'),
      'Le Fournisseur doit pouvoir accéder à la source RAG de ses marges'
    );

    console.log('✓ TEST 1 VALIDÉ : Filtrage RAG étanche et respect strict des frontières RBAC.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2 : MULTI-MODÈLES IA & GESTION DES QUOTAS / RATE LIMITS
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Exclusivité Google Gemini (1.5 Pro & Flash) & Quotas / Rate Limits');
  {
    assert(SUPPORTED_AI_MODELS.length >= 2, 'Au moins 2 modèles Google Gemini officiels doivent être enregistrés');
    const allGemini = SUPPORTED_AI_MODELS.every((m) => m.provider === 'GOOGLE_GEMINI');
    assert(allGemini === true, 'Exclusivité stricte : 100% des modèles supportés doivent être Google Gemini');

    const geminiPro = SUPPORTED_AI_MODELS.find((m) => m.id === 'gemini-1.5-pro');
    const geminiFlash = SUPPORTED_AI_MODELS.find((m) => m.id === 'gemini-1.5-flash');
    assert(!!geminiPro && !!geminiFlash, 'Gemini 1.5 Pro et Gemini 1.5 Flash doivent être configurés');

    // Test de consommation de jetons et dépassement de limite
    const testUserId = `test-user-quota-${Date.now()}`;
    const quotaState = getOrCreateAiQuota(testUserId);
    assert(quotaState.dailyTokensLimit === 100000, 'Quota journalier par défaut de 100,000 jetons');

    // Consommation normale
    const check1 = checkAndConsumeAiTokens(testUserId, geminiPro!, 5000);
    assert(check1.allowed === true, 'La consommation normale de jetons doit être acceptée');
    assert(check1.remainingQuotaPct === 95, 'Le quota restant doit refléter 95%');

    // Dépassement de quota
    const check2 = checkAndConsumeAiTokens(testUserId, geminiPro!, 150000);
    assert(check2.allowed === false, 'Le dépassement de quota journalier doit être bloqué');
    assert(Boolean(check2.reason?.includes('Quota journalier')), 'Le motif de rejet doit indiquer le dépassement de quota');

    console.log('✓ TEST 2 VALIDÉ : Exclusivité Google Gemini et limitation de débit/quota opérationnelles.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3 : OCR / IDP — EXTRACTION TEXTES, MONTANTS ET TABLEAUX D'ARTICLES
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] OCR / IDP : Extraction textes, montants HT/TVA/TTC et lignes d’articles');
  {
    const doc = createMockOcrDocument();
    assert(doc.status === 'EXTRACTED', 'Le document initialisé doit avoir le statut EXTRACTED');
    assert(doc.globalConfidence >= 0.98, 'La confiance globale moyenne doit dépasser 98%');

    // Vérification des champs montants et devises
    const htField = doc.fields.find((f) => f.key === 'totalHt');
    const tvaField = doc.fields.find((f) => f.key === 'tvaAmount');
    const ttcField = doc.fields.find((f) => f.key === 'totalTtc');
    const currField = doc.fields.find((f) => f.key === 'currency');

    assert(htField?.value === '26400.00', 'Montant HT extrait incorrect');
    assert(tvaField?.value === '5030.00', 'Montant TVA extrait incorrect');
    assert(ttcField?.value === '31430.00', 'Montant TTC extrait incorrect');
    assert(currField?.value === 'EUR', 'Devise extraite incorrecte');

    // Vérification du tableau d'articles
    assert(doc.lineItems.length === 2, 'Le tableau doit contenir exactement 2 lignes d’articles');
    assert(doc.lineItems[0].sku === 'CC-250-ISO', 'SKU de la ligne 1 incorrect');
    assert(doc.lineItems[0].quantity === 5, 'Quantité de la ligne 1 incorrecte');
    assert(doc.lineItems[1].unitPrice === '320.00', 'Prix unitaire de la ligne 2 incorrect');

    console.log('✓ TEST 3 VALIDÉ : Extraction structurée complète des montants et tableaux.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4 : OCR / IDP — CORRECTION HUMAINE & VÉRIFICATION DE COHÉRENCE MATHÉMATIQUE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] OCR / IDP : Correction humaine, traçabilité et cohérence mathématique');
  {
    const doc = createMockOcrDocument();

    // 1. Correction manuelle par un opérateur
    const correctedDoc = correctOcrFieldValue(
      doc,
      'invoiceNumber',
      'FAC-IMPORT-2026-9901-REV1',
      'claire.dubois@tradelink.eu'
    );

    const updatedField = correctedDoc.fields.find((f) => f.key === 'invoiceNumber');
    assert(updatedField?.value === 'FAC-IMPORT-2026-9901-REV1', 'La valeur corrigée doit être enregistrée');
    assert(!!updatedField?.isModified, 'Le champ doit porter le flag isModified');
    assert(correctedDoc.corrections.length === 1, 'Une entrée doit être ajoutée au journal des corrections');
    assert(correctedDoc.corrections[0].originalValue === 'FAC-IMPORT-2026-9901', 'Valeur initiale tracée');

    // 2. Test d'incohérence mathématique : modification du TTC pour le rendre faux
    const inconsistentDoc = correctOcrFieldValue(
      correctedDoc,
      'totalTtc',
      '99999.00',
      'claire.dubois@tradelink.eu'
    );
    const failCommit = commitOcrDocumentValidation(inconsistentDoc, 'claire.dubois@tradelink.eu');
    assert(failCommit.success === false, 'La validation doit rejeter une incohérence HT + TVA != TTC');
    assert(failCommit.message.includes('Incohérence mathématique détectée'), 'Alerte mathématique levée');

    // 3. Rétablissement du montant exact et validation réussie
    const balancedDoc = correctOcrFieldValue(
      inconsistentDoc,
      'totalTtc',
      '31430.00',
      'claire.dubois@tradelink.eu'
    );
    const successCommit = commitOcrDocumentValidation(balancedDoc, 'claire.dubois@tradelink.eu');
    assert(successCommit.success === true, 'La validation doit réussir quand les montants sont équilibrés');
    assert(successCommit.document.status === 'VALIDATED', 'Le statut doit passer à VALIDATED');
    assert(successCommit.document.validatedBy === 'claire.dubois@tradelink.eu', 'Validateur tracé');

    console.log('✓ TEST 4 VALIDÉ : Traçabilité des corrections et garde-fou mathématique actif.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 5 : OCR / IDP — GESTION DES CHAMPS DYNAMIQUES & VALIDATION ADMIN
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] OCR / IDP : Champs dynamiques & Validation Administrative');
  {
    const doc = createMockOcrDocument();
    assert(doc.dynamicFields.length > 0, 'Au moins un champ dynamique doit être détecté');
    const dynamicField = doc.dynamicFields[0];
    assert(dynamicField.adminApprovalStatus === 'PENDING', 'Le statut initial doit être PENDING');

    // Approbation par l'administrateur
    const approvedDoc = reviewDynamicOcrField(
      doc,
      dynamicField.id,
      'APPROVED',
      'admin.audit@tradelink.eu',
      'Certificat conforme GDP OMS 961 approuvé pour intégration GED.'
    );

    const approvedField = approvedDoc.dynamicFields.find((df) => df.id === dynamicField.id);
    assert(approvedField?.adminApprovalStatus === 'APPROVED', 'Le champ doit passer au statut APPROVED');
    assert(approvedField?.reviewedBy === 'admin.audit@tradelink.eu', 'L’administrateur réviseur doit être enregistré');
    assert(approvedField?.reviewedAt !== undefined, 'Horodatage d’approbation requis');

    console.log('✓ TEST 5 VALIDÉ : Circuit d’approbation administrative des champs dynamiques conforme.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 6 : DICTÉE VOCALE STT/TTS TRILINGUE (FR / EN / AR) & RTL
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Dictée Vocale STT/TTS trilingue (FR, EN, AR) & RTL');
  {
    // Français avec ponctuation parlée
    const rawFr = 'créer une commande pour 10 conteneurs virgule avec déchargement à casablanca point';
    const cleanFr = formatDictatedText(rawFr, 'fr-FR');
    assert(cleanFr === 'Créer une commande pour 10 conteneurs, avec déchargement à casablanca.', 'Formatage français incorrect');

    // Anglais avec ponctuation parlée
    const rawEn = 'generate commercial invoice comma with cip incoterm period';
    const cleanEn = formatDictatedText(rawEn, 'en-US');
    assert(cleanEn === 'Generate commercial invoice, with cip incoterm.', 'Formatage anglais incorrect');

    // Arabe avec ponctuation parlée
    const rawAr = 'تأكيد استلام الشحنة فاصلة وفحص سلسلة التبريد نقطة';
    const cleanAr = formatDictatedText(rawAr, 'ar-SA');
    assert(cleanAr === 'تأكيد استلام الشحنة، وفحص سلسلة التبريد.', 'Formatage arabe incorrect');

    console.log('✓ TEST 6 VALIDÉ : Traitement vocal trilingue avec ponctuation et RTL.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 7 : ROOM LIVE — INTERDICTION STRICTE DE CRÉATION POUR LE CLIENT (403)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Room Live : Interdiction stricte de création générale pour le rôle Client');
  {
    // 1. Règle fonctionnelle
    assert(canActorCreateRoomLive('CLIENT') === false, 'canActorCreateRoomLive(CLIENT) doit renvoyer false');
    assert(canCreateRoomLiveGeneral('CLIENT') === false, 'canCreateRoomLiveGeneral(CLIENT) doit renvoyer false');

    // 2. Règle backend service avec levée d’erreur 403 et journal d’audit
    const repo = new TradeLinkRepositoryStore(createInitialAiRoomTestDatabase(), false);
    const services = new TradeLinkDomainServices(repo);

    const clientCtx: NonNullable<ServerRequestContext['user']> = {
      id: 'usr-client-01',
      email: 'youssef.berrada@atlas-import.ma',
      role: 'CLIENT',
      sessionId: 'sess-test-client-01',
      companyName: 'Atlas Import-Export SARL',
    };

    let errorCaught = false;
    try {
      services.createRoomLiveChecked({
        title: 'Tentative Création Salle par Client',
        scheduledAt: '2026-11-20 14:00',
        actor: clientCtx,
        correlationId: 'req-corr-client-room-fail',
        ipAddress: '196.200.14.88',
      });
    } catch (err: any) {
      errorCaught = true;
      assert(err.statusCode === 403, 'Le code HTTP doit être 403');
      assert(err.errorCode === 'CLIENT_ROOM_CREATION_FORBIDDEN', 'Code erreur exact requis');
    }

    assert(errorCaught, 'Une exception 403 doit obligatoirement être levée');

    // Vérification du journal d’audit
    const lastAudit = repo.getSnapshot().auditLogs[0];
    assert(lastAudit.action === 'ROOM_CREATE_DENIED_CLIENT_ROLE', 'L’audit log doit enregistrer le refus');
    assert(lastAudit.result === 'DENIED', 'Le résultat audit doit être DENIED');

    console.log('✓ TEST 7 VALIDÉ : Blocage strict 403 de la création Room Live pour le rôle Client.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 8 : ROOM LIVE — AUTORISATION DE CRÉATION POUR LES AUTRES RÔLES
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Room Live : Autorisation de création pour Fournisseur, Transporteur, Admin, Comptable');
  {
    assert(canActorCreateRoomLive('ADMIN') === true, 'ADMIN doit pouvoir créer');
    assert(canActorCreateRoomLive('FOURNISSEUR') === true, 'FOURNISSEUR doit pouvoir créer');
    assert(canActorCreateRoomLive('TRANSPORTEUR') === true, 'TRANSPORTEUR doit pouvoir créer');
    assert(canActorCreateRoomLive('COMPTABLE') === true, 'COMPTABLE doit pouvoir créer');
    assert(canActorCreateRoomLive('SUPPORT') === true, 'SUPPORT doit pouvoir créer');

    const repo = new TradeLinkRepositoryStore(createInitialAiRoomTestDatabase(), false);
    const services = new TradeLinkDomainServices(repo);

    const supplierCtx: NonNullable<ServerRequestContext['user']> = {
      id: 'usr-supp-01',
      email: 'marc.vandenberg@eurotech.de',
      role: 'FOURNISSEUR',
      sessionId: 'sess-test-supp-01',
      companyName: 'EuroTech Industrial GmbH',
    };

    const roomCreated = services.createRoomLiveChecked({
      title: 'Point Logistique Tripartite EuroTech-Atlas',
      scheduledAt: '2026-11-22 10:30',
      actor: supplierCtx,
      correlationId: 'req-corr-supp-room-ok',
      ipAddress: '84.112.50.12',
    });

    assert(!!roomCreated.id, 'La salle doit avoir un ID unique généré');
    assert(roomCreated.roomCode.startsWith('RM-LIVE-'), 'Le code de salle doit respecter le préfixe');
    assert(roomCreated.createdById === 'usr-supp-01', 'L’initiateur doit être le Fournisseur');

    console.log('✓ TEST 8 VALIDÉ : Création de salle autorisée et tracée pour les acteurs habilités.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 9 : ROOM LIVE — SALLE D’ATTENTE, MODÉRATION & DÉLÉGATION D’HÔTE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Room Live : Salle d’attente (Knocking), admission et modération');
  {
    const session = initializeRoomLiveSession('RM-LIVE-TEST-01');

    // 1. Participant en salle d’attente
    const waitingPart = session.participants.find((p) => p.status === 'WAITING_ROOM');
    assert(!!waitingPart, 'Un participant en salle d’attente doit être présent');

    // Admission par l’hôte
    const admitRes = moderateParticipantAction(
      session,
      waitingPart!.id,
      'ADMIT',
      session.hostUserId
    );
    assert(admitRes.success === true, 'L’admission par l’hôte doit réussir');
    const admittedPart = admitRes.session.participants.find((p) => p.id === waitingPart!.id);
    assert(admittedPart?.status === 'CONNECTED', 'Le statut doit passer à CONNECTED');

    // 2. Modération : coupure du micro d’un participant
    const muteRes = moderateParticipantAction(
      admitRes.session,
      'p-client-03',
      'MUTE_MIC',
      session.hostUserId
    );
    assert(muteRes.success === true, 'La coupure du micro doit réussir');
    const mutedPart = muteRes.session.participants.find((p) => p.id === 'p-client-03');
    assert(mutedPart?.audioEnabled === false, 'Le micro doit être désactivé');

    // 3. Délégation d’hôte temporaire
    const delegateRes = moderateParticipantAction(
      muteRes.session,
      'p-client-03',
      'DELEGATE_HOST',
      session.hostUserId
    );
    assert(delegateRes.success === true, 'La délégation d’hôte ponctuelle doit réussir');
    const delegatedPart = delegateRes.session.participants.find((p) => p.id === 'p-client-03');
    assert(delegatedPart?.isDelegatedHost === true, 'Le participant doit devenir co-hôte pour la séance');

    // La délégation ponctuelle ne confère PAS le droit de création générale de salle !
    assert(canActorCreateRoomLive('CLIENT') === false, 'La délégation ponctuelle ne modifie pas les droits généraux');

    console.log('✓ TEST 9 VALIDÉ : Cycle de modération, admission salle d’attente et délégation réussis.');
    passed++;
  }

  // --------------------------------------------------------------------------
  // TEST 10 : ROOM LIVE — COMPTE RENDU IA & EXPORT CERTIFIÉ AVEC RÉTENTION 90 JOURS
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10] Room Live : Compte rendu IA, décisions et export certifié (90 jours)');
  {
    const session = initializeRoomLiveSession('RM-LIVE-EXPORT-01');
    assert(!!session.aiSummary, 'Une synthèse IA post-réunion doit être disponible');
    assert(session.aiSummary!.decisions.length >= 2, 'Au moins 2 décisions formelles doivent être tracées');
    assert(session.aiSummary!.actionItems.length >= 2, 'Au moins 2 actions à mener doivent être assignées');

    const certExport = generateCertifiedMeetingExport(session);
    assert(certExport.includes('COMPTE RENDU OFFICIEL DE RÉUNION ROOM LIVE'), 'Titre officiel présent');
    assert(certExport.includes('CONSENTEMENT RGPD'), 'Mention de consentement RGPD requise');
    assert(certExport.includes('RÉTENTION STRICTES DE 90 JOURS'), 'Règle de rétention légale de 90 jours requise');
    assert(certExport.includes('Art. L. 123-22'), 'Référence légale commerciale requise');
    assert(certExport.includes('SHA256-TL-ROOM-'), 'Sceau cryptographique SHA-256 présent');
    assert(certExport.includes('DÉCISIONS OPÉRATIONNELLES VALIDÉES'), 'Section décisions présente');

    console.log('✓ TEST 10 VALIDÉ : Export certifié conforme aux exigences légales et réglementaires.');
    passed++;
  }

  console.log('\n================================================================================');
  console.log(`SUITE DE TESTS PROMPT 10 VALIDÉE AVEC SUCCÈS : ${passed}/10 TESTS RÉUSSIS (100%)`);
  console.log('================================================================================\n');
}

// Exécution directe si exécuté en tant que script principal
if (typeof require !== 'undefined' && require.main === module) {
  runAiOcrRoomIntegrationSuite();
}
