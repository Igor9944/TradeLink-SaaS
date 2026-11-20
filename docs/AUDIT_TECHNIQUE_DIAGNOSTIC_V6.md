# RAPPORT D'AUDIT TECHNIQUE ET DE DIAGNOSTIC INITIAL — TRADELINK V6.0
**Projet** : TRADELINK SaaS V6.0  
**Branche d'audit et remédiation** : `fix/audit-remediation`  
**Date d'audit** : 20 novembre 2026  
**Équipe d'audit** : Collège d'experts Senior (Architecture SaaS, Node.js/React/PostgreSQL, Cryptographie & Sécurité, DevOps/Docker, Prisma/DBA, QA)  

---

## 1. SYNTHÈSE EXÉCUTIVE DU DIAGNOSTIC

L'audit technique approfondi de la base de code de TRADELINK V6.0 révèle une application frontend React 18 très riche et complète (interfaces 3D, tableaux de bord pour les 6 rôles métier, formulaires, composants d'accessibilité et multilinguisme FR/EN/AR), mais confrontée à **cinq défaillances architecturales et sécuritaires majeures** qui empêchent toute utilisation en production :

1. **Cryptographie factice & Vulnérabilités P0** :
   - Faux Argon2id et faux SHA-256 basés sur une boucle de hachage personnalisée FNV-1a 32-bit non cryptographique (`fnv1a64Hex`).
   - Signature JWT non cryptographique utilisant une simple concaténation avec un secret codé en dur.
   - Génération déterministe des secrets TOTP dérivés de l'adresse email.
   - Code de contournement TOTP codé en dur (`839204`) qui valide n'importe quel compte administrateur.
   - Secrets maîtres codés en dur dans le code source et dans les fichiers `docker-compose.yml`.

2. **Absence de serveur backend HTTP réel & persistance en mémoire** :
   - Aucune instance de serveur HTTP Express / Node.js active écoutant sur un port réseau.
   - Les "contrôleurs" (`domain.controllers.ts`) forment un routeur interne virtuel invoqué uniquement en mémoire ou via des mocks dans les tests.
   - Les repositories (`domain.repositories.ts`) s'appuient sur un store JavaScript en mémoire (`TradeLinkRepositoryStore` avec des `Map` et tableaux), perdant toutes les données au redémarrage.

3. **Inadéquation du schéma Prisma et des migrations PostgreSQL** :
   - Le fichier `prisma/schema.prisma` définit **68 modèles**.
   - La migration initiale `20261118000000_init_tradelink_v6/migration.sql` ne crée que **17 tables**.
   - **51 tables sont totalement manquantes** en base de données PostgreSQL.

4. **Écarts de règles métier critiques** :
   - Les paiements peuvent être marqués comme validés (`SUCCEEDED`) par n'importe quel utilisateur authentifié via `/api/v1/payments/confirm` sans webhook signé ni réconciliation comptable.
   - Le calcul d'intérêt financier `ACT/ACT` applique un diviseur forfaitaire 366 si l'année de début ou de fin est bissextile au lieu de ventiler les jours au prorata exact de chaque année civile.
   - L'analyse antivirus des fichiers n'inspecte que l'extension (`.exe`) sans véritable analyse de payload, magic bytes réels ou détection virale.
   - L'isolation des données entre clients et fournisseurs et la lecture seule comptable ne sont pas garanties par un serveur HTTP avec middleware d'ownership strict.

5. **Dépendances et chaîne CI/CD compromises** :
   - `package.json` ne contient ni `express`, ni `@prisma/client`, ni bibliothèques cryptographiques reconnues (`argon2`, `jsonwebtoken`).
   - Les scripts de test exécutent `node -e` en ciblant des chemins internes rigides de pnpm (`./node_modules/.pnpm/esbuild@0.25.12/...`).
   - Le workflow GitHub Actions CI installe Node.js avec cache pnpm avant d'installer pnpm.
   - Le workflow CD `deploy.yml` n'exécute que des commandes `echo` fictives sans déploiement ni healthchecks réels.

---

## 2. TABLEAU DE BORD DE GRAVITÉ DES VULNÉRABILITÉS ET ANOMALIES

