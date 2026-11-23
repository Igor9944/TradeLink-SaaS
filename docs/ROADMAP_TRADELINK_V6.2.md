# Roadmap — TRADELINK V6.2

## État de référence

Audit réalisé le 23 novembre 2026 sur `main` au commit `f332288`.

## Lot 1 — Sécurité fondamentale

Statut : **TERMINÉ ET VALIDÉ**, sous réserve d'un déploiement ClamAV réel.

- Argon2id vérifié.
- JWT, MFA, RBAC et anti-IDOR vérifiés.
- Quarantaine et protocole zINSTREAM implémentés.

## Lot 1.1 — Audit final cryptographique

Statut : **TERMINÉ ET VALIDÉ** par `test:lot1-audit`.

## Lot 2 — PostgreSQL et Redis

Statut : **TERMINÉ ET VALIDÉ** par `test:lot2-persistence` sur PGlite/PostgreSQL 16 et Redis simulé/externe.

Priorité suivante : exécuter contre PostgreSQL 16 et Redis 7 réellement provisionnés.

## Lot 3 — Importation universelle

Statut : **PARTIELLEMENT DÉVELOPPÉ**.

Présent : CSV, XLSX, JSON, SQL, BAK, DBF, CDX, mapping, doubles détection, sandbox et rapports.
Absent ou incomplet : formats XLS, ODS, DOC/DOCX, PDF textuel, ODT, RTF, TXT, TIFF, BMP, XML, YAML, SQLite, archives, encodage réel, parsing natif volumique et reprise de traitement.

## Lot 4 — Exportation universelle

Statut : **PARTIELLEMENT DÉVELOPPÉ**.

Présent : CSV, XLSX, JSON, PDF et SHA-256.
Absent : ODS, DOCX, ODT, RTF, TXT, XML, YAML, SQL, SQLite, DBF, CDX, sauvegarde BAK métier et aller-retour automatisé.

## Lot 5 — OCR/IDP

Statut : **PARTIELLEMENT DÉVELOPPÉ**.

Présent : validation magic bytes, profils, extraction heuristique, confiance, arithmétique et validation humaine.
Absent : moteur OCR réel local/cloud, TIFF/BMP, PDF numérisé, tableaux fiables, multipage et jeu de précision documenté.

## Lot 6 — Finalisation métier

Statut : **DÉVELOPPÉ MAIS À TESTER** pour une partie des modules; parcours globaux validés localement.

## Lot 7 — IA/traduction

Statut : **DÉVELOPPÉ MAIS À TESTER**; intégration Gemini à valider avec fournisseurs tiers isolés.

## Lot 8 — Performances

Statut : **DÉVELOPPÉ MAIS À TESTER**.

## Lot 9 — Tests complets

Statut : **PARTIELLEMENT DÉVELOPPÉ**.

Automatisations présentes : unitaires, intégration, sécurité, Playwright simulé, charge et harmonisation.
Tests Internet manquants : environnements réels, interruption réseau, reprise et précision OCR.

## Lot 10 — Documentation

Statut : **DÉVELOPPÉ MAIS À TESTER**.

## Lot 11 — Déploiement Internet

Statut : **NON DÉVELOPPÉ**.

Le compose existe, mais aucun déploiement réel ni DNS/HTTPS validé n'est revendiqué.

## Lot 12 — Validation post-déploiement

Statut : **NON DÉVELOPPÉ**.

## Prochaine étape recommandée

Provisionner un environnement staging réel avant tout Lot 2 de modification fonctionnelle : PostgreSQL managé, Redis managé, ClamAV, S3 et données de test. Puis mesurer les formats non pris en charge du Lot 3.
