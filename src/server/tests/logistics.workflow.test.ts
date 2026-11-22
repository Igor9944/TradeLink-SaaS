// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS INTÉGRATION LOGISTIQUE & TRANSPORT (PROMPT 9)
// - Gestion de flotte & Véhicules (agrément ATP, ADR, immatriculations)
// - Cycle Missions logistiques (Affectation, Refus motivé obligatoire, Acceptation)
// - Machine d'états de livraison contrôlée côté serveur (blocage des sauts illégaux)
// - Documents de transport internationaux certifiés (CMR international, EUR.1)
// - Preuve de livraison (POD) certifiée avec signature électronique et synchronisation
// - Incidents de transport avec gravité & Traçabilité géolocalisée (Waypoints carte)
// ============================================================================

import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import {
  ServerRequestContext,
  ServerResponsePayload,
  registerSingleActiveSession,
} from '../middlewares/errorAndSecurity.middleware';
import { OrderRecord, UserRoleCode } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

export function createInitialLogisticsTestDatabase() {
  const readyOrder: OrderRecord & { deletedAt?: string | null } = {
    id: 'ord-log-01',
    orderNumber: 'CMD-2026-77881',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import-Export Distribution',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech Industrial & ColdChain GmbH',
    status: 'PREPARING',
    subtotalAmount: '45000.00',
    taxAmount: '9000.00',
    shippingAmount: '1200.00',
    totalAmount: '55200.00',
    currency: 'EUR',
    shippingAddress: 'Plateforme Logistique Rungis, Bâtiment F4, Paris Sud, France',
    createdAt: '2026-11-18 09:00',
    items: [
      {
        productId: 'prod-01',
        sku: 'PAL-EUR-ISO-1200',
        name: 'Palette Euro Certifiée Chaîne du Froid',
        quantity: 300,
        unitPrice: '150.00',
        totalLine: '45000.00',
        icon3d: 'cold-chain',
      },
    ],
    timeline: [
      {
        step: 'Commande confirmée et préparée en entrepôt',
        timestamp: '2026-11-18 09:15',
        actor: 'EuroTech Industrial & ColdChain GmbH',
        completed: true,
      },
    ],
  };

  return {
    products: [],
    orders: [readyOrder],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
    quotes: [],
    invoices: [],
    payments: [],
    shipments: [],
    incidents: [],
    stockMovements: [],
    accountingEntries: [],
    logisticsMissions: [],
    vehicles: [],
    transportDocuments: [],
  };
}

