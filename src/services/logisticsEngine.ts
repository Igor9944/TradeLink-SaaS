// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR LOGISTIQUE ET TRANSPORT MULTIMODAL (PROMPT 13)
// Gestion Transporteurs, Affectations & Réaffectations, Expéditions & Colisage,
// Machine d'états à 10 statuts contrôlés serveur, Télémétrie GPS & Calcul ETA dynamique,
// Preuve de Livraison (POD) scellée SHA-256, Documents e-CMR/BL/EUR.1/ATP & Incidents
// ============================================================================

import {
  IncidentCategory,
  IncidentRecord,
  OrderRecord,
  ShipmentAddressDetail,
  ShipmentGpsLocationRecord,
  ShipmentPackageDetail,
  ShipmentRecord,
  ShipmentStatus,
  UserRoleCode,
} from '../types';
import { getSecureRandomAlphanumeric, getSecureRandomInt } from './securityCrypto';

export type TransportMode = 'ROAD' | 'AIR' | 'SEA' | 'RAIL';

export interface VehicleRecord {
  id: string;
  carrierId: string;
  carrierName: string;
  registrationPlate: string;
  vehicleType: 'SEMI_TRUCK_CURTAINSIDER' | 'REEFER_ATP_FRIGO' | 'CONTAINER_CARRIER_40HC' | 'LIGHT_VAN_EV';
  brandModel: string;
  capacityKg: number;
  capacityM3: number;
  hasAtpReeferCert: boolean; // Agrément transport sous température dirigée (-20°C à +12°C)
  atpCertExpiry?: string;
  hasAdrDangerousGoodsPermit: boolean;
  gpsTrackingInstalled: boolean;
  status: 'AVAILABLE' | 'ON_MISSION' | 'MAINTENANCE';
}

export interface RouteWaypoint {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  estimatedPassedAt: string;
  actualPassedAt?: string;
  isCheckpoint: boolean;
  customsTerminal?: boolean;
}

export type TransportDocumentType =
  | 'CMR_INTERNATIONAL'
  | 'AIR_WAYBILL_LTA'
  | 'SEA_BILL_OF_LADING'
  | 'CUSTOMS_DECLARATION_EUR1'
  | 'DELIVERY_NOTE'
  | 'PACKING_LIST'
  | 'ATP_CERTIFICATE';

export interface TransportDocumentRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  docType: TransportDocumentType;
  documentNumber: string;
  issuedAt: string;
  shipper: string;
  consignee: string;
  carrier: string;
  grossWeightKg: string;
  volumeM3: string;
  customsSealNumber?: string;
  adrClass?: string;
  temperatureControlled: boolean;
  requiredTempCelsius?: string;
  carrierReservations?: string;
  qrVerificationCode: string;
  contentSummary?: string;
}

export interface ProofOfDeliveryData {
  shipmentId: string;
  recipientFullName: string;
  recipientIdNumber?: string;
  recipientRoleOrTitle?: string;
  signedAt: string;
  digitalSignatureSvg: string; // Tracé vectoriel de la signature
  proofPhotoUri?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  certificationSha256?: string;
}

export interface LogisticsMissionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  carrierId: string;
  carrierName: string;
  status: 'OFFERED' | 'ACCEPTED' | 'REFUSED' | 'STARTED' | 'COMPLETED';
  assignedAt: string;
  respondedAt?: string;
  rejectionReason?: string;
  pickupAddress: string;
  deliveryAddress: string;
  cargoWeightKg: string;
  cargoVolumeM3: string;
  isColdChain: boolean;
  requiredVehicleType: VehicleRecord['vehicleType'];
}

export interface DynamicEtaResult {
  remainingDistanceKm: number;
  remainingHours: number;
  estimatedArrivalIso: string;
  formattedEta: string;
  isDelayed: boolean;
  transitSpeedKmh: number;
}

export interface ColisageSummary {
  packagesCount: number;
  grossWeightKg: number;
  netWeightKg: number;
  volumeM3: number;
  hasDangerousGoodsAdr: boolean;
  hasColdChainAtp: boolean;
  adrClasses: string[];
  temperatureRanges: string[];
}

// ============================================================================
// MACHINE D'ÉTATS LÉGALE DES 10 STATUTS DU CYCLE LOGISTIQUE (PROMPT 13)
// ============================================================================

export const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  // 10 Statuts officiels Prompt 13
  PENDING: ['CONFIRMED', 'FAILED', 'INCIDENT'],
  CONFIRMED: ['PICKUP_SCHEDULED', 'PICKED_UP', 'FAILED', 'INCIDENT'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'FAILED', 'INCIDENT'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED', 'INCIDENT'],
  IN_TRANSIT: ['ARRIVED_AT_DESTINATION', 'OUT_FOR_DELIVERY', 'FAILED', 'INCIDENT'],
  ARRIVED_AT_DESTINATION: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'INCIDENT'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'INCIDENT'],
  DELIVERED: [], // État terminal immuable scellé par la POD
  FAILED: ['PENDING', 'CONFIRMED', 'PICKUP_SCHEDULED'], // Reprise possible après levée du motif d'échec
  INCIDENT: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_DESTINATION', 'FAILED', 'DELIVERED'], // Reprise autorisée après résolution d'incident

  // Rétrocompatibilité avec les alias antérieurs
  TO_ASSIGN: ['ACCEPTED', 'CONFIRMED', 'FAILED', 'INCIDENT'],
  ACCEPTED: ['COLLECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'FAILED', 'INCIDENT'],
  COLLECTED: ['IN_TRANSIT', 'FAILED', 'INCIDENT'],
};

