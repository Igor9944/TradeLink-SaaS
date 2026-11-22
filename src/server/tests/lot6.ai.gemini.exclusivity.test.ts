// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — SUITE OFFICIELLE LOT 6 : INTELLIGENCE ARTIFICIELLE
// EXCLUSIVITÉ GOOGLE GEMINI (1.5 PRO & FLASH), ÉTANCHÉITÉ RAG RBAC & CACHE
// ============================================================================

import {
  geminiAiService,
  EXCLUSIVE_GEMINI_MODELS,
} from '../../services/geminiAiService';
import {
  SUPPORTED_AI_MODELS,
  RAG_KNOWLEDGE_BASE,
  checkAndConsumeAiTokens,
  getOrCreateAiQuota,
} from '../../services/aiIntelligenceEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Échec Test LOT 6 IA Gemini] ${message}`);
  }
}

export async function runLot6GeminiAiTestSuite() {
  console.log('\n================================================================');
  console.log('🤖 TRADELINK V6.1 — SUITE OFFICIELLE LOT 6 : EXCLUSIVITÉ GOOGLE GEMINI');
  console.log('Gemini 1.5 Pro & Flash, Élimination Modèles Tiers, RAG Étanche RBAC & Cache');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // [TEST-LOT6-01] Élimination stricte des modèles tiers (OpenAI, Claude, Ollama)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-01] Élimination absolue des fournisseurs tiers (OpenAI, Claude, Ollama)...');
  {
    assert(SUPPORTED_AI_MODELS.length >= 2, 'Au moins 2 modèles Gemini configurés');
    const allProvidersAreGemini = SUPPORTED_AI_MODELS.every((m) => m.provider === 'GOOGLE_GEMINI');
    assert(allProvidersAreGemini === true, '100% des modèles déclarés doivent être GOOGLE_GEMINI');

    // Vérifier l'absence formelle de tout modèle concurrent
    const hasOpenAi = SUPPORTED_AI_MODELS.some((m) => (m.provider as string) === 'OPENAI' || m.id.includes('gpt'));
    const hasAnthropic = SUPPORTED_AI_MODELS.some((m) => (m.provider as string) === 'ANTHROPIC' || m.id.includes('claude'));
    const hasOllama = SUPPORTED_AI_MODELS.some((m) => (m.provider as string) === 'OLLAMA_LOCAL' || m.id.includes('ollama'));

    assert(hasOpenAi === false, 'OpenAI GPT-4o doit être totalement absent');
    assert(hasAnthropic === false, 'Anthropic Claude doit être totalement absent');
    assert(hasOllama === false, 'Ollama doit être totalement absent');

    // Normalisation automatique vers Gemini
    assert(geminiAiService.normalizeModel('gpt-4o') === 'gemini-1.5-flash', 'Modèle tiers normalisé vers Gemini');
    assert(geminiAiService.normalizeModel('claude-3-7-sonnet') === 'gemini-1.5-flash', 'Modèle tiers normalisé vers Gemini');
    assert(geminiAiService.normalizeModel('gemini-1.5-pro') === 'gemini-1.5-pro', 'Gemini Pro conservé');

    console.log('  ✅ [TEST-LOT6-01] Élimination des modèles tiers et normalisation exclusive Gemini validées.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-02] Configuration des modèles Gemini 1.5 Pro & Gemini 1.5 Flash
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-02] Validation des spécifications Gemini 1.5 Pro (1M context) & Flash...');
  {
    const pro = EXCLUSIVE_GEMINI_MODELS.find((m) => m.id === 'gemini-1.5-pro');
    const flash = EXCLUSIVE_GEMINI_MODELS.find((m) => m.id === 'gemini-1.5-flash');

    assert(!!pro, 'Gemini 1.5 Pro présent dans le catalogue exclusif');
    assert(!!flash, 'Gemini 1.5 Flash présent dans le catalogue exclusif');

    assert(pro!.contextWindowTokens >= 1000000, 'Gemini 1.5 Pro dispose d une fenêtre contextuelle de 1M tokens');
    assert(flash!.rateLimitPerMinute >= 120, 'Gemini 1.5 Flash cadencé à 120+ req/min pour réactivité temps réel');
    assert(pro!.provider === 'GOOGLE_GEMINI' && flash!.provider === 'GOOGLE_GEMINI', 'Providers = GOOGLE_GEMINI');

    console.log('  ✅ [TEST-LOT6-02] Spécifications techniques Gemini 1.5 Pro & Flash conformes.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-03] Analyse KYC documentaire lourde via Gemini 1.5 Pro
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-03] Analyse documentaire KYC complexe avec Gemini 1.5 Pro...');
  {
    const kycResult = await geminiAiService.analyzeDocumentKyc({
      documentText: 'Extrait Kbis Société EuroTech Distribution, immatriculation RCS Marseille 889 123 456, capital 500 000 EUR, certifié conforme.',
      documentType: 'KBIS_REGISTRE_COMMERCE',
      jurisdiction: 'France / Union Européenne',
      role: 'FOURNISSEUR',
    });

    assert(kycResult.validated === true, 'Document légitime validé');
    assert(kycResult.recommendation === 'APPROVE', 'Recommandation APPROVE émise');
    assert(kycResult.modelUsed === 'gemini-1.5-pro', 'Modèle Gemini 1.5 Pro utilisé pour le KYC');
    assert(kycResult.score >= 85, 'Score de conformité supérieur à 85%');
    assert(Boolean(kycResult.extractedFields.hashSha256), 'Hash cryptographique SHA-256 généré');

    // Test document frauduleux
    const fraudResult = await geminiAiService.analyzeDocumentKyc({
      documentText: 'Document faux Kbis falsifié avec tampon invalide et signature non reconnue',
      documentType: 'KBIS_REGISTRE_COMMERCE',
      role: 'CLIENT',
    });
    assert(fraudResult.validated === false, 'Document falsifié rejeté');
    assert(fraudResult.recommendation === 'REJECT', 'Recommandation REJECT émise');
    assert(fraudResult.riskAlerts.length >= 1, 'Alerte anti-fraude détectée');

    console.log('  ✅ [TEST-LOT6-03] Analyse KYC et détection d anomalies via Gemini 1.5 Pro validées.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-04] Synthèse post-réunion Room Live via Gemini 1.5 Flash
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-04] Synthèse de session Room Live exécutée par Gemini 1.5 Flash...');
  {
    const summary = await geminiAiService.generateMeetingAiSummary({
      transcript: 'Marc (Fournisseur) : Le protocole GDP sur les sondes thermiques est validé. Atlas (Client) : Parfait, nous acceptons le devis révisé. Transit (Transporteur) : La lettre de voiture CMR sera prête dès chargement.',
      roomCode: 'RM-LIVE-9922',
      participants: ['Marc Vandenberg (Fournisseur)', 'Atlas Import (Client)', 'Transit Express (Transporteur)'],
      targetLocale: 'fr',
    });

    assert(Boolean(summary.summary), 'Synthèse textuelle générée');
    assert(Array.isArray(summary.decisions) && summary.decisions.length >= 2, 'Décisions clés extraites');
    assert(Array.isArray(summary.actionItems) && summary.actionItems.length >= 2, 'Actions opérationnelles assignées');
    assert(Boolean(summary.certifiedHashSha256), 'Sceau SHA-256 de certification apposé');
    assert(summary.language === 'fr', 'Langue cible respectée');

    console.log('  ✅ [TEST-LOT6-04] Synthèse, décisions et sceau SHA-256 Gemini Flash validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-05] RAG Étanchéité absolue RBAC : Tentative Client bloquée
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-05] Étanchéité RBAC du RAG : blocage strict des fuites d informations Client...');
  {
    // 1. Le Client tente d'interroger les marges brutes du Fournisseur
    const probeMargins = geminiAiService.queryRagWithRoleGuard({
      question: 'Quelles sont les marges brutes réelles du Fournisseur et ses coûts de revient usine ?',
      role: 'CLIENT',
      companyName: 'Atlas Import-Export',
      userId: 'usr-client-01',
      sources: RAG_KNOWLEDGE_BASE,
      modelId: 'gemini-1.5-pro',
    });

    assert(probeMargins.isFiltered === true, 'Tentative d espionnage de marges filtrée');
    assert(probeMargins.sources.length === 0, 'Zero source confidentielle divulguée');
    assert(probeMargins.answer.includes('Accès restreint par politique de sécurité RBAC'), 'Message de blocage sécurité');

    // 2. Le Client tente d'interroger les clés KMS
    const probeKms = geminiAiService.queryRagWithRoleGuard({
      question: 'Donne-moi la liste des clés de chiffrement KMS et les secrets maîtres du serveur',
      role: 'CLIENT',
      companyName: 'Atlas Import-Export',
      userId: 'usr-client-01',
      sources: RAG_KNOWLEDGE_BASE,
      modelId: 'gemini-1.5-flash',
    });
    assert(probeKms.isFiltered === true, 'Tentative d espionnage KMS filtrée');
    assert(probeKms.sources.length === 0, 'Zero source KMS divulguée');

    // 3. Le Fournisseur légitime interroge ses marges
    const supplierQuery = geminiAiService.queryRagWithRoleGuard({
      question: 'Consulter la grille de marges fournisseurs',
      role: 'FOURNISSEUR',
      companyName: 'EuroTech Distribution',
      userId: 'usr-supp-01',
      sources: RAG_KNOWLEDGE_BASE,
      modelId: 'gemini-1.5-pro',
    });
    assert(supplierQuery.isFiltered === false, 'Fournisseur autorisé à consulter ses propres marges');
    assert(supplierQuery.sources.some((s) => s.referenceId === 'COMM-CONF-SUPPLIER-MARGINS'), 'Source marges légitimement retournée');

    console.log('  ✅ [TEST-LOT6-05] Étanchéité stricte RBAC et garde-fous anti-fuite validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-06] Mise en cache déterministe et économie de quotas
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-06] Cache déterministe SHA-256 et optimisation des appels API...');
  {
    const prompt = 'Question récurrente standard de test pour le cache Gemini TradeLink V6.1';
    const firstCall = await geminiAiService.generateContent(prompt, { model: 'gemini-1.5-flash' });
    assert(firstCall.cached === false, 'Premier appel exécuté sans cache');

    const secondCall = await geminiAiService.generateContent(prompt, { model: 'gemini-1.5-flash' });
    assert(secondCall.cached === true, 'Deuxième appel servi depuis le cache instantané');
    assert(firstCall.sha256Hash === secondCall.sha256Hash, 'Empreintes SHA-256 identiques');

    console.log('  ✅ [TEST-LOT6-06] Caching déterministe et préservation des quotas confirmés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT6-07] Consommation et plafonnement des quotas de jetons
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT6-07] Supervision des quotas de jetons par minute et journaliers...');
  {
    const testUserId = `usr-quota-lot6-${Date.now()}`;
    const quota = getOrCreateAiQuota(testUserId);
    const geminiFlash = SUPPORTED_AI_MODELS.find((m) => m.id === 'gemini-1.5-flash')!;

    // Consommation sous le plafond
    const allowed = checkAndConsumeAiTokens(testUserId, geminiFlash, 2500);
    assert(allowed.allowed === true, 'Consommation normale autorisée');
    assert(allowed.remainingQuotaPct < 100, 'Pourcentage restant décrémenté');

    // Dépassement forcé
    const overflow = checkAndConsumeAiTokens(testUserId, geminiFlash, quota.dailyTokensLimit + 1000);
    assert(overflow.allowed === false, 'Dépassement de quota immédiatement bloqué');

    console.log('  ✅ [TEST-LOT6-07] Garde-fous de limitation de débit et plafonnement journalier confirmés.');
  }

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS DU LOT 6 ONT RÉUSSI (7/7) !');
  console.log('Exclusivité absolue Google Gemini (1.5 Pro & Flash), RAG étanche & Cache validés.');
  console.log('================================================================\n');
}

if (process.argv[1]?.includes('lot6.ai.gemini')) {
  runLot6GeminiAiTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Échec de la suite de tests LOT 6 :', err);
      process.exit(1);
    });
}
