# TRADELINK V6.0 — Plateforme SaaS B2B

Plateforme SaaS B2B unifiée de commerce, import-export, gestion documentaire, logistique multimodale, comptabilité déterministe et collaboration temps réel, conçue conformément au **Cahier des Charges Complet TRADELINK V6.0 (Version de référence : 17 novembre 2026)**.

## Démarrage rapide

```bash
pnpm install
pnpm run dev
```

Application accessible sur `http://localhost:5173`.

## Architecture & Ressources Intégrées

- **Logos officiels Thème Blanc & Thème Noir** (`public/logos/logo-light.png`, `logo-dark.png`, `logo-light-horizontal.png`, `logo-dark-horizontal.png`) avec bascule automatique selon le thème actif et préservation de direction en mode RTL.
- **50 Icônes 3D Métier détourées** (`public/icons/3d/*.png`) intégrées au composant réutilisable `<Icon3D />`.
- **4 Photographies Haute Résolution Landing Page** (`public/images/air-cargo-sunset.jpg`, `road-freight-truck.jpg`, `warehouse-operations.jpg`, `container-terminal.jpg`).
- **79 Pages & Routes** couvrant la Zone Publique, l’Authentification (OTP, MFA TOTP), les 6 Espaces Métier (`Admin`, `Client`, `Fournisseur`, `Transporteur`, `Comptable`, `Support`), la salle active `Room Live`, le studio `OCR/IDP`, le `Centre de Notifications` et les pages `403`/`404`/`500`.
- **Schéma Prisma Complet** (`prisma/schema.prisma`) regroupant les 44 modèles initiaux ainsi que les modèles comptables et support, avec types `Decimal` (`@db.Decimal(18, 4)`).
- **Moteur de Calcul Financier Déterministe** (`src/services/backendServices.ts`) basé sur `Decimal.js` prenant en charge les conventions `ACT/365` (défaut), `ACT/360` et `ACT/ACT` (avec détection des années bissextiles).
- **Internationalisation Trilingue FR / EN / AR** avec support réel du **RTL** (`dir="rtl"`).