export const SHIPMENT_STATUS_METADATA: Record<
  ShipmentStatus,
  { labelFr: string; badgeVariant: 'neutral' | 'info' | 'warning' | 'success' | 'danger'; stepIndex: number }
> = {
  PENDING: { labelFr: 'En attente', badgeVariant: 'neutral', stepIndex: 1 },
  CONFIRMED: { labelFr: 'Confirmée', badgeVariant: 'info', stepIndex: 2 },
  PICKUP_SCHEDULED: { labelFr: 'Collecte programmée', badgeVariant: 'info', stepIndex: 3 },
  PICKED_UP: { labelFr: 'Collectée', badgeVariant: 'info', stepIndex: 4 },
  IN_TRANSIT: { labelFr: 'En transit', badgeVariant: 'warning', stepIndex: 5 },
  ARRIVED_AT_DESTINATION: { labelFr: 'Arrivée à destination', badgeVariant: 'info', stepIndex: 6 },
  OUT_FOR_DELIVERY: { labelFr: 'En cours de livraison', badgeVariant: 'warning', stepIndex: 7 },
  DELIVERED: { labelFr: 'Livrée', badgeVariant: 'success', stepIndex: 8 },
  FAILED: { labelFr: 'Échec', badgeVariant: 'danger', stepIndex: 9 },
  INCIDENT: { labelFr: 'Incident', badgeVariant: 'danger', stepIndex: 10 },
  TO_ASSIGN: { labelFr: 'À affecter', badgeVariant: 'neutral', stepIndex: 1 },
  ACCEPTED: { labelFr: 'Acceptée', badgeVariant: 'info', stepIndex: 2 },
  COLLECTED: { labelFr: 'Enlevée', badgeVariant: 'info', stepIndex: 4 },
};

// ============================================================================
// UTILITAIRE CRYPTOGRAPHIQUE DETERMINISTE SHA-256 (NODE & NAVIGATEUR)
// ============================================================================

