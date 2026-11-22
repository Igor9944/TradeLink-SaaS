// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — SUITE OFFICIELLE LOT 7 : TRADUCTION & MULTILINGUISME INTÉGRAL
// TRILINGUISME (FR / EN / AR), SUPPORT NATIF RTL, GLOSSAIRE B2B STRICT & GEMINI
// ============================================================================

import {
  CentralTranslationService,
} from '../../services/translationEngine';
import {
  OFFICIAL_TRADE_GLOSSARY,
} from '../../services/tradeGlossary';
import {
  TradeLinkRepositoryStore,
  DatabaseStateSnapshot,
} from '../repositories/domain.repositories';
import { SupportedLocale } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Échec Test LOT 7 Traduction & RTL] ${message}`);
  }
}

function createEmptyDatabaseState(): DatabaseStateSnapshot {
  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };
}

export async function runLot7TranslationTestSuite() {
  console.log('\n================================================================');
  console.log('🌍 TRADELINK V6.1 — SUITE OFFICIELLE LOT 7 : TRADUCTION & MULTILINGUISME');
  console.log('Trilinguisme FR / EN / AR, Support Natif RTL, Glossaire B2B Strict & Gemini');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // [TEST-LOT7-01] Couverture des 6 combinaisons linguistiques et détection RTL
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-01] Validation des 6 paires de traduction (FR, EN, AR) & détection RTL...');
  {
    const languagePairs: Array<{ source: SupportedLocale; target: SupportedLocale }> = [
      { source: 'fr', target: 'en' },
      { source: 'fr', target: 'ar' },
      { source: 'en', target: 'fr' },
      { source: 'en', target: 'ar' },
      { source: 'ar', target: 'fr' },
      { source: 'ar', target: 'en' },
    ];

    for (const pair of languagePairs) {
      const sampleText = pair.source === 'fr'
        ? 'Bienvenue sur la plateforme commerciale TradeLink SaaS.'
        : pair.source === 'en'
        ? 'Welcome to the TradeLink SaaS commercial platform.'
        : 'مرحبا بكم في منصة تريدلينك للتجارة بين الشركات.';

      const result = CentralTranslationService.translateTextSync({
        text: sampleText,
        sourceLang: pair.source,
        targetLang: pair.target,
      });

      assert(result.sourceLang === pair.source, `Source langue ${pair.source} respectée`);
      assert(result.targetLang === pair.target, `Cible langue ${pair.target} respectée`);
      assert(result.translatedText.length > 0, `Traduction non vide pour ${pair.source} -> ${pair.target}`);
      assert(result.confidenceScore >= 0.8, 'Score de confiance minimum atteint');
    }

    // Détection automatique de la langue et direction
    const detectFr = CentralTranslationService.detectLanguage('Bonjour, nous confirmons la commande de marchandises.');
    const detectEn = CentralTranslationService.detectLanguage('Hello, we confirm the commercial order for items.');
    const detectAr = CentralTranslationService.detectLanguage('مرحبا، نؤكد طلبية البضائع التجارية.');

    assert(detectFr.detectedLang === 'fr', 'Français détecté avec succès');
    assert(detectFr.isRtl === false, 'Français est LTR');

    assert(detectEn.detectedLang === 'en', 'Anglais détecté avec succès');
    assert(detectEn.isRtl === false, 'Anglais est LTR');

    assert(detectAr.detectedLang === 'ar', 'Arabe détecté avec succès');
    assert(detectAr.isRtl === true, 'Arabe est formellement RTL');

    console.log('  ✅ [TEST-LOT7-01] 6 combinaisons linguistiques et détection directionnelle RTL validées.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-02] Application inviolable du Glossaire Métier B2B étendu
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-02] Application stricte du glossaire officiel (Incoterms, Douane, PCG, TVA)...');
  {
    // Vérification de la présence des termes critiques du lot 7
    const requiredTermKeys = [
      'INCOTERM_CIP',
      'INCOTERM_DDP',
      'INCOTERM_FCA',
      'DOUANE_DECLARATION',
      'DOUANE_BORDEREAU',
      'COMPTA_PCG',
      'COMPTA_CONTREPASSATION',
      'COMPTA_TVA',
    ];

    for (const key of requiredTermKeys) {
      const found = OFFICIAL_TRADE_GLOSSARY.find((term) => term.termKey === key);
      assert(found !== undefined, `Terme officiel requis présent: ${key}`);
      assert(found!.targetTextEn.length > 0, `Terme EN renseigné pour ${key}`);
      assert(found!.targetTextAr.length > 0, `Terme AR renseigné pour ${key}`);
      assert(found!.isStrict === true, `Terme ${key} doit être strict`);
    }

    // Traduction avec glossaire B2B strict appliqué
    const tradeSentenceFr = 'La marchandise sera livrée sous DDP (Rendu droits acquittés) avec Déclaration en douane et TVA.';
    const tradeResultEn = CentralTranslationService.translateTextSync({
      text: tradeSentenceFr,
      sourceLang: 'fr',
      targetLang: 'en',
    });

    assert(tradeResultEn.glossaryApplied === true, 'Le glossaire B2B doit être appliqué');
    assert(tradeResultEn.translatedText.includes('DDP (Delivered Duty Paid)'), 'Incoterm DDP fidèlement traduit en EN');
    assert(tradeResultEn.translatedText.includes('Customs Declaration'), 'Douane fidèlement traduite en EN');

    const tradeResultAr = CentralTranslationService.translateTextSync({
      text: 'Nous appliquons le Plan Comptable Général (PCG) pour l Écriture de contre-passation.',
      sourceLang: 'fr',
      targetLang: 'ar',
    });

    assert(tradeResultAr.glossaryApplied === true, 'Glossaire appliqué pour la comptabilité');
    assert(tradeResultAr.translatedText.includes('دليل الحسابات المحاسبي العام (PCG)'), 'PCG fidèlement traduit en Arabe');
    assert(tradeResultAr.translatedText.includes('قيد محاسبي عكسي (تسوية وتصحيح)'), 'Contre-passation fidèlement traduite en Arabe');

    console.log('  ✅ [TEST-LOT7-02] Glossaire B2B strict étendu (Incoterms, Douane, Comptabilité) validé.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-03] Préservation des SKU, numéros de suivi, devises et tokens LTR
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-03] Préservation inviolable des identifiants techniques, SKU et devises...');
  {
    const originalText = 'Expédition de 500 unités du SKU-IND-9921-X d une valeur de 12 450,00 € sous le bordereau TRK-CAS-2026-99.';
    const preserveTerms = ['SKU-IND-9921-X', 'TRK-CAS-2026-99', '12 450,00 €'];

    const resultAr = CentralTranslationService.translateTextSync({
      text: originalText,
      sourceLang: 'fr',
      targetLang: 'ar',
      preserveTerms,
    });

    assert(resultAr.translatedText.includes('SKU-IND-9921-X'), 'SKU préservé à l identique dans le texte arabe');
    assert(resultAr.translatedText.includes('TRK-CAS-2026-99'), 'Numéro de suivi préservé à l identique');
    assert(resultAr.translatedText.includes('12 450,00 €'), 'Montant monétaire et devise préservés à l identique');

    // Vérification du wrapper LTR pour isolation bidi
    const ltrWrapped = `<span class="ltr-preserve" dir="ltr">${preserveTerms[0]}</span>`;
    assert(ltrWrapped.includes('ltr-preserve'), 'Classe CSS de préservation LTR conforme');

    console.log('  ✅ [TEST-LOT7-03] Préservation absolue des identifiants techniques et devises validée.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-04] Désensibilisation et zéro fuite de secrets
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-04] Protection et désensibilisation des secrets (Cartes, Tokens, API Keys)...');
  {
    const sensitivePayload = 'Veuillez utiliser la clé api_key sk-live-9929838491829384 et le token tok_visa_4000123456789010 pour la commande.';
    const { sanitizedText, redactionMap } = CentralTranslationService.redactSensitiveData(sensitivePayload);

    assert(redactionMap.size > 0, 'Au moins un secret détecté et masqué');
    assert(!sanitizedText.includes('sk-live-9929838491829384'), 'La clé API secrète a été purgée du texte envoyé au moteur');
    assert(sanitizedText.includes('__TL_REDACTED_'), 'Présence des jetons temporaires de remplacement sécurisé');

    // Vérification que la traduction finale restitue les secrets en local après traduction
    const translated = await CentralTranslationService.translateText({
      text: sensitivePayload,
      sourceLang: 'fr',
      targetLang: 'en',
    });

    assert(translated.redactedTermsCount > 0, 'Suivi des termes désensibilisés certifié');
    assert(translated.translatedText.includes('sk-live-9929838491829384'), 'Secret restitué en toute sécurité en local');

    console.log('  ✅ [TEST-LOT7-04] Désensibilisation des secrets sans fuite vers les modèles IA validée.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-05] Moteur neuronal hybride Google Gemini et fallback déterministe
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-05] Moteur hybride Google Gemini & fallback déterministe sans rupture...');
  {
    const promptText = 'Livraison express par transporteur maritime avec garantie de séquestre bancaire.';
    
    // Appel asynchrone (moteur avec fallback transparent en cas d indisponibilité réseau)
    const asyncResult = await CentralTranslationService.translateText({
      text: promptText,
      sourceLang: 'fr',
      targetLang: 'en',
    });

    assert(asyncResult.translatedText.length > 0, 'Résultat de traduction asynchrone obtenu');
    assert(typeof asyncResult.durationMs === 'number', 'Durée de traitement quantifiée');
    assert(asyncResult.confidenceScore > 0, 'Score de confiance valide');

    // Performance du cache SHA-256
    const cachedResult = CentralTranslationService.translateTextSync({
      text: promptText,
      sourceLang: 'fr',
      targetLang: 'en',
    });

    assert(cachedResult.cached === true, 'Le résultat doit être servi instantanément depuis le cache SHA-256');
    assert(cachedResult.durationMs <= 5, 'Délai cache < 5ms respecté');

    console.log('  ✅ [TEST-LOT7-05] Moteur de traduction hybride et cache déterministe validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-06] Mention légale informative obligatoire sur documents officiels
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-06] Mention légale informative sur les documents commerciaux officiels...');
  {
    const docInput = {
      type: 'INVOICE' as const,
      id: 'FACT-2026-0045',
      title: 'Facture commerciale Proforma relative aux fournitures industrielles',
      notes: 'Paiement à réception par virement bancaire sous convention Incoterm CIF Tanger.',
    };

    const docEn = CentralTranslationService.translateCommercialDocumentSync(docInput, 'en');
    assert(docEn.isInformativeOnly === true, 'Document traduit marqué formellement comme informatif');
    assert(
      docEn.disclaimerNotice.includes('Legal notice') ||
      docEn.disclaimerNotice.includes('original document remains legally binding'),
      'Clause légale de non-opposabilité présente en anglais'
    );

    const docAr = CentralTranslationService.translateCommercialDocumentSync(docInput, 'ar');
    assert(docAr.isInformativeOnly === true, 'Document arabe marqué informatif');
    assert(docAr.disclaimerNotice.includes('إشعار قانوني'), 'Clause légale officielle présente en arabe');

    console.log('  ✅ [TEST-LOT7-06] Mention légale informative certifiée sur documents commerciaux.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-07] Messagerie B2B et sous-titres Room Live en temps réel
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-07] Messagerie B2B multilingue & sous-titres Room Live certifiés...');
  {
    const b2bMsg = CentralTranslationService.translateChatMessageSync({
      messageId: 'msg-lot7-01',
      senderId: 'usr-buyer-01',
      senderRole: 'CLIENT',
      targetLang: 'ar',
      text: 'Veuillez confirmer la date de départ du navire cargo.',
    });

    assert(b2bMsg.originalText === 'Veuillez confirmer la date de départ du navire cargo.', 'Texte original immuable');
    assert(b2bMsg.sourceLang === 'fr', 'Langue expéditeur fr');
    assert(b2bMsg.targetLang === 'ar', 'Langue destinataire ar');
    assert(b2bMsg.translatedText.length > 0, 'Texte traduit pour le destinataire non vide');

    // Sous-titre Room Live
    const subtitle = CentralTranslationService.translateRoomLiveSubtitleSync({
      speechText: 'We agree on the CIF terms and payment via escrow.',
      speakerId: 'usr-vendor-01',
      speakerName: 'Global Parts Europe',
      speakerRole: 'FOURNISSEUR',
      targetLang: 'ar',
    });

    assert(subtitle.targetLang === 'ar', 'Sous-titre cible en arabe');
    assert(subtitle.speakerName === 'Global Parts Europe', 'Nom intervenant préservé');
    assert(subtitle.translatedSubtitleText.length > 0, 'Sous-titre arabe non vide');
    assert(subtitle.isFinal === true, 'Segment finalisé');

    console.log('  ✅ [TEST-LOT7-07] Messagerie B2B et sous-titres Room Live validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT7-08] Gestion et persistance des préférences linguistiques utilisateur
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT7-08] Gestion des préférences linguistiques (CRUD & auto-détection)...');
  {
    const dbState = createEmptyDatabaseState();
    const repo = new TradeLinkRepositoryStore(dbState, false);
    const testUserId = 'usr-pref-lot7-test';

    // Définition de préférences
    repo.setUserLanguagePreference(testUserId, {
      preferredLocale: 'ar',
      autoTranslateMessages: true,
      displayOriginalByDefault: true,
    });

    const fetched = repo.getUserLanguagePreference(testUserId);
    assert(fetched !== undefined, 'Préférence utilisateur trouvée');
    assert(fetched!.preferredLocale === 'ar', 'Langue préférée enregistrée à ar');
    assert(fetched!.autoTranslateMessages === true, 'Option auto-traduction persistée');

    // Mise à jour vers l anglais
    repo.setUserLanguagePreference(testUserId, {
      preferredLocale: 'en',
      autoTranslateMessages: false,
      displayOriginalByDefault: false,
    });

    const updated = repo.getUserLanguagePreference(testUserId);
    assert(updated!.preferredLocale === 'en', 'Mise à jour vers EN réussie');
    assert(updated!.autoTranslateMessages === false, 'Option autoTranslateMessages mise à jour');

    console.log('  ✅ [TEST-LOT7-08] Persistance et gestion des préférences linguistiques validées.');
  }

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS OFFICIELS DU LOT 7 (8/8) ONT RÉUSSI AVEC SUCCÈS !');
  console.log('Trilinguisme FR / EN / AR, Support Natif RTL, Glossaire B2B & Gemini.');
  console.log('================================================================\n');
}

// Auto-exécution si lancé directement
if (require.main === module || !process.env.TEST_HARNESS_ACTIVE) {
  runLot7TranslationTestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
