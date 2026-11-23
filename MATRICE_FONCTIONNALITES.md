# Matrice des fonctionnalités

## États autorisés

- TERMINÉ ET VALIDÉ
- DÉVELOPPÉ À VALIDER
- PARTIEL
- NON DÉVELOPPÉ
- BLOQUÉ
- À CORRIGER

| Fonctionnalité | État | Justification |
|---|---|---|
| Authentification Argon2id/JWT/MFA | TERMINÉ ET VALIDÉ | LOT 1.1 passé |
| RBAC/IDOR | TERMINÉ ET VALIDÉ | LOT 1.1, LOT 3 et tests sécurité |
| PostgreSQL/PGlite | TERMINÉ ET VALIDÉ | LOT 2 passé |
| Redis externe/fallback | DÉVELOPPÉ À VALIDER | Redis réel externe non provisionné |
| Organisations/acteurs | TERMINÉ ET VALIDÉ | LOT 3 passé |
| Catalogue/stocks/RFQ/commandes | TERMINÉ ET VALIDÉ | LOT 4 passé |
| Facturation/paiement/comptabilité | TERMINÉ ET VALIDÉ | LOT 4 passé |
| Messagerie/notifications | TERMINÉ ET VALIDÉ | LOT 4 passé |
| Room Live/SFU | TERMINÉ ET VALIDÉ | Suite LOT 5 locale |
| Google Meet officiel | DÉVELOPPÉ À VALIDER | Code/tests présents; OAuth réel requis |
| Gemini exclusif | DÉVELOPPÉ À VALIDER | Suite locale; clé réelle requise |
| Traduction FR/EN/AR | TERMINÉ ET VALIDÉ | LOT 7 passé |
| Import universel | PARTIEL | CSV/XLSX/JSON/SQL/BAK/DBF/CDX |
| Export universel | PARTIEL | CSV/XLSX/JSON/PDF |
| OCR/IDP réel | PARTIEL | Heuristiques et profils; moteur réel incomplet |
| Performance/observabilité | TERMINÉ ET VALIDÉ | LOT 8 passé |
| Déploiement Internet | BLOQUÉ | Autorisation, hébergement, DNS et HTTPS requis |
| Validation Internet | BLOQUÉ | Environnement réel requis |
