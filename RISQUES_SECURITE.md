# ANALYSE DES RISQUES DE SÉCURITÉ ET MESURES DE PROTECTION — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`

---

## 1. Cartographie des Risques Applicatifs et Contrôles Implémentés

| Catégorie de Risque | Menace / Vecteur d'Attaque | Sévérité | Mesure de Protection Implémentée dans le Code | Fichier / Preuve |
|---|---|---|---|---|
| **Authentification & Mots de passe** | Vol de base de données, brute-force, dictionnaire, anciens hashes faibles | Critique | Hachage **Argon2id (RFC 9106)** (`m=65536, t=3, p=4`, tag 32 octets), rejet des hashes historiques FNV/SHA-512 (`isLegacyMockHash`), verrouillage anti-brute-force après 5 échecs | `src/services/securityCrypto.ts`, `src/server/services/domain.services.ts` |
| **Contournement MFA Administrateur** | Accès à `/admin/*` ou aux API d'administration sans validation du second facteur | Critique | MFA **TOTP RFC 6238** (HMAC-SHA1, fenêtre ±1 de 30s, secret Base32 160 bits aléatoire) vérifié dans `requireAuthenticatedSession` et `RoleGuard` | `src/server/middlewares/errorAndSecurity.middleware.ts`, `src/components/security/RouteGuards.tsx` |
| **Détournement & Rejeu de Session / JWT** | Vol de jeton JWT, algorithme `none`, sessions fantômes multiples | Critique | Vérification stricte `alg === 'HS256'`, `iss`, `aud`, `exp`, comparaison en temps constant (`constantTimeEqual`), politique de session unique dans Redis (`verifySingleActiveSession`), révocation de `jti` et détection de réutilisation de Refresh Token | `src/services/securityCrypto.ts`, `src/server/database/redis.client.ts` |
| **Accès Inter-Organisations (IDOR / Multi-Tenant)** | Modification d'un ID dans l'URL ou le corps JSON pour lire/modifier les données d'un autre tenant | Critique | Contrôle systématique `enforceRBACAndOwnership` côté serveur avant toute lecture/écriture, filtrage par `clientId` / `supplierId` / `carrierId` / `companyId`, tests automatisés anti-IDOR | `src/server/controllers/domain.controllers.ts`, `src/services/companyAndAccountEngine.ts` |
| **Escalade de Privilèges & Restriction Room Live Client** | Un `VISITEUR` ou `CLIENT` tente de créer/modérer une Room Live ou de s'octroyer un rôle `ADMIN` | Élevée | Inscription publique limitée à `CLIENT`, `FOURNISSEUR`, `TRANSPORTEUR` ; blocage HTTP `403 CLIENT_ROOM_CREATION_FORBIDDEN` sur la création/administration de Room Live par un `CLIENT` ; lecture seule stricte du `COMPTABLE` sur les données commerciales sources | `src/server/controllers/domain.controllers.ts`, `src/services/aiIntelligenceEngine.ts` |
| **Falsification de Webhooks Paiement** | Envoi d'un faux événement de confirmation de paiement Stripe/Konnect/Flouci/CMI | Critique | Capture de `req.rawBody`, vérification de signature **HMAC-SHA256** en temps constant, fenêtre anti-rejeu de `300 s`, registre d'idempotence des événements traités, retour `503` fail-closed si secret non configuré en production | `src/server/controllers/domain.controllers.ts`, `src/services/commercialEngine.ts` |
| **Injections XSS & Pollution de Paramètres Express 5** | Balises `<script>` imbriquées, entités HTML encodées, `?search[x]=1` | Élevée | `assertFlatStringQuery` sur toutes les requêtes entrantes ; `sanitizeHtmlInput` itératif à point fixe (décodage d'entités + suppression de schémas `javascript:`/`data:` + échappement `<`/`>`) | `src/server/middlewares/errorAndSecurity.middleware.ts`, `src/server/validators/schema.validator.ts` |
| **Injection de Formules Tableur (CWE-1236)** | Cellules commençant par `=`, `+`, `-`, `@`, `|`, `%` exécutées par Excel/Calc à l'ouverture d'un export | Élevée | Neutralisation systématique par préfixage `'` via `neutralizeSpreadsheetFormula` et `sanitizeCsvCell` sur tous les exports (`CSV`, `XLSX`, `XLS`, `ODS`) | `src/services/adminAdvancedEngine.ts`, `src/services/importExportEngine.ts`, `src/services/accountingEngine.ts` |
| **Fichiers Malveillants, Archives Piégées & Restauration SQL/BAK** | Upload de malware renommé en `.pdf`/`.csv`, zip-bomb, traversée de chemin `../`, `DROP TABLE`, `.bak` inconnu | Critique | Inspection des **Magic Bytes** binaires, mise en quarantaine à l'ingestion, scan antivirus ClamAV (`zINSTREAM`) fail-closed, limites de taille et de ratio de décompression, blocage des chemins relatifs `../`, exécution des dumps `SQL`/`BAK`/`DBF` exclusivement en conteneur Sandbox sans réseau (`network_mode: "none"`, UID `20001`) avec double approbation Admin (4-Eyes) | `src/services/importExportEngine.ts`, `src/services/ocrDocumentEngine.ts`, `src/services/kycEngine.ts`, `Dockerfile.sandbox` |
| **Fuite de Secrets ou de Données Démo en Production** | Exposition de clés API Gemini/OAuth ou de mots de passe démo dans le bundle JS client | Critique | Centralisation exclusive des appels Gemini/Meet dans le backend, garde `!import.meta.env.PROD` permettant l'élimination par Dead Code Elimination (0 fuite vérifiée sur les 14 chunks `dist/assets/*.js`), validation `validateProductionSecurityEnv()` au démarrage | `vite.config.ts`, `src/contexts/AppContext.tsx`, `src/server/app.ts` |
| **Injection de Prompt IA & Fuite de Contexte RAG** | Manipulation de l'assistant Gemini pour extraire des données d'autres organisations ou déclencher une action critique | Élevée | Détection d'injection de prompt, désensibilisation automatique des secrets/IBAN/cartes avant envoi, filtrage RAG strict par rôle et organisation, blocage matériel (`BLOCKED_BY_GUARDRAIL`) des actions financières/juridiques/administratives critiques sans validation humaine | `src/services/geminiAiService.ts`, `src/services/copilotEngine.ts` |

---

## 2. Risques Liés à l'Environnement de Déploiement

| Risque Opérationnel | Impact | Mitigation Prévue dans l'Architecture |
|---|---|---|
| Absence de PostgreSQL 16 ou Redis 7 en production | Perte de persistance ou désynchronisation de sessions | Démarrage **fail-closed** (`NODE_ENV=production` refuse de démarrer sans connexion active à PostgreSQL et Redis) |
| Indisponibilité du démon ClamAV (`clamd:3310`) | Impossibilité de scanner un document entrant | Circuit breaker + maintien strict du document en statut `QUARANTINED` (aucun passage silencieux à `CLEAN`) |
| Exposition publique de `/api/v1/metrics` | Fuite de métriques internes | Blocage HTTP `403` dans Nginx (`infra/nginx/default.conf`) + jeton `METRICS_SCRAPE_TOKEN` ou rôle `ADMIN` requis dans Express |
| Exécution conteneur en `root` | Compromission de l'hôte en cas d'évasion | `USER 10001:10001` (`Dockerfile`) et `USER 20001:20001` (`Dockerfile.sandbox`), `cap_drop: [ALL]`, `read_only: true`, `no-new-privileges:true` |
