# Cartographie fonctionnelle

## Zones publiques

- Accueil
- Catalogue public
- Présentation
- Services
- Fonctionnement
- Contact
- FAQ
- Blog
- Mentions légales
- Confidentialité
- Cookies

## Authentification

- Inscription
- Connexion
- OTP
- Mot de passe oublié
- MFA

## Espace Administrateur

Dashboard, utilisateurs, détail utilisateur, KYC, KYC détaillé, commercial, finance, logistique, sécurité, import/export, configuration IA, Room Live, boutons flottants, audit, sauvegardes, rapports et paramètres.

## Espace Client

Dashboard, KYC, dépôt KYC, catalogue, détail produit, panier, checkout, commandes, détails commande, devis, nouveau devis, factures, paiements, logistique, documents, Room Live et paramètres.

## Espace Fournisseur

Dashboard, KYC, catalogue, nouveau produit, édition produit, stocks, commandes, détails commande, devis, documents, paiements, clients, logistique, IA, Room Live et paramètres.

## Espace Transporteur

Dashboard, KYC, missions, détail mission, expéditions, documents, incidents, communication, IA, Room Live et paramètres.

## Espace Comptable

Dashboard, factures, documents, journaux, grand livre, états financiers, moteur de calcul, IA et paramètres.

## Espace Support

Dashboard, tickets, détail ticket, utilisateurs, communication, base de connaissances, IA, Room Live et paramètres.

## Interfaces transversales

- Room Live
- Studio OCR/IDP
- Centre de notifications
- Pages d'erreur 403/404/500

## Preuves

Le routage est défini dans `src/App.tsx`; les pages sont découpées par domaines avec `React.lazy`, et les espaces privés sont protégés par `RoleGuard`.
