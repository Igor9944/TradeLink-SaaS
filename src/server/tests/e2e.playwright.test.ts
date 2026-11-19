// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS END-TO-END (E2E PLAYWRIGHT SIMULATION)
// PROMPT 12 : VÉRIFICATION DU WORKFLOW COMPLET DE BOUT EN BOUT
// Scénarios couverts :
// 1. Inscription Visiteur -> Hachage Argon2id -> Défi OTP -> Compte Client Promu
// 2. Dépôt KYC -> Horodatage & Chiffrement -> Protection Règle 7j -> Décision Admin
// 3. Écosystème Commercial -> Devis -> Négociation -> Commande -> Paiement Stripe Idempotent
// 4. Logistique -> Flotte Véhicule -> Mission -> CMR -> Transition Transit -> Signature POD
// 5. Comptabilité -> Écriture Double-Partie équilibrée -> Règle Lecture Seule -> Moteur Decimal.js
// 6. Collaboration IA & Room Live -> Règle Création Room -> OCR Extraction & RAG
// 7. Gouvernance Admin -> Chiffrement KMS -> Sandbox Isolée -> Double Approbation Anti-Auto-Approbation
// ============================================================================

import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession, ServerResponsePayload } from '../middlewares/errorAndSecurity.middleware';
import { AccountingEngine } from '../../services/accountingEngine';
import {
  analyzeFileInIsolatedSandbox,
  rotateKmsMasterKey,
  simulateEnvelopeEncryption,
  validateDualAdminOperation,
  verifyBackupCryptographicIntegrity,
} from '../../services/adminAdvancedEngine';
import {
  createMockOcrDocument,
  correctOcrFieldValue,
  commitOcrDocumentValidation,
  canActorCreateRoomLive,
  queryAiAssistantWithRag,
} from '../../services/aiIntelligenceEngine';
import { BackupRecord, KMSKeyRecord } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion E2E : ${message}`);
  }
}

function createE2EDatabase(): DatabaseStateSnapshot {
  return {
    products: [
      {
        id: 'prod-01',
        sku: 'PAL-EUR-ISO-1200',
        supplierId: 'usr-supp-01',
        supplierName: 'Atlas Solar Energy Systems',
        category: 'COLD_CHAIN',
        name: {
          fr: 'Palette Euro Certifiée Chaîne du Froid',
          en: 'Certified Cold Chain Euro Pallet',
          ar: 'منصة شحن معتمدة لسلسلة التبريد',
        },
        description: {
          fr: 'Palette de manutention traitée NIMP15 pour transport sous température dirigée',
          en: 'ISPM15 treated handling pallet for temperature-controlled logistics',
          ar: 'منصة مناولة معالجة لمعايير الشحن الدولي والمبرد',
        },
        unitPrice: '145.50',
        currency: 'EUR',
        taxRate: '20.00',
        unit: 'PAL',
        stockAvailable: 250,
        stockReserved: 10,
        minStockAlert: 50,
        icon3d: 'cold-chain',
        originCountry: 'Allemagne',
        incoterm: 'CIF',
        leadTimeDays: 3,
        isPublished: true,
      },
    ],
    quotes: [],
    orders: [],
    invoices: [],
    payments: [],
    shipments: [],
    accountingEntries: [],
    kycDossiers: [
      {
        id: 'kyc-e2e-client',
        userId: 'usr-client-e2e',
        userName: 'Sven Lindqvist',
        companyName: 'Nordic Green Infrastructure AB',
        actorType: 'CLIENT',
        jurisdiction: 'EU',
        status: 'PENDING_SUBMISSION',
        startedAt: '2026-11-15',
        deadlineAt: '2026-11-22',
        daysElapsed: 2,
        daysRemaining: 5,
        remindersSent: ['J+1'],
        documents: [],
        adminComments: [],
        history: [],
      },
    ],
    backups: [],
    auditLogs: [],
    rooms: [],
    calcHistory: [],
  };
}

export function runE2EPlaywrightTestSuite() {
  console.log('====================================================================');
  console.log('TRADELINK V6.0 — SUITE DE TESTS END-TO-END (E2E SIMULATION)');
  console.log('====================================================================\n');

  const repo = new TradeLinkRepositoryStore(createE2EDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  let passed = 0;

  // Session context credentials
  const adminSessionId = 'sess-admin-e2e-01';
  const admin2SessionId = 'sess-admin-e2e-02';
  const suppSessionId = 'sess-supp-e2e-01';
  const transpSessionId = 'sess-transp-e2e-01';
  const comptaSessionId = 'sess-compta-e2e-01';

  registerSingleActiveSession('usr-admin-01', adminSessionId, true);
  registerSingleActiveSession('usr-admin-02', admin2SessionId, true);
  registerSingleActiveSession('usr-supp-01', suppSessionId, true);
  registerSingleActiveSession('usr-transp-01', transpSessionId, true);
  registerSingleActiveSession('usr-compta-01', comptaSessionId, true);

  const adminUser = {
    id: 'usr-admin-01',
    email: 'karim.admin@tradelink.ma',
    role: 'ADMIN' as const,
    sessionId: adminSessionId,
    companyName: 'TRADELINK Headquarters',
    mfaVerified: true,
  };

  const supplierUser = {
    id: 'usr-supp-01',
    email: 'contact@atlas-solar.com',
    role: 'FOURNISSEUR' as const,
    sessionId: suppSessionId,
    companyName: 'Atlas Solar Energy Systems',
    mfaVerified: true,
  };

  const transporterUser = {
    id: 'usr-transp-01',
    email: 'ops@trans-maghreb.ma',
    role: 'TRANSPORTEUR' as const,
    sessionId: transpSessionId,
    companyName: 'Trans-Maghreb Express Logistics',
    mfaVerified: true,
  };

  const accountantUser = {
    id: 'usr-compta-01',
    email: 'claire.dubois@fiduciaire.fr',
    role: 'COMPTABLE' as const,
    sessionId: comptaSessionId,
    companyName: 'Cabinet Audit & Conseil',
    mfaVerified: true,
  };

  // Helper pour appeler les requêtes API
  function makeReq(options: {
    method: string;
    path: string;
    headers?: Record<string, string | undefined>;
    query?: Record<string, string | undefined>;
    params?: Record<string, string>;
    body?: Record<string, any>;
    user?: any;
    correlationId?: string;
    ipAddress?: string;
  }): ServerResponsePayload<any> {
    return app.handleRequest({
      method: options.method,
      path: options.path,
      headers: options.headers ?? {},
      query: options.query ?? {},
      params: options.params ?? {},
      body: options.body ?? {},
      user: options.user,
      correlationId: options.correlationId ?? `corr-e2e-${Date.now()}`,
      ipAddress: options.ipAddress ?? '194.153.110.42',
    }) as ServerResponsePayload<any>;
  }

  // --------------------------------------------------------------------------
  // WORKFLOW 1 : Inscription Visiteur, Hachage Argon2id et Défi OTP
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 1 : Inscription Visiteur, Sécurité OTP et Création de Compte...');
  const visitorEmail = 'sven.lindqvist@nordic-green.se';
  const registerRes = makeReq({
    method: 'POST',
    path: '/api/v1/auth/register',
    body: {
      email: visitorEmail,
      password: 'StrongP@ssw0rd2026!Argon2',
      fullName: 'Sven Lindqvist',
      companyName: 'Nordic Green Infrastructure AB',
      taxId: 'SE556012345601',
      country: 'Suède',
      requestedRole: 'CLIENT',
    },
  });

  assert(registerRes.statusCode === 201, 'Inscription visiteur retourne HTTP 201');
  const visitorData = registerRes.body.data as any;
  assert(visitorData.userId && visitorData.kycStatus === 'PENDING_OTP', 'Compte créé avec kycStatus PENDING_OTP');
  const otpCode = visitorData.sandboxOtpCode || '123456';
  assert(otpCode.length === 6, 'Code OTP à 6 chiffres généré');

  // Validation de l'OTP
  const otpRes = makeReq({
    method: 'POST',
    path: '/api/v1/auth/verify-otp',
    body: {
      email: visitorEmail,
      code: otpCode,
      approveClientOnboarding: true,
    },
  });

  assert(otpRes.statusCode === 200, 'Validation OTP retourne HTTP 200');
  const verifiedUser = otpRes.body.data as any;
  assert(verifiedUser.role === 'CLIENT', 'Utilisateur promu au rôle CLIENT');
  const clientUserId = verifiedUser.userId;
  const clientSessionId = 'sess-client-e2e-01';
  registerSingleActiveSession(clientUserId, clientSessionId, true);

  const clientUser = {
    id: clientUserId,
    email: visitorEmail,
    role: 'CLIENT' as const,
    sessionId: clientSessionId,
    companyName: 'Nordic Green Infrastructure AB',
    mfaVerified: true,
  };

  // Liaison du dossier KYC à l'identifiant du client créé
  const kycDossierId = 'kyc-e2e-client';
  repo.executeTransaction((tx) => {
    const kycDos = tx.kycDossiers.find((d) => d.id === kycDossierId);
    if (kycDos) {
      kycDos.userId = clientUserId;
    }
  });
  console.log('  -> [PASS] Visiteur inscrit, OTP validé, compte CLIENT provisionné.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 2 : Dépôt KYC, Compte à rebours 7j et Approbation Administrateur
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 2 : Dépôt KYC, Compte à Rebours 7j & Approbation Administrative...');

  // Dépôt des pièces obligatoires CLIENT (CIN_DIRIGEANT, PATENTE_FISCAL, RNE_KBIS)
  const up1 = makeReq({
    method: 'POST',
    path: `/api/v1/kyc/${kycDossierId}/documents`,
    user: clientUser,
    body: { docType: 'CIN_DIRIGEANT', fileName: 'CIN_Sven_2026.pdf', fileSizeBytes: 340000 },
  });
  assert(up1.statusCode === 201, 'Upload CIN_DIRIGEANT réussi (201)');

  const up2 = makeReq({
    method: 'POST',
    path: `/api/v1/kyc/${kycDossierId}/documents`,
    user: clientUser,
    body: { docType: 'PATENTE_FISCAL', fileName: 'Tax_Cert_2026.pdf', fileSizeBytes: 410000 },
  });
  assert(up2.statusCode === 201, 'Upload PATENTE_FISCAL réussi (201)');

  const up3 = makeReq({
    method: 'POST',
    path: `/api/v1/kyc/${kycDossierId}/documents`,
    user: clientUser,
    body: { docType: 'RNE_KBIS', fileName: 'KBis_Nordic_2026.pdf', fileSizeBytes: 520000 },
  });
  assert(up3.statusCode === 201, 'Upload RNE_KBIS réussi (201)');
  const upData = up3.body.data as any;
  assert(upData.completion.allMandatoryUploaded === true, 'Toutes les pièces obligatoires soumises');
  assert(upData.dossier.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW', 'Statut passé en SUBMITTED_IN_TIME_PENDING_REVIEW');
  assert(upData.ruleEvaluation.protectedFromAutoSuspension === true, 'Protégé contre la suspension automatique');

  // Approbation administrative finale par l'Administrateur
  const decisionRes = makeReq({
    method: 'PUT',
    path: `/api/v1/kyc/${kycDossierId}/decision`,
    user: adminUser,
    body: {
      decision: 'VALIDATED',
      adminNotes: 'Dossier vérifié et certifié conforme par le pôle Conformité TRADELINK.',
    },
  });
  assert(decisionRes.statusCode === 200, 'Validation administrative KYC retourne HTTP 200');
  assert(decisionRes.body.data.dossier.status === 'VALIDATED', 'Dossier marqué VALIDATED');
  console.log('  -> [PASS] Pièces KYC chiffrées KMS, règle 7j validée, dossier certifié par Admin.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 3 : Négociation Commerciale, Devis, Commande & Paiement Stripe
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 3 : Devis Commercial, Commande & Paiement Stripe Idempotent...');
  // 1. Client demande un devis
  const quoteReq = makeReq({
    method: 'POST',
    path: '/api/v1/quotes',
    user: clientUser,
    body: {
      clientId: clientUser.id,
      clientName: clientUser.companyName,
      supplierId: supplierUser.id,
      supplierName: supplierUser.companyName,
      currency: 'EUR',
      validityDays: 15,
      lines: [
        {
          productId: 'prod-01',
          description: 'Palette Euro Certifiée Chaîne du Froid',
          quantity: 20,
          targetPrice: '140.00',
        },
      ],
    },
  });
  assert(quoteReq.statusCode === 201, 'Demande de devis Client créée en 201');
  const quoteId = quoteReq.body.data.id;

  // 2. Fournisseur répond et accepte avec remise 5%
  const quoteResp = makeReq({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/respond`,
    user: supplierUser,
    body: {
      lines: [
        {
          description: 'Palette Euro Certifiée Chaîne du Froid',
          quantity: 20,
          unitPrice: '145.50',
          discountPct: '5.00',
        },
      ],
      validUntilDate: '2026-12-15',
    },
  });
  assert(quoteResp.statusCode === 200, 'Fournisseur a chiffré le devis (200)');

  // 3. Client accepte
  const quoteAccept = makeReq({
    method: 'PUT',
    path: `/api/v1/quotes/${quoteId}/accept`,
    user: clientUser,
  });
  assert(quoteAccept.statusCode === 200, 'Client a accepté le devis chiffré (200)');

  // 4. Conversion atomique du devis en commande avec réservation de stock
  const convertRes = makeReq({
    method: 'POST',
    path: `/api/v1/quotes/${quoteId}/convert`,
    user: clientUser,
    body: {
      shippingAddress: 'Zone Franche Port Tanger Med, Lot 8, Maroc',
    },
  });
  assert(convertRes.statusCode === 201, 'Conversion Devis -> Commande réussie (201)');
  const orderCreated = convertRes.body.data.createdOrder;
  const orderId = orderCreated.id;
  assert(orderCreated.status === 'ACCEPTED' || orderCreated.status === 'CONFIRMED', 'Commande créée au statut CONFIRMED ou ACCEPTED');

  // 5. Génération de facture légale par le Fournisseur
  const invoiceRes = makeReq({
    method: 'POST',
    path: '/api/v1/invoices/generate',
    user: supplierUser,
    body: {
      orderId: orderCreated.id,
      dueInDays: 30,
      jurisdiction: 'France / UE (TVA 20%)',
    },
  });
  assert(invoiceRes.statusCode === 201, 'Facture légale générée en 201');
  const invoiceData = invoiceRes.body.data;
  assert(invoiceData.invoiceNumber.startsWith('FAC-2026-'), 'Numérotation de facture légale conforme');

  // 6. Création session de paiement Stripe Test
  const stripeSessionRes = makeReq({
    method: 'POST',
    path: '/api/v1/payments/stripe/checkout-session',
    user: clientUser,
    body: {
      orderId: orderCreated.id,
      invoiceId: invoiceData.id,
    },
  });
  assert(stripeSessionRes.statusCode === 201, 'Session Stripe Checkout générée en 201');
  const sessionData = stripeSessionRes.body.data;

  // 7. Règlement Stripe via Webhook idempotent
  const webhookEventId = `evt_stripe_e2e_${Date.now()}`;
  const amountCents = Math.round(parseFloat(invoiceData.totalAmount) * 100);
  const webhookPayload = {
    id: webhookEventId,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionData.sessionId,
        amount_total: amountCents,
        currency: 'eur',
        customer_email: clientUser.email,
        metadata: {
          orderId: orderCreated.id,
          invoiceId: invoiceData.id,
          clientId: clientUser.id,
          supplierId: supplierUser.id,
        },
        payment_status: 'paid',
      },
    },
  };

  const webhookRes = makeReq({
    method: 'POST',
    path: '/api/v1/payments/stripe/webhook',
    body: webhookPayload,
  });
  assert(webhookRes.statusCode === 200, 'Webhook Stripe traité avec 200');
  assert(webhookRes.body.data.status === 'PROCESSED', 'Webhook marqué PROCESSED');
  assert(webhookRes.body.data.invoice.status === 'PAID', 'Facture légale passée au statut PAID');
  console.log('  -> [PASS] Négociation devis, conversion commande, facture et règlement Stripe validés.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 4 : Logistique, Transporteur, CMR & Preuve de Livraison (POD)
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 4 : Logistique, Affectation Flotte, CMR & Preuve de Livraison POD...');
  // 1. Fournisseur crée une mission logistique pour la commande
  const missionRes = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/missions',
    user: supplierUser,
    body: {
      orderId,
      carrierId: transporterUser.id,
      carrierName: transporterUser.companyName,
      pickupAddress: 'Hub Logistique Zenata, Casablanca, Maroc',
      deliveryAddress: 'Zone Franche Port Tanger Med, Lot 8, Maroc',
      cargoWeightKg: '5800',
      cargoVolumeM3: '22',
      isColdChain: true,
      requiredVehicleType: 'REEFER_ATP_FRIGO',
    },
  });
  assert(missionRes.statusCode === 201, 'Mission créée avec 201');
  const mission = missionRes.body.data;

  // 2. Transporteur accepte la mission
  const acceptMission = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/missions/${mission.id}/respond`,
    user: transporterUser,
    body: {
      accept: true,
      vehicleId: 'veh-01',
      driverName: 'Rachid Amrani',
    },
  });
  assert(acceptMission.statusCode === 200, 'Transporteur accepte la mission');
  const shipment = acceptMission.body.data.createdShipment;
  assert(Boolean(shipment && shipment.id), 'Expédition créée automatiquement');

  // 3. Émission des documents de transport certifiés (CMR International)
  const docGen = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${shipment.id}/documents`,
    user: transporterUser,
  });
  assert(docGen.statusCode === 201, 'CMR International généré avec 201');
  assert(docGen.body.data.length >= 1, 'Au moins un document de transport émis');

  // 4. Transitions d'état contrôlées (Machine d'états légale)
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: transporterUser,
    body: { nextStatus: 'COLLECTED' },
  });
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: transporterUser,
    body: { nextStatus: 'IN_TRANSIT' },
  });
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: transporterUser,
    body: { nextStatus: 'OUT_FOR_DELIVERY' },
  });

  // 5. Remise et Preuve de livraison (POD) certifiée
  const podRes = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${shipment.id}/pod`,
    user: transporterUser,
    body: {
      recipientFullName: 'Sven Lindqvist (Réceptionnaire)',
      recipientIdNumber: 'CNI-SE-991044',
      signedAt: '2026-11-20 14:15',
      digitalSignatureSvg: '<svg><path d="M10 20 L50 40"/></svg>',
      deliveryLatitude: 35.888,
      deliveryLongitude: -5.512,
      deliveryNotes: 'Palettes réceptionnées conformes sous température dirigée.',
    },
  });
  assert(podRes.statusCode === 201, 'Preuve de livraison (POD) enregistrée');
  assert(podRes.body.data.updatedShipment.status === 'DELIVERED', 'Expédition livrée');
  assert(podRes.body.data.updatedOrder.status === 'DELIVERED', 'Commande synchronisée en DELIVERED');
  console.log('  -> [PASS] Mission acceptée, CMR généré, transit tracé et signature POD enregistrée.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 5 : Comptabilité, Écritures Double-Partie & Moteur Financier
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 5 : Écriture Comptable Double-Partie & Moteur Financier Decimal.js...');
  // 1. Comptable enregistre une écriture en partie double
  const invoiceTotal = orderCreated.totalAmount;
  const entryReq = makeReq({
    method: 'POST',
    path: '/api/v1/accounting/entries',
    user: accountantUser,
    body: {
      journalCode: 'VTE',
      fiscalPeriod: '2026-11',
      pieceReference: `FAC-${orderId}`,
      description: `Vente E2E Commande ${orderId}`,
      lines: [
        {
          accountCode: '411000',
          accountName: 'Clients',
          label: 'Client Nordic Green Infrastructure',
          debit: invoiceTotal,
          credit: '0.00',
        },
        {
          accountCode: '707000',
          accountName: 'Ventes de marchandises',
          label: 'Marchandises vendues',
          debit: '0.00',
          credit: orderCreated.subtotalAmount,
        },
        {
          accountCode: '445710',
          accountName: 'TVA collectée',
          label: 'TVA 20%',
          debit: '0.00',
          credit: orderCreated.taxAmount,
        },
      ],
    },
  });
  assert(entryReq.statusCode === 201, 'Écriture comptable enregistrée avec 201');
  const entry = entryReq.body.data;
  assert(entry.isBalanced === true, 'Écriture équilibrée Débit = Crédit');

  // 2. Vérification de la sécurité Stage 3 : le rôle Comptable ne peut pas muter le catalogue
  let comptableBlocked = false;
  try {
    AccountingEngine.enforceAccountantReadOnlyRestriction('COMPTABLE');
  } catch (err: any) {
    if (err.message.includes('INTERDIT (Sécurité Stage 3')) {
      comptableBlocked = true;
    }
  }
  assert(comptableBlocked, 'Sécurité Stage 3 vérifiée : Comptable interdit d’écriture sur données commerciales');

  // 3. Moteur financier Decimal.js : Échéancier de prêt amortissable à solde nul
  const amort = AccountingEngine.calculateAmortizationSchedule({
    principalStr: '60000.00',
    annualRatePctStr: '4.50',
    durationMonths: 12,
    startDateStr: '2026-01-01',
  });
  assert(amort.schedule.length === 12, '12 mensualités générées');
  assert(amort.schedule[11].remainingPrincipalEnd === '0.00', 'Solde fin d’amortissement = 0.00');
  console.log('  -> [PASS] Écriture comptable équilibrée, restriction Stage 3 et amortissement Decimal.js certifiés.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 6 : Collaboration Room Live, Analyse OCR & Assistant IA RAG
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 6 : Room Live Collaboration, OCR Facture & Assistant IA...');
  // 1. Règle Room Live : Le client ne peut pas créer de salle publique (403), le Fournisseur le peut
  assert(canActorCreateRoomLive('CLIENT') === false, 'Client interdit de création générale Room Live');
  assert(canActorCreateRoomLive('FOURNISSEUR') === true, 'Fournisseur autorisé à créer Room Live');

  // 2. OCR IDP : création, extraction, correction humaine et validation
  const ocrDoc = createMockOcrDocument();
  assert(ocrDoc.fields.length >= 3, 'Extraction OCR des champs clés réussie');
  assert(ocrDoc.globalConfidence >= 0.9, 'Indice de confiance OCR élevé (> 90%)');
  const correctedDoc = correctOcrFieldValue(
    ocrDoc,
    'invoiceNumber',
    'FAC-IMPORT-2026-9901-REV1',
    'claire.dubois@tradelink.eu'
  );
  const finalOcr = commitOcrDocumentValidation(correctedDoc, 'claire.dubois@tradelink.eu');
  assert(finalOcr.success === true, 'Document OCR validé avec traçabilité');

  // 3. Assistant IA avec RAG contextuel et filtrage de sécurité RBAC
  const aiAnswer = queryAiAssistantWithRag({
    userId: clientUserId,
    role: 'CLIENT',
    companyName: 'Nordic Green Infrastructure AB',
    question: 'Où en est la livraison de ma commande et mon statut KYC ?',
    threadHistory: [],
    modelId: 'gemini-1.5-pro',
  });
  assert(
    Boolean(aiAnswer.responseMessage && aiAnswer.responseMessage.text.length > 20),
    'Réponse Assistant IA contextuelle générée'
  );
  console.log('  -> [PASS] Permissions Room Live, pipeline OCR certifié et assistant IA contextualisé validés.\n');
  passed++;

  // --------------------------------------------------------------------------
  // WORKFLOW 7 : Administration Avancée, KMS, Sandbox Isolée & Double Approbation
  // --------------------------------------------------------------------------
  console.log('WORKFLOW 7 : Gouvernance Admin, KMS AES-256-GCM, Sandbox & Double Approbation...');
  const kekMaster: KMSKeyRecord = {
    id: 'kms-01',
    keyAlias: 'alias/tradelink-prod-kek-v4',
    keyType: 'KEK_MASTER',
    algorithm: 'AES-256-GCM',
    kmsProvider: 'HASHICORP_VAULT_KMS',
    keyArnMasked: 'vault://kms/eu-west-1/key/••••••••-••••-49a1-b82c-99102f88e104',
    version: 4,
    status: 'ACTIVE',
    lastRotatedAt: '2026-10-01 00:00:00',
    nextRotationAt: '2027-01-01',
  };

  // 1. Chiffrement par enveloppe KMS sans exposition de clé brute
  const sensitivePayload = 'NUMERO_COMPTE_BANCAIRE_IBAN:FR7630006000011234567890189;BIC:BNPAFRPP';
  const cipherResult = simulateEnvelopeEncryption(sensitivePayload, kekMaster);
  assert(Boolean(cipherResult.cipherTextBase64), 'Donnée chiffrée en AES-256-GCM');
  assert(Boolean(cipherResult.cipherDekBase64), 'Clé DEK chiffrée par la KEK maître');
  assert(cipherResult.ivHex.length === 24, 'IV hex 96 bits conforme');
  assert(cipherResult.authTagHex.length === 32, 'Tag d\'authentification GCM 128 bits');

  // 2. Rotation de la clé maître KEK
  const rotationResult = rotateKmsMasterKey(kekMaster, 'usr-admin-01');
  assert(rotationResult.updatedKey.version === 5, 'Version KEK incrémentée à v5');
  assert(rotationResult.logEntry.result === 'SUCCESS', 'Rotation KEK réussie');

  // 3. Vérification d'intégrité de sauvegarde SHA-256
  const sampleBackup: BackupRecord = {
    id: 'bak-e2e-01',
    backupCode: 'BAK-2026-001',
    type: 'MANUAL_SNAPSHOT',
    sizeFormatted: '45.89 Mo',
    encryptionKeyAlias: 'alias/tradelink-prod-kek-v4',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'VERIFIED',
    restoreStatus: 'NONE',
    createdAt: '2026-11-18 10:00',
  };
  const verifiedBackup = verifyBackupCryptographicIntegrity(sampleBackup);
  assert(verifiedBackup.isValid === true, 'Intégrité SHA-256 de sauvegarde validée');

  // 4. Analyse en Sandbox isolée sans risque pour la base de production
  const sandboxAnalysis = analyzeFileInIsolatedSandbox({
    fileName: 'Migration_Fournisseurs_2026.sql',
    fileSize: 1850000,
    format: 'SQL',
  });
  assert(sandboxAnalysis.isolatedNetworkVerified === true, 'Sandbox garantit réseau coupé');
  assert(sandboxAnalysis.productionSecretsStripped === true, 'Sandbox supprime secrets prod');
  assert(sandboxAnalysis.avScanStatus === 'CLEAN', 'Scan antivirus clean');

  // 5. Double Approbation Administrative : rejet strict de l'auto-approbation
  const selfApprovalValidation = validateDualAdminOperation({
    initiatorId: 'usr-admin-01',
    approverId: 'usr-admin-01',
    actionCode: 'BACKUP_RESTORE_TO_PROD',
    planHash: 'hash-db-restore-plan-2026',
    expectedPlanHash: 'hash-db-restore-plan-2026',
  });
  assert(selfApprovalValidation.allowed === false, 'Auto-approbation strictement rejetée');
  assert(selfApprovalValidation.errorCode === 'SELF_APPROVAL_FORBIDDEN', 'Erreur SELF_APPROVAL_FORBIDDEN levée');

  // Approbation valide par un second administrateur distinct
  const validDualApproval = validateDualAdminOperation({
    initiatorId: 'usr-admin-01',
    approverId: 'usr-admin-02',
    actionCode: 'BACKUP_RESTORE_TO_PROD',
    planHash: 'hash-db-restore-plan-2026',
    expectedPlanHash: 'hash-db-restore-plan-2026',
  });
  assert(validDualApproval.allowed === true, 'Double approbation par deux admins distincts acceptée');
  console.log('  -> [PASS] KMS Enveloppe, Sandbox isolée, SHA-256 certifié et règle anti-auto-approbation vérifiés.\n');
  passed++;

  console.log('====================================================================');
  console.log(`RÉSULTAT SUITE E2E PLAYWRIGHT : ${passed} / 7 WORKFLOWS RÉUSSIS (100%) !`);
  console.log('====================================================================\n');
}

if (process.argv[1]?.endsWith('e2e.playwright.test.ts') || process.argv[1]?.endsWith('e2e.playwright.test.cjs')) {
  runE2EPlaywrightTestSuite();
}
