# Risques de sécurité

## Risques externes bloqués

| Risque | Sévérité | Preuve/mesure |
|---|---|---|
| Secrets en production absents | Critique | Garde production fail-closed |
| PostgreSQL non provisionné | Critique | PGlite seulement en développement/test |
| Redis non provisionné | Élevée | Fallback local non distribué |
| ClamAV démon non déployé | Critique | Quarantaine si indisponible |
| Google OAuth non configuré | Élevée | Dépendance externe |
| Gemini sans clé | Élevée | Service bloqué ou fallback déterministe |
| S3/KMS non provisionnés | Critique | Fichiers sensibles non autorisés sans stockage réel |
| HTTPS/DNS non configurés | Critique | Aucun déploiement Internet validé |

## Risques applicatifs à surveiller

- IDOR sur les nouvelles ressources.
- Isolation inter-organisation.
- Rejeu des webhooks.
- Archivage des fichiers infectés.
- Injection de formules dans les exports CSV.
- Mots destructeurs SQL.
- Fuites de contexte Gemini.
- Permissions masquées uniquement côté frontend.

## Contrôles locaux observés

- Argon2id.
- JWT.
- MFA.
- RBAC.
- Quarantaine.
- ClamAV zINSTREAM.
- SHA-256.
- HMAC-SHA256 standardisé via la primitive cryptographique centrale.
- HMAC-SHA1 RFC utilisé uniquement pour les jetons TOTP RFC 6238.
- KMS/enveloppe.
- Transactions ACID.
