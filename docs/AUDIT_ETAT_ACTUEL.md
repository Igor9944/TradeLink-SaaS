# Audit de l'état actuel

Date : 23 novembre 2026

## Base vérifiée

- Branche : `main`
- Commit : `f332288`
- Modèles Prisma : 68
- Tests serveur : 40 fichiers
- SHAs LOT 1 connus : présents sur la branche
- Dépôt local : propre avant cette mise à jour documentaire

## Statuts

### TERMINÉ ET VALIDÉ

| Domaine | Preuve |
|---|---|
| Argon2id | Suite LOT 1.1 |
| JWT/MFA/RBAC/IDOR | Suites LOT 1.1, sécurité et lifecycle |
| ClamAV protocolaire | Client TCP zINSTREAM et serveur local simulé |
| PostgreSQL 16 | Migrations PGlite exécutées |
| Redis 7 | Implémentation ioredis et tests |
| Parcours métier | `test:global-validation` : 12/12 |

### DÉVELOPPÉ MAIS À TESTER

- Déploiement PostgreSQL/Redis externes
- Intégrations Gemini, Google Meet, Stripe
- Services KMS, S3, Vault et MinIO
- Mise en production complète

### PARTIELLEMENT DÉVELOPPÉ

- Import/export universel
- OCR/IDP réel
- Formats DBF/CDX/BAK
- Traitement asynchrone
- Tests Internet
- Documentation opérationnelle

### NON DÉVELOPPÉ

- Déploiement Internet réel
- DNS/HTTPS vérifiés en production
- Rapport de validation post-déploiement réel

## Points vérifiés

- Le code utilise Argon2id via `@node-rs/argon2` ou `@noble/hashes`.
- PostgreSQL est fail-closed en production sans URL valide.
- Redis dispose d'un mode externe ioredis et d'un fallback en mémoire local.
- La sauvegarde PGlite applique les deux migrations.
- ClamAV dispose d'un client TCP réel; il reste dépendant du démon déployé.
- L'import/export est limité aux types présents dans les unions TypeScript.
- L'OCR possède des profils et des heuristiques mais ne contient pas de moteur OCR réel visible dans les dépendances.

## Incohérences

- Des rapports historiques utilisent parfois « 30 suites vertes » sans historique de résultat GitHub vérifiable.
- La limite locale PGlite ne constitue pas une validation d'une infrastructure PostgreSQL managée.
- Le fallback Redis partagé est un mécanisme de développement et ne remplace pas Redis déployé.
- Les tests ClamAV peuvent simuler le démon; ils ne prouvent pas seul une installation en production.
- Les formats avancés sont annoncés par endroits alors que les types/exporteurs restent limités.

## Résultats de tests

| Vérification | Résultat |
|---|---|
| `typecheck` | Passé |
| `test:lot1-audit` | Passé |
| `test:lot2-persistence` | Passé |
| `test:global-validation` | Passé, 12/12 |
