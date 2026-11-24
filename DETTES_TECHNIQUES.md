# REGISTRE DES DETTES TECHNIQUES ET PLAN DE RÉSOLUTION — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Dettes Techniques Applicatives (Résolues ou en Cours de Résolution dans les Lots 1 à 6)

| ID | Domaine | Description de la Dette | Sévérité | Lot de Résolution | Statut |
|---|---|---|---|---|---|
| **DT-01** | Cryptographie (`securityCrypto.ts`) | Normalisation de `.trim()` sur `getJwtSecret()` lors de la lecture des variables d'environnement | Faible | LOT 1 | **RÉSOLU ET TESTÉ** |
| **DT-02** | Modèle de Permissions (`securityCrypto.ts`) | Unification de la nomenclature des permissions granulaires (`PERMISSION_CATALOG` : support conjoint du format `:` et du format `.` : `organization.read`, `rooms.create`, `documents.import`, etc. avec métadonnées de sensibilité) | Moyenne | LOT 1 | **RÉSOLU ET TESTÉ** |
| **DT-03** | Catalogue API (`domain.controllers.ts`) | Utilisation du validateur borné `validatePaginationAndFilters` sur `GET /api/v1/catalog/products` | Faible | LOT 3 | **RÉSOLU ET TESTÉ** |
| **DT-04** | Export Comptable & UI (`accountingEngine.ts`, `translations.ts`) | Application systématique de la neutralisation CWE-1236 dans `exportTrialBalanceToCsv`, `downloadDataExport` et `TranslationGlossaryAdminView.tsx` | Moyenne | LOT 2 & 3 | **RÉSOLU ET TESTÉ** |
| **DT-05** | Import/Export Universel (`importExportEngine.ts`) | Couverture complète des 26 formats d'import et 17 formats d'export de la Section 11 (`XLS`, `ODS`, `DOC`, `DOCX`, `ODT`, `RTF`, `TXT`, `XML`, `YAML`, `SQLITE`, `DBF` binaire/structurel, `CDX`, archives `ZIP`/`TAR`/`GZ` avec contrôle anti-zip-bomb et anti-traversal) | Haute | LOT 4 | **RÉSOLU ET TESTÉ** |
| **DT-06** | OCR / IDP (`ocrDocumentEngine.ts`) | Prise en charge des magic bytes `TIFF` et `BMP`, extraction dynamique et blocage formel (`canTriggerAutomatedDownstreamAction`) de toute écriture comptable ou validation KYC automatique sur extraction non validée humainement ou à confiance < 85 % | Haute | LOT 4 | **RÉSOLU ET TESTÉ** |
| **DT-07** | Google Meet API v2 (`googleMeetService.ts`, `domain.services.ts`) | Ajout des méthodes `spaces.patch`, `conferenceRecords`, helpers OAuth 2.0 (URL d'autorisation, chiffrement AES-256-GCM des tokens, révocation) et rejet HTTP 403 strict sur toutes les routes de modération/lobby/enregistrement Room Live pour le rôle `CLIENT` | Moyenne | LOT 5 | **RÉSOLU ET TESTÉ** |
| **DT-08** | Internationalisation (`src/i18n/`, `translationEngine.ts`) | Extension de l'architecture linguistique à l'espagnol (`es`) aux côtés de `fr`, `en`, `ar`, et traçabilité complète des traductions dynamiques avec mention explicite de non-certification juridique (`isCertified: false`, `legalDisclaimer`) | Moyenne | LOT 6 | **RÉSOLU ET TESTÉ** |

---

## 2. Dépendances d'Infrastructure et d'Exploitation Externe (Non Simulables en Local)

Conformément à la Section 21 du Prompt Directeur, ces éléments relèvent du provisionnement de l'environnement de production et sont documentés en toute transparence :

1. **Instance PostgreSQL 16 Managée & Cluster Redis 7 Externe** :
   - Sur le poste de validation déconnecté, les tests s'exécutent contre le moteur PostgreSQL 16 WASM (`@electric-sql/pglite`) et le store Redis de test.
   - En production (`NODE_ENV=production`), `TradeLinkPostgresManager` et `TradeLinkRedisManager` refusent tout repli en mémoire et exigent `DATABASE_URL` et `REDIS_URL` pointant vers les services réels.
2. **Démon Antivirus ClamAV (`clamd:3310`)** :
   - Le client TCP `ClamAvDaemonClient` (`zPING` / `zINSTREAM`) est implémenté dans `src/services/kycEngine.ts`. En absence du démon `clamd` sur l'hôte local, la politique fail-safe place tout fichier suspect ou non vérifiable en statut `QUARANTINED`.
3. **Identifiants OAuth 2.0 Google Workspace & Clé API Google Gemini** :
   - Les appels HTTP officiels vers `https://meet.googleapis.com/v2/*`, `https://oauth2.googleapis.com/token` et `https://generativelanguage.googleapis.com/v1beta/models/*` sont implémentés et protégés par disjoncteurs (`CircuitBreaker`). Leur exécution réelle sur Internet nécessite la fourniture des secrets `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET`, `GOOGLE_MEET_REFRESH_TOKEN` et `GEMINI_API_KEY`.
4. **Exécution Docker Engine Linux & Validation Internet (Phase 14)** :
   - Les fichiers `Dockerfile`, `Dockerfile.sandbox`, `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/ci.yml` et `deploy.yml` sont prêts et validés syntaxiquement. Le déploiement sur un serveur accessible par Internet (HTTPS/DNS) dépend de l'autorisation et de l'infrastructure cible de l'utilisateur.
