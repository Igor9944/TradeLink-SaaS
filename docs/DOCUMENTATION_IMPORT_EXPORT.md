# Documentation import/export

## Formats actuellement implémentés

### Import

- CSV
- XLSX
- JSON
- SQL
- BAK
- DBF
- CDX

### Export

- CSV
- XLSX
- JSON
- PDF

## Pipeline

1. Upload
2. Identification
3. Validation
4. Analyse
5. Prévisualisation
6. Mapping
7. Doublons
8. Rapport d'erreurs
9. Simulation
10. Confirmation
11. Exécution
12. Rapport final

## Sécurité

- Extension interdite.
- Taille maximale.
- Magic bytes.
- Quarantaine.
- ClamAV lorsqu'il est connecté.
- Neutralisation CSV contre les formules.
- Double validation pour migration base.

## Formats à implémenter

XLS, ODS, DOC, DOCX, PDF structuré, ODT, RTF, TXT, JPG, JPEG, PNG, TIFF, BMP, XML, YAML, SQLite, ZIP, TAR, GZ, DOCX/ODT/RTF export, SQL/SQLite/DBF/CDX export et BAK source SQL Server.

## DBF/CDX

Ajouter un lecteur DBF natif, la résolution des encodages, les lignes supprimées, les tags CDX et un rapport de compatibilité. Ne pas restaurer ou réécrire un CDX sans validation du moteur.

## BAK

Ne pas traiter un fichier BAK comme du SQL. Reconnaître SQL Server, provisionner une instance isolée compatible, restaurer, vérifier les métadonnées, extraire vers un format intermédiaire puis importer PostgreSQL.

## Critères de passage Lot 3/4

- Tests réels pour chaque format.
- Aller-retour sans perte.
- Encodages accentués.
- Gros fichiers avec reprise.
- Empreinte SHA-256.
- Rapport détaillé.
