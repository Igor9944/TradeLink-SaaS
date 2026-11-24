# Changelog

## V6.2 — 23 novembre 2026

### LOT 1 — Consolidation cryptographique

- Centralisation des signatures HMAC-SHA256, SHA-256 et MFA TOTP sur les primitives partagées.
- Remplacement des fallback HMAC approximatifs par des implémentations HMAC-SHA256/SHA1 RFC via `@noble/hashes`.
- Centralisation des scellements de quittance, webhooks et jetons documentaires.
- Suppression des imports Node `crypto` devenus inutiles dans les moteurs commerciaux.

### Documentation

- Ajout du cahier des charges V6.2.
- Ajout de la roadmap par lots.
- Ajout de l'audit réel de l'état actuel.
- Ajout des documents d'architecture, sécurité, import/export, OCR/IDP, tests et déploiement.
- Ajout d'un rapport de travail et de prochaines étapes.
- Actualisation des liens principaux dans le README.

### Validation

- SHA des lots 1 et 1.1 vérifiés sur `main`.
- TypeScript strict vérifié.
- Test Lot 1.1 réussi.
- Test Lot 2 réussi.
- Validation globale réussie : 12/12 blocs.
