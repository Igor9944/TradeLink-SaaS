# TRADELINK SaaS B2B — Plateforme Internationale de Commerce, Logistique, Comptabilité, Gestion Documentaire & Collaboration IA

**Version** : 6.2.0  
**Branche** : `main`  
**Dépôt** : `https://github.com/Igor9944/TradeLink-SaaS`

---

## 1. Présentation Générale

**TRADELINK SaaS** est une plateforme B2B multi-tenant complète conçue pour sécuriser et orchestrer les opérations commerciales internationales :
- **Gouvernance Multi-Rôles (7 Rôles Plateforme + 7 Rôles Internes d'Organisation)** : Superadministrateur (`ADMIN` + MFA TOTP obligatoire), Client/Acheteur (`CLIENT`), Fournisseur/Exportateur (`FOURNISSEUR`), Transporteur/Logisticien (`TRANSPORTEUR`), Comptable/Auditeur (`COMPTABLE`), Agent Support (`SUPPORT`) et Visiteur (`VISITEUR`), avec isolation multi-tenant stricte (anti-IDOR).
- **Conformité KYC & Chiffrement KMS** : Dépôt de justificatifs scannés par ClamAV (`zINSTREAM`) et chiffrés par enveloppe **AES-256-GCM** (HashiCorp Vault KMS), SLA de 7 jours (relances J+1 à J+7), prévisualisation par URL présignée HMAC (15 min).
- **Cycle Commercial, Séquestre & Comptabilité Partie Double** : Catalogue B2B avec paliers dégressifs et MOQ, réservations atomiques de stock, devis (RFQ), commandes, factures/avoirs scellés SHA-256, paiements séquestre multi-prestataires (Stripe, Konnect, Flouci, CMI, Virement, LC), comptabilité immuable avec contre-passation (`/reverse`), plans comptables `PCG`/`IFRS`/`OHADA`/`PCM`, export FEC et moteur financier déterministe `Decimal.js`.
- **Exploitation Universelle des Documents (Import 26 Formats / Export 17 Formats & OCR/IDP)** :
  - Import/Export de tableurs (`CSV`, `XLS`, `XLSX`, `ODS`), documents (`DOC`, `DOCX`, `PDF`, `ODT`, `RTF`, `TXT`), images (`JPG`, `JPEG`, `PNG`, `TIFF`, `BMP`), données structurées (`JSON`, `XML`, `YAML`), bases de données (`SQL`, `SQLITE`, `BAK`, `DBF`, `CDX` en Sandbox isolée sans réseau avec double approbation Admin à 4 yeux) et archives (`ZIP`, `TAR`, `GZ` avec protection anti-Zip-Bomb et anti-Path-Traversal).
  - Pipeline OCR/IDP en 13 étapes sur 7 profils métiers avec contrôle arithmétique `HT + TVA = TTC` et garde-fou interdisant toute écriture comptable ou validation KYC automatique sans revue humaine.
- **Room Live WebRTC SFU & Google Meet API v2** : Création et gestion d'espaces officiels Google Meet v2 (`spaces.create`, `spaces.get`, `spaces.patch`, `spaces.endActiveConference`, `conferenceRecords`, OAuth 2.0) et fallback WebRTC SFU. **Règle métier appliquée côté UI, API et services : le profil `CLIENT` peut uniquement rejoindre une Room Live autorisée et ne peut jamais en créer ni en administrer (`403`)**.
- **Intelligence Artificielle Exclusive Google Gemini & Traduction Native (FR / EN / AR / ES)** : Copilot IA scopé par rôle et organisation avec garde-fou humain, internationalisation native hors-ligne (`fr` référence, `en`, `ar` RTL, `es`) et traduction dynamique avec mention légale explicite de non-certification sur les documents juridiques et financiers.

---

## 2. Démarrage Rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Valider le schéma Prisma (68 modèles) et le typage TypeScript strict
npx prisma validate
npm run typecheck

# 3. Démarrer le Frontend (port 5173) et le Backend API (port 3000)
npm run dev
npm run dev:backend

# 4. Compiler les builds de production
npm run build
npm run build:backend
```

---

## 3. Index de la Documentation Officielle (26 Livrables)

### Audit, Cartographie & Analyse des Risques (Phase 1 / LOT 0)
1. [AUDIT_COMPLET_TRADELINK.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/AUDIT_COMPLET_TRADELINK.md) — Audit technique complet du dépôt.
2. [CARTOGRAPHIE_FONCTIONNELLE.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/CARTOGRAPHIE_FONCTIONNELLE.md) — Cartographie des 12 domaines fonctionnels.
3. [MATRICE_FONCTIONNALITES.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/MATRICE_FONCTIONNALITES.md) — Matrice de suivi et d'état des fonctionnalités.
4. [DETTES_TECHNIQUES.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DETTES_TECHNIQUES.md) — Registre des dettes techniques résolues et dépendances externes.
5. [RISQUES_SECURITE.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/RISQUES_SECURITE.md) — Analyse des risques et contrôles cryptographiques.

### Architecture, UML, Interfaces, Rôles & Spécifications Techniques (Phase 2, 3, 4 & 16)
6. [DOCUMENTATION_TECHNIQUE.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_TECHNIQUE.md) — Pile technologique, versions réelles et organisation du code.
7. [ARCHITECTURE_TRADELINK.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/ARCHITECTURE_TRADELINK.md) — Architecture en couches, isolation multi-tenant et topologie réseau.
8. [MODELISATION_UML.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/MODELISATION_UML.md) — Diagrammes UML (Cas d'utilisation, 30 Classes, 21 Séquences, 10 Activités, Composants, Déploiement).
9. [CARTOGRAPHIE_INTERFACES.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/CARTOGRAPHIE_INTERFACES.md) — Inventaire détaillé des 79 routes et interfaces (20 attributs par interface).
10. [ROLES_PERMISSIONS_POLITIQUES.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/ROLES_PERMISSIONS_POLITIQUES.md) — Référentiel RBAC/ABAC, périmètres des acteurs et matrice obligatoire.
11. [DOCUMENTATION_API.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_API.md) — Catalogue complet des 130+ endpoints REST `/api/v1/*`.
12. [DOCUMENTATION_BASE_DE_DONNEES.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_BASE_DE_DONNEES.md) — Schéma PostgreSQL 16 (68 modèles Prisma), Redis 7 et migrations.
13. [DOCUMENTATION_SECURITE.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_SECURITE.md) — Argon2id, MFA TOTP RFC 6238, JWT, anti-IDOR, XSS, CWE-1236, ClamAV, KMS.
14. [DOCUMENTATION_TRADUCTION.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_TRADUCTION.md) — Système i18n natif (FR/EN/AR/ES), glossaire B2B et mention de non-certification.
15. [DOCUMENTATION_GEMINI.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_GEMINI.md) — Assistant IA exclusif Google Gemini, RAG scopé et garde-fous.
16. [DOCUMENTATION_GOOGLE_MEET.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_GOOGLE_MEET.md) — Room Live, API Google Meet v2 officielle, OAuth 2.0 et restriction Client.
17. [DOCUMENTATION_IMPORT_EXPORT.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_IMPORT_EXPORT.md) — Moteur universel d'importation (26 formats), Sandbox DB 4-Eyes et exportation (17 formats).
18. [DOCUMENTATION_OCR_IDP.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/DOCUMENTATION_OCR_IDP.md) — Pipeline OCR/IDP en 13 étapes (PDF, JPG, PNG, WebP, TIFF, BMP) et validation humaine.

### Guides d'Exploitation, Tests & Rapports Finaux (Phase 13, 14, 15, 16 & Section 22)
19. [GUIDE_INSTALLATION.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/GUIDE_INSTALLATION.md) — Installation locale et compilation des builds.
20. [GUIDE_CONFIGURATION.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/GUIDE_CONFIGURATION.md) — Configuration des 72 variables d'environnement et secrets.
21. [GUIDE_DEPLOIEMENT.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/GUIDE_DEPLOIEMENT.md) — Comparatif d'hébergement, déploiement Docker Compose prod, rollback et validation Internet.
22. [GUIDE_MAINTENANCE.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/GUIDE_MAINTENANCE.md) — Supervision Prometheus, rotation KMS, Restore Drills et PRA/PCA.
23. [PLAN_TESTS.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/PLAN_TESTS.md) — Stratégie et exécution des 40 suites de tests (unitaires, intégration, E2E, sécurité, charge).
24. [RAPPORT_VALIDATION_PRODUCTION.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/RAPPORT_VALIDATION_PRODUCTION.md) — Résultats des contrôles de production et prérequis de mise en ligne.
25. [RAPPORT_FINAL_TRADELINK.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/RAPPORT_FINAL_TRADELINK.md) — Rapport final d'ingénierie consolidé (Lots 0 à 10).
26. [docs/RAPPORT_FINAL_RECETTE_LOT9.md](file:///c:/Users/mmeca/Documents/TradeLink%20SaaS/docs/RAPPORT_FINAL_RECETTE_LOT9.md) — Rapport officiel de recette en 17 sections.
