# DOCUMENTATION OCR ET INTELLIGENCE DOCUMENTAIRE (IDP) — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 9 (Sections 11.7 & 11.8)  
**Fichiers Sources** : `src/services/ocrDocumentEngine.ts`, `src/components/ocr/OcrDocumentStudioView.tsx`, `src/components/ocr/OcrSecureUploader.tsx`

---

## 1. Formats Pris en Charge et Validation Binaire Magic Bytes

Le moteur OCR/IDP accepte les documents jusqu'à **15 Mo** (`OCR_MAX_FILE_SIZE_BYTES`) et inspecte systématiquement les **Magic Bytes** binaires (`validateFileMagicBytes`) avant tout traitement :

| Format | Extension | MIME Détecté | Signature Binaire (Magic Bytes) |
|---|---|---|---|
| **PDF** (Natif ou Numérisé multipage) | `.pdf` | `application/pdf` | `25 50 44 46` (`%PDF`) |
| **JPEG / JPG** | `.jpg`, `.jpeg` | `image/jpeg` | `FF D8 FF` |
| **PNG** | `.png` | `image/png` | `89 50 4E 47` (`\x89PNG`) |
| **WebP** | `.webp` | `image/webp` | `52 49 46 46 ... 57 45 42 50` (`RIFF....WEBP`) |
| **TIFF** (Little-Endian & Big-Endian) | `.tiff`, `.tif` | `image/tiff` | `49 49 2A 00` (`II*\0`) ou `4D 4D 00 2A` (`MM\0*`) |
| **BMP** | `.bmp` | `image/bmp` | `42 4D` (`BM`, en-tête DIB >= 14 octets) |

Tout binaire exécutable camouflé (`MZ` Windows PE, `ELF` Linux, `#!` Shell) est immédiatement rejeté.

---

## 2. Pipeline OCR / IDP en 13 Étapes et 7 Profils Métiers (Section 11.7)

### Étapes du Pipeline
1. Réception du document (`POST /api/v1/ocr/upload`).
2. Détection binaire du format (`validateFileMagicBytes`).
3. Calcul d'empreinte SHA-256 (`calculateDocumentSha256`) pour l'intégrité et la détection de doublons.
4. Prétraitement et détection de la qualité (`LOW_QUALITY_SCAN`, détection de langue `fr` / `en` / `ar` / `mixed`).
5. Reconnaissance optique de caractères (OCR).
6. Localisation des boîtes englobantes par page (`boundingBox: { x, y, width, height, page }`).
7. Extraction des champs structurés selon le profil documentaire (`EXTRACTION_PROFILE_REGISTRY`).
8. Extraction des lignes de tableaux (`lineItems` : SKU, désignation, quantité, prix unitaire, TVA, total ligne).
9. Classification et normalisation des devises (`EUR`, `MAD`, `USD`) et des dates ISO.
10. Calcul des scores de confiance par champ et du score global (`globalConfidence`).
11. Contrôle arithmétique déterministe via `Decimal.js` (`verifyDocumentArithmeticConsistency` : `Total HT + Montant TVA === Total TTC`).
12. Revue, correction manuelle traçable (`PUT /api/v1/ocr/documents/:id/fields`) et validation humaine obligatoire (`POST /api/v1/ocr/documents/:id/validate`).
13. Enregistrement final et génération du rapport d'audit.

### Les 7 Profils Métiers (`OcrDocumentProfile`)
- `INVOICE` : Factures commerciales & Proformas (`invoiceNumber`, `supplier`, `client`, `issueDate`, `dueDate`, `totalHt`, `tvaAmount`, `totalTtc`, `currency`, `iban`, lignes d'articles).
- `KYC` : Pièces légales d'entreprise (`companyName`, `registrationNumber`, `taxId`, `representativeName`, `issueDate`, `expirationDate`).
- `QUOTE` : Devis & Demandes de cotation RFQ (`quoteNumber`, `client`, `supplier`, `validUntil`, `subtotalAmount`, `taxAmount`, `totalAmount`, `currency`).
- `PURCHASE_ORDER` : Bons de commande B2B (`orderNumber`, `orderDate`, `buyerName`, `sellerName`, `deliveryAddress`, `totalAmount`).
- `DELIVERY_NOTE` : Bons de livraison & POD (`deliveryNoteNumber`, `carrierName`, `deliveryDate`, `recipientName`, `recipientSignature`, `reservations`).
- `TRANSPORT_CMR` : Lettres de voiture e-CMR & EUR.1 (`cmrNumber`, `carrier`, `vehiclePlate`, `incoterm`, `temperatureRange`, `customsSealNumber`).
- `ACCOUNTING` : Relevés bancaires & justificatifs comptables (`statementNumber`, `bankName`, `periodStart`, `periodEnd`, `openingBalance`, `closingBalance`, `iban`).

---

## 3. Fiabilité OCR et Garde-Fou Contre les Actions Automatiques (Section 11.8)

Conformément à la Section 11.8 :
- **Seuil de confiance** : tout champ dont le score est `< 0.85` (`OCR_MIN_CONFIDENCE_THRESHOLD`) est marqué comme incertain (`hasUncertainFields = true`) et surligné dans le Studio OCR (`/ocr-idp`).
- **Interdiction absolue de déclenchement automatique (`canTriggerAutomatedDownstreamAction` & `commitHumanReviewValidation`)** :
  - Une extraction OCR ne déclenche **jamais** automatiquement une écriture comptable ou une validation KYC.
  - La fonction `canTriggerAutomatedDownstreamAction` bloque toute action aval tant que :
    1. La revue humaine n'a pas été formellement validée (`humanReviewCompleted === true` et statut `VALIDATED`).
    2. Les champs incertains (`confidence < 0.85`) n'ont pas été vérifiés ou corrigés par un opérateur humain.
    3. L'égalité mathématique `HT + TVA = TTC` n'est pas strictement vérifiée par `Decimal.js`.
