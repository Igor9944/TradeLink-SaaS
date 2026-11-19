// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — SUITE DE TESTS AVANCÉE LOGISTIQUE & TRANSPORT (PROMPT 13)
// 1. Expéditions & Colisage détaillé (palettes, cartons, conteneurs, ADR, ATP)
// 2. Affectation, réaffectation avec motif et suivi transporteurs
// 3. Machine d'états déterministe à 10 statuts (blocage des sauts illégaux)
// 4. Cartographie, télémétrie GPS, calcul dynamique d'ETA & alerte chaîne du froid
// 5. Preuve de livraison (POD) certifiée et scellée cryptographiquement SHA-256
// 6. Gestion complète des incidents logistiques (déclaration, photos, résolution)
// 7. Cloisonnement strict RBAC Anti-IDOR (Client, Fournisseur, Transporteur, Admin)
// ============================================================================

import { TradeLinkRepositoryStore } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { ServerRequestContext, ServerResponsePayload } from '../middlewares/errorAndSecurity.middleware';
import { OrderRecord, ShipmentPackageDetail, ShipmentAddressDetail, UserRoleCode } from '../../types';
import {
  calculateHaversineDistanceKm,
  LogisticsEngine,
} from '../../services/logisticsEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Échec Assertion : ${message}`);
  }
}

export function createInitialAdvancedLogisticsDatabase() {
  const readyOrder: OrderRecord & { deletedAt?: string | null } = {
    id: 'ord-adv-log-01',
    orderNumber: 'CMD-2026-99120',
    clientId: 'usr-client-01',
    clientName: 'Atlas Import-Export Distribution S.A.R.L.',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech ColdChain & Industrial GmbH',
    status: 'PREPARING',
    subtotalAmount: '85000.00',
    taxAmount: '17000.00',
    shippingAmount: '3500.00',
    totalAmount: '105500.00',
    currency: 'EUR',
    shippingAddress: 'Plateforme Logistique Rungis / Bâtiment F4, Paris Sud, France',
    createdAt: '2026-11-18 08:30',
    items: [
      {
        productId: 'prod-01',
        sku: 'PAL-EUR-ISO-1200',
        name: 'Palettes Euro Surgelés ATP FRC (-20°C)',
        quantity: 24,
        unitPrice: '3500.00',
        totalLine: '84000.00',
        icon3d: 'cold-chain',
      },
    ],
    timeline: [
      {
        step: 'Commande confirmée et préparée en entrepôt',
        timestamp: '2026-11-18 09:00',
        actor: 'EuroTech ColdChain & Industrial GmbH',
        completed: true,
      },
    ],
  };

  const otherClientOrder: OrderRecord & { deletedAt?: string | null } = {
    id: 'ord-adv-log-02',
    orderNumber: 'CMD-2026-99121',
    clientId: 'usr-client-02',
    clientName: 'Nordic Retail Group A/S',
    supplierId: 'usr-supp-01',
    supplierName: 'EuroTech ColdChain & Industrial GmbH',
    status: 'CONFIRMED',
    subtotalAmount: '30000.00',
    taxAmount: '6000.00',
    shippingAmount: '1500.00',
    totalAmount: '37500.00',
    currency: 'EUR',
    shippingAddress: 'Copenhagen Logistics Port Terminal 2, Denmark',
    createdAt: '2026-11-18 10:00',
    items: [],
    timeline: [],
  };

  return {
    products: [],
    orders: [readyOrder, otherClientOrder],
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
    notifications: [],
  };
}