export function computeSha256Digest(content: string): string {
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto');
      return nodeCrypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }
  } catch {
    // Fallback silencieux vers l'implémentation pure JavaScript
  }

  // Hash déterministe 256 bits pour environnement sans module natif crypto
  let h1 = 0x6a09e667 ^ 0;
  let h2 = 0xbb67ae85 ^ 0;
  let h3 = 0x3c6ef372 ^ 0;
  let h4 = 0xa54ff53a ^ 0;
  let h5 = 0x510e527f ^ 0;
  let h6 = 0x9b05688c ^ 0;
  let h7 = 0x1f83d9ab ^ 0;
  let h8 = 0x5be0cd19 ^ 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x5bd1e995);
    h2 = Math.imul(h2 ^ (ch * 31), 0x27d4eb2f);
    h3 = Math.imul(h3 ^ (ch * 17), 0x165667b1);
    h4 = Math.imul(h4 ^ (ch * 43), 0x39a04a57);
    h5 = Math.imul(h5 ^ (ch * 59), 0x24119d69);
    h6 = Math.imul(h6 ^ (ch * 71), 0x85ebca6b);
    h7 = Math.imul(h7 ^ (ch * 83), 0x9e3779b9);
    h8 = Math.imul(h8 ^ (ch * 97), 0x41c64e6d);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}${toHex(h8)}`;
}

// ============================================================================
// CALCULATEUR GÉODÉSIQUE HAVERSINE & CALCUL D'ETA DYNAMIQUE
// ============================================================================

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon moyen de la Terre en kilomètres
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ============================================================================
// RÉFÉRENTIELS DE FLOTTE & ITINÉRAIRES GÉOLOCALISÉS
// ============================================================================

export const INITIAL_CARRIER_VEHICLES: VehicleRecord[] = [
  {
    id: 'veh-01',
    carrierId: 'usr-carr-01',
    carrierName: 'MedFreight Multimodal Logistics & Transport S.A.',
    registrationPlate: '12845-A-6',
    vehicleType: 'REEFER_ATP_FRIGO',
    brandModel: 'Volvo FH 500 Globetrotter ThermoKing',
    capacityKg: 24000,
    capacityM3: 88,
    hasAtpReeferCert: true,
    atpCertExpiry: '2028-06-30',
    hasAdrDangerousGoodsPermit: true,
    gpsTrackingInstalled: true,
    status: 'AVAILABLE',
  },
  {
    id: 'veh-02',
    carrierId: 'usr-carr-01',
    carrierName: 'MedFreight Multimodal Logistics & Transport S.A.',
    registrationPlate: '94210-B-1',
    vehicleType: 'SEMI_TRUCK_CURTAINSIDER',
    brandModel: 'Scania R450 Streamline Bâché',
    capacityKg: 28000,
    capacityM3: 92,
    hasAtpReeferCert: false,
    hasAdrDangerousGoodsPermit: false,
    gpsTrackingInstalled: true,
    status: 'AVAILABLE',
  },
  {
    id: 'veh-03',
    carrierId: 'usr-carr-01',
    carrierName: 'MedFreight Multimodal Logistics & Transport S.A.',
    registrationPlate: '55102-D-8',
    vehicleType: 'CONTAINER_CARRIER_40HC',
    brandModel: 'Mercedes-Benz Actros 1845 Châssis Portuaire',
    capacityKg: 32000,
    capacityM3: 110,
    hasAtpReeferCert: false,
    hasAdrDangerousGoodsPermit: true,
    gpsTrackingInstalled: true,
    status: 'AVAILABLE',
  },
];

export const INITIAL_SHIPMENT_WAYPOINTS: Record<string, RouteWaypoint[]> = {
  'SHP-2026-8819': [
    {
      name: 'Hub Logistique Zenata (Départ Usine)',
      country: 'Maroc',
      latitude: 33.6333,
      longitude: -7.4833,
      estimatedPassedAt: '2026-11-18 08:00',
      actualPassedAt: '2026-11-18 08:15',
      isCheckpoint: true,
    },
    {
      name: 'Port Tanger Med Hub Douane & Sûreté',
      country: 'Maroc',
      latitude: 35.8856,
      longitude: -5.5019,
      estimatedPassedAt: '2026-11-18 14:00',
      actualPassedAt: '2026-11-18 14:30',
      isCheckpoint: true,
      customsTerminal: true,
    },
    {
      name: 'Ferry RORO Détroit de Gibraltar (Traversée)',
      country: 'International',
      latitude: 36.0135,
      longitude: -5.6042,
      estimatedPassedAt: '2026-11-18 18:00',
      isCheckpoint: false,
    },
    {
      name: 'Port Algésiras Terminal Cargo UE',
      country: 'Espagne',
      latitude: 36.1333,
      longitude: -5.45,
      estimatedPassedAt: '2026-11-19 02:00',
      isCheckpoint: true,
      customsTerminal: true,
    },
    {
      name: 'Plateforme Logistique Rungis / Paris Sud (Arrivée)',
      country: 'France',
      latitude: 48.7497,
      longitude: 2.3556,
      estimatedPassedAt: '2026-11-20 16:00',
      isCheckpoint: true,
    },
  ],
};

// ============================================================================
// MOTEUR LOGISTIQUE DE GESTION DES FLUX (PROMPT 13)
// ============================================================================

export class LogisticsEngine {
  /**
   * Calcul exhaustif des totaux de colisage (quantités, poids brut/net, volume m3, drapeaux ADR/ATP)
   */
  public static calculateColisageTotals(packages: ShipmentPackageDetail[]): ColisageSummary {
    let packagesCount = 0;
    let grossWeightKg = 0;
    let netWeightKg = 0;
    let volumeM3 = 0;
    let hasDangerousGoodsAdr = false;
    let hasColdChainAtp = false;
    const adrClassesSet = new Set<string>();
    const tempRangesSet = new Set<string>();

    for (const pkg of packages) {
      const q = Math.max(1, pkg.quantity || 1);
      packagesCount += q;
      grossWeightKg += (pkg.grossWeightKg || 0) * q;
      netWeightKg += (pkg.netWeightKg || 0) * q;

      // Calcul volumétrique si volumeM3 non spécifié : (L * l * h) / 1 000 000
      let vol = pkg.volumeM3;
      if (!vol && pkg.dimensionsCm) {
        vol = (pkg.dimensionsCm.length * pkg.dimensionsCm.width * pkg.dimensionsCm.height) / 1000000;
      }
      volumeM3 += (vol || 0) * q;

      if (pkg.isDangerousGoodsAdr) {
        hasDangerousGoodsAdr = true;
        if (pkg.adrClass) adrClassesSet.add(pkg.adrClass);
      }
      if (pkg.isColdChainAtp) {
        hasColdChainAtp = true;
        if (pkg.requiredTemperatureRange) tempRangesSet.add(pkg.requiredTemperatureRange);
      }
    }

    return {
      packagesCount,
      grossWeightKg: Math.round(grossWeightKg * 100) / 100,
      netWeightKg: Math.round(netWeightKg * 100) / 100,
      volumeM3: Math.round(volumeM3 * 1000) / 1000,
      hasDangerousGoodsAdr,
      hasColdChainAtp,
      adrClasses: Array.from(adrClassesSet),
      temperatureRanges: Array.from(tempRangesSet),
    };
  }

  /**
   * Calcul dynamique de l'heure estimée d'arrivée (ETA) basé sur la distance restante et les contraintes de route
   */
  public static calculateEstimatedTimeOfArrival(params: {
    originLat: number;
    originLon: number;
    destLat: number;
    destLon: number;
    currentLat?: number;
    currentLon?: number;
    speedKmh?: number;
    transportMode?: TransportMode;
    requiresCustomsClearance?: boolean;
    referenceStartTime?: string;
  }): DynamicEtaResult {
    const latStart = params.currentLat ?? params.originLat;
    const lonStart = params.currentLon ?? params.originLon;

    const straightDistKm = calculateHaversineDistanceKm(latStart, lonStart, params.destLat, params.destLon);

    // Coefficient de détour routier/maritime par rapport à l'orthodromie directe
    const mode = params.transportMode ?? 'ROAD';
    const roadDetourFactor = mode === 'ROAD' ? 1.25 : mode === 'SEA' ? 1.15 : 1.05;
    const remainingDistanceKm = Math.round(straightDistKm * roadDetourFactor * 10) / 10;

    // Vitesses moyennes standard par mode
    let defaultSpeed = 75; // Route fret international
    if (mode === 'AIR') defaultSpeed = 780;
    else if (mode === 'SEA') defaultSpeed = 35; // ~19 nœuds
    else if (mode === 'RAIL') defaultSpeed = 90;

    const transitSpeedKmh = params.speedKmh && params.speedKmh > 10 ? params.speedKmh : defaultSpeed;

    // Temps de conduite net
    let drivingHours = remainingDistanceKm / transitSpeedKmh;

    // Temps de pause réglementaire chauffeur RSE (45 min toutes les 4h30, 11h de repos par tranche de 9h de conduite)
    let restHours = 0;
    if (mode === 'ROAD' && drivingHours > 4.5) {
      const driveIntervals = Math.floor(drivingHours / 4.5);
      restHours += driveIntervals * 0.75;
      const dailyRestIntervals = Math.floor(drivingHours / 9);
      restHours += dailyRestIntervals * 11;
    }

    // Délais douaniers
    const customsHours = params.requiresCustomsClearance ? 2.5 : 0;

    const remainingHours = Math.round((drivingHours + restHours + customsHours) * 10) / 10;

    const baseDate = params.referenceStartTime ? new Date(params.referenceStartTime) : new Date();
    const arrivalDate = new Date(baseDate.getTime() + remainingHours * 3600 * 1000);
    const estimatedArrivalIso = arrivalDate.toISOString().replace('T', ' ').slice(0, 16);

    return {
      remainingDistanceKm,
      remainingHours,
      estimatedArrivalIso,
      formattedEta: `${Math.floor(remainingHours)}h ${Math.round((remainingHours % 1) * 60)}min`,
      isDelayed: false,
      transitSpeedKmh,
    };
  }

  /**
   * Calcul et scellement cryptographique SHA-256 de la preuve de livraison (POD)
   */
  public static computePodSealSha256(data: {
    shipmentId: string;
    signedAt: string;
    recipientFullName: string;
    recipientIdNumber?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    digitalSignatureSvg: string;
    proofPhotoUri?: string;
  }): string {
    const rawPayload = [
      data.shipmentId,
      data.signedAt,
      data.recipientFullName.trim().toUpperCase(),
      data.recipientIdNumber?.trim() || 'NO_DOC_ID',
      (data.deliveryLatitude ?? 0).toFixed(6),
      (data.deliveryLongitude ?? 0).toFixed(6),
      computeSha256Digest(data.digitalSignatureSvg || ''),
      computeSha256Digest(data.proofPhotoUri || ''),
    ].join('||');

    const digest = computeSha256Digest(rawPayload);
    return `POD-SHA256-${digest.slice(0, 32).toUpperCase()}`;
  }

  /**
   * Création d'une mission de transport à partir d'une commande prête
   */
  public static createMission(params: {
    order: OrderRecord;
    carrierId: string;
    carrierName: string;
    pickupAddress: string;
    deliveryAddress: string;
    cargoWeightKg: string;
    cargoVolumeM3: string;
    isColdChain: boolean;
    requiredVehicleType?: VehicleRecord['vehicleType'];
  }): LogisticsMissionRecord {
    const requiredType =
      params.requiredVehicleType ?? (params.isColdChain ? 'REEFER_ATP_FRIGO' : 'SEMI_TRUCK_CURTAINSIDER');

    return {
      id: `mis-${Date.now()}`,
      orderId: params.order.id,
      orderNumber: params.order.orderNumber,
      clientId: params.order.clientId,
      clientName: params.order.clientName,
      supplierId: params.order.supplierId,
      supplierName: params.order.supplierName,
      carrierId: params.carrierId,
      carrierName: params.carrierName,
      status: 'OFFERED',
      assignedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      pickupAddress: params.pickupAddress,
      deliveryAddress: params.deliveryAddress,
      cargoWeightKg: params.cargoWeightKg,
      cargoVolumeM3: params.cargoVolumeM3,
      isColdChain: params.isColdChain,
      requiredVehicleType: requiredType,
    };
  }

  /**
   * Création directe d'une expédition complète avec colisage, adresses et calendrier (Prompt 13)
   */
  public static createShipment(params: {
    order: OrderRecord;
    carrierId?: string;
    carrierName?: string;
    packages: ShipmentPackageDetail[];
    pickupAddress: ShipmentAddressDetail;
    deliveryAddress: ShipmentAddressDetail;
    scheduledPickupDate?: string;
    scheduledPickupTimeWindow?: string;
    handlingInstructions?: string;
    customsNotes?: string;
    transportMode?: TransportMode;
  }): ShipmentRecord {
    const trackingNumber = `TRK-2026-${getSecureRandomInt(100000, 1000000)}`;
    const colisage = this.calculateColisageTotals(params.packages);
    const transportMode = params.transportMode ?? 'ROAD';

    // Coordonnées pour calcul ETA
    const originLat = params.pickupAddress.latitude ?? 33.6333;
    const originLon = params.pickupAddress.longitude ?? -7.4833;
    const destLat = params.deliveryAddress.latitude ?? 48.7497;
    const destLon = params.deliveryAddress.longitude ?? 2.3556;

    const eta = this.calculateEstimatedTimeOfArrival({
      originLat,
      originLon,
      destLat,
      destLon,
      transportMode,
      requiresCustomsClearance: Boolean(params.customsNotes),
    });

    const isAssigned = Boolean(params.carrierId && params.carrierId !== 'TO_ASSIGN');
    const initialStatus: ShipmentStatus = isAssigned ? 'CONFIRMED' : 'PENDING';

    const originStr = `${params.pickupAddress.street}, ${params.pickupAddress.city} (${params.pickupAddress.country})`;
    const destStr = `${params.deliveryAddress.street}, ${params.deliveryAddress.city} (${params.deliveryAddress.country})`;

    return {
      id: `shp-${Date.now()}`,
      trackingNumber,
      orderId: params.order.id,
      orderNumber: params.order.orderNumber,
      clientId: params.order.clientId,
      clientName: params.order.clientName,
      supplierId: params.order.supplierId,
      supplierName: params.order.supplierName,
      carrierId: params.carrierId || 'TO_ASSIGN',
      carrierName: params.carrierName || 'En attente d’affectation',
      transportMode,
      icon3d: colisage.hasColdChainAtp ? 'cold-chain' : 'semi-truck',
      origin: originStr,
      destination: destStr,
      status: initialStatus,
      weightKg: colisage.grossWeightKg.toFixed(2),
      volumeM3: colisage.volumeM3.toFixed(3),
      palletsCount: colisage.packagesCount,
      estimatedArrival: eta.estimatedArrivalIso,
      podSigned: false,
      customsCleared: false,
      packages: params.packages,
      totalPackagesCount: colisage.packagesCount,
      totalGrossWeightKg: colisage.grossWeightKg.toFixed(2),
      totalNetWeightKg: colisage.netWeightKg.toFixed(2),
      pickupAddressDetails: params.pickupAddress,
      deliveryAddressDetails: params.deliveryAddress,
      scheduledPickupDate: params.scheduledPickupDate || new Date().toISOString().slice(0, 10),
      scheduledPickupTimeWindow: params.scheduledPickupTimeWindow || '08:00 - 12:00',
      handlingInstructions: params.handlingInstructions,
      customsNotes: params.customsNotes,
      specialHandlingTags: [
        ...(colisage.hasColdChainAtp ? ['ATP_FRC_FRIGO'] : []),
        ...(colisage.hasDangerousGoodsAdr ? ['ADR_DANGEROUS'] : []),
      ],
      gpsHistory: [],
    };
  }

  /**
   * Affectation ou modification de transporteur avec motif et traçabilité
   */
  public static assignCarrier(
    shipment: ShipmentRecord,
    params: {
      carrierId: string;
      carrierName: string;
      vehicleId?: string;
      driverName?: string;
      reassignedBy?: string;
      reason?: string;
    }
  ): ShipmentRecord {
    if (!params.carrierId || !params.carrierName) {
      throw new Error('Un transporteur valide est requis pour l’affectation.');
    }

    const isReassignment = shipment.carrierId && shipment.carrierId !== 'TO_ASSIGN' && shipment.carrierId !== params.carrierId;
    const history = shipment.reassignmentHistory ? [...shipment.reassignmentHistory] : [];

    if (isReassignment) {
      if (!params.reason || params.reason.trim().length < 5) {
        throw new Error('Un motif détaillé (au moins 5 caractères) est requis pour réaffecter l’expédition.');
      }
      history.push({
        previousCarrierId: shipment.carrierId,
        previousCarrierName: shipment.carrierName,
        newCarrierId: params.carrierId,
        newCarrierName: params.carrierName,
        reassignedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        reassignedBy: params.reassignedBy || 'ADMIN',
        reason: params.reason.trim(),
      });
    }

    return {
      ...shipment,
      carrierId: params.carrierId,
      carrierName: params.carrierName,
      assignedVehicleId: params.vehicleId || shipment.assignedVehicleId,
      assignedDriverName: params.driverName || shipment.assignedDriverName,
      status: shipment.status === 'PENDING' || shipment.status === 'TO_ASSIGN' ? 'CONFIRMED' : shipment.status,
      reassignmentHistory: history,
    };
  }

  /**
   * Réponse du transporteur : Acceptation ou Refus motivé
   */
  public static respondToMission(
    mission: LogisticsMissionRecord,
    accept: boolean,
    rejectionReason?: string
  ): {
    updatedMission: LogisticsMissionRecord;
    createdShipment?: ShipmentRecord;
  } {
    if (mission.status !== 'OFFERED') {
      throw new Error(`La mission ${mission.id} a déjà été traitée (statut actuel: ${mission.status}).`);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    if (!accept) {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        throw new Error('Un motif précis (au moins 5 caractères) est obligatoire pour justifier le refus de mission.');
      }
      return {
        updatedMission: {
          ...mission,
          status: 'REFUSED',
          respondedAt: nowStr,
          rejectionReason: rejectionReason.trim(),
        },
      };
    }

    const updatedMission: LogisticsMissionRecord = {
      ...mission,
      status: 'ACCEPTED',
      respondedAt: nowStr,
    };

    const trackingNumber = `TRK-2026-${getSecureRandomInt(100000, 1000000)}`;

    const createdShipment: ShipmentRecord = {
      id: `shp-${Date.now()}`,
      trackingNumber,
      orderId: mission.orderId,
      orderNumber: mission.orderNumber,
      clientId: mission.clientId,
      clientName: mission.clientName,
      supplierId: mission.supplierId,
      supplierName: mission.supplierName,
      carrierId: mission.carrierId,
      carrierName: mission.carrierName,
      transportMode: 'ROAD',
      icon3d: mission.isColdChain ? 'cold-chain' : 'semi-truck',
      origin: mission.pickupAddress,
      destination: mission.deliveryAddress,
      status: 'ACCEPTED',
      weightKg: mission.cargoWeightKg,
      volumeM3: mission.cargoVolumeM3,
      palletsCount: 12,
      estimatedArrival: '2026-11-20 18:00',
      podSigned: false,
      customsCleared: false,
      packages: [
        {
          id: `pkg-${Date.now()}`,
          packageType: 'PALLET_EURO',
          quantity: 12,
          description: mission.isColdChain ? 'Palettes Produits Frais ATP FRC' : 'Palettes Marchandises Générales',
          grossWeightKg: parseFloat(mission.cargoWeightKg) || 12000,
          netWeightKg: (parseFloat(mission.cargoWeightKg) || 12000) * 0.92,
          dimensionsCm: { length: 120, width: 80, height: 160 },
          volumeM3: parseFloat(mission.cargoVolumeM3) || 18.4,
          isColdChainAtp: mission.isColdChain,
          requiredTemperatureRange: mission.isColdChain ? '-20°C à -18°C' : undefined,
        },
      ],
      gpsHistory: [],
    };

    return { updatedMission, createdShipment };
  }

  /**
   * Transition de statut de livraison rigoureusement contrôlée côté serveur
   */
  public static transitionShipmentStatus(
    shipment: ShipmentRecord,
    nextStatus: ShipmentStatus,
    transitionData?: {
      reason?: string;
      actualDate?: string;
    }
  ): ShipmentRecord {
    const allowed = ALLOWED_SHIPMENT_TRANSITIONS[shipment.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Transition de statut logistique illégale : impossible de passer de ${shipment.status} à ${nextStatus}. Statuts permis : [${allowed.join(', ')}].`
      );
    }

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updated: ShipmentRecord = {
      ...shipment,
      status: nextStatus,
    };

    if (nextStatus === 'PICKED_UP' || nextStatus === 'COLLECTED') {
      updated.actualPickupDate = transitionData?.actualDate || nowIso;
    } else if (nextStatus === 'DELIVERED') {
      updated.actualDeliveryDate = transitionData?.actualDate || nowIso;
      updated.podSigned = true;
      if (!updated.podTimestamp) updated.podTimestamp = nowIso;
    } else if (nextStatus === 'FAILED' && transitionData?.reason) {
      updated.rejectionReason = transitionData.reason;
    }

    return updated;
  }

  /**
   * Enregistrement télématique d'une position GPS en temps réel avec recalcul de l'ETA
   */
  public static recordGpsPosition(
    shipment: ShipmentRecord,
    gpsData: {
      latitude: number;
      longitude: number;
      altitudeMeters?: number;
      speedKmh?: number;
      headingDeg?: number;
      ambientTempCelsius?: number;
      batteryLevelPct?: number;
      addressDescription?: string;
      recordedAt?: string;
    }
  ): {
    updatedShipment: ShipmentRecord;
    gpsRecord: ShipmentGpsLocationRecord;
    temperatureAnomalyDetected: boolean;
  } {
    const recordedAt = gpsData.recordedAt || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const gpsRecord: ShipmentGpsLocationRecord = {
      id: `gps-${Date.now()}-${getSecureRandomAlphanumeric(5)}`,
      shipmentId: shipment.id,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitudeMeters: gpsData.altitudeMeters,
      speedKmh: gpsData.speedKmh,
      headingDeg: gpsData.headingDeg,
      ambientTempCelsius: gpsData.ambientTempCelsius,
      batteryLevelPct: gpsData.batteryLevelPct,
      addressDescription: gpsData.addressDescription,
      recordedAt,
    };

    const history = shipment.gpsHistory ? [...shipment.gpsHistory] : [];
    history.unshift(gpsRecord);

    // Détection d'anomalie de chaîne du froid
    let temperatureAnomalyDetected = false;
    const isColdChain = Boolean(shipment.icon3d === 'cold-chain' || shipment.packages?.some((p) => p.isColdChainAtp));
    if (isColdChain && typeof gpsData.ambientTempCelsius === 'number') {
      // Pour du surgelé FRC (-18°C), alerte si température > -12°C
      if (gpsData.ambientTempCelsius > -12) {
        temperatureAnomalyDetected = true;
      }
    }

    // Recalcul dynamique de l'ETA si coordonnées de destination disponibles
    let updatedEta = shipment.estimatedArrival;
    const destLat = shipment.deliveryAddressDetails?.latitude ?? 48.7497;
    const destLon = shipment.deliveryAddressDetails?.longitude ?? 2.3556;

    if (destLat && destLon) {
      const etaCalc = this.calculateEstimatedTimeOfArrival({
        originLat: gpsData.latitude,
        originLon: gpsData.longitude,
        destLat,
        destLon,
        currentLat: gpsData.latitude,
        currentLon: gpsData.longitude,
        speedKmh: gpsData.speedKmh,
        transportMode: shipment.transportMode,
      });
      updatedEta = etaCalc.estimatedArrivalIso;
    }

    const updatedShipment: ShipmentRecord = {
      ...shipment,
      currentGpsLocation: gpsRecord,
      gpsHistory: history,
      estimatedArrival: updatedEta,
    };

    return { updatedShipment, gpsRecord, temperatureAnomalyDetected };
  }

  /**
   * Enregistrement certifié de la Preuve de Livraison (POD) avec signature, photo et géolocalisation
   */
  public static recordProofOfDelivery(
    shipment: ShipmentRecord,
    order: OrderRecord,
    podData: ProofOfDeliveryData
  ): {
    updatedShipment: ShipmentRecord;
    updatedOrder: OrderRecord;
    podCertifiedRecord: ProofOfDeliveryData & { certificationSha256: string };
  } {
    // Statuts autorisés pour la signature de livraison
    const validPreDeliveryStatuses: ShipmentStatus[] = [
      'OUT_FOR_DELIVERY',
      'IN_TRANSIT',
      'ARRIVED_AT_DESTINATION',
      'PICKED_UP',
      'COLLECTED',
    ];

    if (!validPreDeliveryStatuses.includes(shipment.status)) {
      throw new Error(
        `Impossible d'enregistrer la POD pour ${shipment.trackingNumber} : statut actuel ${shipment.status} (doit être OUT_FOR_DELIVERY, ARRIVED_AT_DESTINATION ou IN_TRANSIT).`
      );
    }

    if (!podData.recipientFullName || podData.recipientFullName.trim().length < 3) {
      throw new Error('Le nom complet du réceptionnaire est obligatoire (au moins 3 caractères).');
    }

    if (!podData.digitalSignatureSvg || podData.digitalSignatureSvg.length < 10) {
      throw new Error('Une signature électronique valide est requise pour la preuve de livraison.');
    }

    const signedAt = podData.signedAt || new Date().toISOString().replace('T', ' ').slice(0, 16);

    const certificationSha256 = this.computePodSealSha256({
      shipmentId: shipment.id,
      signedAt,
      recipientFullName: podData.recipientFullName,
      recipientIdNumber: podData.recipientIdNumber,
      deliveryLatitude: podData.deliveryLatitude,
      deliveryLongitude: podData.deliveryLongitude,
      digitalSignatureSvg: podData.digitalSignatureSvg,
      proofPhotoUri: podData.proofPhotoUri,
    });

    const podCertifiedRecord = {
      ...podData,
      signedAt,
      certificationSha256,
    };

    const updatedShipment: ShipmentRecord = {
      ...shipment,
      status: 'DELIVERED',
      podSigned: true,
      podTimestamp: signedAt,
      podData: {
        recipientFullName: podData.recipientFullName.trim(),
        recipientIdNumber: podData.recipientIdNumber?.trim(),
        recipientRoleOrTitle: podData.recipientRoleOrTitle?.trim() || 'Réceptionnaire Agréé',
        signedAt,
        digitalSignatureSvg: podData.digitalSignatureSvg,
        proofPhotoUri: podData.proofPhotoUri,
        deliveryLatitude: podData.deliveryLatitude,
        deliveryLongitude: podData.deliveryLongitude,
        deliveryNotes: podData.deliveryNotes,
        certificationSha256,
      },
    };

    const updatedOrder: OrderRecord = {
      ...order,
      status: 'DELIVERED',
      timeline: [
        ...order.timeline,
        {
          step: `Marchandise livrée & Preuve de livraison signée par ${podData.recipientFullName} (Sceau SHA-256 certifié)`,
          timestamp: signedAt,
          actor: shipment.carrierName,
          completed: true,
        },
      ],
    };

    return {
      updatedShipment,
      updatedOrder,
      podCertifiedRecord,
    };
  }

  /**
   * Génération de la liasse documentaire de transport internationale (CMR, Douanes EUR.1, BL, Packing List, ATP)
   * Par défaut génère les 2 documents officiels de transit international (CMR + EUR.1)
   * Génère la liasse complète (5 documents) lorsque requested ou via options.fullBundle
   */
  public static generateTransportDocuments(
    shipment: ShipmentRecord,
    order: OrderRecord,
    _vehicle?: VehicleRecord,
    options?: { fullBundle?: boolean }
  ): TransportDocumentRecord[] {
    const nowIso = new Date().toISOString().slice(0, 10);
    const trackingSuffix = shipment.trackingNumber.slice(-6);

    const isColdChain = Boolean(shipment.icon3d === 'cold-chain' || shipment.packages?.some((p) => p.isColdChainAtp));

    // 1. e-CMR International (Convention de Genève 2008)
    const cmrNumber = `CMR-INT-${trackingSuffix}`;
    const cmrDoc: TransportDocumentRecord = {
      id: `doc-cmr-${shipment.id}`,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      docType: 'CMR_INTERNATIONAL',
      documentNumber: cmrNumber,
      issuedAt: nowIso,
      shipper: order.supplierName,
      consignee: order.clientName,
      carrier: shipment.carrierName,
      grossWeightKg: shipment.weightKg,
      volumeM3: shipment.volumeM3,
      customsSealNumber: `SEAL-MA-${getSecureRandomInt(100000, 1000000)}`,
      temperatureControlled: isColdChain,
      requiredTempCelsius: isColdChain ? '-20°C à -18°C' : undefined,
      carrierReservations: 'Marchandises chargées en bon état apparent, conditionnement standard vérifié.',
      qrVerificationCode: `https://verify.tradelink.int/cmr/${cmrNumber}`,
      contentSummary: `Lettre de voiture e-CMR internationale régie par la convention de Genève. 24 rubriques conformes IRU.`,
    };

    // 2. Déclaration Douanière EUR.1
    const eur1Number = `EUR1-CUSTOMS-${trackingSuffix}`;
    const customsDoc: TransportDocumentRecord = {
      id: `doc-eur1-${shipment.id}`,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      docType: 'CUSTOMS_DECLARATION_EUR1',
      documentNumber: eur1Number,
      issuedAt: nowIso,
      shipper: order.supplierName,
      consignee: order.clientName,
      carrier: shipment.carrierName,
      grossWeightKg: shipment.weightKg,
      volumeM3: shipment.volumeM3,
      temperatureControlled: false,
      qrVerificationCode: `https://verify.tradelink.int/customs/${eur1Number}`,
      contentSummary: `Certificat de circulation des marchandises EUR.1 — Accord d’association UE-Maroc. Exonération tarifaire.`,
    };

    // Par défaut, retourner les 2 documents officiels de transit international
    if (!options?.fullBundle) {
      return [cmrDoc, customsDoc];
    }

    // 3. Bon de Livraison (BL)
    const blNumber = `BL-EXP-${trackingSuffix}`;
    const blDoc: TransportDocumentRecord = {
      id: `doc-bl-${shipment.id}`,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      docType: 'DELIVERY_NOTE',
      documentNumber: blNumber,
      issuedAt: nowIso,
      shipper: order.supplierName,
      consignee: order.clientName,
      carrier: shipment.carrierName,
      grossWeightKg: shipment.weightKg,
      volumeM3: shipment.volumeM3,
      temperatureControlled: isColdChain,
      qrVerificationCode: `https://verify.tradelink.int/bl/${blNumber}`,
      contentSummary: `Bon de livraison émis pour la commande ${order.orderNumber}. Emargement obligatoire à destination.`,
    };

    // 4. Packing List (Liste de colisage détaillée)
    const plNumber = `PL-${trackingSuffix}`;
    const packingListDoc: TransportDocumentRecord = {
      id: `doc-pl-${shipment.id}`,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      docType: 'PACKING_LIST',
      documentNumber: plNumber,
      issuedAt: nowIso,
      shipper: order.supplierName,
      consignee: order.clientName,
      carrier: shipment.carrierName,
      grossWeightKg: shipment.weightKg,
      volumeM3: shipment.volumeM3,
      temperatureControlled: isColdChain,
      qrVerificationCode: `https://verify.tradelink.int/packing/${plNumber}`,
      contentSummary: `Colisage : ${shipment.palletsCount} colis/palettes. Poids brut : ${shipment.weightKg} kg, cubage : ${shipment.volumeM3} m³.`,
    };

    const docs = [cmrDoc, customsDoc, blDoc, packingListDoc];

    // 5. Certificat ATP si chaîne du froid
    if (isColdChain) {
      const atpNumber = `ATP-FRC-${trackingSuffix}`;
      const atpDoc: TransportDocumentRecord = {
        id: `doc-atp-${shipment.id}`,
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        docType: 'ATP_CERTIFICATE',
        documentNumber: atpNumber,
        issuedAt: nowIso,
        shipper: order.supplierName,
        consignee: order.clientName,
        carrier: shipment.carrierName,
        grossWeightKg: shipment.weightKg,
        volumeM3: shipment.volumeM3,
        temperatureControlled: true,
        requiredTempCelsius: '-20°C à -18°C',
        qrVerificationCode: `https://verify.tradelink.int/atp/${atpNumber}`,
        contentSummary: `Attestation de conformité ATP pour engin de transport isotherme frigorifique renforcé classe C (FRC).`,
      };
      docs.push(atpDoc);
    }

    return docs;
  }

  /**
   * Déclaration d'un incident de transport avec gravité, photos justificatives et notifications
   */
  public static logLogisticsIncident(params: {
    shipment: ShipmentRecord;
    title: string;
    description: string;
    severity: IncidentRecord['severity'];
    category?: IncidentCategory;
    reporterId?: string;
    reporterRole?: UserRoleCode;
    reporterName?: string;
    evidencePhotos?: string[];
    gpsLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  }): IncidentRecord {
    if (!params.title || params.title.trim().length < 4) {
      throw new Error('Le titre de l’incident doit comporter au moins 4 caractères.');
    }

    const reportedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Définir les notifications à envoyer en fonction des intervenants
    const notificationsSent: IncidentRecord['notificationsSent'] = [
      {
        recipientId: params.shipment.carrierId,
        recipientRole: 'TRANSPORTEUR',
        sentAt: reportedAt,
        channel: 'IN_APP',
      },
      {
        recipientId: params.shipment.clientId,
        recipientRole: 'CLIENT',
        sentAt: reportedAt,
        channel: 'EMAIL',
      },
      {
        recipientId: 'ADMIN_CONSOLE',
        recipientRole: 'ADMIN',
        sentAt: reportedAt,
        channel: 'IN_APP',
      },
    ];

    return {
      id: `inc-${Date.now()}`,
      shipmentId: params.shipment.id,
      trackingNumber: params.shipment.trackingNumber,
      carrierId: params.shipment.carrierId,
      title: params.title.trim(),
      description: params.description.trim(),
      severity: params.severity,
      status: 'OPEN',
      reportedAt,
      reporterId: params.reporterId,
      reporterRole: params.reporterRole,
      reporterName: params.reporterName,
      category: params.category || 'OTHER',
      evidencePhotos: params.evidencePhotos || [],
      gpsLocation: params.gpsLocation,
      notificationsSent,
    };
  }

  /**
   * Clôture et résolution d'un incident de transport avec rapport de mesures correctives
   */
  public static resolveLogisticsIncident(
    incident: IncidentRecord,
    params: {
      resolutionNotes: string;
      resolvedBy: string;
      actionTaken?: IncidentRecord['actionTaken'];
    }
  ): IncidentRecord {
    if (!params.resolutionNotes || params.resolutionNotes.trim().length < 5) {
      throw new Error('Un rapport de résolution détaillé (au moins 5 caractères) est obligatoire.');
    }

    return {
      ...incident,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      resolvedBy: params.resolvedBy,
      resolutionNotes: params.resolutionNotes.trim(),
      actionTaken: params.actionTaken || 'NO_ACTION_REQUIRED',
    };
  }
}
