# Cahier des charges — TRADELINK V6.2

## 1. Positionnement

TRADELINK est une plateforme SaaS B2B dédiée au commerce international, à la logistique, à la conformité, à la comptabilité, au paiement et à la collaboration. La version 6.2 conserve l'ensemble des fonctions V6.1 et les formalise comme des exigences vérifiables.

## 2. Acteurs

- Visiteur
- Client
- Fournisseur
- Transporteur
- Comptable
- Support
- Administrateur

## 3. Exigences transversales

### 3.1 Sécurité

- Argon2id, JWT HS256 vérifié, sessions uniques, MFA TOTP Admin, reset sécurisé, verrouillage anti-brute-force.
- RBAC côté serveur, contrôle d'appartenance, isolation par entreprise.
- HTTPS, CORS strict, cookies sécurisés, protection XSS/CSRF/SQLi/SSRF.
- Secrets hors dépôt, rotation possible et production fail-closed.
- ClamAV réel sur clamd, quarantaine et blocage avant validation.

### 3.2 Données

- PostgreSQL 16 comme source persistante en production.
- Redis pour les sessions, révocations, locks, idempotence et limites.
- Transactions ACID, clés étrangères, pagination et journaux d'audit.
- Aucun retour silencieux vers un stockage mémoire en production.

### 3.3 Qualité

- Toute fonctionnalité doit être prouvée par un test reproductible.
- Les données réelles ne sont jamais utilisées en tests.
- Les validations Internet sont autorisées uniquement sur environnement isolé.

## 4. Modules fonctionnels

### Authentification et comptes

Inscription, OTP, rôles, sessions, MFA, appareil, mot de passe oublié, réinitialisation à usage unique, révocation et audit.

### KYC

Depot de pièces, chiffrement, revue, quorum, échéance J+7, historique et décision administrateur.

### Catalogue, stocks et commerce

Produits trilingues, stocks réservables, panier, devis/RFQ, négociation, commande, réservation atomique et facturation.

### Paiements

Séquestre Stripe et passerelles configurables, webhooks signés, idempotence et quittance.

### Logistique

Missions, 10 statuts, chaîne du froid, télémétrie, ETA, POD et preuves horodatées.

### Comptabilité

Journaux, écritures équilibrées, Decimal.js, intérêts, balance âgée et export FEC.

### Collaboration

Messagerie, pièces jointes quarantenaires, notifications, Room Live, Google Meet, transcription et compte rendu.

### IA et traduction

Gemini comme fournisseur IA unique, contexte RBAC, quotas, classification, traduction FR/EN/AR et mode RTL.

## 5. Importation universelle

Formats requis : XLS, XLSX, CSV, ODS, DOC, DOCX, PDF, ODT, RTF, TXT, JPG, JPEG, PNG, TIFF, BMP, JSON, XML, YAML, SQL, SQLite, BAK, DBF, CDX, ZIP, TAR et GZ.

Fonctions obligatoires :

1. Détection du format, du contenu et de l'encodage.
2. Analyse antivirus avant validation.
3. Prévisualisation.
4. Mapping automatique et manuel.
5. Validation des types.
6. Détection des doublons et conflits.
7. Rapport d'erreurs.
8. Import complet ou partiel.
9. Restauration lorsque techniquement possible.
10. Historique et notifications.
11. Traitement asynchrone des gros fichiers.

### DBF/CDX

Lire les champs, types, encodages, lignes supprimées, tags et cohérence DBF/CDX. Ne jamais promettre la reconstruction d'un index CDX sans moteur compatible validé.

### BAK

Identifier le moteur source. Pour SQL Server, restaurer uniquement dans une instance isolée compatible, vérifier l'intégrité, extraire les tables puis convertir vers PostgreSQL.

## 6. Exportation universelle

Formats requis : XLS, XLSX, CSV, ODS, PDF, DOCX, ODT, RTF, TXT, JSON, XML, YAML, SQL, SQLite, DBF, CDX et procédure SQL Server pour BAK.

Fonctions obligatoires : filtres, relations, types, planification, sauvegardes, téléchargement sécurisé, SHA-256, historique et réimportation aller-retour.

## 7. OCR et IDP

Formats : PDF, JPG, JPEG, PNG, TIFF et BMP. OCR multipage, langue, rotation, zones, tableaux, montants, dates, références et gestion qualité.

IDP : classification, factures, bons de commande, contrats, KYC, contrôle HT/TVA/TTC, champs manquants, confiance et validation humaine obligatoire.

## 8. Déploiement

Architecture frontend, backend persistant, PostgreSQL managé, Redis managé, stockage S3, ClamAV, worker asynchrone, DNS, HTTPS, CDN, staging, monitoring, sauvegardes et restauration.

## 9. Critères d'acceptation

- Aucune dette technique critique ouverte.
- Tests reproductibles verts.
- Migrations vérifiées.
- Production fail-closed.
- Déploiement et tests Internet autorisés séparément.
