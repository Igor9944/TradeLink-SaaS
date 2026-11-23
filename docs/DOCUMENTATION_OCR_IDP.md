# Documentation OCR/IDP

## Implémentation actuelle

Le moteur actuel valide les magic bytes, détecte la langue, produit des champs selon des profils heuristiques, calcule la confiance et applique une validation humaine.

Formats vérifiés par le code : PDF, JPEG, PNG et WebP.

## Formats documentaires requis

- PDF natif
- PDF numérisé
- JPG/JPEG
- PNG
- TIFF
- BMP

## Extraction à produire

- Texte
- Zones
- Tables
- Montants
- Dates
- Numéros
- Rotation
- Multipage
- Qualité

## Profils

- KYC
- Facture
- Devis
- Bon de commande
- Bon de livraison
- CMR
- Comptabilité

## Contrôles

- HT + TVA = TTC
- Champs requis
- Confiance
- Duplicata SHA-256
- Validation humaine
- Audit des corrections

## Conclusion

Une extraction OCR réelle et reproductible reste une dépendance à ajouter. Les heuristiques actuelles ne constituent pas une preuve de précision industrielle.
