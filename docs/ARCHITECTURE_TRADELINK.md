# Architecture — TRADELINK

## Vue globale

React/Vite communique avec Express. Express applique validation, authentification, RBAC, quotas et contrôle d'appartenance. Les services métier utilisent PostgreSQL/Prisma et Redis. Les fichiers sont mis en quarantaine puis traités sur stockage objet.

## Frontend

- React 18
- TypeScript
- Vite
- Tailwind
- i18next FR/EN/AR
- React Router

## Backend

- Express 5
- Contrôleurs et routes REST
- Zod
- Middlewares sécurité
- Services métier
- Repositories
- Prisma

## Données

- PostgreSQL 16
- Prisma 68 modèles
- PGlite uniquement pour le développement/test
- Redis 7 externe ou fallback local

## Stockage et sécurité

- S3/MinIO pour les pièces
- Vault/KMS pour les clés
- ClamAV clamd
- AES-256-GCM pour les documents sensibles
- SHA-256 pour les empreintes

## Import/export cible

Entrée fichier -> quarantaine -> ClamAV -> détection format/encodage -> extraction -> mapping -> validation -> simulation -> import -> rapport. Export -> sélection -> filtrage -> sérialisation -> antivirus si applicable -> empreinte -> téléchargement.

## Asynchrone cible

Les gros fichiers doivent passer par une file, un identifiant de tâche, une progression persistante, une reprise contrôlée et une notification.

## Production

Nginx TLS, réseau DMZ/interne, migrations contrôlées, sauvegardes PostgreSQL/S3, monitoring Prometheus, alertes et procédure de retour arrière.
