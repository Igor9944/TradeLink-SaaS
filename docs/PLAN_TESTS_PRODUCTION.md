# Plan de tests en production

## Autorisation

Aucun test réseau réel n'est lancé sans autorisation explicite sur un environnement isolé. Toutes les données sont factices.

## Environnement

- Staging distinct
- Données synthétiques
- Comptes acteurs dédiés
- Backend, PostgreSQL, Redis, S3 et ClamAV réels
- Capture des logs et métriques

## Matrice

| Domaine | Test |
|---|---|
| Import | Tous les formats pris en charge |
| Import volumineux | Taille limite, interruption, reprise |
| Export | Aller-retour, intégrité, SHA-256 |
| OCR | Documents réels factices, PDF, multipage |
| IDP | Précision, rejets, validation humaine |
| Sécurité | MFA, RBAC, IDOR, XSS, SQLi, CSRF |
| Fichiers | Malwares EICAR, panne scanner |
| Sauvegarde | Restauration |
| Performance | Charge k6 |
| Stabilité | Arrêt/redémarrage PostgreSQL/Redis |

## Rapport attendu

Fonction, environnement, données, résultat attendu, résultat obtenu, durée, erreur, correctif et preuve associée.
