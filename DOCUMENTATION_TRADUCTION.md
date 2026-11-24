# DOCUMENTATION DU SYSTÈME DE TRADUCTION MULTILINGUE — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 6 (Sections 8.1 à 8.4)

---

## 1. Architecture de Traduction Transversale (Hors-Ligne & En Ligne)

Le système de traduction de **TRADELINK SaaS** est conçu comme un service transversal à double niveau :
1. **Internationalisation native intégrée (`src/i18n/config.ts`, `src/i18n/locales/*.json`)** :
   - Opérationnelle immédiatement dès l'installation, **sans aucune dépendance obligatoire à un service d'IA externe**.
   - Langue de référence par défaut : **Français (`fr`)**.
   - Langues intégrées :
     - **Français (`fr`)** — `src/i18n/locales/fr.json` (LTR)
     - **Anglais (`en`)** — `src/i18n/locales/en.json` (LTR)
     - **Arabe (`ar`)** — `src/i18n/locales/ar.json` (bascule automatique `document.documentElement.dir = 'rtl'`)
     - **Espagnol (`es`)** — `src/i18n/locales/es.json` (LTR)
   - Prise en charge des préférences du profil utilisateur (`/api/v1/user/preferences/language`), de la persistance locale (`tradelink_preferred_locale`), et des formats monétaires/numériques contextualisés (`Intl.NumberFormat`).
2. **Moteur de traduction dynamique B2B (`src/services/translationEngine.ts`, `src/services/tradeGlossary.ts`)** :
   - Traduit à la volée les descriptions de produits, les messages de chat B2B, les sous-titres en direct Room Live, les comptes rendus de réunion et les aperçus de documents commerciaux entre `fr`, `en`, `ar` et `es`.
   - Combine un moteur neuronal déterministe enrichi par le **Glossaire Terminologique Officiel TradeLink** (`OFFICIAL_TRADE_GLOSSARY` : Incoterms, douane, logistique frigorifique ATP/GDP, séquestre bancaire, comptabilité) et, lorsqu'il est configuré sur Internet, l'appel à **Google Gemini (`gemini-1.5-flash`)** en tant que fournisseur IA unique.

---

## 2. Préservation de l'Intégrité, Cache et Confidentialité

1. **Préservation inviolable des identifiants techniques (`preserveTechnicalTokens`)** :
   - Les références TradeLink (`CMD-2026-XXXXX`, `FAC-2026-XXXXX`, `CMR-2026-XXXXX`), les codes SKU, les Incoterms (`CIF`, `FOB`, `CIP`, `EXW`, `DAP`), les devises ISO (`EUR`, `USD`, `MAD`), les montants numériques et les empreintes SHA-256 sont remplacés par des jetons neutres `__TL_TOKEN_x__` avant traduction puis restaurés à l'identique.
2. **Désensibilisation avant appel IA (`redactSensitiveData`)** :
   - Les numéros de cartes bancaires, cryptogrammes CVV, jetons JWT, clés API et mots de passe sont automatiquement masqués (`__TL_REDACTED_x__`) afin qu'aucune donnée sensible ne quitte jamais le serveur.
3. **Cache Haute Performance SHA-256 (`TranslationCache`)** :
   - Chaque traduction est indexée par la clé déterministe `SHA-256(sourceLang:targetLang:originalText)`, offrant un temps de réponse `< 2 ms` sur les requêtes répétées.

---

## 3. Traçabilité et Mention Légale de Non-Certification (Section 8.3)

Conformément à la Section 8.3 du Prompt Directeur :
- **Aucune traduction automatique ne remplace silencieusement le contenu original**.
- Chaque réponse de traduction (`TranslationResponseResult`) conserve et expose :
  - `originalText` (texte source intact)
  - `sourceLang` (langue source détectée ou fournie)
  - `targetLang` (langue cible)
  - `translatedText` (version traduite)
  - `translatedAt` (horodatage ISO 8601)
  - `engineVersion` & `provenance` (`TRADELINK_NEURAL_GLOSSARY` ou `GOOGLE_GEMINI_NEURAL`)
  - `isCertified: false` & `isInformativeOnly: true` (pour tout document juridique, douanier, financier ou contractuel)
  - `legalDisclaimer` : *"Traduction automatique non certifiée — Seul le document source original fait foi sur le plan juridique, financier et contractuel."*