export function runLogisticsWorkflowTests(): { passed: number; results: string[] } {
  const repo = new TradeLinkRepositoryStore(createInitialLogisticsTestDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: string[] = [];
  let passed = 0;

  const makeReq = (
    partial: Partial<ServerRequestContext> & { method: ServerRequestContext['method']; path: string }
  ): ServerResponsePayload<any> => {
    const ctx: ServerRequestContext = {
      correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ipAddress: '10.0.4.15',
      headers: {},
      query: {},
      params: {},
      body: {},
      ...partial,
    };
    return app.handleRequest(ctx);
  };

  // 1. Initialisation des sessions actives (transporteur flotte usr-carr-01 + comptes Argon2id)
  const carrierSessionId = 'sess-carr-01-logistics-wf';
  registerSingleActiveSession('usr-carr-01', carrierSessionId, true);
  const carrierUser = {
    id: 'usr-carr-01',
    email: 'ops@medfreight-logistics.com',
    role: 'TRANSPORTEUR' as UserRoleCode,
    sessionId: carrierSessionId,
    companyName: 'MedFreight Multimodal Logistics & Transport S.A.',
    mfaVerified: true,
  };

  const supplierLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'h.weber@eurotech-supply.de', password: 'SupplierEuro!2026' },
  });
  const supplierData = supplierLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const supplierUser = {
    id: supplierData.userId,
    email: supplierData.email,
    role: 'FOURNISSEUR' as UserRoleCode,
    sessionId: supplierData.sessionId,
    companyName: supplierData.companyName,
    mfaVerified: true,
  };

  const clientLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 's.mansouri@atlas-import.ma', password: 'ClientAtlas!2026' },
  });
  const clientData = clientLogin.body.data as { userId: string; sessionId: string; email: string; companyName: string };
  const clientUser = {
    id: clientData.userId,
    email: clientData.email,
    role: 'CLIENT' as UserRoleCode,
    sessionId: clientData.sessionId,
    companyName: clientData.companyName,
    mfaVerified: true,
  };

  // ==========================================================================
  // [LOG-01] Gestion de flotte & Véhicules habilités (Agrément ATP & ADR)
  // ==========================================================================
  const vehRes = makeReq({
    method: 'GET',
    path: '/api/v1/logistics/vehicles',
    user: carrierUser,
  });
  assert(vehRes.statusCode === 200, 'GET /api/v1/logistics/vehicles doit renvoyer 200');
  const vehicles = vehRes.body.data;
  assert(vehicles.length >= 3, 'Flotte doit comporter au moins 3 types de véhicules');
  const reefer = vehicles.find((v: any) => v.vehicleType === 'REEFER_ATP_FRIGO');
  assert(reefer && reefer.hasAtpReeferCert === true, 'Camion frigo doté d’un certificat ATP valide');
  passed++;
  results.push(
    `✓ [LOG-01] Référentiel de flotte & Véhicules validé (${vehicles.length} véhicules : Frigo ATP, Bâché, Châssis conteneur)`
  );

  // ==========================================================================
  // [LOG-02] Création de Mission logistique par le Fournisseur
  // ==========================================================================
  const missionCreateRes = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/missions',
    user: supplierUser,
    body: {
      orderId: 'ord-log-01',
      carrierId: carrierUser.id,
      carrierName: carrierUser.companyName,
      pickupAddress: 'Hub Logistique Zenata, Casablanca, Maroc',
      deliveryAddress: 'Plateforme Logistique Rungis, Bâtiment F4, Paris Sud, France',
      cargoWeightKg: '22500',
      cargoVolumeM3: '85',
      isColdChain: true,
      requiredVehicleType: 'REEFER_ATP_FRIGO',
    },
  });
  assert(missionCreateRes.statusCode === 201, 'Création mission doit retourner 201');
  const mission = missionCreateRes.body.data;
  assert(mission.status === 'OFFERED', 'Statut initial mission = OFFERED');
  assert(mission.isColdChain === true, 'Mission classée chaîne du froid');
  passed++;
  results.push(
    `✓ [LOG-02] Création d’une mission logistique frigorifique internationale et affectation au transporteur validées`
  );

  // ==========================================================================
  // [LOG-03] Refus motivé obligatoire & Acceptation de Mission
  // ==========================================================================
  // 1. Refus sans motif -> Rejet par le serveur
  let refusedWithoutReasonFailed = false;
  try {
    const badRefusal = makeReq({
      method: 'PUT',
      path: `/api/v1/logistics/missions/${mission.id}/respond`,
      user: carrierUser,
      body: {
        accept: false,
        rejectionReason: '',
      },
    });
    if (badRefusal.statusCode >= 400) {
      refusedWithoutReasonFailed = true;
    }
  } catch {
    refusedWithoutReasonFailed = true;
  }
  assert(refusedWithoutReasonFailed, 'Le refus sans motif précis doit être strictement rejeté');

  // 2. Acceptation valide de la mission -> Statut ACCEPTED et génération automatique de l'expédition
  const acceptMissionRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/missions/${mission.id}/respond`,
    user: carrierUser,
    body: {
      accept: true,
    },
  });
  assert(acceptMissionRes.statusCode === 200, 'Acceptation mission retourne 200');
  assert(acceptMissionRes.body.data.updatedMission.status === 'ACCEPTED', 'Mission marquée ACCEPTED');
  const shipment = acceptMissionRes.body.data.createdShipment;
  assert(shipment && shipment.status === 'ACCEPTED', 'Expédition initialisée au statut ACCEPTED');
  assert(shipment.trackingNumber.startsWith('TRK-2026-'), 'Numéro de suivi TRK-2026-XXXXXX généré');
  passed++;
  results.push(
    `✓ [LOG-03] Contrôle strict du motif de refus & Acceptation de mission avec initialisation d’expédition validées`
  );

  // ==========================================================================
  // [LOG-04] Transitions de statuts contrôlées serveur (Machine d'états légale)
  // ==========================================================================
  // 1. Saut illégal : Tenter de passer de ACCEPTED directement à DELIVERED -> Rejet
  const illegalTransitionRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: carrierUser,
    body: {
      nextStatus: 'DELIVERED',
    },
  });
  assert(illegalTransitionRes.statusCode >= 400, 'Transition illégale ACCEPTED -> DELIVERED doit échouer (400)');

  // 2. Transition légale : ACCEPTED -> COLLECTED (Enlèvement marchandise)
  const collectedRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: carrierUser,
    body: {
      nextStatus: 'COLLECTED',
    },
  });
  assert(collectedRes.statusCode === 200, 'Passage en COLLECTED réussi');
  assert(collectedRes.body.data.status === 'COLLECTED', 'Statut expédition = COLLECTED');

  // 3. Transition légale : COLLECTED -> IN_TRANSIT (En cours d'acheminement)
  const inTransitRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: carrierUser,
    body: {
      nextStatus: 'IN_TRANSIT',
    },
  });
  assert(inTransitRes.statusCode === 200, 'Passage en IN_TRANSIT réussi');

  // 4. Transition légale : IN_TRANSIT -> OUT_FOR_DELIVERY (En cours de livraison finale)
  const outDeliveryRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shipment.id}/status`,
    user: carrierUser,
    body: {
      nextStatus: 'OUT_FOR_DELIVERY',
    },
  });
  assert(outDeliveryRes.statusCode === 200, 'Passage en OUT_FOR_DELIVERY réussi');
  passed++;
  results.push(
    `✓ [LOG-04] Machine d’états contrôlée côté serveur validée (blocage des sauts d’étapes illégaux & séquence ordonnée)`
  );

  // ==========================================================================
  // [LOG-05] Documents de transport internationaux (CMR & Douanes EUR.1)
  // ==========================================================================
  const docGenRes = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${shipment.id}/documents`,
    user: carrierUser,
  });
  assert(docGenRes.statusCode === 201, 'Génération documents retourne 201');
  const docs = docGenRes.body.data;
  assert(docs.length === 2, 'Génération de 2 documents (CMR International + Déclaration Douanière EUR.1)');
  const cmr = docs.find((d: any) => d.docType === 'CMR_INTERNATIONAL');
  assert(cmr && cmr.temperatureControlled === true, 'CMR certifie le contrôle de température frigorifique');
  assert(cmr.qrVerificationCode.includes('/cmr/'), 'CMR comprend un code de vérification numérique officiel');
  passed++;
  results.push(
    `✓ [LOG-05] Émission certifiée des documents de transport internationaux (CMR International & Déclaration Douanière EUR.1)`
  );

  // ==========================================================================
  // [LOG-06] Preuve de livraison (POD) certifiée avec signature & Synchronisation
  // ==========================================================================
  const podRes = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${shipment.id}/pod`,
    user: carrierUser,
    body: {
      recipientFullName: 'Jean-Marc Dupont (Responsable Réception Rungis)',
      recipientIdNumber: 'CNI-FR-88992201',
      signedAt: '2026-11-20 16:30',
      digitalSignatureSvg: '<svg viewBox="0 0 100 50"><path d="M10 20 Q 30 5, 50 25 T 90 20" stroke="blue"/></svg>',
      deliveryLatitude: 48.7497,
      deliveryLongitude: 2.3556,
      deliveryNotes: '300 palettes réceptionnées intactes, enregistreur de température contrôlé conforme à +3.8°C.',
    },
  });
  assert(podRes.statusCode === 201, 'POD certifiée enregistrée avec 201');
  assert(podRes.body.data.updatedShipment.status === 'DELIVERED', 'Expédition passée en DELIVERED');
  assert(podRes.body.data.updatedShipment.podSigned === true, 'POD marquée signée');
  assert(podRes.body.data.updatedOrder.status === 'DELIVERED', 'Commande synchronisée en DELIVERED');
  assert(
    podRes.body.data.podCertifiedRecord.certificationSha256.startsWith('POD-'),
    'Empreinte de certification numérique SHA-256 générée'
  );
  passed++;
  results.push(
    `✓ [LOG-06] Preuve de livraison (POD) certifiée avec signature électronique et synchronisation commande/expédition validée`
  );

  // ==========================================================================
  // [LOG-07] Incidents de transport & Tableau de bord géolocalisé (Waypoints)
  // ==========================================================================
  // 1. Déclaration d'incident logistique
  const incidentRes = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/incidents',
    user: carrierUser,
    body: {
      shipmentId: shipment.id,
      title: 'Ralentissement contrôle scanner terminal portuaire Tanger Med',
      description: 'File d’attente scanner mobile douanier 45 min, aucun dommage matériel, chaîne du froid maintenue.',
      severity: 'LOW',
    },
  });
  assert(incidentRes.statusCode === 201, 'Déclaration incident logistique validée en 201');
  assert(incidentRes.body.data.status === 'OPEN', 'Statut incident = OPEN');

  // 2. Vérification des waypoints géolocalisés pour la carte interactive
  const trackingRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${shipment.id}/tracking`,
    user: clientUser,
  });
  assert(trackingRes.statusCode === 200, 'Suivi tracking géolocalisé retourne 200');
  assert(trackingRes.body.data.hasGeoCoordinates === true, 'Coordonnées GPS réelles présentes pour la carte');
  assert(trackingRes.body.data.waypoints.length >= 2, 'Étapes portuaires et douanières présentes dans l’itinéraire');
  passed++;
  results.push(
    `✓ [LOG-07] Déclaration d’incident logistique & Itinéraire géolocalisé pour carte interactive validés`
  );

  return { passed, results };
}

// Exécution directe si invoqué par Node.js
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, results } = runLogisticsWorkflowTests();
  console.log('\n=== SUITE DE TESTS MODULE LOGISTIQUE & TRANSPORT TRADELINK V6.0 (' + passed + '/7 RÉUSSIS) ===');
  results.forEach((r) => console.log(r));
}
