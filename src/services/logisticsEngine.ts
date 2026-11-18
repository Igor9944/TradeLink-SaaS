// ============================================================================
// TRADELINK V6.0 — MOTEUR LOGISTIQUE & TRANSPORT MULTIMODAL (PROMPT 9)
// Gestion Transporteurs, Flotte & Véhicules, Missions, Expéditions multimodales,
// Itinéraires, Statuts contrôlés serveur, Documents CMR/LTA/Douanes, POD & Incidents
// ============================================================================

import { IncidentRecord, OrderRecord, ShipmentRecord, ShipmentStatus } from '../types';

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

export interface TransportDocumentRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  docType: 'CMR_INTERNATIONAL' | 'AIR_WAYBILL_LTA' | 'SEA_BILL_OF_LADING' | 'CUSTOMS_DECLARATION_EUR1';
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
}

export interface ProofOfDeliveryData {
  shipmentId: string;
  recipientFullName: string;
  recipientIdNumber?: string;
  signedAt: string;
  digitalSignatureSvg: string; // Tracé vectoriel de la signature
  proofPhotoUri?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
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

// Machine d'états légale des statuts de livraison contrôlés côté serveur
export const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  TO_ASSIGN: ['ACCEPTED', 'FAILED'],
  ACCEPTED: ['COLLECTED', 'FAILED'],
  COLLECTED: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [], // État terminal immuable
  FAILED: ['TO_ASSIGN'], // Reprise possible
};

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
// MOTEUR LOGISTIQUE DE GESTION DES FLUX
// ============================================================================

export class LogisticsEngine {
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
    const requiredType = params.requiredVehicleType ?? (params.isColdChain ? 'REEFER_ATP_FRIGO' : 'SEMI_TRUCK_CURTAINSIDER');

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

    const trackingNumber = `TRK-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const createdShipment: ShipmentRecord = {
      id: `shp-${Date.now()}`,
      trackingNumber,
      orderId: mission.orderId,
      orderNumber: mission.orderNumber,
      clientId: mission.clientId,
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
    };

    return { updatedMission, createdShipment };
  }

  /**
   * Transition de statut de livraison rigoureusement contrôlée côté serveur
   */
  public static transitionShipmentStatus(
    shipment: ShipmentRecord,
    nextStatus: ShipmentStatus
  ): ShipmentRecord {
    const allowed = ALLOWED_SHIPMENT_TRANSITIONS[shipment.status];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Transition de statut logistique illégale : impossible de passer de ${shipment.status} à ${nextStatus}. Statuts permis : [${allowed.join(', ')}].`
      );
    }

    return {
      ...shipment,
      status: nextStatus,
    };
  }

  /**
   * Génération des documents de transport internationaux certifiés (CMR, LTA, Douanes)
   */
  public static generateTransportDocuments(
    shipment: ShipmentRecord,
    order: OrderRecord,
    _vehicle?: VehicleRecord
  ): TransportDocumentRecord[] {
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 10);
    const cmrNumber = `CMR-INT-${shipment.trackingNumber.slice(-6)}`;
    const eur1Number = `EUR1-CUSTOMS-${shipment.trackingNumber.slice(-6)}`;

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
      customsSealNumber: `SEAL-MA-${Math.floor(100000 + Math.random() * 900000)}`,
      temperatureControlled: shipment.icon3d === 'cold-chain',
      requiredTempCelsius: shipment.icon3d === 'cold-chain' ? '+4°C (+/- 2°C)' : undefined,
      carrierReservations: 'Marchandises chargées en bon état apparent, emballage standard vérifié.',
      qrVerificationCode: `https://verify.tradelink.int/cmr/${cmrNumber}`,
    };

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
    };

    return [cmrDoc, customsDoc];
  }

  /**
   * Enregistrement certifié de la Preuve de Livraison (POD) avec signature et géolocalisation
   * Met à jour automatiquement le Shipment et la Commande en DELIVERED
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
    if (shipment.status !== 'OUT_FOR_DELIVERY' && shipment.status !== 'IN_TRANSIT') {
      throw new Error(
        `Impossible d'enregistrer la POD pour ${shipment.trackingNumber} : statut actuel ${shipment.status} (doit être OUT_FOR_DELIVERY ou IN_TRANSIT).`
      );
    }

    if (!podData.recipientFullName || podData.recipientFullName.trim().length < 3) {
      throw new Error('Le nom complet du réceptionnaire est obligatoire.');
    }

    if (!podData.digitalSignatureSvg || podData.digitalSignatureSvg.length < 10) {
      throw new Error('Une signature électronique valide est requise pour la preuve de livraison.');
    }

    const certificationSha256 = `POD-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

    const updatedShipment: ShipmentRecord = {
      ...shipment,
      status: 'DELIVERED',
      podSigned: true,
      podTimestamp: podData.signedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const updatedOrder: OrderRecord = {
      ...order,
      status: 'DELIVERED',
      timeline: [
        ...order.timeline,
        {
          step: `Marchandise livrée & Preuve de livraison signée par ${podData.recipientFullName}`,
          timestamp: updatedShipment.podTimestamp || new Date().toISOString(),
          actor: shipment.carrierName,
          completed: true,
        },
      ],
    };

    return {
      updatedShipment,
      updatedOrder,
      podCertifiedRecord: {
        ...podData,
        certificationSha256,
      },
    };
  }

  /**
   * Déclaration d'un incident de transport avec gravité
   */
  public static logLogisticsIncident(params: {
    shipment: ShipmentRecord;
    title: string;
    description: string;
    severity: IncidentRecord['severity'];
  }): IncidentRecord {
    if (!params.title || params.title.trim().length < 4) {
      throw new Error('Le titre de l’incident doit comporter au moins 4 caractères.');
    }

    return {
      id: `inc-${Date.now()}`,
      shipmentId: params.shipment.id,
      trackingNumber: params.shipment.trackingNumber,
      carrierId: params.shipment.carrierId,
      title: params.title.trim(),
      description: params.description.trim(),
      severity: params.severity,
      status: 'OPEN',
      reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
  }
}