| ID | Domaine | Fichier(s) | Lignes | Gravité | Description du problème | Correctif requis |
|---|---|---|---|---|---|---|
| **SEC-01** | Cryptographie | `src/services/securityCrypto.ts` | L.9–34, 40–50 | **CRITIQUE (P0)** | Faux Argon2id : fonction `fnv1a64Hex` non cryptographique simulant une chaîne PHC. | Remplacer par du vrai hachage cryptographique (PBKDF2/Argon2 natif crypto) avec sel aléatoire fort (`crypto.randomBytes`). |
| **SEC-02** | Cryptographie | `src/services/securityCrypto.ts` | L.36–38 | **CRITIQUE (P0)** | Faux SHA-256 : `generateSha256Hash` utilise `fnv1a64Hex` au lieu du véritable algorithme SHA-256 NIST. | Utiliser `crypto.createHash('sha256')`. |
| **SEC-03** | Authentification | `src/services/securityCrypto.ts` | L.94, 121–125 | **CRITIQUE (P0)** | JWT non cryptographique : secret codé en dur (`SERVER_JWT_SECRET`) et signature simulée via `fnv1a64Hex`. | Signature HMAC-SHA256 (`crypto.createHmac`) avec secret d'environnement obligatoire de 256 bits minimum. |
| **SEC-04** | MFA / TOTP | `src/services/securityCrypto.ts` | L.147–156 | **CRITIQUE (P0)** | Secret TOTP déterministe calculé à partir de l'email de l'utilisateur. | Génération de secrets cryptographiquement aléatoires en Base32 (20 octets d'entropie). |
| **SEC-05** | MFA / Backdoor | `src/services/securityCrypto.ts` | L.169–174 | **CRITIQUE (P0)** | Code TOTP universel de démonstration `'839204'` permettant de contourner le MFA de n'importe quel compte. | Supprimer immédiatement le code en dur ; valider strictement l'algorithme RFC 6238. |
| **SEC-06** | Infrastructure | `docker-compose.yml` | L.39–50, 73, 93 | **CRITIQUE (P0)** | Mots de passe et secrets codés en dur dans Docker Compose (`TradeLinkStrong2026Password`, `TradeLinkRedisSecret2026!`, etc.). | Externaliser dans des variables d'environnement validées (`.env`) avec profils dev/prod distincts. |
| **ARCH-01** | Backend | `src/server/` | Global | **ÉLEVÉE (P1)** | Absence de serveur HTTP réel (Express) : l'application n'écoute sur aucun port HTTP backend. | Mettre en place un serveur Express structuré avec écoute sur port configurable, middlewares et injection de dépendances. |
| **ARCH-02** | Persistance | `src/server/repositories/domain.repositories.ts` | L.135–170 | **ÉLEVÉE (P1)** | Données uniquement stockées dans des collections mémoire (`Map` et arrays). Perte de données à chaque redémarrage. | Connecter les repositories à PostgreSQL via Prisma Client. |
| **DB-01** | Schéma & DB | `prisma/migrations/` vs `prisma/schema.prisma` | Global | **ÉLEVÉE (P1)** | 51 modèles Prisma sur 68 n'ont pas de table en base de données PostgreSQL (seules 17 tables existent). | Créer une migration Prisma contrôlée `20261120000000_complete_51_tables` pour les 51 tables manquantes. |
| **BUS-01** | Finance | `src/server/controllers/domain.controllers.ts` | L.1284–1300 | **ÉLEVÉE (P1)** | Endpoint `/api/v1/payments/confirm` permet la validation arbitraire sans webhook signé ni réconciliation bancaire. | Restreindre la confirmation aux webhooks signés (Stripe HMAC) ou à la réconciliation explicite par Admin/Comptable. |
| **BUS-02** | Comptabilité | `src/services/backendServices.ts` | L.85–93 | **MOYENNE (P2)** | Calcul ACT/ACT multi-années incorrect (diviseur global 366 si l'une des années est bissextile). | Implémenter la convention ACT/ACT ICMA avec décomposition exacte année par année. |
| **BUS-03** | Sécurité fichiers | `src/services/importExportEngine.ts` | L.142–154 | **MOYENNE (P2)** | Scan antivirus simulé uniquement basé sur les extensions d'exécutables (`.exe`, `.bat`). | Détecter les magic bytes réels, signatures EICAR et assainissement de payload. |
| **DEVOPS-01**| CI / CD | `package.json` | L.12–43 | **MOYENNE (P2)** | Scripts de test dépendant de chemins internes `.pnpm/esbuild@0.25.12/...`. | Rendre l'exécution des tests indépendante de la structure interne de pnpm (via esbuild ou tsx standard). |
| **DEVOPS-02**| CI / CD | `.github/workflows/ci.yml` | L.25–36 | **MOYENNE (P2)** | Ordre d'installation inversé : `actions/setup-node` avec `cache: 'pnpm'` exécuté avant `pnpm/action-setup`. | Configurer `pnpm/action-setup` en premier, puis `actions/setup-node`. |
| **DEVOPS-03**| CI / CD | `.github/workflows/deploy.yml` | L.38–72 | **MOYENNE (P2)** | Workflow de déploiement fictif composé uniquement de commandes `echo`. | Remplacer par des vérifications de santé HTTP réelles et blocage en cas d'erreur. |

---

## 3. AUDIT DÉTAILLÉ PAR MODULE

### 3.1. Sécurité et Cryptographie (`src/services/securityCrypto.ts`)
- **Problème identifié** : L'implémentation de "Argon2id" et "SHA-256" a été codée en JavaScript pur via une boucle `fnv1a64Hex` utilisant des opérations 32-bit `Math.imul`.
- **Preuve technique** :
  ```ts
  // Extrait réel src/services/securityCrypto.ts
  function fnv1a64Hex(input: string, rounds = 1000): string { ... }
  export function generateSha256Hash(input: string): string {
    return fnv1a64Hex(`sha256:${input}`, 500);
  }
  export function hashPasswordArgon2id(plainPassword: string, customSalt?: string): string {
    ...
    return `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${derivedA}${derivedB}`;
  }
  ```
- **Conséquence de sécurité** : Les empreintes générées ont une entropie extrêmement faible, aucune résistance aux attaques par dictionnaire ou GPU, et le format PHC `$argon2id$...` n'est qu'un leurre cosmétique.
- **Backdoor TOTP** : La présence de `cleaned === '839204'` dans `verifyTotpCode` permet à n'importe quel attaquant de franchir l'authentification MFA à deux facteurs sans posséder l'appareil de l'administrateur.
- **Solution de remédiation** :
  1. Utiliser le module cryptographique certifié de Node.js (`crypto.pbkdf2Sync` ou Argon2 avec sel aléatoire cryptographique `crypto.randomBytes(16)` et format PHC conforme).
  2. Fournir une compatibilité descendante et une migration transparente des comptes utilisateurs existants.
  3. Utiliser un vrai HMAC-SHA1 RFC 6238 avec secret aléatoire Base32 (32 caractères) pour le TOTP.
  4. Bannir tout code en dur comme `'839204'`.
  5. Signer les JWT avec HMAC-SHA256 réel et vérifier avec `crypto.timingSafeEqual`.

### 3.2. Architecture Backend & Connectivité Réelle
- **Problème identifié** : Les tests du projet appellent directement les méthodes de la classe `DomainControllersDispatcher` en passant un faux contexte `{ method, path, headers, body, user }`. Il n'existe aucun script serveur (`server.ts`, `app.listen(port)`) permettant d'exposer l'API sur le réseau.
- **Solution de remédiation** :
  1. Créer un point d'entrée serveur `src/server/app.ts` et `src/server/server.ts` propulsé par Express.
  2. Brancher les middlewares : CORS, Helmet (sécurité des en-têtes HTTP), JSON body parser, Context Logger (Correlation-ID), Rate Limiter, Auth JWT, RBAC et Ownership.
  3. Créer des routes Express modulaires correspondant aux 19 groupes d'API recensés dans `TRADELINK_API_INVENTORY`.
  4. Exposer les endpoints de santé :
     - `GET /health` et `GET /api/v1/health` (vérification DB, Redis, KMS, S3).
     - `GET /metrics` (métriques Prometheus).
  5. Configurer le frontend Vite pour communiquer directement avec l'API (`/api/v1` proxy ou variable `VITE_API_BASE_URL`).

### 3.3. Base de Données PostgreSQL & Prisma
- **Problème identifié** : Le fichier `prisma/schema.prisma` recense 68 modèles métiers complexes avec relations, index et contraintes. Cependant, la seule migration appliquée (`20261118000000_init_tradelink_v6/migration.sql`) ne contient que 17 tables.
- **Liste des 51 tables manquantes dans la migration initiale** :
  1. `refresh_token`
  2. `m_f_a_configuration`
  3. `login_attempt`
  4. `k_y_c_decision_history`
  5. `k_y_c_jurisdiction_config`
  6. `k_y_c_reminder_log`
  7. `carrier`
  8. `product_translation`
  9. `stock_movement`
  10. `order_line`
  11. `quote`
  12. `quote_line`
  13. `invoice`
  14. `payment`
  15. `shipment`
  16. `transport_document`
  17. `incident`
  18. `document`
  19. `notification`
  20. `setting`
  21. `document_i_d_p`
  22. `dynamic_field_schema`
  23. `voice_interaction`
  24. `a_i_conversation`
  25. `a_i_message`
  26. `import_job`
  27. `export_job`
  28. `backup`
  29. `calculation_rule`
  30. `calculation_period`
  31. `floating_button_config`
  32. `room`
  33. `participant`
  34. `room_message`
  35. `meeting_summary`
  36. `chart_of_account`
  37. `fiscal_period`
  38. `accounting_journal`
  39. `accounting_entry`
  40. `accounting_entry_line`
  41. `reconciliation`
  42. `ticket`
  43. `ticket_message`
  44. `ticket_assignment`
  45. `ticket_attachment`
  46. `user_language_preference`
  47. `translation`
  48. `translation_cache`
  49. `translation_job`
  50. `translation_glossary`
  51. `translation_provider_config`
- **Solution de remédiation** :
  1. Conserver intacte la migration initiale `20261118000000_init_tradelink_v6`.
  2. Générer une nouvelle migration SQL ordonnée `20261120000000_complete_51_tables/migration.sql` créant les 51 tables manquantes avec leurs clés étrangères, index composites et contraintes d'unicité.
  3. Installer `@prisma/client` et `prisma` dans `package.json`.
  4. Créer la couche d'accès aux données Prisma dans les repositories pour assurer la persistance réelle en base PostgreSQL.

### 3.4. Secrets, Docker Compose & Infrastructure
- **Problème identifié** : Les mots de passe sont inscrits en dur dans `docker-compose.yml` (`TradeLinkStrong2026Password`, `TradeLinkRedisSecret2026!`, etc.).
- **Solution de remédiation** :
  1. Établir un modèle de configuration strict par variable d'environnement avec validation au démarrage.
  2. Fournir un fichier `.env.example` complet et à jour avec des instructions claires de génération de secrets forts.
  3. Mettre à jour `docker-compose.yml` et `docker-compose.prod.yml` pour référencer `${POSTGRES_PASSWORD}`, `${REDIS_PASSWORD}`, `${JWT_SECRET}`, `${S3_SECRET_KEY}`, etc.
  4. Prévoir une configuration HashiCorp Vault distincte : mode dev éphémère vs mode production avec transit engine et audit logging.

### 3.5. Règles Métier & Logique d'Application
- **Calcul ACT/ACT** : Implémenter la décomposition annuelle stricte :
  $$\text{Intérêts} = \text{Principal} \times \frac{\text{Taux}}{100} \times \sum_{i} \frac{\text{Jours dans l'année } Y_i}{\text{Nombre total de jours dans } Y_i (365 \text{ ou } 366)}$$
- **Paiements** : Tout paiement créé reçoit initialement le statut `PENDING`. Sa confirmation requiert obligatoirement un webhook Stripe vérifié cryptographiquement par signature HMAC (`stripe-signature`) ou un ordre de rapprochement explicite validé par un utilisateur ayant le rôle `ADMIN` ou `COMPTABLE`.
- **Room Live** : Les clients ne peuvent pas créer de salle publique ou générale ; ils ne peuvent que rejoindre les salles auxquelles ils ont été explicitement invités.
- **KYC J+7** : L'algorithme de suspension automatique à J+7 doit impérativement épargner les dossiers dont l'ensemble des pièces requises a été soumis dans le délai imparti (`SUBMITTED_IN_TIME_PENDING_REVIEW`).

---

## 4. PLAN D'EXÉCUTION ET DE REMÉDIATION PAR ÉTAPES

Conformément à la règle de travail imposée :
1. **Étape 2 (P0)** : Remise en conformité cryptographique (Argon2id réel, SHA-256 natif, JWT HMAC-SHA256, TOTP RFC 6238, suppression de la backdoor `839204` et des secrets codés en dur).
2. **Étape 3** : Mise en place du véritable serveur HTTP Node.js/Express, des routes modulaires, middlewares RBAC/Ownership et healthchecks.
3. **Étape 4** : PostgreSQL & Prisma — Déploiement des 51 tables manquantes dans la migration contrôlée, génération du client Prisma, connexion des repositories.
4. **Étape 5** : Assainissement des secrets et durcissement de l'infrastructure Docker.
5. **Étape 6** : Corrections des règles métier (paiements PENDING, ACT/ACT multi-années, antivirus réel, KYC J+7, permissions Room Live).
6. **Étape 7** : Remise en conformité de la CI/CD (pnpm, scripts de tests indépendants, workflow de déploiement réel).
7. **Étape 8** : Validation exhaustive et rapport final de conformité.
