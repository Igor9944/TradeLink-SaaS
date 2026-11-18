# TRADELINK V6.0 — GUIDE D'UTILISATION COMPLET

Bienvenue dans le manuel d'utilisation officiel de la plateforme SaaS B2B **TRADELINK V6.0**.
Ce guide fournit toutes les instructions opérationnelles nécessaires pour chaque rôle applicatif.

---

## SOMMAIRE

1. [Vue d'Ensemble & Architecture des Rôles](#1-vue-densemble--architecture-des-rôles)
2. [Espace Visiteur (Demande de Compte & Défi OTP)](#2-espace-visiteur)
3. [Module KYC (Conformité & Compte à Rebours 7 Jours)](#3-module-kyc)
4. [Espace Client (Catalogue, Devis, Commandes & Paiements)](#4-espace-client)
5. [Espace Fournisseur (Catalogue, Chiffrage Devis, Préparation & Facturation)](#5-espace-fournisseur)
6. [Espace Transporteur (Flotte, Missions, CMR & Signature POD)](#6-espace-transporteur)
7. [Espace Comptable (Plan Comptable, Grand Livre, Rapprochement & Moteur Financier)](#7-espace-comptable)
8. [Module Collaboration & IA (Room Live, OCR & Assistant RAG)](#8-module-collaboration--ia)

---

## 1. VUE D'ENSEMBLE & ARCHITECTURE DES RÔLES

TRADELINK applique un modèle strict de permissions RBAC (Role-Based Access Control) associé à une politique d'isolation inter-entreprises (anti-IDOR) et une unicité de session active (*Single Active Session Policy*).

| Profil | Missions Principales | Restrictions Critiques |
| :--- | :--- | :--- |
| **VISITEUR** | Inscription publique, validation OTP de l'email professionnel. | Aucun accès aux données commerciales avant approbation. |
| **CLIENT** | Consultation catalogue multilingue, demandes de devis, commandes, paiements Stripe. | Ne peut pas créer de Room Live publique sans invitation. |
| **FOURNISSEUR** | Gestion du catalogue de produits, réponses chiffrées aux devis, expéditions. | Ne consulte que ses propres commandes et produits. |
| **TRANSPORTEUR** | Acceptation des missions de fret, édition du CMR international, signature POD. | Accès restreint aux expéditions qui lui sont affectées. |
| **COMPTABLE** | Journaux comptables, grand livre, balance, amortissements financiers Decimal.js. | **Règle Stage 3** : Strictement en lecture seule sur les données commerciales. |
| **ADMINISTRATEUR** | Supervision globale, validation KYC, double approbation des sauvegardes et KMS. | Provisionné manuellement uniquement (inscription publique interdite). |

---

## 2. ESPACE VISITEUR

### Inscription Visiteur
1. Accédez à l'écran d'accueil TRADELINK et cliquez sur **"Demander un Compte Professionnel"**.
2. Remplissez les champs obligatoires : Raison sociale, numéro d'identification fiscale (ICE/SIRET/VAT), pays, email professionnel et mot de passe fort (minimum 10 caractères, haché en **Argon2id**).
3. Soumettez le formulaire. Un code de sécurité OTP à 6 chiffres est immédiatement généré.

### Défi OTP & Activation
1. Saisissez le code reçu à 6 chiffres dans les 10 minutes.
2. Vous disposez de 5 tentatives maximales. Au-delà, le code est invalidé pour protection anti-brute-force.
3. Une fois vérifié, votre compte est provisionné au rôle **CLIENT** et orienté vers l'onboarding KYC.

---

## 3. MODULE KYC

### Dépôt des Pièces Justificatives
Dès l'activation de votre compte, un compte à rebours de **7 jours calendaires** s'enclenche :
- **CLIENT** : Registre du Commerce (K-bis), Carte d'identité du dirigeant, Attestation fiscale.
- **FOURNISSEUR** : Registre commercial, Attestation de régularité fiscale, Relevé d'identité bancaire (RIB/IBAN).
- **TRANSPORTEUR** : Licence de transport de marchandises, Permis C+E / Carte grise, Assurance flotte.

### Règle des 7 Jours & Relances
- Des notifications automatiques de relance sont émises à **J+1, J+3, J+5 et J+6**.
- **Garantie de non-suspension** : Tout dossier dont l'intégralité des pièces requises est déposée avant l'échéance de J+7 passe au statut `SUBMITTED_IN_TIME_PENDING_REVIEW` et **ne sera jamais suspendu** en attente d'arbitrage administratif.
- Seul l'administrateur habilité peut valider le dossier, demander un complément d'information ou prononcer un rejet motivé.

---

## 4. ESPACE CLIENT

### Recherche & Catalogue
- Parcourez le catalogue de produits avec support multilingue trilingue (**Français, Anglais, Arabe**) et directionnalité **RTL** native pour l'arabe.
- Visualisez les visuels 3D, pays d'origine, incoterms (DAP, CIF, FOB, CIP) et stocks disponibles en temps réel.

### Demande de Devis & Négociation
1. Depuis la fiche produit, cliquez sur **"Demander un Devis"**.
2. Spécifiez la quantité souhaitée, le prix cible unitaire et le lieu de livraison.
3. Dès notification de la proposition chiffrée du Fournisseur, vous pouvez l'accepter d'un clic.

### Commande & Paiement Stripe
1. Lors de l'acceptation, le devis est converti de manière atomique en **Commande**. Les stocks sont immédiatement réservés.
2. Réglez la commande en toute sécurité par carte bancaire via le composant **Stripe Checkout**. L'opération est protégée par un jeton d'idempotence évitant tout double débit accidentel.

---

## 5. ESPACE FOURNISSEUR

### Gestion du Catalogue
- Créez et publiez vos articles avec déclinaison multilingue des dénominations et descriptions.
- Définissez des seuils minimaux d'alerte de stock. Tout mouvement franchissant ce seuil déclenche une alerte automatique.

### Traitement des Devis & Facturation
- Répondez aux demandes des clients en appliquant des remises de volume (`discountPct`) ou des ajustements d'incoterm.
- Dès validation de commande, générez la **Facture légale** conforme (mention HT, TVA, TTC et mentions obligatoires).

---

## 6. ESPACE TRANSPORTEUR

### Gestion de Flotte
- Consultez vos véhicules enregistrés avec attestations spécifiques : Frigorifique ATP (Classe C sous température dirigée), Bâché ou Porte-conteneur.

### Cycle d'une Mission Logistique
1. **Notification d'offre** : Lorsqu'un fournisseur affecte une mission de transport, visualisez les adresses de prise en charge et de livraison, le tonnage et le cubage.
2. **Acceptation ou Refus motivé** : En cas de refus, un motif légal précis doit obligatoirement être spécifié.
3. **CMR International** : Le bordereau CMR est généré automatiquement avec QR code de vérification numérique.
4. **Preuve de Livraison (POD)** : À la remise, faites signer le destinataire sur PDA/tablette (signature SVG), joignez la photo du colis scellé et enregistrez les coordonnées GPS. La commande et l'expédition passent simultanément à l'état `DELIVERED`.

---

## 7. ESPACE COMPTABLE

### Règle Régalienne Stage 3
Le comptable bénéficie d'un accès complet à l'ensemble des données financières (factures, paiements, écritures), mais **ne peut modifier aucune donnée commerciale source** (produits, stocks, commandes). Toute tentative de mutation génère une erreur `403 COMPTABLE_STAGE3_READONLY_SOURCE_DATA`.

### Journaux & Écritures en Partie Double
- Journaux disponibles : **Ventes (VTE)**, **Achats (ACH)**, **Banque (BNQ)**, **Opérations Diverses (OD)**.
- Toute écriture doit respecter la balance stricte : `Total Débit == Total Crédit`.

### Moteur Financier Déterministe (Decimal.js)
- Calcul précis au centime d'euro des échéanciers d'amortissement de prêt ou de crédit commercial (36 à 360 mois) sans arrondi binaire flottant.
- Prise en charge des conventions de calcul d'intérêts : **ACT/365**, **ACT/360** et **ACT/ACT** avec détection automatique des années bissextiles à 366 jours.

---

## 8. MODULE COLLABORATION & IA

### Room Live (Visioconférence B2B)
- Salles de réunion interactives avec audio, vidéo, partage d'écran et salon d'attente (*Knocking*).
- **Règle d'accès** : Fournisseurs, Transporteurs et Administrateurs peuvent créer des salles ; les Clients peuvent les rejoindre sur invitation nominative.
- Synthèse automatique des échanges par IA et export PDF certifié.

### OCR & IDP Intelligent
- Déposez vos factures PDF ou scans douaniers : le moteur extrait automatiquement le numéro de pièce, les montants HT/TVA/TTC et les devises avec un indice de confiance supérieur à 90%.
- Traçabilité complète des corrections manuelles opérateur.

### Assistant IA Conversationnel (RAG)
- Posez vos questions en langage naturel : l'assistant filtre ses réponses selon votre rôle (les informations de marge et de clés de sécurité restent inaccessibles aux clients).
