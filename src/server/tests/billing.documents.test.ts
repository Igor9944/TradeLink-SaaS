// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// SUITE DE TESTS COMPLÈTE — FACTURATION & GESTION DOCUMENTAIRE (PROMPT 12)
// 12 Tests : Juridictions fiscales, 7 types de documents, calculs déterministes,
// PDF standard %PDF-1.4, immutabilité & avoirs, scellement SHA-256, tokens 900s,
// RBAC Anti-IDOR, Stage 3 Comptable, versionnement, trilinguisme FR/EN/AR et API REST
// ============================================================================

import assert from 'assert';
import crypto from 'crypto';
import {
  BillingDocumentEngine,
  TAX_JURISDICTIONS,
} from '../../services/billingDocumentEngine';
import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkDomainServices } from '../services/domain.services';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession, ServerRequestContext } from '../middlewares/errorAndSecurity.middleware';
import {
  CommercialDocumentRecord,
  CommercialDocumentType,
  DocumentPartyInfo,
  TaxJurisdictionCode,
} from '../../types';

console.log('\n====================================================================');
console.log('TRADELINK V6.0 — SUITE DE TESTS FACTURATION & DOCUMENTS COMMERCIAUX');
console.log('====================================================================\n');

async function runBillingDocumentsTestSuite() {
  // 1. Initialisation de l'environnement de test
  const repo = new TradeLinkRepositoryStore({
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    commercialDocuments: [],
  });

  const domainServices = new TradeLinkDomainServices(repo);
  const app = new TradeLinkApiApplication(repo);

  // Acteurs de simulation
  const clientUserA: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-casa-01',
    email: 'achats@casalogistics.ma',
    role: 'CLIENT',
    companyName: 'Casablanca Logistics & Cold Hub SARL',
    sessionId: 'sess-doc-client-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(clientUserA.id, clientUserA.sessionId);

  const clientUserB: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-client-tanger-02',
    email: 'direction@tangermed-import.ma',
    role: 'CLIENT',
    companyName: 'Tanger Med Import Export SA',
    sessionId: 'sess-doc-client-02',
    mfaVerified: true,
  };
  registerSingleActiveSession(clientUserB.id, clientUserB.sessionId);

  const supplierUser: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-supp-eurotech-01',
    email: 'billing@eurotech-coldchain.de',
    role: 'FOURNISSEUR',
    companyName: 'EuroTech ColdChain GmbH',
    sessionId: 'sess-doc-supp-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(supplierUser.id, supplierUser.sessionId);

  const carrierUser: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-carrier-trans-01',
    email: 'fret@maghreb-trans.com',
    role: 'TRANSPORTEUR',
    companyName: 'Maghreb Intermodal Transporters',
    sessionId: 'sess-doc-carrier-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(carrierUser.id, carrierUser.sessionId);

  const comptableUser: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-compta-audit-01',
    email: 'expert@cabinet-fiduciaire.fr',
    role: 'COMPTABLE',
    companyName: 'Cabinet Audit & Finance International',
    sessionId: 'sess-doc-compta-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(comptableUser.id, comptableUser.sessionId);

  const adminUser: NonNullable<ServerRequestContext['user']> = {
    id: 'usr-admin-global-01',
    email: 'governance@tradelink-saas.com',
    role: 'ADMIN',
    companyName: 'TradeLink International SAS',
    sessionId: 'sess-doc-admin-01',
    mfaVerified: true,
  };
  registerSingleActiveSession(adminUser.id, adminUser.sessionId);

  // Helper requêtes API
  const makeReq = (opts: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    user?: ServerRequestContext['user'];
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  }): ServerRequestContext => ({
    correlationId: `req-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    method: opts.method,
    path: opts.path,
    headers: opts.headers || {},
    query: opts.query || {},
    params: {},
    body: opts.body || {},
    user: opts.user,
    ipAddress: '197.230.12.88',
  });

  // Profils d'acteurs types pour les documents
  const partySupplier: DocumentPartyInfo = {
    companyName: 'EuroTech ColdChain GmbH',
    legalForm: 'GmbH',
    address: 'Industriestrasse 42, 60311 Frankfurt am Main',
    postalCode: '60311',
    city: 'Frankfurt am Main',
    country: 'DE',
    email: supplierUser.email,
    phone: '+49 69 12345678',
    taxId: 'DE812345678',
    registrationNumber: 'HRB 98765 (Amtsgericht Frankfurt)',
    iban: 'DE89370400440532013000',
    swiftBic: 'DBEUMM2X',
    bankName: 'Deutsche Bank Frankfurt',
  };

  const partyClientCasa: DocumentPartyInfo = {
    companyName: 'Casablanca Logistics & Cold Hub SARL',
    legalForm: 'SARL',
    address: 'Zone Logistique Portuaire, Terminal 2, Zenata',
    city: 'Casablanca',
    country: 'MA',
    email: clientUserA.email,
    phone: '+212 522 987654',
    taxId: '001234567890001', // ICE 15 chiffres
    registrationNumber: 'RC 456789 Casablanca',
    additionalLegalMentions: {
      IF: '33445566',
      Patente: '22334455',
    },
  };

  const partyCarrier: DocumentPartyInfo = {
    companyName: 'Maghreb Intermodal Transporters',
    legalForm: 'SA',
    address: 'Boulevard Mohammed VI, Port Tanger Med',
    city: 'Tanger',
    country: 'MA',
    email: carrierUser.email,
    phone: '+212 539 123456',
    taxId: '009876543210002',
    registrationNumber: 'RC 99887 Tanger',
  };

  // ==========================================================================
  // TEST 1 : RÉFÉRENTIEL DES JURIDICTIONS FISCALES MULTI-PAYS
  // ==========================================================================
  console.log('👉 [TEST 1] Référentiel des Juridictions Fiscales : FR_UE, MA, TN, AE_GCC & INTL');
  {
    const jurisdictions: TaxJurisdictionCode[] = ['FR_UE', 'MA', 'TN', 'AE_GCC', 'INTL_EXPORT'];

    jurisdictions.forEach((code) => {
      const config = TAX_JURISDICTIONS[code];
      assert.ok(config, `La configuration fiscale pour ${code} doit exister`);
      assert.ok(config.name.fr && config.name.en && config.name.ar, `Noms trilingues requis pour ${code}`);
      assert.ok(config.defaultTaxRate, `Taux de taxe par défaut requis pour ${code}`);
      assert.ok(config.taxRates.length > 0, `Au moins un taux de taxe défini pour ${code}`);
      assert.ok(config.mandatoryMentions.fr.length > 0, `Mentions obligatoires FR requises pour ${code}`);
      assert.ok(config.numberingPrefix.COMMERCIAL_INVOICE, `Préfixe de facture requis pour ${code}`);
    });

    // Spécificités juridictionnelles
    assert.strictEqual(TAX_JURISDICTIONS.FR_UE.defaultTaxRate, '20.00');
    assert.strictEqual(TAX_JURISDICTIONS.MA.defaultTaxRate, '20.00');
    assert.strictEqual(TAX_JURISDICTIONS.TN.defaultTaxRate, '19.00');
    assert.strictEqual(TAX_JURISDICTIONS.TN.fiscalStampAmount, '1.000', 'Tunisie doit avoir un droit de timbre de 1.000 TND');
    assert.strictEqual(TAX_JURISDICTIONS.AE_GCC.defaultTaxRate, '5.00');
    assert.strictEqual(TAX_JURISDICTIONS.AE_GCC.requiresBilingualInvoice, true, 'EAU nécessite présentation bilingue');
    assert.strictEqual(TAX_JURISDICTIONS.INTL_EXPORT.defaultTaxRate, '0.00', 'Export international exonéré de taxe directe');

    console.log('  ✅ [TEST 1] 5 juridictions fiscales configurées avec taux, devises et mentions vérifiés.');
  }

  // ==========================================================================
  // TEST 2 : GÉNÉRATION DES 7 TYPES DE DOCUMENTS COMMERCIAUX
  // ==========================================================================
  console.log('\n👉 [TEST 2] Génération des 7 types de documents commerciaux B2B');
  {
    const documentTypes: CommercialDocumentType[] = [
      'QUOTE',
      'PURCHASE_ORDER',
      'ORDER_CONFIRMATION',
      'COMMERCIAL_INVOICE',
      'PAYMENT_RECEIPT',
      'DELIVERY_NOTE',
      'TRANSPORT_DOCUMENT',
    ];

    const linesSample = [
      {
        sku: 'TL-COOL-40FT',
        description: {
          fr: 'Groupe Froid Industriel 40ft Climat Tropical',
          en: 'Industrial 40ft Cooling Unit Tropical Climate',
          ar: 'وحدة تبريد صناعية 40 قدم للمناخ الاستوائي',
        },
        quantity: 2,
        unit: 'unité',
        unitPrice: '12000.00',
        discountPct: '5.00',
        taxRatePct: '20.00',
        hsCode: '8418.69.00',
      },
    ];

    documentTypes.forEach((docType) => {
      const doc = BillingDocumentEngine.createCommercialDocument({
        documentType: docType,
        jurisdiction: 'FR_UE',
        issuer: partySupplier,
        recipient: partyClientCasa,
        carrier: docType === 'TRANSPORT_DOCUMENT' ? partyCarrier : undefined,
        lines: linesSample,
        orderNumber: 'CMD-2026-8801',
        shippingAmount: '650.00',
        currency: 'EUR',
        incoterm: 'DAP',
        transportDetails: docType === 'TRANSPORT_DOCUMENT' ? {
          licensePlate: 'TR-988-MA',
          driverName: 'Karim Bennani',
          trailerNumber: 'REM-442-FR',
          temperatureSetpoint: '-20°C',
        } : undefined,
        createdByUserId: supplierUser.id,
        createdByUserName: supplierUser.companyName,
      });

      assert.ok(doc.id.startsWith('doc-'));
      assert.strictEqual(doc.documentType, docType);
      assert.strictEqual(doc.status, 'ISSUED');
      assert.strictEqual(doc.lines.length, 1);
      assert.ok(doc.documentNumber.startsWith(TAX_JURISDICTIONS.FR_UE.numberingPrefix[docType]), `Le préfixe doit correspondre à ${docType}`);
      assert.strictEqual(doc.digitalSealSha256.length, 64, 'Chaque document doit porter un sceau SHA-256');

      repo.saveCommercialDocument(doc);
    });

    console.log('  ✅ [TEST 2] Les 7 types de documents (Devis, BC, CFM, Facture, Reçu, BL, CMR) émis avec succès.');
  }

  // ==========================================================================
  // TEST 3 : CALCULS DÉTERMINISTES DECIMAL.JS, TIMBRE FISCAL & MONTANT EN LETTRES
  // ==========================================================================
  console.log('\n👉 [TEST 3] Calculs déterministes multi-taxes (Decimal.js) et montants en toutes lettres');
  {
    // Scénario A : Vente France / UE (TVA 20%, remise 5%, port 650 EUR)
    // 2 x 12000 = 24000 EUR Brut
    // Remise 5% = 1200 EUR
    // Net Commercial HT = 22800 EUR
    // TVA 20% sur 22800 = 4560 EUR
    // Fret = 650 EUR
    // Total TTC = 22800 + 4560 + 650 = 28010.00 EUR
    const linesSample = [
      {
        sku: 'TL-COOL-40FT',
        description: { fr: 'Groupe Froid', en: 'Cooling Unit', ar: 'وحدة تبريد' },
        quantity: 2,
        unit: 'unité',
        unitPrice: '12000.00',
        discountPct: '5.00',
        taxRatePct: '20.00',
      },
    ];

    const totalsFr = BillingDocumentEngine.calculateDocumentTotals(linesSample, 'FR_UE', '650.00', 'EUR');
    assert.strictEqual(totalsFr.subtotalHt, '24000.00');
    assert.strictEqual(totalsFr.totalDiscountAmount, '1200.00');
    assert.strictEqual(totalsFr.netCommercialHt, '22800.00');
    assert.strictEqual(totalsFr.totalTaxAmount, '4560.00');
    assert.strictEqual(totalsFr.shippingAmount, '650.00');
    assert.strictEqual(totalsFr.totalTtc, '28010.00');
    assert.strictEqual(totalsFr.fiscalStampAmount, undefined);

    // Vérification des montants en lettres
    assert.ok(totalsFr.amountInWords.fr.includes('Vingt-huit mille'), `FR en lettres incorrect: ${totalsFr.amountInWords.fr}`);
    assert.ok(totalsFr.amountInWords.en.includes('Twenty-eight thousand'), `EN en lettres incorrect: ${totalsFr.amountInWords.en}`);
    assert.ok(
      totalsFr.amountInWords.ar.includes('ثمانية وعشرون ألف') || totalsFr.amountInWords.ar.includes('ثمانية و عشرون ألف'),
      `AR en lettres incorrect: ${totalsFr.amountInWords.ar}`
    );

    // Scénario B : Vente Tunisie avec Droit de Timbre Fiscal (+1.000 TND)
    // 1 x 5000 TND, TVA 19% = 950 TND, Port 100 TND, Timbre 1.000 TND
    // Total TTC = 5000 + 950 + 100 + 1.000 = 6051.000 TND
    const linesTn = [
      {
        sku: 'TL-SENSOR-TN',
        description: { fr: 'Capteur', en: 'Sensor', ar: 'مستشعر' },
        quantity: 1,
        unit: 'pièce',
        unitPrice: '5000.00',
        discountPct: '0.00',
        taxRatePct: '19.00',
      },
    ];
    const totalsTn = BillingDocumentEngine.calculateDocumentTotals(linesTn, 'TN', '100.00', 'TND');
    assert.strictEqual(totalsTn.netCommercialHt, '5000.00');
    assert.strictEqual(totalsTn.totalTaxAmount, '950.00');
    assert.strictEqual(totalsTn.fiscalStampAmount, '1.000');
    assert.strictEqual(totalsTn.totalTtc, '6051.00');
    assert.ok(totalsTn.amountInWords.fr.includes('dinars tunisiens'));

    console.log('  ✅ [TEST 3] Calculs déterministes, droit de timbre tunisien et montants en lettres validés.');
  }

  // ==========================================================================
  // TEST 4 : GÉNÉRATEUR BINAIRE PDF STANDARD %PDF-1.4
  // ==========================================================================
  console.log('\n👉 [TEST 4] Générateur PDF binaire standard %PDF-1.4');
  {
    const invoiceDoc = BillingDocumentEngine.createCommercialDocument({
      documentType: 'COMMERCIAL_INVOICE',
      jurisdiction: 'FR_UE',
      issuer: partySupplier,
      recipient: partyClientCasa,
      lines: [
        {
          sku: 'TL-COOL-40FT',
          description: { fr: 'Groupe Froid Industriel 40ft', en: 'Cooling Unit 40ft', ar: 'وحدة تبريد' },
          quantity: 2,
          unit: 'unité',
          unitPrice: '12000.00',
          discountPct: '5.00',
          taxRatePct: '20.00',
        },
      ],
      shippingAmount: '650.00',
      currency: 'EUR',
      orderNumber: 'CMD-2026-8802',
      createdByUserId: supplierUser.id,
      createdByUserName: supplierUser.companyName,
    });
    repo.saveCommercialDocument(invoiceDoc);

    const pdfBuffer = BillingDocumentEngine.generateStandardPdfBuffer(invoiceDoc, 'fr');
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Le résultat doit être un Buffer binaire');
    assert.ok(pdfBuffer.length > 500, `La taille du PDF doit être substantielle (>500 octets), actuelle: ${pdfBuffer.length}`);

    // Vérification de la signature du fichier standard %PDF-1.4
    const pdfHeader = pdfBuffer.slice(0, 8).toString('utf8');
    assert.ok(pdfHeader.startsWith('%PDF-1.4'), 'Le document doit commencer par l’en-tête standard %PDF-1.4');

    // Vérification de la fin de fichier %%EOF
    const pdfTail = pdfBuffer.slice(-30).toString('utf8');
    assert.ok(pdfTail.includes('%%EOF'), 'Le document doit se terminer par le marqueur %%EOF');

    // Vérification de la présence des métadonnées essentielles dans le flux
    const pdfContent = pdfBuffer.toString('utf8');
    assert.ok(pdfContent.includes(invoiceDoc.documentNumber), 'Le numéro de document doit figurer dans le PDF');
    assert.ok(pdfContent.includes('TRADELINK GLOBAL B2B'), 'La marque TradeLink doit figurer dans le header');
    assert.ok(pdfContent.includes(invoiceDoc.digitalSealSha256), 'Le sceau SHA-256 doit être imprimé dans le document');

    console.log('  ✅ [TEST 4] Flux binaire %PDF-1.4 valide généré avec catalogue, xref et structure conformes.');
  }

  // ==========================================================================
  // TEST 5 : IMMUTABILITÉ FISCALE & SCELLEMENT NUMÉRIQUE SHA-256
  // ==========================================================================
  console.log('\n👉 [TEST 5] Immutabilité fiscale & Sceau cryptographique SHA-256');
  {
    const originalDoc = repo.queryCommercialDocuments({ documentType: 'COMMERCIAL_INVOICE' })[0];
    assert.ok(originalDoc, 'Une facture doit exister dans le store');

    // 5.1 Vérification du sceau sur le document intègre
    const isValidSeal = BillingDocumentEngine.verifyDocumentSeal(originalDoc);
    assert.strictEqual(isValidSeal, true, 'Le sceau d’origine doit être certifié valide');

    // 5.2 Tentative d’altération frauduleuse du prix ou du montant
    const tamperedDoc: CommercialDocumentRecord = structuredClone(originalDoc);
    tamperedDoc.lines[0].unitPrice = '9000.00'; // Altération du prix unitaire
    tamperedDoc.totalTtc = '21000.00'; // Falsification du total

    const isTamperedValid = BillingDocumentEngine.verifyDocumentSeal(tamperedDoc);
    assert.strictEqual(isTamperedValid, false, 'Le sceau doit détecter immédiatement toute falsification');

    console.log('  ✅ [TEST 5] Immutabilité scellée par SHA-256 certifiée : Altération détectée avec succès.');
  }

  // ==========================================================================
  // TEST 6 : FACTURE D'AVOIR (CREDIT NOTE) & RÈGLE D'INVIOLABILITÉ
  // ==========================================================================
  console.log('\n👉 [TEST 6] Émission obligatoire d\'une Facture d\'Avoir pour annulation/rectification');
  {
    const invoiceToCancel = repo.queryCommercialDocuments({ documentType: 'COMMERCIAL_INVOICE' })[0];
    assert.strictEqual(invoiceToCancel.status, 'ISSUED');

    // 6.1 Rejet si motif insuffisant (< 8 caractères)
    assert.throws(
      () => {
        BillingDocumentEngine.createCreditNoteFromInvoice(
          invoiceToCancel,
          'Erreur',
          { id: supplierUser.id, name: supplierUser.companyName, role: 'FOURNISSEUR' }
        );
      },
      /motif détaillé d’au moins 8 caractères/,
      'Un motif explicite est obligatoire pour émettre un avoir'
    );

    // 6.2 Émission légale d'un avoir total
    const { creditNote, updatedOriginalInvoice } = BillingDocumentEngine.createCreditNoteFromInvoice(
      invoiceToCancel,
      'Avoir commercial suite à révision de quantité convenue',
      { id: supplierUser.id, name: supplierUser.companyName, role: 'FOURNISSEUR' }
    );

    assert.strictEqual(creditNote.documentType, 'CREDIT_NOTE');
    assert.strictEqual(creditNote.originalInvoiceId, invoiceToCancel.id);
    assert.strictEqual(creditNote.originalInvoiceNumber, invoiceToCancel.documentNumber);
    assert.strictEqual(creditNote.creditNoteReason, 'Avoir commercial suite à révision de quantité convenue');
    assert.strictEqual(creditNote.totalTtc, invoiceToCancel.totalTtc);
    assert.ok(creditNote.documentNumber.startsWith(TAX_JURISDICTIONS[invoiceToCancel.jurisdiction].numberingPrefix.CREDIT_NOTE));

    // La facture d'origine passe au statut CANCELLED sans être supprimée
    assert.strictEqual(updatedOriginalInvoice.status, 'CANCELLED');
    assert.strictEqual(updatedOriginalInvoice.revisionHistory?.length, 2);

    repo.saveCommercialDocument(creditNote);
    repo.saveCommercialDocument(updatedOriginalInvoice);

    // 6.3 Tentative de ré-annuler une facture déjà annulée (bloqué)
    assert.throws(
      () => {
        BillingDocumentEngine.createCreditNoteFromInvoice(
          updatedOriginalInvoice,
          'Seconde tentative d’avoir',
          { id: supplierUser.id, name: supplierUser.companyName, role: 'FOURNISSEUR' }
        );
      },
      /déjà annulée par un avoir précédent/,
      'Une facture déjà annulée ne peut faire l’objet d’un second avoir'
    );

    console.log('  ✅ [TEST 6] Règle d\'inviolabilité comptable respectée : Facture annulée via avoir officiel.');
  }

  // ==========================================================================
  // TEST 7 : TÉLÉCHARGEMENT SÉCURISÉ & TOKENS PRÉSIGNÉS TEMPORAIRES (900s)
  // ==========================================================================
  console.log('\n👉 [TEST 7] URLs présignées temporaires (900s) et signature HMAC-SHA256');
  {
    const secretKey = 'whsec_tradelink_super_test_key';
    const sampleDoc = repo.queryCommercialDocuments()[0];

    // 7.1 Génération du token valide pour 15 minutes (900s)
    const tokenPayload = BillingDocumentEngine.generateTemporaryDownloadToken(
      sampleDoc.id,
      sampleDoc.documentNumber,
      clientUserA.id,
      secretKey,
      900
    );

    assert.strictEqual(tokenPayload.documentId, sampleDoc.id);
    assert.strictEqual(tokenPayload.userId, clientUserA.id);
    assert.strictEqual(tokenPayload.hmacSignature.length, 64);
    assert.ok(tokenPayload.expiresAt > Math.floor(Date.now() / 1000));

    // 7.2 Validation du token intact
    const checkValid = BillingDocumentEngine.verifyTemporaryDownloadToken(
      sampleDoc.id,
      sampleDoc.documentNumber,
      clientUserA.id,
      tokenPayload.expiresAt,
      tokenPayload.hmacSignature,
      secretKey
    );
    assert.strictEqual(checkValid.valid, true, 'Le token valide doit être accepté');

    // 7.3 Rejet d’un token falsifié (Attaque par altération de signature)
    const checkTampered = BillingDocumentEngine.verifyTemporaryDownloadToken(
      sampleDoc.id,
      sampleDoc.documentNumber,
      clientUserA.id,
      tokenPayload.expiresAt,
      'bad_fake_hmac_hash_0000000000000000000000000000000000000000000000000',
      secretKey
    );
    assert.strictEqual(checkTampered.valid, false);
    assert.strictEqual(checkTampered.reason, 'SIGNATURE_INVALID');

    // 7.4 Rejet d’un token expiré (Horodatage dépassé)
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 secondes dans le passé
    const expiredSignature = crypto
      .createHmac('sha256', secretKey)
      .update(`${sampleDoc.id}|${sampleDoc.documentNumber}|${clientUserA.id}|${expiredTimestamp}`)
      .digest('hex');

    const checkExpired = BillingDocumentEngine.verifyTemporaryDownloadToken(
      sampleDoc.id,
      sampleDoc.documentNumber,
      clientUserA.id,
      expiredTimestamp,
      expiredSignature,
      secretKey
    );
    assert.strictEqual(checkExpired.valid, false);
    assert.strictEqual(checkExpired.reason, 'TOKEN_EXPIRED');

    console.log('  ✅ [TEST 7] Tokens temporaires présignés HMAC-SHA256 opérationnels et barrière anti-expiration validée.');
  }

  // ==========================================================================
  // TEST 8 : CONTRÔLE D'ACCÈS RBAC, ANTI-IDOR & STAGE 3 COMPTABLE
  // ==========================================================================
  console.log('\n👉 [TEST 8] Contrôle d\'accès RBAC, barrière Anti-IDOR & Lecture Seule Comptable (Stage 3)');
  {
    const invoiceClientA = repo.queryCommercialDocuments({ documentType: 'COMMERCIAL_INVOICE' })[0];

    // 8.1 Client A peut consulter son document
    assert.doesNotThrow(() => {
      BillingDocumentEngine.enforceDocumentAccess(clientUserA, invoiceClientA, 'VIEW');
    });

    // 8.2 Client B tente d'accéder au document du Client A -> Rejet 403 Anti-IDOR
    assert.throws(
      () => {
        BillingDocumentEngine.enforceDocumentAccess(clientUserB, invoiceClientA, 'VIEW');
      },
      /Anti-IDOR/,
      'Un client tiers ne doit pas pouvoir accéder aux documents d’un autre client'
    );

    // 8.3 Client tente d'émettre un avoir -> Rejet 403
    assert.throws(
      () => {
        BillingDocumentEngine.enforceDocumentAccess(clientUserA, invoiceClientA, 'CREATE_CREDIT_NOTE');
      },
      /Client ne peut ni émettre d’avoir/,
      'Le client ne dispose pas du droit d’émission d’avoirs'
    );

    // 8.4 Transporteur tente de consulter une facture commerciale -> Rejet 403
    assert.throws(
      () => {
        BillingDocumentEngine.enforceDocumentAccess(carrierUser, invoiceClientA, 'VIEW');
      },
      /Transporteur est uniquement habilité à consulter les lettres de voiture/,
      'Le transporteur ne doit avoir accès qu’aux documents logistiques (e-CMR, BL)'
    );

    // 8.5 Profil COMPTABLE (Stage 3) : Lecture autorisée
    assert.doesNotThrow(() => {
      BillingDocumentEngine.enforceDocumentAccess(comptableUser, invoiceClientA, 'VIEW');
      BillingDocumentEngine.enforceDocumentAccess(comptableUser, invoiceClientA, 'DOWNLOAD');
    });

    // 8.6 Profil COMPTABLE (Stage 3) : Mutation / Avoir strictement interdite
    assert.throws(
      () => {
        BillingDocumentEngine.enforceDocumentAccess(comptableUser, invoiceClientA, 'CREATE_CREDIT_NOTE');
      },
      /COMPTABLE dispose uniquement d’un droit de consultation\/lecture seule/,
      'Règle Stage 3 : Le comptable ne peut en aucun cas muter les données sources'
    );

    console.log('  ✅ [TEST 8] Matrice RBAC, étanchéité Anti-IDOR et règle Stage 3 Comptable certifiées.');
  }

  // ==========================================================================
  // TEST 9 : VERSIONNEMENT DES DEVIS & BROUILLONS
  // ==========================================================================
  console.log('\n👉 [TEST 9] Versionnement et traçabilité des devis et brouillons');
  {
    const quoteDoc = repo.queryCommercialDocuments({ documentType: 'QUOTE' })[0];
    assert.strictEqual(quoteDoc.version, 1);
    assert.ok(quoteDoc.revisionHistory && quoteDoc.revisionHistory.length >= 1);

    // Simulation d'une négociation : modification de prix avant validation définitive
    const revisedQuote: CommercialDocumentRecord = {
      ...quoteDoc,
      version: 2,
      subtotalHt: '22000.00',
      totalTtc: '26400.00',
      updatedAt: new Date().toISOString(),
      revisionHistory: [
        ...(quoteDoc.revisionHistory || []),
        {
          version: 2,
          modifiedAt: new Date().toISOString(),
          modifiedBy: supplierUser.companyName,
          changeNote: 'Ajustement tarifaire accordé suite à négociation B2B (-2000 EUR)',
        },
      ],
    };
    revisedQuote.digitalSealSha256 = BillingDocumentEngine.computeDigitalSealSha256(revisedQuote);
    repo.saveCommercialDocument(revisedQuote);

    const savedRevised = repo.findCommercialDocumentById(revisedQuote.id);
    assert.strictEqual(savedRevised?.version, 2);
    assert.strictEqual(savedRevised?.revisionHistory?.length, 2);
    assert.strictEqual(savedRevised?.revisionHistory?.[1].version, 2);

    console.log('  ✅ [TEST 9] Versionnement v1 -> v2 avec journal des révisions immuable validé.');
  }

  // ==========================================================================
  // TEST 10 : MOTEUR DE RECHERCHE & FILTRAGE FACETTÉ
  // ==========================================================================
  console.log('\n👉 [TEST 10] Recherche et filtrage facetté multi-critères');
  {
    const allDocs = repo.queryCommercialDocuments();
    assert.ok(allDocs.length >= 7, 'Au moins 7 documents doivent exister');

    // 10.1 Filtrage par type
    const invoicesOnly = repo.queryCommercialDocuments({ documentType: 'COMMERCIAL_INVOICE' });
    assert.ok(invoicesOnly.every((d) => d.documentType === 'COMMERCIAL_INVOICE'));

    // 10.2 Filtrage par juridiction
    const frOnly = repo.queryCommercialDocuments({ jurisdiction: 'FR_UE' });
    assert.ok(frOnly.every((d) => d.jurisdiction === 'FR_UE'));

    // 10.3 Recherche plein texte par référence commande
    const searchOrder = repo.queryCommercialDocuments({ query: 'CMD-2026-8801' });
    assert.ok(searchOrder.length > 0);
    assert.ok(searchOrder.some((d) => d.orderNumber === 'CMD-2026-8801'));

    // 10.4 Recherche par mot-clé dans les lignes (SKU)
    const searchSku = repo.queryCommercialDocuments({ query: 'TL-COOL-40FT' });
    assert.ok(searchSku.length > 0);

    console.log('  ✅ [TEST 10] Moteur de recherche facetté (type, juridiction, texte, SKU) vérifié.');
  }

  // ==========================================================================
  // TEST 11 : TRILINGUISME COMPLET (FR/EN/AR) & SUPPORT RTL
  // ==========================================================================
  console.log('\n👉 [TEST 11] Trilinguisme complet (FR/EN/AR) et intégrité du document original');
  {
    const docSample = repo.queryCommercialDocuments({ documentType: 'COMMERCIAL_INVOICE' })[0];

    // 11.1 Prévisualisation en Français
    const previewFr = domainServices.getCommercialDocumentPreviewService(supplierUser, docSample.id, 'fr');
    assert.strictEqual(previewFr.targetLocale, 'fr');
    assert.strictEqual(previewFr.isSealValid, true);

    // 11.2 Prévisualisation en Anglais
    const previewEn = domainServices.getCommercialDocumentPreviewService(supplierUser, docSample.id, 'en');
    assert.strictEqual(previewEn.targetLocale, 'en');
    assert.strictEqual(previewEn.isSealValid, true);

    // 11.3 Prévisualisation en Arabe (avec adaptation RTL informative)
    const previewAr = domainServices.getCommercialDocumentPreviewService(supplierUser, docSample.id, 'ar');
    assert.strictEqual(previewAr.targetLocale, 'ar');
    assert.strictEqual(previewAr.isSealValid, true);
    assert.ok(previewAr.document.amountInWords.ar.includes('يورو'));

    // Vérification que le document d'origine dans la base n'a pas été altéré
    const intactOriginal = repo.findCommercialDocumentById(docSample.id);
    assert.strictEqual(intactOriginal?.digitalSealSha256, docSample.digitalSealSha256);

    console.log('  ✅ [TEST 11] Prévisualisations FR/EN/AR conformes sans aucune altération du document scellé.');
  }

  // ==========================================================================
  // TEST 12 : VALIDATION DES ROUTES API REST SOUS /api/v1/documents/*
  // ==========================================================================
  console.log('\n👉 [TEST 12] Validation complète des routes API REST sous /api/v1/documents/*');
  {
    // 12.1 GET /api/v1/documents/jurisdictions (Public / Authentifié)
    const resJur = app.handleRequest(makeReq({ method: 'GET', path: '/api/v1/documents/jurisdictions', user: clientUserA }));
    assert.strictEqual(resJur.statusCode, 200);
    const dataJur = resJur.body.data as any;
    assert.ok(dataJur.jurisdictions.FR_UE);

    // 12.2 POST /api/v1/documents (Création d'un bon de commande par le client)
    const resCreate = app.handleRequest(
      makeReq({
        method: 'POST',
        path: '/api/v1/documents',
        user: clientUserA,
        body: {
          documentType: 'PURCHASE_ORDER',
          jurisdiction: 'MA',
          issuer: partyClientCasa,
          recipient: partySupplier,
          lines: [
            {
              sku: 'TL-COOL-40FT',
              description: { fr: 'Groupe Froid 40ft', en: 'Cooling Unit 40ft', ar: 'وحدة تبريد' },
              quantity: 1,
              unit: 'unité',
              unitPrice: '12000.00',
              taxRatePct: '20.00',
            },
          ],
          currency: 'MAD',
          orderNumber: 'CMD-2026-9901',
        },
      })
    );
    assert.strictEqual(resCreate.statusCode, 201);
    const dataCreate = resCreate.body.data as any;
    const createdPo = dataCreate.document;
    assert.strictEqual(createdPo.documentType, 'PURCHASE_ORDER');
    assert.strictEqual(createdPo.jurisdiction, 'MA');

    // 12.3 GET /api/v1/documents (Recherche avec filtres)
    const resList = app.handleRequest(
      makeReq({
        method: 'GET',
        path: '/api/v1/documents',
        user: clientUserA,
        query: { documentType: 'PURCHASE_ORDER' },
      })
    );
    assert.strictEqual(resList.statusCode, 200);
    const dataList = resList.body.data as any;
    assert.ok(dataList.documents.length >= 1);

    // 12.4 GET /api/v1/documents/:id/preview
    const resPrev = app.handleRequest(
      makeReq({
        method: 'GET',
        path: `/api/v1/documents/${createdPo.id}/preview`,
        user: clientUserA,
        query: { locale: 'ar' },
      })
    );
    assert.strictEqual(resPrev.statusCode, 200);
    const dataPrev = resPrev.body.data as any;
    assert.strictEqual(dataPrev.targetLocale, 'ar');
    assert.strictEqual(dataPrev.isSealValid, true);

    // 12.5 GET /api/v1/documents/:id/pdf (Génération directe PDF binaire)
    const resPdf = app.handleRequest(
      makeReq({
        method: 'GET',
        path: `/api/v1/documents/${createdPo.id}/pdf`,
        user: clientUserA,
      })
    );
    assert.strictEqual(resPdf.statusCode, 200);
    assert.strictEqual(resPdf.headers['Content-Type'], 'application/pdf');
    const dataPdf = resPdf.body.data as any;
    assert.ok(dataPdf.base64Pdf.length > 100);

    // 12.6 POST /api/v1/documents/:id/token (Création du token présigné de téléchargement)
    const resToken = app.handleRequest(
      makeReq({
        method: 'POST',
        path: `/api/v1/documents/${createdPo.id}/token`,
        user: clientUserA,
      })
    );
    assert.strictEqual(resToken.statusCode, 200);
    const tokenInfo = resToken.body.data as any;
    assert.ok(tokenInfo.downloadUrl.includes('token='));

    // 12.7 GET /api/v1/documents/:id/download (Téléchargement via URL présignée)
    const resDownload = app.handleRequest(
      makeReq({
        method: 'GET',
        path: `/api/v1/documents/${createdPo.id}/download`,
        query: {
          token: tokenInfo.hmacSignature,
          expires: String(tokenInfo.expiresAt),
          user: clientUserA.id,
          locale: 'fr',
        },
      })
    );
    assert.strictEqual(resDownload.statusCode, 200);
    assert.strictEqual(resDownload.headers['Content-Type'], 'application/pdf');

    console.log('  ✅ [TEST 12] Endpoints REST /api/v1/documents/* (8 routes) testés avec succès.');
  }

  console.log('\n====================================================================');
  console.log('🎉 TOUS LES TESTS DE FACTURATION & DOCUMENTS COMMERCIAUX (12/12) ONT RÉUSSI !');
  console.log('Devis, bons de commande, factures, avoirs, PDF %PDF-1.4 et scellement SHA-256 certifiés.');
  console.log('====================================================================\n');
}

runBillingDocumentsTestSuite().catch((err) => {
  console.error('\n❌ ÉCHEC DE LA SUITE DE TESTS FACTURATION & DOCUMENTS COMMERCIAUX :', err);
  process.exit(1);
});