export function runAdvancedLogisticsTests(): { passed: number; results: string[] } {
  const repo = new TradeLinkRepositoryStore(createInitialAdvancedLogisticsDatabase(), false);
  const app = new TradeLinkApiApplication(repo);
  const results: string[] = [];
  let passed = 0;

  const makeReq = (
    partial: Partial<ServerRequestContext> & { method: ServerRequestContext['method']; path: string }
  ): ServerResponsePayload<any> => {
    const ctx: ServerRequestContext = {
      correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ipAddress: '192.168.10.45',
      headers: {},
      query: {},
      params: {},
      body: {},
      ...partial,
    };
    return app.handleRequest(ctx);
  };

  // Sessions d'authentification réelles des 4 acteurs via /api/v1/auth/login
  const carrierLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-carr-01',
      email: 'dispatch@medfreight-logistics.com',
      role: 'TRANSPORTEUR',
      companyName: 'MedFreight Multimodal Logistics & Transport S.A.',
    },
  });
  const carrierSessionId = (carrierLogin.body.data as { sessionId: string }).sessionId;
  const carrierUser = {
    id: 'usr-carr-01',
    email: 'dispatch@medfreight-logistics.com',
    role: 'TRANSPORTEUR' as UserRoleCode,
    companyName: 'MedFreight Multimodal Logistics & Transport S.A.',
    sessionId: carrierSessionId,
    mfaVerified: true,
  };

  const carrierLogin2 = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-carr-02',
      email: 'ops@trans-gibraltar.com',
      role: 'TRANSPORTEUR',
      companyName: 'Trans-Gibraltar Ferry & Roadways',
    },
  });
  const carrierSessionId2 = (carrierLogin2.body.data as { sessionId: string }).sessionId;
  const carrierUser2 = {
    id: 'usr-carr-02',
    email: 'ops@trans-gibraltar.com',
    role: 'TRANSPORTEUR' as UserRoleCode,
    companyName: 'Trans-Gibraltar Ferry & Roadways',
    sessionId: carrierSessionId2,
    mfaVerified: true,
  };

  const supplierLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-supp-01',
      email: 'logistics@eurotech-gmbh.de',
      role: 'FOURNISSEUR',
      companyName: 'EuroTech ColdChain & Industrial GmbH',
    },
  });
  const supplierSessionId = (supplierLogin.body.data as { sessionId: string }).sessionId;
  const supplierUser = {
    id: 'usr-supp-01',
    email: 'logistics@eurotech-gmbh.de',
    role: 'FOURNISSEUR' as UserRoleCode,
    companyName: 'EuroTech ColdChain & Industrial GmbH',
    sessionId: supplierSessionId,
    mfaVerified: true,
  };

  const clientLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-client-01',
      email: 'achats@atlas-distribution.ma',
      role: 'CLIENT',
      companyName: 'Atlas Import-Export Distribution S.A.R.L.',
    },
  });
  const clientSessionId = (clientLogin.body.data as { sessionId: string }).sessionId;
  const clientUser = {
    id: 'usr-client-01',
    email: 'achats@atlas-distribution.ma',
    role: 'CLIENT' as UserRoleCode,
    companyName: 'Atlas Import-Export Distribution S.A.R.L.',
    sessionId: clientSessionId,
    mfaVerified: true,
  };

  const otherClientLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-client-02',
      email: 'purchasing@nordic-retail.dk',
      role: 'CLIENT',
      companyName: 'Nordic Retail Group A/S',
    },
  });
  const otherClientSessionId = (otherClientLogin.body.data as { sessionId: string }).sessionId;
  const otherClientUser = {
    id: 'usr-client-02',
    email: 'purchasing@nordic-retail.dk',
    role: 'CLIENT' as UserRoleCode,
    companyName: 'Nordic Retail Group A/S',
    sessionId: otherClientSessionId,
    mfaVerified: true,
  };

  const adminLogin = makeReq({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: {
      userId: 'usr-admin-01',
      email: 'supervision@tradelink.int',
      role: 'ADMIN',
      companyName: 'TradeLink Global Platform Administration',
    },
  });
  const adminSessionId = (adminLogin.body.data as { sessionId: string }).sessionId;
  const adminUser = {
    id: 'usr-admin-01',
    email: 'supervision@tradelink.int',
    role: 'ADMIN' as UserRoleCode,
    companyName: 'TradeLink Global Platform Administration',
    sessionId: adminSessionId,
    mfaVerified: true,
  };

  // ==========================================================================
  // [LOG-ADV-01] Création d'Expédition avec Colisage Détaillé (Prompt 13 §1)
  // ==========================================================================
  const testPackages: ShipmentPackageDetail[] = [
    {
      id: 'pkg-01',
      packageType: 'PALLET_EURO',
      quantity: 18,
      description: 'Palettes Euro Produits Biologiques Surgelés ATP FRC (-20°C)',
      grossWeightKg: 750,
      netWeightKg: 690,
      dimensionsCm: { length: 120, width: 80, height: 165 },
      volumeM3: 1.584,
      isColdChainAtp: true,
      requiredTemperatureRange: '-20°C à -18°C',
    },
    {
      id: 'pkg-02',
      packageType: 'BOX_CARTON',
      quantity: 50,
      description: 'Cartons Échantillons Sous Contrôle ADR Classe 9',
      grossWeightKg: 15,
      netWeightKg: 14,
      dimensionsCm: { length: 40, width: 30, height: 30 },
      volumeM3: 0.036,
      isDangerousGoodsAdr: true,
      adrClass: '9 (Matières dangereuses diverses)',
    },
  ];

  const testPickupAddress: ShipmentAddressDetail = {
    street: 'Hub Logistique Zenata, Zone Franche Bâtiment B3',
    postalCode: '20600',
    city: 'Casablanca',
    country: 'Maroc',
    latitude: 33.6333,
    longitude: -7.4833,
    contactName: 'M. Othmane Tazi (Chef de Quai Expédition)',
    contactPhone: '+212 522 88 99 00',
    contactEmail: 'quai-zenata@eurotech.ma',
    operatingHours: '06:00 - 20:00 (Du Lundi au Samedi)',
    requiresTailLift: false,
    specialInstructions: 'Quai de chargement frigorifique niveau -18°C obligatoire avec sas thermique hermétique.',
  };

  const testDeliveryAddress: ShipmentAddressDetail = {
    street: 'Plateforme Logistique Rungis, Bâtiment F4, Allée des Primeurs',
    postalCode: '94150',
    city: 'Rungis / Paris Sud',
    country: 'France',
    latitude: 48.7497,
    longitude: 2.3556,
    contactName: 'M. Youssef Berrada (Responsable Réception)',
    contactPhone: '+33 1 48 53 12 34',
    contactEmail: 'reception-rungis@atlas-distribution.ma',
    dockAccessCode: 'QUAI-FRIGO-94',
    requiresTailLift: true,
    operatingHours: '04:00 - 14:00',
    specialInstructions: 'Contrôle thermographique systématique au déchargement avant émargement de la POD.',
  };

  // Test unitaire direct du calcul de colisage
  const colisageCalcul = LogisticsEngine.calculateColisageTotals(testPackages);
  assert(colisageCalcul.packagesCount === 68, 'Nombre total de colis calculé = 68 (18 palettes + 50 cartons)');
  assert(colisageCalcul.grossWeightKg === 14250, 'Poids brut total = 14250 kg (18*750 + 50*15)');
  assert(colisageCalcul.netWeightKg === 13120, 'Poids net total = 13120 kg (18*690 + 50*14)');
  assert(colisageCalcul.hasColdChainAtp === true, 'Détection automatique de fret sous chaîne du froid ATP');
  assert(colisageCalcul.hasDangerousGoodsAdr === true, 'Détection automatique de matières ADR');

  // Création via endpoint API REST POST /api/v1/logistics/shipments
  const createShipmentRes = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/shipments',
    user: supplierUser,
    body: {
      orderId: 'ord-adv-log-01',
      packages: testPackages,
      pickupAddress: testPickupAddress,
      deliveryAddress: testDeliveryAddress,
      scheduledPickupDate: '2026-11-20',
      scheduledPickupTimeWindow: '08:00 - 12:00',
      handlingInstructions: 'Maintenir la chaîne du froid en continu à -18°C. Ne pas gerber sur plus de 2 niveaux.',
      customsNotes: 'Exportation Maroc vers UE sous accord préférentiel EUR.1.',
      transportMode: 'ROAD',
    },
  });

  assert(createShipmentRes.statusCode === 201, 'Création expédition doit retourner 201');
  const createdShipment = createShipmentRes.body.data.shipment;
  assert(createdShipment.status === 'PENDING', 'Statut initial sans transporteur = PENDING');
  assert(createdShipment.trackingNumber.startsWith('TRK-2026-'), 'Tracking number TRK-2026-XXXXXX généré');
  assert(createdShipment.packages.length === 2, 'Colisage détaillé rattaché à l’expédition');
  assert(createdShipment.totalPackagesCount === 68, 'Quantité totale de colis conforme');
  assert(createdShipment.totalGrossWeightKg === '14250.00', 'Poids brut total enregistré conforme');
  assert(createdShipment.icon3d === 'cold-chain', 'Icône 3D automatique cold-chain');

  // Vérifier la liasse documentaire générée
  const docs = createShipmentRes.body.data.documents;
  assert(docs.length >= 4, 'Liasse documentaire générée (CMR, BL, EUR1, Packing List, ATP)');
  assert(docs.some((d: any) => d.docType === 'CMR_INTERNATIONAL'), 'e-CMR international présent');
  assert(docs.some((d: any) => d.docType === 'CUSTOMS_DECLARATION_EUR1'), 'EUR.1 douanier présent');
  assert(docs.some((d: any) => d.docType === 'DELIVERY_NOTE'), 'Bon de livraison présent');
  assert(docs.some((d: any) => d.docType === 'PACKING_LIST'), 'Packing list présent');
  passed++;
  results.push('✓ [LOG-ADV-01] Création d’expédition avec colisage détaillé, adresses et documents associés validée');

  // ==========================================================================
  // [LOG-ADV-02] Affectation, réaffectation motivée & consultation transporteurs (Prompt 13 §2)
  // ==========================================================================
  // 1. Consultation des véhicules disponibles
  const vehiclesRes = makeReq({
    method: 'GET',
    path: '/api/v1/logistics/vehicles',
    user: supplierUser,
  });
  assert(vehiclesRes.statusCode === 200, 'Consultation véhicules retourne 200');
  assert(vehiclesRes.body.data.length >= 3, 'Flotte de véhicules répertoriée');

  // 2. Affectation de l'expédition au transporteur MedFreight
  const assignRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/assign`,
    user: supplierUser,
    body: {
      carrierId: carrierUser.id,
      carrierName: carrierUser.companyName,
      vehicleId: 'veh-01',
      driverName: 'Karim Benjelloun (Permis EC - FIMO - ADR - ATP)',
    },
  });
  assert(assignRes.statusCode === 200, 'Affectation transporteur réussie');
  assert(assignRes.body.data.carrierId === carrierUser.id, 'Carrier ID mis à jour');
  assert(assignRes.body.data.status === 'CONFIRMED', 'Statut passé automatiquement à CONFIRMED');
  assert(assignRes.body.data.assignedDriverName.includes('Karim Benjelloun'), 'Chauffeur titulaire affecté');

  // 3. Réaffectation sans motif suffisant -> Rejet (doit faire >= 5 caractères)
  let shortReasonFailed = false;
  try {
    const badReassign = makeReq({
      method: 'PUT',
      path: `/api/v1/logistics/shipments/${createdShipment.id}/assign`,
      user: adminUser,
      body: {
        carrierId: carrierUser2.id,
        carrierName: carrierUser2.companyName,
        reason: 'NA',
      },
    });
    if (badReassign.statusCode >= 400) shortReasonFailed = true;
  } catch {
    shortReasonFailed = true;
  }
  assert(shortReasonFailed, 'Réaffectation sans motif suffisant (>= 5 car.) doit être rejetée');

  // 4. Réaffectation valide d'urgence avec historique
  const validReassignRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/assign`,
    user: adminUser,
    body: {
      carrierId: carrierUser2.id,
      carrierName: carrierUser2.companyName,
      driverName: 'Hassan Amrani',
      reason: 'Panne mécanique sur tracteur Volvo veh-01, bascule sur flotte Trans-Gibraltar.',
    },
  });
  assert(validReassignRes.statusCode === 200, 'Réaffectation d’urgence validée');
  assert(validReassignRes.body.data.carrierId === carrierUser2.id, 'Nouveau transporteur actif');
  assert(validReassignRes.body.data.reassignmentHistory.length === 1, 'Historique de réaffectation conservé');
  assert(
    validReassignRes.body.data.reassignmentHistory[0].reason.includes('Panne mécanique'),
    'Motif de réaffectation archivé'
  );

  // 5. Réassignation retour au transporteur 1 pour la suite des tests opérationnels
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/assign`,
    user: adminUser,
    body: {
      carrierId: carrierUser.id,
      carrierName: carrierUser.companyName,
      reason: 'Remise en service après contrôle technique anticipé.',
    },
  });
  passed++;
  results.push('✓ [LOG-ADV-02] Consultation flotte, affectation transporteur et réaffectation motivée avec audit validées');

  // ==========================================================================
  // [LOG-ADV-03] Machine d'états déterministe à 10 statuts (Prompt 13 §3)
  // ==========================================================================
  // Statut actuel : CONFIRMED
  // 1. Saut illégal : CONFIRMED -> DELIVERED (Interdit)
  const illegalJumpRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'DELIVERED' },
  });
  assert(illegalJumpRes.statusCode >= 400, 'Transition illégale CONFIRMED -> DELIVERED doit échouer (400)');

  // 2. CONFIRMED -> PICKUP_SCHEDULED (Collecte programmée)
  const pickupSchedRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'PICKUP_SCHEDULED' },
  });
  assert(pickupSchedRes.statusCode === 200, 'Transition vers PICKUP_SCHEDULED réussie');
  assert(pickupSchedRes.body.data.status === 'PICKUP_SCHEDULED', 'Statut = PICKUP_SCHEDULED');

  // 3. PICKUP_SCHEDULED -> PICKED_UP (Collectée)
  const pickedUpRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'PICKED_UP', actualDate: '2026-11-20 08:30' },
  });
  assert(pickedUpRes.statusCode === 200, 'Transition vers PICKED_UP réussie');
  assert(pickedUpRes.body.data.status === 'PICKED_UP', 'Statut = PICKED_UP');
  assert(pickedUpRes.body.data.actualPickupDate === '2026-11-20 08:30', 'Date de collecte réelle enregistrée');

  // 4. PICKED_UP -> IN_TRANSIT (En transit multimodal)
  const inTransitRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'IN_TRANSIT' },
  });
  assert(inTransitRes.statusCode === 200, 'Transition vers IN_TRANSIT réussie');
  assert(inTransitRes.body.data.status === 'IN_TRANSIT', 'Statut = IN_TRANSIT');

  // 5. IN_TRANSIT -> ARRIVED_AT_DESTINATION (Arrivée à destination / Hub logistique Rungis)
  const arrivedRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'ARRIVED_AT_DESTINATION' },
  });
  assert(arrivedRes.statusCode === 200, 'Transition vers ARRIVED_AT_DESTINATION réussie');
  assert(arrivedRes.body.data.status === 'ARRIVED_AT_DESTINATION', 'Statut = ARRIVED_AT_DESTINATION');

  // 6. ARRIVED_AT_DESTINATION -> OUT_FOR_DELIVERY (En cours de livraison finale)
  const outForDeliveryRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'OUT_FOR_DELIVERY' },
  });
  assert(outForDeliveryRes.statusCode === 200, 'Transition vers OUT_FOR_DELIVERY réussie');
  assert(outForDeliveryRes.body.data.status === 'OUT_FOR_DELIVERY', 'Statut = OUT_FOR_DELIVERY');
  passed++;
  results.push('✓ [LOG-ADV-03] Machine d’états déterministe à 10 statuts contrôlée et séquence ordonnée validées');

  // ==========================================================================
  // [LOG-ADV-04] Cartographie, Télémétrie GPS, ETA dynamique & Chaîne du Froid (Prompt 13 §4)
  // ==========================================================================
  // 1. Calcul géodésique Haversine (Casablanca -> Paris Rungis)
  const distanceKm = calculateHaversineDistanceKm(33.6333, -7.4833, 48.7497, 2.3556);
  assert(distanceKm > 1800 && distanceKm < 2100, `Distance Haversine cohérente : ${distanceKm} km`);

  // 2. Calcul dynamique d'ETA par le moteur
  const etaCalc = LogisticsEngine.calculateEstimatedTimeOfArrival({
    originLat: 33.6333,
    originLon: -7.4833,
    destLat: 48.7497,
    destLon: 2.3556,
    speedKmh: 75,
    transportMode: 'ROAD',
    requiresCustomsClearance: true,
  });
  assert(etaCalc.remainingDistanceKm > 2000, 'Distance routière avec coefficient de détour > 2000 km');
  assert(etaCalc.remainingHours > 40, 'Temps de parcours avec pauses réglementaires RSE et douane > 40 heures');
  assert(etaCalc.estimatedArrivalIso.length > 10, 'Date ISO d’arrivée calculée');

  // 3. Émission d'une balise GPS télématique normale
  const gps1Res = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/gps`,
    user: carrierUser,
    body: {
      latitude: 35.8856,
      longitude: -5.5019,
      speedKmh: 82,
      ambientTempCelsius: -19.4,
      batteryLevelPct: 98,
      addressDescription: 'Autoroute A1, Approche Terminal Tanger Med',
    },
  });
  assert(gps1Res.statusCode === 201, 'Balise GPS enregistrée avec succès');
  assert(gps1Res.body.data.temperatureAnomalyDetected === false, 'Température -19.4°C conforme à la consigne ATP FRC');
  assert(gps1Res.body.data.shipment.currentGpsLocation.latitude === 35.8856, 'Dernière position GPS mise à jour');

  // 4. Émission d'une balise avec anomalie de chaîne du froid (-8.5°C au lieu de -18°C)
  const gpsAnomalyRes = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/gps`,
    user: carrierUser,
    body: {
      latitude: 36.1333,
      longitude: -5.45,
      speedKmh: 65,
      ambientTempCelsius: -8.5, // Trop chaud pour du surgelé FRC (-18°C max tolérance -12°C)
      batteryLevelPct: 84,
      addressDescription: 'Terminal Algésiras Port Cargo',
    },
  });
  assert(gpsAnomalyRes.statusCode === 201, 'Balise anomalie enregistrée');
  assert(gpsAnomalyRes.body.data.temperatureAnomalyDetected === true, 'Détection automatique d’anomalie chaîne du froid');
  assert(gpsAnomalyRes.body.data.shipment.gpsHistory.length === 2, 'Historique des relevés GPS enrichi');
  passed++;
  results.push('✓ [LOG-ADV-04] Cartographie, télémétrie GPS, calcul dynamique d’ETA et alerte chaîne du froid validés');

  // ==========================================================================
  // [LOG-ADV-05] Preuve de Livraison (POD) Scellée Cryptographiquement SHA-256 (Prompt 13 §5)
  // ==========================================================================
  // 1. Soumission sans nom de réceptionnaire -> Rejet
  let missingSignerFailed = false;
  try {
    const badPod = makeReq({
      method: 'POST',
      path: `/api/v1/logistics/shipments/${createdShipment.id}/pod`,
      user: carrierUser,
      body: {
        recipientFullName: '',
        digitalSignatureSvg: '<svg height="100" width="200"><path d="M10 10"/></svg>',
      },
    });
    if (badPod.statusCode >= 400) missingSignerFailed = true;
  } catch {
    missingSignerFailed = true;
  }
  assert(missingSignerFailed, 'POD sans nom complet de réceptionnaire doit échouer');

  // 2. Soumission valide de la Preuve de Livraison (POD)
  const validPodRes = makeReq({
    method: 'POST',
    path: `/api/v1/logistics/shipments/${createdShipment.id}/pod`,
    user: carrierUser,
    body: {
      recipientFullName: 'Youssef Berrada',
      recipientIdNumber: 'CIN-BK-889124 / Badge Rungis #4421',
      recipientRoleOrTitle: 'Directeur Logistique Réception Atlas Rungis',
      signedAt: '2026-11-20 11:45',
      digitalSignatureSvg:
        '<svg viewBox="0 0 400 150"><path d="M 20 80 Q 90 20, 180 80 T 360 80" stroke="#0F172A" stroke-width="3" fill="none"/></svg>',
      proofPhotoUri: 'https://storage.tradelink.int/pod-photos/pod-rungis-pallets-ok.jpg',
      deliveryLatitude: 48.7497,
      deliveryLongitude: 2.3556,
      deliveryNotes: '68 colis vérifiés, 18 palettes filmées intactes, thermo-enregistreur conforme à -19.1°C.',
    },
  });

  assert(validPodRes.statusCode === 201, 'Validation POD retourne 201');
  const podResult = validPodRes.body.data;
  assert(podResult.updatedShipment.status === 'DELIVERED', 'Statut expédition = DELIVERED');
  assert(podResult.updatedShipment.podSigned === true, 'Drapeau podSigned = true');
  assert(
    podResult.podCertifiedRecord.certificationSha256.startsWith('POD-SHA256-'),
    'Sceau cryptographique SHA-256 généré pour la POD'
  );
  assert(podResult.updatedOrder.status === 'DELIVERED', 'Commande associée mise à jour en DELIVERED');
  assert(
    podResult.updatedOrder.timeline.some((t: any) => t.step.includes('Sceau SHA-256 certifié')),
    'Jalon de livraison certifiée inscrit dans la timeline de commande'
  );

  // 3. Immuabilité : tentative de changer le statut d'une expédition DELIVERED -> Rejet
  let postDeliveryChangeFailed = false;
  try {
    const illegalPostDelivery = makeReq({
      method: 'PUT',
      path: `/api/v1/logistics/shipments/${createdShipment.id}/status`,
      user: carrierUser,
      body: { nextStatus: 'IN_TRANSIT' },
    });
    if (illegalPostDelivery.statusCode >= 400) postDeliveryChangeFailed = true;
  } catch {
    postDeliveryChangeFailed = true;
  }
  assert(postDeliveryChangeFailed, 'L’état DELIVERED est un état terminal immuable qui ne peut plus être modifié');
  passed++;
  results.push('✓ [LOG-ADV-05] Preuve de livraison (POD) mobile scellée SHA-256 et immuabilité terminale validées');

  // ==========================================================================
  // [LOG-ADV-06] Cycle complet des Incidents Logistiques (Prompt 13 §6)
  // ==========================================================================
  // Créons une 2ème expédition pour tester le flux complet d'incident
  const shipment2Res = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/shipments',
    user: supplierUser,
    body: {
      orderId: 'ord-adv-log-01',
      packages: testPackages,
      pickupAddress: testPickupAddress,
      deliveryAddress: testDeliveryAddress,
      carrierId: carrierUser.id,
      carrierName: carrierUser.companyName,
    },
  });
  const shp2 = shipment2Res.body.data.shipment;

  // Passer en transit
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shp2.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'PICKED_UP' },
  });
  makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/shipments/${shp2.id}/status`,
    user: carrierUser,
    body: { nextStatus: 'IN_TRANSIT' },
  });

  // 1. Déclaration d'un incident critique (panne frigorifique survenue en cours de route)
  const reportIncRes = makeReq({
    method: 'POST',
    path: '/api/v1/logistics/incidents',
    user: carrierUser,
    body: {
      shipmentId: shp2.id,
      title: 'Avarie compresseur groupe frigorifique ThermoKing',
      description: 'Coupure compresseur à Algésiras. Température montée à -9°C. Transfert d’urgence sur groupe de secours.',
      severity: 'CRITICAL',
      category: 'COLD_CHAIN_BREACH',
      evidencePhotos: ['https://storage.tradelink.int/incidents/thermoking-alarm-error-code.jpg'],
      gpsLocation: {
        latitude: 36.1333,
        longitude: -5.45,
        address: 'Aire de fret Port Algésiras',
      },
    },
  });

  assert(reportIncRes.statusCode === 201, 'Déclaration incident retourne 201');
  const incident = reportIncRes.body.data;
  assert(incident.status === 'OPEN', 'Statut incident initial = OPEN');
  assert(incident.severity === 'CRITICAL', 'Gravité = CRITICAL');
  assert(incident.notificationsSent.length >= 3, 'Notifications automatiques adressées au client, transporteur et admin');

  // Vérifier que le statut de l'expédition est automatiquement passé à INCIDENT
  const verifyShpIncRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${shp2.id}`,
    user: adminUser,
  });
  assert(verifyShpIncRes.body.data.status === 'INCIDENT', 'Expédition basculée en statut INCIDENT suite à incident critique');

  // 2. Clôture et résolution de l'incident avec mesures correctives
  const resolveIncRes = makeReq({
    method: 'PUT',
    path: `/api/v1/logistics/incidents/${incident.id}/resolve`,
    user: adminUser,
    body: {
      resolutionNotes: 'Groupe frigorifique de secours enclenché, température redescendue et stabilisée à -19.5°C. Marchandise saine.',
      actionTaken: 'CARGO_REPLACED',
      resumeShipmentStatus: 'IN_TRANSIT',
    },
  });

  assert(resolveIncRes.statusCode === 200, 'Résolution incident retourne 200');
  assert(resolveIncRes.body.data.status === 'RESOLVED', 'Incident marqué RESOLVED');
  assert(resolveIncRes.body.data.resolvedBy === adminUser.email, 'Résolu par l’administration');

  // Vérifier reprise de l'expédition en transit
  const verifyResumedShp = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${shp2.id}`,
    user: adminUser,
  });
  assert(verifyResumedShp.body.data.status === 'IN_TRANSIT', 'Expédition réarmée au statut IN_TRANSIT après résolution');
  passed++;
  results.push('✓ [LOG-ADV-06] Cycle complet d’incident logistique (déclaration, blocage, notifications et résolution) validé');

  // ==========================================================================
  // [LOG-ADV-07] Cloisonnement strict RBAC Anti-IDOR (Prompt 13 §7)
  // ==========================================================================
  // 1. Client 1 peut consulter sa propre expédition
  const cli1AllowedRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${createdShipment.id}`,
    user: clientUser,
  });
  assert(cli1AllowedRes.statusCode === 200, 'Client 1 autorisé sur sa propre expédition');

  // 2. Client 2 tente de consulter l'expédition du Client 1 -> Rejet 403 (Anti-IDOR)
  const cli2IdorBlockedRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${createdShipment.id}`,
    user: otherClientUser,
  });
  assert(cli2IdorBlockedRes.statusCode === 403, 'Tentative IDOR Client 2 sur expédition Client 1 bloquée (403)');

  // 3. Transporteur 2 tente de consulter l'expédition confiée au Transporteur 1 -> Rejet 403
  const carr2IdorBlockedRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${createdShipment.id}`,
    user: carrierUser2,
  });
  assert(carr2IdorBlockedRes.statusCode === 403, 'Tentative IDOR Transporteur non-assigné bloquée (403)');

  // 4. Admin consulte n'importe quelle expédition -> Autorisé
  const adminAllowedRes = makeReq({
    method: 'GET',
    path: `/api/v1/logistics/shipments/${createdShipment.id}`,
    user: adminUser,
  });
  assert(adminAllowedRes.statusCode === 200, 'Administrateur possède une visibilité transverse totale (200)');
  passed++;
  results.push('✓ [LOG-ADV-07] Cloisonnement strict RBAC et étanchéité Anti-IDOR multi-acteurs validés');

  return { passed, results };
}

if (typeof require !== 'undefined' && require.main === module) {
  try {
    const { passed, results } = runAdvancedLogisticsTests();
    console.log(`\n=== SUITE DE TESTS AVANCÉE LOGISTIQUE TRADELINK V6.0 (${passed}/7 RÉUSSIS) ===`);
    results.forEach((r) => console.log(r));
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Échec de la suite de tests avancée logistique :');
    console.error(error);
    process.exit(1);
  }
}
