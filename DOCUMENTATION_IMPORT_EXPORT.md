# DOCUMENTATION EXPLOITATION UNIVERSELLE DES DOCUMENTS (IMPORT / EXPORT) — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 9 (Sections 11.1 à 11.6 & 11.9 à 11.11)  
**Fichier Source Principal** : `src/services/importExportEngine.ts`

---

## 1. Formats d'Importation et d'Exportation Pris en Charge (Sections 11.1 & 11.10)

Le moteur `ImportExportEngine` prend en charge **26 formats d'importation** (`ImportExportFormat`) et **17 formats d'exportation** (`ExportFormatType`) :

| Famille | Formats Supportés | Magic Bytes / Détection | Capacités Spécifiques |
|---|---|---|---|
| **Tableurs** | `CSV`, `XLS`, `XLSX`, `ODS` | `504B0304` (Zip/XML), `D0CF11E0` (BIFF8), `Excel.Sheet`, `opendocument.spreadsheet` | Détection délimiteurs (`;`, `,`, `\t`, `|`), feuilles/colonnes/types, protection CWE-1236 à l'import et à l'export |
| **Documents Bureautiques** | `DOC`, `DOCX`, `PDF`, `ODT`, `RTF`, `TXT` | `25504446` (`%PDF-`), `7B5C727466` (`{\rtf`), WordprocessingML `w:document`, OpenDocument `text:p` | Extraction de lignes tabulaires ou clé-valeur, génération structurée `DOCX`, `ODT`, `RTF`, `TXT`, `PDF` |
| **Images (vers OCR/IDP)** | `JPG`, `JPEG`, `PNG`, `TIFF`, `BMP` | `FFD8FF`, `89504E47`, `49492A00` / `4D4D002A` (TIFF LE/BE), `424D` (`BM`) | Routage sécurisé vers le pipeline OCR/IDP après validation des signatures binaires |
| **Données Structurées** | `JSON`, `XML`, `YAML` | `7B` (`{`/`[`), `3C3F786D6C` (`<?xml`), `2D2D2D` (`---`) | Parsing hiérarchique, échappement XML strict, sérialisation YAML et aller-retour complet (`Export -> Re-Import`) |
| **Bases de Données** | `SQL`, `SQLITE`, `BAK`, `DBF`, `CDX` | `CREATE TABLE`/`INSERT INTO`, `SQLite format 3`, `[MSSQL_BACKUP_STREAM`, en-tête dBASE `0x03`/`0x30` | Analyse isolée en Sandbox (`network_mode: none`), blocage des commandes destructives (`DROP`, `TRUNCATE`, `XP_CMDSHELL`), principe des 4 yeux |
| **Archives** | `ZIP`, `TAR`, `GZ` | `504B0304`, `7573746172` (`ustar`), `1F8B` | Contrôle anti-Zip-Bomb (ratio max `100:1`, `250 Mo` décompressés, `1000` entrées) et anti-Path-Traversal (`../`, `..\`) |

---

## 2. Pipeline d'Importation et de Reconnaissance en 12 / 18 Étapes (Sections 11.2 & 11.3)

1. **Réception & Vérification RBAC (`enforceImportPermission`)** : vérifie que le rôle est habilité pour l'entité cible (`FOURNISSEUR` -> `CATALOG_PRODUCTS`, `CLIENT` -> `CLIENTS`, `COMPTABLE` -> `ACCOUNTING_ENTRIES`, `ADMIN` -> Toutes).
2. **Quarantaine Initiale (`QUARANTINED_ON_INGEST`) & Contrôle de Taille (`MAX_FILE_SIZES`)**.
3. **Inspection des Magic Bytes, Extension & Comparaison (`extensionMatchesContent`)** : ne fait jamais confiance uniquement à l'extension du fichier.
4. **Scan Antivirus ClamAV (`zINSTREAM`) & Contrôle des Archives Piégées** : rejet immédiat des exécutables (`EXE`, `BAT`, `CMD`, `SH`, `DLL`, `PS1`, `ELF`, `MZ`) ; maintien strict en `QUARANTINED` si ClamAV est indisponible.
5. **Analyse du Contenu (`step4_analyzeContent`) & Détection de l'Encodage (`UTF-8`, `UTF-8-BOM`, `UTF-16`, `CP850`, `CP1252`)**.
6. **Prévisualisation (`step5_preview`)** des premières lignes extraites.
7. **Mapping Automatique et Manuel des Colonnes (`step6_mapColumns`)** : associe les colonnes sources aux champs TRADELINK (ex. `Nom produit` -> `name.fr`, `Prix unitaire` -> `priceAmount`, `Référence` -> `sku`) avec score de confiance.
8. **Détection des Doublons (`step7_detectDuplicates`)** selon la stratégie choisie (`SKIP`, `OVERWRITE`, `REJECT`).
9. **Validation des Types & Rapport d'Erreurs Ligne par Ligne (`step8_reportErrors`)**.
10. **Simulation à Blanc / Dry-Run (`step9_simulate`)** : calcule `wouldCreate`, `wouldUpdate`, `wouldSkip`, `wouldReject` sans modifier la base.
11. **Confirmation & Contrôle de Double Approbation Admin (`step10_confirm`)** : active automatiquement la règle des 4 yeux si `> 1000` lignes ou format base de données (`SQL`, `SQLITE`, `BAK`, `DBF`).
12. **Exécution Transactionnelle & Rapport Final (`step11_and_12_executeAndReport`)** : distingue explicitement les lignes importées, ignorées et rejetées avec empreinte `sha256` et `auditLogId`.

---

## 3. Traitement Spécifique des Bases `DBF`/`CDX`, `SQL`/`SQLite` et Sauvegardes `BAK` (Sections 11.4 à 11.6)

- **Fichiers `DBF` et `CDX` (`analyzeDbfStructure` & `analyzeCdxStructure`)** :
  - Lecture des descripteurs binaires dBASE III / IV / Visual FoxPro (octet de version, nombre d'enregistrements, longueur d'en-tête, descripteurs de champs de 32 octets `C/N/F/L/D/M`, codepage à l'offset 29, distinction entre enregistrements actifs `0x20` et supprimés `0x2A`).
  - Pour les index composés `.CDX`, le moteur inspecte l'arbre et les expressions de clés (`isStructureVerified`, `canRebuildIndex`) et ne prétend jamais reconstruire un index CDX si la table DBF associée n'est pas vérifiée.
- **Sauvegardes `.BAK` (`createDatabaseSandboxSession`)** :
  - Identification du moteur d'origine (`MSSQL_SERVER`). Un fichier `.BAK` n'est jamais exécuté sur la base PostgreSQL de production : il est analysé exclusivement en conteneur Sandbox isolé compatible, avec extraction contrôlée et double approbation Admin (`approveDualAdminMigration` bloque toute auto-approbation `ADMIN_SELF_APPROVAL_FORBIDDEN`).
- **Scripts `SQL` et `SQLite`** :
  - Détection et blocage des commandes destructives (`DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, `ALTER ROLE`, `SHUTDOWN`, `XP_CMDSHELL`), extraction en mode prévisualisation des clauses `CREATE TABLE` et `INSERT INTO`.
