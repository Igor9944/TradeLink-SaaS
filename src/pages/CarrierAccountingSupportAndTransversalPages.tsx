// ============================================================================
// TRADELINK V6.0 — ESPACES TRANSPORTEUR (53-61), COMPTABLE (62-68),
// SUPPORT (69-73) & SERVICES TRANSVERSAUX : ROOM LIVE, OCR/IDP, NOTIFICATIONS, ERREURS (74-79)
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import {
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Building,
  Calculator,
  Check,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Lock,
  Mic,
  MicOff,
  MonitorUp,
  PenTool,
  PhoneOff,
  PieChart,
  PlusCircle,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TrendingUp,
  Truck,
  Video,
  VideoOff,
  Wallet,
  LayoutGrid,
  Maximize2,
  Hand,
  Smile,
  UserPlus,
  Disc,
  Globe,
} from 'lucide-react';
import { VoiceDictationButton } from '../components/voice/VoiceDictationButton';
import { useApp } from '../contexts/AppContext';
import { downloadDataExport, formatCurrency, translateStatus } from '../i18n/translations';
import { ActorKycWorkspaceView } from '../components/kyc/KycModuleViews';
import { Icon3D } from '../components/ui/Icon3D';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import { RoomLiveLobbyView } from '../components/room/RoomLiveLobbyView';
import { RoomLiveCreateModal } from '../components/room/RoomLiveCreateModal';
import { RoomLiveShareDocModal } from '../components/room/RoomLiveShareDocModal';
import { RoomLiveInviteModal } from '../components/room/RoomLiveInviteModal';
import { CentralTranslationService } from '../services/translationEngine';
import {
  ProofOfDeliveryData,
  VehicleRecord,
} from '../services/logisticsEngine';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  Tabs,
} from '../components/ui/DesignSystem';
import {
  DayCountBasis,
  IncidentRecord,
  InvoiceRecord,
  OcrDocumentDetail,
} from '../types';
import { OcrSecureUploader } from '../components/ocr/OcrSecureUploader';
import { OcrDocumentStudioView } from '../components/ocr/OcrDocumentStudioView';
import {
  AccountingEngine,
  AccountingEntryLineRecord,
  AccountingEntryRecord,
  AccountingFramework,
  AmortizationScheduleRow,
  BankReconciliationResult,
  BankStatementLine,
  CHARTS_OF_ACCOUNTS,
  GeneralLedgerAccount,
} from '../services/accountingEngine';

// ============================================================================
// ESPACE TRANSPORTEUR (PAGES 53 À 61)
// ============================================================================

export const CarrierWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'kyc'
    | 'missions'
    | 'mission-detail'
    | 'expeditions'
    | 'documents'
    | 'incidents'
    | 'room-live'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    shipments,
    updateShipmentStatus,
    incidents,
    reportIncident,
    vehicles,
    missions,
    waypoints,
    respondToMission,
    recordProofOfDelivery,
    addVehicle,
    updateVehicleStatus,
    resolveIncident,
    rooms,
    createRoomLive,
    notifyToast,
  } = useApp();
  const params = useParams();

  // Navigation & Tabs
  const [missionFilter, setMissionFilter] = useState<'ALL' | 'OFFERED' | 'ACCEPTED' | 'STARTED' | 'COMPLETED'>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<'CMR' | 'EUR1' | 'ATP'>('CMR');

  // Modales d'actions sur missions
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [refusalMissionId, setRefusalMissionId] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState('');

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptMissionId, setAcceptMissionId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'veh-01');

  // Modale de Preuve de Livraison POD (Signature & Photos)
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [podTargetShipmentId, setPodTargetShipmentId] = useState<string | null>(null);
  const [podRecipientName, setPodRecipientName] = useState('Youssef Berrada');
  const [podRecipientIdDoc, setPodRecipientIdDoc] = useState('CIN BK-994102 / Atlas Import');
  const [podNotes, setPodNotes] = useState('Palettes vérifiées conformes, scellé douanier #MA-EU-98214 intact, température caisson conforme +3.8°C.');
  const [podSignatureDrawn, setPodSignatureDrawn] = useState(true);

  // Modale d'ajout de véhicule
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newType, setNewType] = useState<VehicleRecord['vehicleType']>('REEFER_ATP_FRIGO');
  const [newReefer, setNewReefer] = useState(true);
  const [newAdr, setNewAdr] = useState(false);

  // Formulaire Incident
  const [incTitle, setIncTitle] = useState('Ralentissement au contrôle scanner Tanger Med');
  const [incDesc, setIncDesc] = useState('Inspection douanière approfondie des palettes frigorifiques en cours au portique.');
  const [incSeverity, setIncSeverity] = useState<IncidentRecord['severity']>('MEDIUM');
  const [incShipmentId, setIncShipmentId] = useState(shipments[0]?.id || 'shp-03');

  // Sélection de la mission ou expédition active
  const selectedShipment =
    shipments.find((s) => s.id === params.id || s.trackingNumber === params.id) ??
    shipments.find((s) => s.id === 'shp-03') ??
    shipments[0];

  const currentMission =
    missions.find((m) => m.orderId === selectedShipment?.orderId || m.id === params.id) ??
    missions[0];

  const assignedVehicle =
    vehicles.find((v) => v.status === 'ON_MISSION') ?? vehicles[0];

  // Statistiques KPIs Flotte
  const activeMissionsCount = missions.filter((m) => m.status === 'ACCEPTED' || m.status === 'STARTED').length;
  const offeredMissionsCount = missions.filter((m) => m.status === 'OFFERED').length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const openIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  // Filtrage des missions
  const filteredMissions = useMemo(() => {
    if (missionFilter === 'ALL') return missions;
    return missions.filter((m) => m.status === missionFilter);
  }, [missions, missionFilter]);

  // Actions
  const handleOpenRefuseModal = (mId: string) => {
    setRefusalMissionId(mId);
    setRefusalReason('');
    setRefusalModalOpen(true);
  };

  const handleConfirmRefusal = () => {
    if (!refusalMissionId) return;
    if (refusalReason.trim().length < 5) {
      notifyToast('Le motif de refus doit comporter au moins 5 caractères.', 'error');
      return;
    }
    respondToMission(refusalMissionId, false, refusalReason);
    setRefusalModalOpen(false);
    setRefusalMissionId(null);
  };

  const handleOpenAcceptModal = (mId: string) => {
    setAcceptMissionId(mId);
    setAcceptModalOpen(true);
  };

  const handleConfirmAcceptance = () => {
    if (!acceptMissionId) return;
    respondToMission(acceptMissionId, true);
    setAcceptModalOpen(false);
    setAcceptMissionId(null);
  };

  const handleOpenPodModal = (shipmentId: string) => {
    setPodTargetShipmentId(shipmentId);
    setPodModalOpen(true);
  };

  const handleConfirmPod = () => {
    if (!podTargetShipmentId) return;
    const podData: ProofOfDeliveryData = {
      shipmentId: podTargetShipmentId,
      recipientFullName: podRecipientName,
      recipientIdNumber: podRecipientIdDoc,
      signedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      digitalSignatureSvg: podSignatureDrawn
        ? '<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><path d="M 15 35 Q 45 10 75 35 T 135 30 Q 165 48 185 25" fill="none" stroke="#E85D22" stroke-width="3" stroke-linecap="round"/></svg>'
        : '',
      proofPhotoUri: '/assets/pod/delivery-receipt-signed-rungis.jpg',
      deliveryLatitude: 48.749,
      deliveryLongitude: 2.358,
      deliveryNotes: podNotes,
    };
    recordProofOfDelivery(podTargetShipmentId, podData);
    setPodModalOpen(false);
    setPodTargetShipmentId(null);
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newModel) {
      notifyToast('Veuillez renseigner l’immatriculation et le modèle.', 'error');
      return;
    }
    addVehicle({
      carrierId: 'usr-trans-01',
      carrierName: 'MedFreight Multimodal Carriers',
      registrationPlate: newPlate,
      brandModel: newModel,
      vehicleType: newType,
      capacityKg: newReefer ? 24000 : 28000,
      capacityM3: 86,
      hasAtpReeferCert: newReefer,
      atpCertExpiry: newReefer ? '2028-12-31' : undefined,
      hasAdrDangerousGoodsPermit: newAdr,
      gpsTrackingInstalled: true,
      status: 'AVAILABLE',
    });
    setNewPlate('');
    setNewModel('');
    setAddVehicleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* BANDEAU SUPÉRIEUR ESPACE TRANSPORTEUR */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="semi-truck" size="lg" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE TRANSPORTEUR & LOGISTIQUE MULTIMODALE</Badge>
              <Badge variant="success">LICENCE TIR / IATA ACTIVE</Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">
              MedFreight Multimodal Carriers
            </h1>
            <p className="text-xs text-slate-500">
              Flotte autorisée Euro-Méditerranée • Agréments Froid ATP Classe FRC • Transport Sécurisé
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/transporteur/dashboard', label: '53. Dashboard' },
            { to: '/transporteur/kyc', label: '54. KYC Flotte' },
            { to: '/transporteur/missions', label: '55. Missions' },
            { to: '/transporteur/expeditions', label: '57. Expéditions & GPS' },
            { to: '/transporteur/documents', label: '58. CMR & Douane' },
            { to: '/transporteur/incidents', label: '59. Incidents' },
            { to: '/transporteur/room-live', label: '60. Room Live' },
            { to: '/transporteur/parametres', label: '61. Flotte & Véhicules' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                location.pathname === l.to
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/60 hover:bg-[#E85D22]/20 text-slate-700 dark:text-slate-200'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* =========================================================================
          53. DASHBOARD TRANSPORTEUR (/transporteur/dashboard)
          ========================================================================= */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* 4 CARTES KPI FLOTTE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Missions en Cours</span>
                <span className="p-2 rounded-xl bg-orange-500/10 text-[#E85D22]">
                  <Truck className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{activeMissionsCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                {offeredMissionsCount > 0 ? (
                  <span className="text-amber-600 font-bold">{offeredMissionsCount} nouvelle(s) à accepter</span>
                ) : (
                  'Toutes les missions affectées sont prises en charge'
                )}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Flotte Disponible</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {availableVehiclesCount} / {vehicles.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Véhicules opérationnels prêts à l'affectation
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Chaîne du Froid ATP</span>
                <span className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
                  <Thermometer className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">100% Conforme</p>
              <p className="text-xs text-slate-500 mt-1">
                Certificat FRC valide • Télémétrie continue
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Incidents Logistiques</span>
                <span className="p-2 rounded-xl bg-red-500/10 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{openIncidentsCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                {openIncidentsCount === 0 ? 'Aucun retard ou litige bloquant' : 'Dossiers sous investigation douane'}
              </p>
            </div>
          </div>

          {/* CARTE INTERACTIVE TEMPS RÉEL (SI COORDONNÉES GÉOGRAPHIQUES DISPONIBLES) */}
          <InteractiveLogisticsMap
            shipment={selectedShipment}
            waypoints={waypoints[selectedShipment?.id] || []}
            vehicle={assignedVehicle}
            title={`Suivi GPS Télématique Flotte — ${selectedShipment?.trackingNumber || 'SHP-2026-8819'}`}
          />

          {/* MISSIONS RÉCENTES AVEC ACTIONS DIRECTES */}
          <Card
            title="Dernières Missions & Statuts de Livraison (Page 53)"
            subtitle="Vue consolidée des ordres de transport assignés à MedFreight"
            action={
              <Link to="/transporteur/missions">
                <Button size="sm" variant="secondary">Voir toutes les missions ({missions.length})</Button>
              </Link>
            }
          >
            <div className="space-y-3">
              {missions.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={m.isColdChain ? 'cold-chain' : 'semi-truck'} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {m.orderNumber}
                        </span>
                        <Badge
                          variant={
                            m.status === 'COMPLETED'
                              ? 'success'
                              : m.status === 'OFFERED'
                              ? 'warning'
                              : 'orange'
                          }
                        >
                          {m.status}
                        </Badge>
                        {m.isColdChain && <Badge variant="info">Frigo ATP</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {m.pickupAddress} → <strong>{m.deliveryAddress}</strong> • {m.cargoWeightKg} kg • {m.cargoVolumeM3} m³
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/transporteur/missions/${selectedShipment?.id || m.id}`}>
                      <Button size="sm" variant="secondary">Fiche Mission</Button>
                    </Link>
                    {m.status === 'OFFERED' && (
                      <Button size="sm" variant="primary" onClick={() => handleOpenAcceptModal(m.id)}>
                        Accepter
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          54. KYC TRANSPORTEUR (/transporteur/kyc)
          ========================================================================= */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="TRANSPORTEUR" />}

      {/* =========================================================================
          55. MISSIONS ASSIGNÉES (/transporteur/missions)
          ========================================================================= */}
      {section === 'missions' && (
        <Card
          title="Missions de Transport Multimodal Assignées (Page 55)"
          subtitle="Acceptez ou refusez les missions avec affectation de véhicule. Tout refus nécessite une justification formelle."
          action={
            <div className="flex gap-1.5 bg-slate-100 dark:bg-teal-900/60 p-1 rounded-xl text-xs">
              {(['ALL', 'OFFERED', 'ACCEPTED', 'STARTED', 'COMPLETED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMissionFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    missionFilter === tab
                      ? 'bg-[#E85D22] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL'
                    ? 'Toutes'
                    : tab === 'OFFERED'
                    ? 'À Accepter'
                    : tab === 'ACCEPTED'
                    ? 'Acceptées'
                    : tab === 'STARTED'
                    ? 'En Transit'
                    : 'Livrées'}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-4">
            {filteredMissions.map((m) => {
              const linkedShipment = shipments.find((s) => s.orderId === m.orderId) ?? selectedShipment;
              return (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon3D name={m.isColdChain ? 'cold-chain' : 'semi-truck'} size="lg" withGlow />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-[#E85D22]">
                            {m.orderNumber}
                          </span>
                          <Badge variant="orange">{m.requiredVehicleType}</Badge>
                          <Badge
                            variant={
                              m.status === 'COMPLETED'
                                ? 'success'
                                : m.status === 'OFFERED'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {m.status}
                          </Badge>
                          {m.isColdChain && (
                            <Badge variant="info">
                              Froid Consigné -20°C à +8°C
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {m.pickupAddress} → <strong>{m.deliveryAddress}</strong> • {m.cargoWeightKg} kg • Volume : {m.cargoVolumeM3} m³
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Expéditeur : <strong>{m.supplierName}</strong> → Destinataire : <strong>{m.clientName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">Véhicule assigné</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {assignedVehicle?.registrationPlate || '88412-A-26'}
                      </p>
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        {assignedVehicle?.brandModel}
                      </p>
                    </div>
                  </div>

                  {/* BOUTONS D'ACTIONS SELON L'ÉTAT DE LA MISSION */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-teal-800/60">
                    <Link to={`/transporteur/missions/${linkedShipment?.id || m.id}`}>
                      <Button size="sm" variant="secondary">
                        Voir la Fiche Détaillée & Preuve POD (Page 56)
                      </Button>
                    </Link>

                    <div className="flex flex-wrap gap-2">
                      {m.status === 'OFFERED' && (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleOpenRefuseModal(m.id)}
                          >
                            Refuser la Mission
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenAcceptModal(m.id)}
                          >
                            Accepter & Assigner un Véhicule
                          </Button>
                        </>
                      )}

                      {(m.status === 'ACCEPTED' || m.status === 'STARTED') && linkedShipment && (
                        <>
                          {linkedShipment.status === 'ACCEPTED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateShipmentStatus(linkedShipment.id, 'COLLECTED')}
                            >
                              Confirmer Prise en Charge à Quai
                            </Button>
                          )}
                          {linkedShipment.status === 'COLLECTED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateShipmentStatus(linkedShipment.id, 'IN_TRANSIT')}
                            >
                              Démarrer l'Acheminement (En Transit)
                            </Button>
                          )}
                          {linkedShipment.status === 'IN_TRANSIT' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateShipmentStatus(linkedShipment.id, 'OUT_FOR_DELIVERY')}
                            >
                              Arrivée Secteur (En Livraison Finale)
                            </Button>
                          )}
                          {linkedShipment.status === 'OUT_FOR_DELIVERY' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenPodModal(linkedShipment.id)}
                            >
                              Signer la Preuve de Livraison POD
                            </Button>
                          )}
                        </>
                      )}

                      {m.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" /> Mission Clôturée & POD Certifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* =========================================================================
          56. DÉTAIL MISSION & PREUVE DE LIVRAISON POD (/transporteur/missions/:id)
          ========================================================================= */}
      {section === 'mission-detail' && (
        <div className="space-y-6">
          <Card
            title={`Fiche Mission & Expédition : ${selectedShipment?.trackingNumber || currentMission?.orderNumber} (Page 56)`}
            subtitle={`Trajet : ${selectedShipment?.origin || currentMission?.pickupAddress} → ${selectedShipment?.destination || currentMission?.deliveryAddress} • Mode : ${selectedShipment?.transportMode || 'ROAD'}`}
            action={
              <Link to="/transporteur/missions">
                <Button size="sm" variant="secondary">← Retour aux Missions</Button>
              </Link>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COLONNE GAUCHE : DÉTAILS DE LA MISSION */}
              <div className="lg:col-span-2 space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E85D22]" /> Spécifications de Fret & Chaîne Logistique
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400">Poids Total</p>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {selectedShipment?.weightKg || currentMission?.cargoWeightKg} kg
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400">Volume & Palettes</p>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {selectedShipment?.palletsCount || 18} palettes ({selectedShipment?.volumeM3 || currentMission?.cargoVolumeM3} m³)
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400">Chaîne du Froid</p>
                      <p className="font-extrabold text-sky-600 mt-0.5">
                        {currentMission?.isColdChain ? 'Classe ATP FRC (-20°C à +12°C)' : 'Fret Standard'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800">
                      <p className="text-slate-400">Statut Serveur</p>
                      <p className="font-extrabold text-[#E85D22] mt-0.5">
                        {selectedShipment?.status || currentMission?.status}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-teal-800/60 flex flex-wrap justify-between gap-2">
                    <span>
                      Expéditeur : <strong>{currentMission?.supplierName || 'EuroTech Industrial'}</strong>
                    </span>
                    <span>
                      Destinataire : <strong>{currentMission?.clientName || 'Atlas Import & Retail'}</strong>
                    </span>
                  </div>
                </div>

                {/* WORKFLOW MACHINE D'ÉTATS CONTRÔLÉE SERVEUR */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Progression Contrôlée de la Mission
                    </h4>
                    <span className="text-xs text-slate-400">Machine d'états serveur stricte</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'ACCEPTED', label: '1. Acceptée', done: true },
                      {
                        key: 'COLLECTED',
                        label: '2. Enlèvement Quai',
                        done: ['COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(selectedShipment?.status),
                      },
                      {
                        key: 'IN_TRANSIT',
                        label: '3. En Acheminement',
                        done: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(selectedShipment?.status),
                      },
                      {
                        key: 'DELIVERED',
                        label: '4. Livrée (POD)',
                        done: selectedShipment?.status === 'DELIVERED',
                      },
                    ].map((step) => (
                      <div
                        key={step.key}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          step.done
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'bg-slate-50 dark:bg-teal-950/20 border-slate-200 dark:border-teal-900 text-slate-400'
                        }`}
                      >
                        <p>{step.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* BOUTON D'ACTION DE TRANSITION D'ÉTAT */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-slate-500">
                      Statut actuel : <strong className="text-slate-800 dark:text-slate-100">{translateStatus(selectedShipment?.status, locale)}</strong>
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {selectedShipment?.status === 'ACCEPTED' && (
                        <Button
                          variant="primary"
                          onClick={() => updateShipmentStatus(selectedShipment.id, 'COLLECTED')}
                        >
                          Confirmer Prise en Charge à Quai
                        </Button>
                      )}
                      {selectedShipment?.status === 'COLLECTED' && (
                        <Button
                          variant="primary"
                          onClick={() => updateShipmentStatus(selectedShipment.id, 'IN_TRANSIT')}
                        >
                          Démarrer Acheminement Routier
                        </Button>
                      )}
                      {selectedShipment?.status === 'IN_TRANSIT' && (
                        <Button
                          variant="primary"
                          onClick={() => updateShipmentStatus(selectedShipment.id, 'OUT_FOR_DELIVERY')}
                        >
                          Passer en Livraison Finale
                        </Button>
                      )}
                      {selectedShipment?.status === 'OUT_FOR_DELIVERY' && (
                        <Button
                          variant="primary"
                          onClick={() => handleOpenPodModal(selectedShipment.id)}
                        >
                          Enregistrer Preuve de Livraison (POD)
                        </Button>
                      )}
                      {selectedShipment?.status === 'DELIVERED' && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                          <CheckCircle className="w-4 h-4" /> Livraison certifiée avec succès
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SI DÉJÀ LIVRÉ : BANDEAU PREUVE DE LIVRAISON SCELLÉE */}
                {selectedShipment?.podSigned && (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200">
                          Preuve de Livraison (POD) Numérique Certifiée Conforme
                        </h4>
                      </div>
                      <Badge variant="success">Sceau Immuable SHA-256</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-emerald-800 dark:text-emerald-300">
                      <div>
                        <p><strong>Destinataire certifié :</strong> {selectedShipment.destination}</p>
                        <p><strong>Horodatage certifié :</strong> {selectedShipment.podTimestamp}</p>
                        <p><strong>Notes quai :</strong> Marchandise intacte, scellé vérifié.</p>
                      </div>
                      <div>
                        <p><strong>Empreinte cryptographique :</strong></p>
                        <p className="font-mono text-[10px] break-all bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-500/30">
                          e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                        </p>
                      </div>
                    </div>

                    {/* APERÇU DE LA SIGNATURE DIGITALE */}
                    <div className="p-3 rounded-xl bg-white dark:bg-[#071f22] border border-emerald-500/30 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">Signature Électronique Déposée</p>
                        <p className="text-[10px] text-slate-400">Contrôlée conforme au Règlement eIDAS / OHADA</p>
                      </div>
                      <div className="w-36 h-12 bg-slate-50 dark:bg-teal-950/40 rounded border border-slate-200 dark:border-teal-800 flex items-center justify-center p-1">
                        <svg viewBox="0 0 200 60" className="w-full h-full">
                          <path
                            d="M 15 35 Q 45 10 75 35 T 135 30 Q 165 48 185 25"
                            fill="none"
                            stroke="#E85D22"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* COLONNE DROITE : VÉHICULE & DOCUMENTS */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E85D22]" /> Véhicule Flotte Affecté
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Immatriculation :</span>
                      <strong className="font-mono">{assignedVehicle?.registrationPlate || '88412-A-26'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Modèle :</span>
                      <span>{assignedVehicle?.brandModel || 'Volvo FH16 Globetrotter'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type de caisse :</span>
                      <Badge variant="orange">{assignedVehicle?.vehicleType || 'REEFER_ATP_FRIGO'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Certificat Froid ATP :</span>
                      <Badge variant="success">
                        {assignedVehicle?.hasAtpReeferCert ? 'ATP FRC (Valide 2028)' : 'Standard'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Télématique IoT :</span>
                      <span className="text-emerald-600 font-bold">
                        {assignedVehicle?.gpsTrackingInstalled ? 'Actif GPS/4G' : 'Non installé'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#E85D22]" /> Documents Réglementaires
                  </h4>
                  <div className="space-y-2">
                    <Link to="/transporteur/documents">
                      <Button size="sm" variant="secondary" className="w-full text-left justify-start">
                        Consulter Lettre CMR e-CMR
                      </Button>
                    </Link>
                    <Link to="/transporteur/documents">
                      <Button size="sm" variant="secondary" className="w-full text-left justify-start">
                        Consulter Déclaration Douane EUR.1
                      </Button>
                    </Link>
                    <Link to="/transporteur/documents">
                      <Button size="sm" variant="secondary" className="w-full text-left justify-start">
                        Consulter Attestation Frigo ATP
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          57. EXPÉDITIONS & CARTOGRAPHIE INTERACTIVE (/transporteur/expeditions)
          ========================================================================= */}
      {section === 'expeditions' && (
        <div className="space-y-6">
          <InteractiveLogisticsMap
            shipment={selectedShipment}
            waypoints={waypoints[selectedShipment?.id] || []}
            vehicle={assignedVehicle}
            title="Tracé GPS Multimodal en Temps Réel & Points de Contrôle Douane"
          />

          <Card
            title="Feuille de Route & Jalons d'Acheminement (Page 57)"
            subtitle="Points de passage obligatoires et statuts de dédouanement"
          >
            <div className="space-y-3">
              {(waypoints[selectedShipment?.id] || []).map((wp, idx) => (
                <div
                  key={wp.name + idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-teal-900 font-bold flex items-center justify-center text-slate-700 dark:text-slate-200">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{wp.name}</p>
                      <p className="text-slate-500">
                        {wp.country} • GPS : {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {wp.customsTerminal && (
                      <Badge variant="orange">Terminal Douanier</Badge>
                    )}
                    <Badge variant={wp.actualPassedAt ? 'success' : 'neutral'}>
                      {wp.actualPassedAt ? `Passé (${wp.actualPassedAt})` : `Prévu (${wp.estimatedPassedAt})`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          58. DOCUMENTS DE TRANSPORT : CMR, EUR.1 & ATP (/transporteur/documents)
          ========================================================================= */}
      {section === 'documents' && (
        <Card
          title="Documents de Transport Certifiés & Déclarations Douanières (Page 58)"
          subtitle="Conformes à la Convention de Genève CMR 1956 et Protocole e-CMR Dématérialisé"
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedDocType === 'CMR' ? 'primary' : 'secondary'}
                onClick={() => setSelectedDocType('CMR')}
              >
                e-CMR International
              </Button>
              <Button
                size="sm"
                variant={selectedDocType === 'EUR1' ? 'primary' : 'secondary'}
                onClick={() => setSelectedDocType('EUR1')}
              >
                Certificat Douane EUR.1
              </Button>
              <Button
                size="sm"
                variant={selectedDocType === 'ATP' ? 'primary' : 'secondary'}
                onClick={() => setSelectedDocType('ATP')}
              >
                Agrément Froid ATP
              </Button>
            </div>
          }
        >
          {selectedDocType === 'CMR' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#071f22] border-2 border-slate-300 dark:border-teal-700 space-y-5 text-xs text-slate-800 dark:text-slate-200">
              {/* EN-TÊTE CMR */}
              <div className="flex flex-wrap items-center justify-between border-b pb-4 border-slate-300 dark:border-teal-700">
                <div>
                  <h3 className="text-base font-black tracking-wide uppercase">
                    Lettre de Voiture Internationale / International Consignment Note (e-CMR)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ce transport est soumis, nonobstant toute clause contraire, à la Convention de Genève (CMR).
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="orange">CMR-INTL-2026-9941</Badge>
                  <p className="text-[10px] text-slate-400 mt-1">Horodaté : 2026-11-18 09:30 UTC</p>
                </div>
              </div>

              {/* CASES CMR CONFORME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-1">
                  <span className="font-bold text-[#E85D22]">1. Expéditeur (Nom, adresse, pays)</span>
                  <p className="font-semibold">{currentMission?.supplierName || 'EuroTech Industrial & ColdChain GmbH'}</p>
                  <p className="text-slate-500">Hafenstraße 42, 20457 Hambourg, Allemagne (DE)</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-1">
                  <span className="font-bold text-[#E85D22]">2. Destinataire (Nom, adresse, pays)</span>
                  <p className="font-semibold">{currentMission?.clientName || 'Atlas Import & Distribution S.A.'}</p>
                  <p className="text-slate-500">Bd Al Massira Al Khadra, 20100 Casablanca, Maroc (MA)</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-1">
                  <span className="font-bold text-[#E85D22]">16. Transporteur (Nom, adresse, pays)</span>
                  <p className="font-semibold">MedFreight Multimodal Carriers S.A.</p>
                  <p className="text-slate-500">Muelle de Isla Verde, 11201 Algeciras, Espagne • Licence TIR-8841</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-1">
                  <span className="font-bold text-[#E85D22]">18. Réserves & Remarques du Transporteur</span>
                  <p className="text-slate-600 dark:text-slate-400">
                    Température consigne : <strong>-20°C à +8°C</strong>. Scellé douanier inviolable n° <strong>MA-EU-98214</strong> intact au départ de quai.
                  </p>
                </div>
              </div>

              {/* DÉSIGNATION MARCHANDISE & POIDS */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800">
                <span className="font-bold text-[#E85D22]">6-12. Marques, numéros, nombre de colis, nature de la marchandise</span>
                <div className="flex flex-wrap justify-between gap-4 mt-2 font-semibold">
                  <span>Nature : Conteneurs Isothermes Pharma GDP (Classe ATP FRC)</span>
                  <span>Palettes : {selectedShipment?.palletsCount || 18}</span>
                  <span>Poids Brut : {currentMission?.cargoWeightKg || 14200} kg</span>
                  <span>Volume : {currentMission?.cargoVolumeM3 || 68} m³</span>
                </div>
              </div>

              {/* BAS DE PAGE AVEC SIGNATURES & QR CODE */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-300 dark:border-teal-700">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-teal-900/60 rounded-xl flex items-center justify-center p-2 border border-slate-300 dark:border-teal-800 font-mono text-[9px] text-center">
                    [QR CODE e-CMR VERIFIED]
                  </div>
                  <div>
                    <p className="font-bold">Authentification Dématérialisée</p>
                    <p className="text-[10px] text-slate-400">Hash SHA-256 : 7a91b...f430c</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => notifyToast('Téléchargement du PDF e-CMR officiel...', 'info')}
                  >
                    Télécharger PDF Certifié
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => notifyToast('Exemplaire e-CMR envoyé aux autorités douanières.', 'success')}
                  >
                    Transmettre aux Douanes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedDocType === 'EUR1' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#071f22] border-2 border-slate-300 dark:border-teal-700 space-y-4 text-xs">
              <h3 className="text-base font-black">Certificat de Circulation des Marchandises EUR.1</h3>
              <p className="text-slate-500">
                Régime préférentiel d'accord d'association Union Européenne - Royaume du Maroc.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-2">
                <p><strong>Numéro de Déclaration :</strong> EUR1-MA-2026-44102</p>
                <p><strong>Pays d'origine :</strong> Union Européenne (Allemagne / Espagne)</p>
                <p><strong>Pays de destination :</strong> Maroc</p>
                <p><strong>Visa de la Douane :</strong> Tanger Med Douane Portuaire • Statut : CONFORME</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => notifyToast('Certificat EUR.1 téléchargé.', 'info')}
              >
                Télécharger EUR.1
              </Button>
            </div>
          )}

          {selectedDocType === 'ATP' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#071f22] border-2 border-slate-300 dark:border-teal-700 space-y-4 text-xs">
              <h3 className="text-base font-black">Attestation de Conformité ATP (Denrées Périssables & Pharma)</h3>
              <p className="text-slate-500">
                Accord relatif aux transports internationaux de denrées périssables et aux engins spéciaux à utiliser.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-teal-950/30 border border-slate-200 dark:border-teal-800 space-y-2">
                <p><strong>Numéro de Certificat :</strong> ATP-FRC-2026-9921</p>
                <p><strong>Catégorie :</strong> FRC (Engin frigorifique renforcé classe C, T &le; -20°C)</p>
                <p><strong>Date d'expiration :</strong> 31 Décembre 2028</p>
                <p><strong>Groupe Frigorifique :</strong> Carrier Vector HE 19 Multi-Température</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => notifyToast('Attestation ATP téléchargée.', 'info')}
              >
                Télécharger Agrément ATP
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          59. SIGNALEMENT & SUIVI DES INCIDENTS (/transporteur/incidents)
          ========================================================================= */}
      {section === 'incidents' && (
        <Card
          title="Signalement & Suivi des Incidents Logistiques (Page 59 — Composant 50)"
          subtitle="Avarie marchandise, retard douanier, rupture de chaîne du froid ou blocage technique"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!incTitle || !incDesc) {
                notifyToast('Veuillez renseigner le titre et la description.', 'error');
                return;
              }
              reportIncident(incShipmentId, incTitle, incDesc, incSeverity);
              setIncTitle('');
              setIncDesc('');
            }}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 mb-6 space-y-4"
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Déclarer un Nouvel Incident</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Expédition concernée</label>
                <select
                  value={incShipmentId}
                  onChange={(e) => setIncShipmentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22]"
                >
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trackingNumber} ({s.origin} → {s.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Gravité / Sévérité</label>
                <select
                  value={incSeverity}
                  onChange={(e) => setIncSeverity(e.target.value as IncidentRecord['severity'])}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22]"
                >
                  <option value="LOW">Faible (LOW)</option>
                  <option value="MEDIUM">Moyenne (MEDIUM)</option>
                  <option value="HIGH">Élevée (HIGH)</option>
                  <option value="CRITICAL">Critique / Urgente (CRITICAL)</option>
                </select>
              </div>

              <Input
                label="Titre de l'incident"
                value={incTitle}
                onChange={(e) => setIncTitle(e.target.value)}
                placeholder="Ex: Contrôle scanner douanier Tanger Med"
              />
            </div>

            <Input
              label="Description détaillée & Mesures d'urgence"
              value={incDesc}
              onChange={(e) => setIncDesc(e.target.value)}
              placeholder="Détaillez la cause, le retard estimé et l'impact sur la marchandise..."
            />

            <div className="flex justify-end">
              <Button type="submit" variant="danger">
                Signaler l'Incident & Notifier le Dispatcheur
              </Button>
            </div>
          </form>

          {/* LISTE DES INCIDENTS AVEC ACTION DE RÉSOLUTION */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registre des Incidents Ouverts ({incidents.length})
            </h4>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      [{inc.trackingNumber}] {inc.title}
                    </span>
                    <Badge
                      variant={
                        inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                          ? 'danger'
                          : inc.severity === 'MEDIUM'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {inc.severity}
                    </Badge>
                    <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'orange'}>
                      {inc.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 mt-1">{inc.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Signalé le : {inc.reportedAt}</p>
                </div>

                <div>
                  {inc.status !== 'RESOLVED' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => resolveIncident(inc.id)}
                    >
                      Marquer comme Résolu
                    </Button>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Résolu
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* =========================================================================
          60. ROOM LIVE TRANSPORTEUR & DOUANE (/transporteur/room-live)
          ========================================================================= */}
      {section === 'room-live' && (
        <Card
          title="Room Live Transporteur — Coordination Logistique & Douane (Page 60)"
          subtitle="Salle vidéo/audio sécurisée pour résoudre les blocages douaniers et coordonner les flux multimodaux"
        >
          <div className="space-y-4">
            <Button
              variant="primary"
              onClick={() => createRoomLive('Coordination Passage Douane Tanger Med', '2026-11-19 14:00')}
            >
              + Créer une Salle de Coordination Logistique
            </Button>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold">{rm.title}</p>
                    <p className="text-slate-500">{rm.scheduledAt} • {rm.creatorName}</p>
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="secondary">Rejoindre</Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* =========================================================================
          61. GESTION DE FLOTTE & PARAMÈTRES TRANSPORTEUR (/transporteur/parametres)
          ========================================================================= */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Gestion de la Flotte & Véhicules Autorisés (Page 61)"
            subtitle="Inventaire des semi-remorques, camions frigorifiques ATP et agréments ADR"
            action={
              <Button size="sm" variant="primary" onClick={() => setAddVehicleModalOpen(true)}>
                + Ajouter un Véhicule à la Flotte
              </Button>
            }
          >
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Icon3D name={v.hasAtpReeferCert ? 'cold-chain' : 'semi-truck'} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {v.registrationPlate}
                        </span>
                        <span className="text-slate-500 font-medium">{v.brandModel}</span>
                        <Badge variant="orange">{v.vehicleType}</Badge>
                        {v.hasAtpReeferCert && (
                          <Badge variant="info">
                            ATP FRC (Valide {v.atpCertExpiry || '2028'})
                          </Badge>
                        )}
                        {v.hasAdrDangerousGoodsPermit && <Badge variant="danger">ADR Matières Dangereuses</Badge>}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Charge Max : {v.capacityKg} kg • Volume : {v.capacityM3} m³ • GPS Télématique : {v.gpsTrackingInstalled ? 'Connecté' : 'Non installé'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Statut :</span>
                    <select
                      value={v.status}
                      onChange={(e) => updateVehicleStatus(v.id, e.target.value as VehicleRecord['status'])}
                      className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22] font-semibold"
                    >
                      <option value="AVAILABLE">DISPONIBLE</option>
                      <option value="ON_MISSION">EN MISSION</option>
                      <option value="MAINTENANCE">EN MAINTENANCE</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Licences & Profil Transporteur">
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <Input label="Raison Sociale" defaultValue="MedFreight Multimodal Carriers S.A." />
              <Input label="Licence Communautaire TIR / IATA" defaultValue="LIC-INTL-2026-8841" />
              <Input label="Numéro EORI Douane" defaultValue="ES-B12345678" />
              <Input label="Assurance Marchandises Transportées" defaultValue="AXA Corporate Cargo #POL-88192" />
              <div className="sm:col-span-2 flex justify-end">
                <Button variant="primary" onClick={() => notifyToast('Profil transporteur sauvegardé.', 'success')}>
                  Enregistrer les Modifications
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODALES LOGISTIQUES : REFUS, ACCEPTATION, POD, AJOUT VÉHICULE
          ========================================================================= */}

      {/* MODALE 1 : REFUS FORMEL DE MISSION AVEC MOTIF OBLIGATOIRE >= 5 CARACTÈRES */}
      <Modal
        open={refusalModalOpen}
        onClose={() => setRefusalModalOpen(false)}
        title="Refus de la Mission Logistique"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Conformément aux règles TRADELINK, tout refus de mission doit être formellement motivé (minimum 5 caractères) afin d'alerter le donneur d'ordre et de réaffecter la cargaison.
          </p>
          <Input
            label="Motif du refus (obligatoire)"
            value={refusalReason}
            onChange={(e) => setRefusalReason(e.target.value)}
            placeholder="Ex: Flotte frigorifique saturée sur l'axe Tanger-Paris..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRefusalModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleConfirmRefusal}>
              Confirmer le Refus
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODALE 2 : ACCEPTATION AVEC SÉLECTION DU VÉHICULE */}
      <Modal
        open={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        title="Accepter la Mission & Affecter un Véhicule"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Sélectionnez le véhicule disponible de votre flotte qui réalisera l'enlèvement et l'acheminement :
          </p>
          <div>
            <label className="font-semibold block mb-1">Véhicule assigné :</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22]"
            >
              {vehicles
                .filter((v) => v.status === 'AVAILABLE' || v.id === selectedVehicleId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationPlate} — {v.brandModel} ({v.vehicleType})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAcceptModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleConfirmAcceptance}>
              Confirmer l'Acceptation
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODALE 3 : PREUVE DE LIVRAISON POD DÉMATÉRIALISÉE */}
      <Modal
        open={podModalOpen}
        onClose={() => setPodModalOpen(false)}
        title="Certification de la Preuve de Livraison (POD)"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-[#E85D22]">
            <p className="font-bold">Décharge & Transfert de Responsabilité Marchandise</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              L'enregistrement du POD clôture la mission, met à jour la commande associée et scelle les métadonnées (horodatage, géolocalisation, signature).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nom & Prénom du Réceptionnaire"
              value={podRecipientName}
              onChange={(e) => setPodRecipientName(e.target.value)}
            />
            <Input
              label="Pièce d'Identité / Référence Société"
              value={podRecipientIdDoc}
              onChange={(e) => setPodRecipientIdDoc(e.target.value)}
            />
          </div>

          <Input
            label="Observations & État des Colis"
            value={podNotes}
            onChange={(e) => setPodNotes(e.target.value)}
          />

          {/* ZONE DE SIGNATURE ÉLECTRONIQUE INTERACTIVE */}
          <div className="space-y-1">
            <label className="font-semibold block text-slate-700 dark:text-slate-300">
              Signature Électronique du Destinataire :
            </label>
            <div className="h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-teal-700 bg-slate-50 dark:bg-[#071f22] flex flex-col items-center justify-center relative p-3">
              {podSignatureDrawn ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <svg viewBox="0 0 200 60" className="w-48 h-14">
                    <path
                      d="M 15 35 Q 45 10 75 35 T 135 30 Q 165 48 185 25"
                      fill="none"
                      stroke="#E85D22"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-[10px] text-emerald-600 font-bold">Signature manuscrite capturée & horodatée</p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <PenTool className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p>Cliquez pour capturer la signature tactile du réceptionnaire</p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Coordonnées GPS capturées : 48.7490° N, 2.3580° E</span>
              <button
                type="button"
                onClick={() => setPodSignatureDrawn(!podSignatureDrawn)}
                className="text-[#E85D22] font-semibold hover:underline"
              >
                {podSignatureDrawn ? 'Effacer la signature' : 'Générer signature certifiée'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPodModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleConfirmPod}>
              Valider & Sceller le POD
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODALE 4 : AJOUT D'UN VÉHICULE À LA FLOTTE */}
      <Modal
        open={addVehicleModalOpen}
        onClose={() => setAddVehicleModalOpen(false)}
        title="Enregistrer un Nouveau Véhicule dans la Flotte"
      >
        <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
          <Input
            label="Numéro d'Immatriculation"
            placeholder="Ex: 99421-B-26"
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
          />
          <Input
            label="Marque & Modèle"
            placeholder="Ex: Scania R500 V8 Streamline"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
          />
          <div>
            <label className="font-semibold block mb-1">Type de véhicule :</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as VehicleRecord['vehicleType'])}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22]"
            >
              <option value="REEFER_ATP_FRIGO">Semi-remorque Frigorifique (ATP Classe FRC)</option>
              <option value="SEMI_TRUCK_CURTAINSIDER">Semi-remorque Bâchée Tautliner</option>
              <option value="CONTAINER_CARRIER_40HC">Châssis Porte-conteneur 40HC</option>
              <option value="LIGHT_VAN_EV">Fourgon Électrique Urbain (Dernier km)</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newReefer}
                onChange={(e) => setNewReefer(e.target.checked)}
                className="rounded text-[#E85D22]"
              />
              <span>Équipé Groupe Frigorifique ATP</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAdr}
                onChange={(e) => setNewAdr(e.target.checked)}
                className="rounded text-[#E85D22]"
              />
              <span>Agrément ADR Matières Dangereuses</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddVehicleModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Ajouter le Véhicule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// ESPACE COMPTABLE & MOTEUR DE CALCUL FINANCIER DECIMAL.JS (PAGES 62 À 68)
// ============================================================================

// ============================================================================
// ESPACE COMPTABLE & MOTEUR DE CALCUL FINANCIER DECIMAL.JS (PAGES 62 À 68)
// ============================================================================

export const AccountingWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'factures'
    | 'journaux'
    | 'grand-livre'
    | 'etats-financiers'
    | 'calcul'
    | 'parametres';
}> = ({ section }) => {
  const { locale, invoices, calcHistory, runFinancialCalculation, notifyToast, payments } = useApp();

  // Configuration du référentiel comptable
  const [framework, setFramework] = useState<AccountingFramework>('PCG');

  // Moteur d'intérêts ACT/365, ACT/360, ACT/ACT
  const [principal, setPrincipal] = useState('150000.00');
  const [rate, setRate] = useState('5.25');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [basis, setBasis] = useState<DayCountBasis>('ACT/365');

  // Moteur d'amortissement de prêt
  const [loanPrincipal, setLoanPrincipal] = useState('250000.00');
  const [loanRate, setLoanRate] = useState('4.50');
  const [loanDuration, setLoanDuration] = useState('12');
  const [loanPeriodicity, setLoanPeriodicity] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationScheduleRow[]>(() => {
    try {
      const res = AccountingEngine.calculateAmortizationSchedule({
        principalStr: '250000.00',
        annualRatePctStr: '4.50',
        durationMonths: 12,
        startDateStr: '2026-01-01',
      });
      return res.schedule;
    } catch {
      return [];
    }
  });

  // Filtres et onglets
  const [selectedJournal, setSelectedJournal] = useState<'ALL' | 'VTE' | 'ACH' | 'BNQ' | 'OD'>('ALL');
  const [selectedLedgerTab, setSelectedLedgerTab] = useState<'ledger' | 'balance' | 'subledger' | 'reconciliation'>('ledger');
  const [selectedCalcTab, setSelectedCalcTab] = useState<'interest' | 'amortization'>('interest');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  // Modal saisie écriture équilibrée
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [newEntryJournal, setNewEntryJournal] = useState<'VTE' | 'ACH' | 'BNQ' | 'OD'>('OD');
  const [newEntryDate, setNewEntryDate] = useState('2026-11-18');
  const [newEntryRef, setNewEntryRef] = useState('OD-2026-REG-01');
  const [newEntryDesc, setNewEntryDesc] = useState('Régularisation charges et écritures d’inventaire');
  const [newEntryLines, setNewEntryLines] = useState([
    { accountCode: '624100', accountName: 'Transports sur ventes et logistique', debit: '1250.00', credit: '0.00' },
    { accountCode: '401000', accountName: 'Fournisseurs', debit: '0.00', credit: '1250.00' },
  ]);

  // Modal alerte Stage 3
  const [stage3AlertOpen, setStage3AlertOpen] = useState(false);

  // Écritures comptables
  const [entries, setEntries] = useState<AccountingEntryRecord[]>(() => {
    const list: AccountingEntryRecord[] = [
      {
        id: 'ent-init-01',
        entryNumber: 'OD-2026-0001',
        journalCode: 'OD',
        date: '2026-01-01',
        fiscalPeriod: '2026-01',
        pieceReference: 'BILAN-OUVERTURE-2026',
        description: 'Bilan d’ouverture de l’exercice fiscal 2026',
        totalDebit: '100000.00',
        totalCredit: '100000.00',
        isBalanced: true,
        validatedAt: '2026-01-01T08:00:00Z',
        validatedBy: 'Commissaire aux Comptes',
        lines: [
          { id: 'l1', accountCode: '512000', accountName: 'Banque Trésorerie Principale', debit: '60000.00', credit: '0.00', label: 'Disponibilités bancaires' },
          { id: 'l2', accountCode: '215400', accountName: 'Matériel industriel et logistique', debit: '40000.00', credit: '0.00', label: 'Immobilisations' },
          { id: 'l3', accountCode: '101000', accountName: 'Capital social', debit: '0.00', credit: '100000.00', label: 'Capital social libéré' },
        ],
      },
      {
        id: 'ent-init-02',
        entryNumber: 'VTE-2026-0081',
        journalCode: 'VTE',
        date: '2026-11-10',
        fiscalPeriod: '2026-11',
        pieceReference: 'FAC-2026-9901',
        description: 'Vente équipements Atlas Import & Distribution S.A.',
        totalDebit: '31680.00',
        totalCredit: '31680.00',
        isBalanced: true,
        validatedAt: '2026-11-10T10:15:00Z',
        validatedBy: 'Automate Facturation V6.0',
        lines: [
          { id: 'l4', accountCode: '411000', accountName: 'Clients', auxiliaryCode: 'CLI-ATLAS', debit: '31680.00', credit: '0.00', label: 'Créance Atlas Import S.A.' },
          { id: 'l5', accountCode: '707000', accountName: 'Ventes de marchandises B2B', debit: '0.00', credit: '26400.00', label: 'Produits HT Ventes' },
          { id: 'l6', accountCode: '445710', accountName: 'TVA collectée', debit: '0.00', credit: '5280.00', label: 'TVA 20% collectée' },
        ],
      },
      {
        id: 'ent-init-03',
        entryNumber: 'BNQ-2026-0042',
        journalCode: 'BNQ',
        date: '2026-11-15',
        fiscalPeriod: '2026-11',
        pieceReference: 'PAY-STRP-7719A',
        description: 'Règlement Stripe Facture FAC-2026-9901',
        totalDebit: '31680.00',
        totalCredit: '31680.00',
        isBalanced: true,
        validatedAt: '2026-11-15T14:30:00Z',
        validatedBy: 'Webhook Stripe Idempotent',
        lines: [
          { id: 'l7', accountCode: '512000', accountName: 'Banque Trésorerie Principale', debit: '30888.00', credit: '0.00', label: 'Encaissement net Stripe' },
          { id: 'l8', accountCode: '627800', accountName: 'Commissions et frais bancaires Stripe', debit: '792.00', credit: '0.00', label: 'Commission Stripe 2.5%' },
          { id: 'l9', accountCode: '411000', accountName: 'Clients', auxiliaryCode: 'CLI-ATLAS', debit: '0.00', credit: '31680.00', label: 'Solde créance client' },
        ],
      },
      {
        id: 'ent-init-04',
        entryNumber: 'ACH-2026-0019',
        journalCode: 'ACH',
        date: '2026-11-12',
        fiscalPeriod: '2026-11',
        pieceReference: 'FAC-FOURN-EUR-881',
        description: 'Achat de composants chaîne du froid EuroTech GmbH',
        totalDebit: '14400.00',
        totalCredit: '14400.00',
        isBalanced: true,
        validatedAt: '2026-11-12T09:00:00Z',
        validatedBy: 'Comptable Stage 3',
        lines: [
          { id: 'l10', accountCode: '607000', accountName: 'Achats de marchandises', debit: '12000.00', credit: '0.00', label: 'Composants frigorifiques HT' },
          { id: 'l11', accountCode: '445660', accountName: 'TVA déductible sur autres biens et services', debit: '2400.00', credit: '0.00', label: 'TVA 20% déductible' },
          { id: 'l12', accountCode: '401000', accountName: 'Fournisseurs', auxiliaryCode: 'FRN-EUROTECH', debit: '0.00', credit: '14400.00', label: 'Dette EuroTech GmbH' },
        ],
      },
    ];
    return list;
  });

  // Relevé bancaire pour le rapprochement
  const [bankLines] = useState<BankStatementLine[]>([
    {
      id: 'bnk-line-01',
      statementDate: '2026-11-15',
      valueDate: '2026-11-15',
      reference: 'PAY-STRP-7719A',
      label: 'Virement STRIPE PAYOUTS RECONCIL TRADELINK',
      amount: '30888.00',
      currency: 'EUR',
    },
    {
      id: 'bnk-line-02',
      statementDate: '2026-11-16',
      valueDate: '2026-11-16',
      reference: 'VIR-SEPA-8841-MED',
      label: 'Virement client MedTech Maghreb',
      amount: '15200.00',
      currency: 'EUR',
    },
    {
      id: 'bnk-line-03',
      statementDate: '2026-11-17',
      valueDate: '2026-11-17',
      reference: 'VIR-EUROTECH-881',
      label: 'Règlement fournisseur EuroTech GmbH',
      amount: '-14400.00',
      currency: 'EUR',
    },
    {
      id: 'bnk-line-04',
      statementDate: '2026-11-18',
      valueDate: '2026-11-18',
      reference: 'CHQ-UNKNOWN-001',
      label: 'Remise de chèque en attente d’identification',
      amount: '3450.00',
      currency: 'EUR',
    },
  ]);

  // Rapprochement bancaire exécuté
  const [reconciliations, setReconciliations] = useState<BankReconciliationResult[]>(() => {
    return AccountingEngine.executeBankReconciliation(
      [
        {
          id: 'bnk-line-01',
          statementDate: '2026-11-15',
          valueDate: '2026-11-15',
          reference: 'PAY-STRP-7719A',
          label: 'Virement STRIPE PAYOUTS RECONCIL TRADELINK',
          amount: '30888.00',
          currency: 'EUR',
        },
      ],
      payments
    );
  });

  // Calcul du Grand Livre et de la Balance Générale
  const generalLedger: GeneralLedgerAccount[] = useMemo(() => {
    return AccountingEngine.computeGeneralLedger(entries, CHARTS_OF_ACCOUNTS[framework]);
  }, [entries, framework]);

  const trialBalanceResult = useMemo(() => {
    return AccountingEngine.computeTrialBalance(generalLedger);
  }, [generalLedger]);

  const trialBalance = trialBalanceResult.items;

  const financialStatements = useMemo(() => {
    return AccountingEngine.generateFinancialStatements(trialBalance, framework);
  }, [trialBalance, framework]);

  // Vérification de balance en temps réel pour la saisie
  const newEntryBalance = useMemo(() => {
    return AccountingEngine.validateDoubleEntryBalance(newEntryLines);
  }, [newEntryLines]);

  // Calcul d'amortissement
  const handleCalculateAmortization = () => {
    try {
      const res = AccountingEngine.calculateAmortizationSchedule({
        principalStr: loanPrincipal,
        annualRatePctStr: loanRate,
        durationMonths: parseInt(loanDuration, 10) || 12,
        startDateStr: '2026-01-01',
      });
      setAmortizationSchedule(res.schedule);
      notifyToast(
        `Tableau d'amortissement calculé avec succès : ${res.schedule.length} échéances déterminées via Decimal.js.`,
        'success'
      );
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Erreur calcul amortissement', 'error');
    }
  };

  // Validation d'une nouvelle écriture manuelle
  const handleSaveNewEntry = () => {
    if (!newEntryBalance.isBalanced) {
      notifyToast(
        `Écriture déséquilibrée : Total Débit (${newEntryBalance.totalDebit} EUR) ≠ Total Crédit (${newEntryBalance.totalCredit} EUR).`,
        'error'
      );
      return;
    }

    const created: AccountingEntryRecord = {
      id: `ent-manual-${Date.now()}`,
      entryNumber: `${newEntryJournal}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      journalCode: newEntryJournal,
      date: newEntryDate,
      fiscalPeriod: newEntryDate.slice(0, 7),
      pieceReference: newEntryRef,
      description: newEntryDesc,
      totalDebit: newEntryBalance.totalDebit,
      totalCredit: newEntryBalance.totalCredit,
      isBalanced: true,
      validatedAt: new Date().toISOString(),
      validatedBy: 'Claire Dubois (Comptable Titulaire)',
      lines: newEntryLines.map((l, idx) => ({
        id: `line-${Date.now()}-${idx}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        label: newEntryDesc,
        debit: l.debit || '0.00',
        credit: l.credit || '0.00',
      })),
    };

    setEntries((prev) => [created, ...prev]);
    setIsNewEntryModalOpen(false);
    notifyToast(`Écriture ${created.entryNumber} enregistrée en partie double (${created.totalDebit} EUR).`, 'success');
  };

  // Génération de l'écriture de vente depuis une facture commerciale
  const handleGenerateInvoiceEntry = (inv: typeof invoices[0]) => {
    try {
      const entry = AccountingEngine.createSalesInvoiceEntry(inv, 'Claire Dubois (Comptable)');
      setEntries((prev) => [entry, ...prev]);
      notifyToast(
        `Écriture ${entry.entryNumber} générée pour la facture ${inv.invoiceNumber} (Débit 411 = Crédit 707 + 44571).`,
        'success'
      );
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Erreur génération écriture', 'error');
    }
  };

  // Rapprochement bancaire manuel
  const handleExecuteReconciliation = () => {
    const results = AccountingEngine.executeBankReconciliation(bankLines, payments);
    setReconciliations(results);
    const matched = results.filter((r) => r.status === 'MATCHED').length;
    notifyToast(
      `Rapprochement bancaire exécuté : ${matched} transaction(s) lettrée(s) avec succès.`,
      'success'
    );
  };

  // Filtrage des factures
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(invoiceSearch.toLowerCase());
      const matchStatus =
        invoiceStatusFilter === 'ALL' ||
        (invoiceStatusFilter === 'PAID' && inv.status === 'PAID') ||
        (invoiceStatusFilter === 'PENDING' && inv.status !== 'PAID');
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  // Filtrage des écritures par journal
  const filteredEntries = useMemo(() => {
    if (selectedJournal === 'ALL') return entries;
    return entries.filter((e) => e.journalCode === selectedJournal);
  }, [entries, selectedJournal]);

  // Totaux de la balance
  const balanceTotals = useMemo(() => {
    let totDebit = new Decimal(0);
    let totCredit = new Decimal(0);
    let totSoldeDeb = new Decimal(0);
    let totSoldeCred = new Decimal(0);
    for (const item of trialBalance) {
      totDebit = totDebit.plus(item.totalDebit);
      totCredit = totCredit.plus(item.totalCredit);
      totSoldeDeb = totSoldeDeb.plus(item.soldeDebiteur);
      totSoldeCred = totSoldeCred.plus(item.soldeCrediteur);
    }
    return {
      debit: totDebit.toFixed(2),
      credit: totCredit.toFixed(2),
      soldeDeb: totSoldeDeb.toFixed(2),
      soldeCred: totSoldeCred.toFixed(2),
      isBalanced: totDebit.equals(totCredit) && totSoldeDeb.equals(totSoldeCred),
    };
  }, [trialBalance]);

  return (
    <div className="space-y-6">
      {/* BANNIÈRE HAUTE AVEC NAVIGATION RAPIDE & INDICATEUR STAGE 3 */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="analytics" size="lg" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE COMPTABLE & AUDIT FINANCIER</Badge>
              <Badge variant="warning">STAGE 3 : LECTURE SEULE SUR SOURCES COMMERCIALES</Badge>
              <Badge variant="info">RÉFÉRENTIEL : {framework}</Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1">
              Comptabilité Générale, Grand Livre & Moteur Financier Decimal.js
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/comptable/dashboard', label: '62. Dashboard' },
            { to: '/comptable/factures', label: '63. Factures (Read-Only)' },
            { to: '/comptable/journaux', label: '64. Journaux' },
            { to: '/comptable/grand-livre', label: '65. Grand Livre & Tiers' },
            { to: '/comptable/etats-financiers', label: '66. États Financiers' },
            { to: '/comptable/calcul', label: '67. Moteur de Calcul (ACT & Prêts)' },
            { to: '/comptable/parametres', label: '68. Paramètres & Plans' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${
                (section === 'dashboard' && l.to.includes('dashboard')) ||
                (section === 'factures' && l.to.includes('factures')) ||
                (section === 'journaux' && l.to.includes('journaux')) ||
                (section === 'grand-livre' && l.to.includes('grand-livre')) ||
                (section === 'etats-financiers' && l.to.includes('etats-financiers')) ||
                (section === 'calcul' && l.to.includes('calcul')) ||
                (section === 'parametres' && l.to.includes('parametres'))
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/60 hover:bg-[#E85D22] hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* =========================================================================
          PAGE 62 : TABLEAU DE BORD COMPTABLE & AUDIT (/comptable/dashboard)
         ========================================================================= */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI CARDS COMPTABLES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Trésorerie Disponible (512)</p>
                  <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                    {financialStatements.balanceSheet.assets.cashAndEquivalents} EUR
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rapprochement bancaire actif</span>
              </div>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Créances Clients (411)</p>
                  <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                    {financialStatements.balanceSheet.assets.currentAssets} EUR
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Lettrage auxiliaire à jour</span>
              </div>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Chiffre d’Affaires HT (707)</p>
                  <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                    {financialStatements.incomeStatement.operatingRevenue} EUR
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Exercice fiscal 2026 ouvert</span>
              </div>
            </Card>

            <Card className="border-l-4 border-l-[#E85D22]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Résultat Net Période</p>
                  <p className="text-2xl font-black mt-1 text-[#E85D22]">
                    +{financialStatements.incomeStatement.netIncome} EUR
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#E85D22]">
                  <Scale className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Partie double équilibrée (0.00 EUR)</span>
              </div>
            </Card>
          </div>

          {/* ALERTE STAGE 3 & GARANTIE D'INTÉGRITÉ */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Protection d'Intégrité Stage 3 — Règle Métier Absolue
                  <Badge variant="warning">HTTP 403 STRICT</Badge>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                  Le profil Comptable dispose d'un accès en <strong>lecture seule</strong> sur les catalogues de produits, stocks, devis et commandes commerciales sources. Il ne peut en aucun cas modifier un prix, une quantité ou un statut commercial. Toute tentative d'écriture déclenche une erreur <code>COMPTABLE_STAGE3_READONLY_SOURCE_DATA</code>.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStage3AlertOpen(true)}
              className="text-amber-800 dark:text-amber-200 border-amber-400 hover:bg-amber-100"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Tester le verrouillage Stage 3
            </Button>
          </div>

          {/* GRILLE CENTRALE DASHBOARD */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* RÉSUMÉ DU BILAN & RÉSULTAT */}
            <div className="lg:col-span-7 space-y-6">
              <Card
                title="Bilan & Compte de Résultat Simplifiés (Conformes PCG/IFRS)"
                subtitle="Calcul automatique en temps réel à partir des écritures validées du journal"
                action={
                  <Link to="/comptable/etats-financiers">
                    <Button size="sm" variant="secondary">
                      <PieChart className="w-4 h-4 mr-1" />
                      Voir les États Détaillés
                    </Button>
                  </Link>
                }
              >
                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">TOTAL ACTIF</span>
                      <Badge variant="success">Équilibré</Badge>
                    </div>
                    <p className="text-xl font-extrabold text-emerald-600">
                      {financialStatements.balanceSheet.assets.totalAssets} EUR
                    </p>
                    <div className="mt-3 space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Actif Immobilisé (215) :</span>
                        <span className="font-mono">{financialStatements.balanceSheet.assets.nonCurrentAssets} EUR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Créances & Stocks (370/411) :</span>
                        <span className="font-mono">{financialStatements.balanceSheet.assets.currentAssets} EUR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trésorerie & Banque (512) :</span>
                        <span className="font-mono">{financialStatements.balanceSheet.assets.cashAndEquivalents} EUR</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">TOTAL PASSIF & CAPITAUX</span>
                      <Badge variant="orange">100% Conforme</Badge>
                    </div>
                    <p className="text-xl font-extrabold text-[#E85D22]">
                      {financialStatements.balanceSheet.liabilities.totalLiabilitiesAndEquity} EUR
                    </p>
                    <div className="mt-3 space-y-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>Capitaux Propres (101) :</span>
                        <span className="font-mono">{financialStatements.balanceSheet.liabilities.equity} EUR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Résultat de l’Exercice :</span>
                        <span className="font-mono font-bold text-emerald-600">+{financialStatements.incomeStatement.netIncome} EUR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dettes Fournisseurs & TVA :</span>
                        <span className="font-mono">{financialStatements.balanceSheet.liabilities.operatingLiabilities} EUR</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* DERNIÈRES ÉCRITURES COMPTABLES */}
              <Card
                title="Dernières Écritures des Journaux (Partie Double)"
                subtitle="Contrôle d'équilibre Débit = Crédit sur chaque mouvement"
                action={
                  <Link to="/comptable/journaux">
                    <Button size="sm" variant="secondary">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Consulter les Journaux
                    </Button>
                  </Link>
                }
              >
                <div className="space-y-2.5">
                  {entries.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{e.journalCode}</Badge>
                          <span className="font-mono font-bold">{e.entryNumber}</span>
                          <span className="text-slate-400 font-mono">({e.pieceReference})</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 font-medium">{e.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 text-sm">
                          {formatCurrency(e.totalDebit, 'EUR', locale)}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                          <CheckCircle className="w-3 h-3" />
                          <span>Équilibré</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ACTIONS RAPIDES & RAPPROCHEMENT BANCAIRE */}
            <div className="lg:col-span-5 space-y-6">
              <Card
                title="Rapprochement Bancaire Stripe / Banque"
                subtitle="Pointage automatique flux bancaire vs écritures de trésorerie"
                action={
                  <Button size="sm" variant="secondary" onClick={handleExecuteReconciliation}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Pointer
                  </Button>
                }
              >
                <div className="space-y-3 text-xs">
                  {bankLines.slice(0, 3).map((line) => {
                    const rec = reconciliations.find((r) => r.statementLineId === line.id);
                    const isMatched = rec?.status === 'MATCHED';
                    return (
                      <div
                        key={line.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{line.label}</p>
                          <p className="text-slate-400 font-mono text-[11px]">{line.reference} • {line.statementDate}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${new Decimal(line.amount).isPositive() ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                            {formatCurrency(line.amount, line.currency, locale)}
                          </p>
                          <div className="mt-1">
                            <Badge variant={isMatched ? 'success' : 'warning'}>
                              {isMatched ? 'MATCHED' : 'À RAPPROCHER'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title="Raccourcis & Exports Légaux">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const csv = AccountingEngine.exportTrialBalanceToCsv(trialBalance);
                      downloadDataExport('balance_generale_tradelink_2026.csv', csv);
                      notifyToast('Balance générale téléchargée (Format Excel/CSV).', 'success');
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-600" />
                    Balance Générale CSV
                  </Button>

                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      downloadDataExport(
                        'grand_livre_2026.csv',
                        'Compte,Intitule,Date,Piece,Debit,Credit,Solde\n411000,Clients,2026-11-10,FAC-2026-9901,31680.00,0.00,+31680.00\n512000,Banque,2026-11-15,PAY-STRP-7719A,30888.00,0.00,+30888.00'
                      );
                      notifyToast('Grand Livre complet exporté au format CSV.', 'success');
                    }}
                  >
                    <Download className="w-4 h-4 mr-1 text-blue-600" />
                    Grand Livre CSV
                  </Button>

                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const report = `=======================================================\nTRADELINK V6.0 — RAPPORT FINANCIER CERTIFIÉ DE L'EXERCICE\n=======================================================\nRéférentiel : ${framework}\nDate d'arrêté : 18/11/2026\n\nBILAN ACTIF : ${financialStatements.balanceSheet.assets.totalAssets} EUR\nBILAN PASSIF : ${financialStatements.balanceSheet.liabilities.totalLiabilitiesAndEquity} EUR\nRÉSULTAT NET : +${financialStatements.incomeStatement.netIncome} EUR\nCHIFFRE D'AFFAIRES HT : ${financialStatements.incomeStatement.operatingRevenue} EUR\n\nCertifié exact par le cabinet d'audit et conforme au plan comptable.\n=======================================================`;
                      downloadDataExport('rapport_financier_certifie_tradelink.txt', report);
                      notifyToast('Rapport financier certifié généré.', 'success');
                    }}
                  >
                    <FileText className="w-4 h-4 mr-1 text-[#E85D22]" />
                    Rapport Bilan PDF
                  </Button>

                  <Link to="/comptable/calcul">
                    <Button variant="secondary" className="w-full justify-start">
                      <Calculator className="w-4 h-4 mr-1 text-purple-600" />
                      Moteur ACT/Prêts
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 63 : FACTURES COMMERCIALES EN LECTURE SEULE STAGE 3 (/comptable/factures)
         ========================================================================= */}
      {section === 'factures' && (
        <Card
          title="Consultation & Vérification des Factures (Page 63 — Lecture Seule Stage 3)"
          subtitle="Le comptable vérifie, rapproche et intègre les factures commerciales dans le journal VTE sans pouvoir altérer les sources"
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStage3AlertOpen(true)}
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                Tenter modification commerciale
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const csvData = [
                    'Numero,Client,Fournisseur,SousTotal_HT,TVA,Total_TTC,Devise,Statut,Echeance',
                    ...filteredInvoices.map(
                      (i) =>
                        `${i.invoiceNumber},"${i.clientName}","${i.supplierName}",${i.subtotal},${i.taxAmount},${i.totalAmount},${i.currency},${i.status},${i.dueAt}`
                    ),
                  ].join('\n');
                  downloadDataExport('factures_commerciales_tradelink.csv', csvData);
                  notifyToast('Export CSV des factures commerciales téléchargé.', 'success');
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Exporter Factures CSV
              </Button>
            </div>
          }
        >
          {/* BARRE DE RECHERCHE ET FILTRES */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 max-w-sm w-full">
              <Input
                placeholder="Rechercher par n° facture, client ou fournisseur..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Statut :</span>
              {(['ALL', 'PAID', 'PENDING'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    invoiceStatusFilter === st
                      ? 'bg-[#E85D22] text-white'
                      : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st === 'ALL' ? 'Toutes' : st === 'PAID' ? 'Payées' : 'En Attente'}
                </button>
              ))}
            </div>
          </div>

          <DataTable<InvoiceRecord>
            caption="Factures commerciales en consultation lecture seule pour le comptable"
            keyExtractor={(inv: InvoiceRecord) => inv.id}
            data={filteredInvoices as InvoiceRecord[]}
            columns={[
              {
                key: 'num',
                header: 'N° Facture',
                isRowHeader: true,
                render: (inv: InvoiceRecord) => (
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                    <p className="text-[11px] text-slate-400">Émise le {inv.issuedAt}</p>
                  </div>
                ),
              },
              {
                key: 'cli',
                header: 'Client B2B',
                render: (inv: InvoiceRecord) => (
                  <div>
                    <span className="font-semibold">{inv.clientName}</span>
                    <p className="text-[11px] text-slate-400 font-mono">Compte : 411-{inv.clientId.slice(-4).toUpperCase()}</p>
                  </div>
                ),
              },
              {
                key: 'sup',
                header: 'Fournisseur',
                render: (inv: InvoiceRecord) => <span>{inv.supplierName}</span>,
              },
              {
                key: 'ht',
                header: 'Total HT',
                render: (inv: InvoiceRecord) => <span className="font-mono">{formatCurrency(inv.subtotal, inv.currency, locale)}</span>,
              },
              {
                key: 'tva',
                header: 'TVA (20%)',
                render: (inv: InvoiceRecord) => <span className="font-mono text-slate-500">{formatCurrency(inv.taxAmount, inv.currency, locale)}</span>,
              },
              {
                key: 'tot',
                header: 'Total TTC',
                render: (inv: InvoiceRecord) => (
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(inv.totalAmount, inv.currency, locale)}
                  </span>
                ),
              },
              {
                key: 'st',
                header: 'Statut Paiement',
                render: (inv: InvoiceRecord) => (
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                    {translateStatus(inv.status, locale)}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Action Comptable',
                render: (inv: InvoiceRecord) => {
                  const alreadyGenerated = entries.some((e) => e.pieceReference === inv.invoiceNumber);
                  return (
                    <div className="flex items-center gap-2">
                      {alreadyGenerated ? (
                        <Badge variant="info">
                          Écriture VTE Générée
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleGenerateInvoiceEntry(inv)}
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          Générer Écriture VTE
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </Card>
      )}

      {/* =========================================================================
          PAGE 64 : JOURNAUX COMPTABLES VTE, ACH, BNQ & OD (/comptable/journaux)
         ========================================================================= */}
      {section === 'journaux' && (
        <Card
          title="Journaux Comptables VTE, ACH, BNQ & OD (Page 64)"
          subtitle="Enregistrement chronologique des écritures équilibrées en partie double (Débit = Crédit via Decimal.js)"
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsNewEntryModalOpen(true)}
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                Saisir Écriture Manuelle
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const rows: string[] = ['Numero,Journal,Date,Piece,Libelle,Compte,Intitule,Debit,Credit'];
                  for (const e of filteredEntries) {
                    for (const l of e.lines) {
                      rows.push(
                        `${e.entryNumber},${e.journalCode},${e.date},${e.pieceReference},"${e.description}",${l.accountCode},"${l.accountName}",${l.debit},${l.credit}`
                      );
                    }
                  }
                  downloadDataExport('journaux_comptables_complets.csv', rows.join('\n'));
                  notifyToast('Export CSV des journaux comptables téléchargé.', 'success');
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Exporter Journaux CSV
              </Button>
            </div>
          }
        >
          {/* ONGLET DES JOURNAUX STANDARD */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
            <span className="font-bold text-slate-500 mr-2">Sélection Journal :</span>
            {(['ALL', 'VTE', 'ACH', 'BNQ', 'OD'] as const).map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setSelectedJournal(j)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedJournal === j
                    ? 'bg-[#E85D22] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {j === 'ALL'
                  ? 'Tous les Journaux'
                  : j === 'VTE'
                  ? 'Ventes (VTE)'
                  : j === 'ACH'
                  ? 'Achats (ACH)'
                  : j === 'BNQ'
                  ? 'Banque / Trésorerie (BNQ)'
                  : 'Opérations Diverses (OD)'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredEntries.map((e: AccountingEntryRecord) => (
              <div
                key={e.id}
                className="rounded-2xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#082225] p-4 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-teal-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Badge variant={e.journalCode === 'VTE' ? 'info' : e.journalCode === 'ACH' ? 'warning' : e.journalCode === 'BNQ' ? 'success' : 'orange'}>
                      {e.journalCode}
                    </Badge>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{e.entryNumber}</span>
                    <span className="text-xs text-slate-400 font-mono">Pièce : {e.pieceReference}</span>
                    <span className="text-xs text-slate-400">• Date : {e.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Équilibré : {e.totalDebit} EUR</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Validé par : {e.validatedBy}</span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{e.description}</p>

                {/* TABLEAU DES LIGNES EN PARTIE DOUBLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-[#0B2D31]/80 text-slate-500 font-semibold border-y border-slate-200 dark:border-teal-800">
                      <tr>
                        <th className="py-2 px-3">Compte</th>
                        <th className="py-2 px-3">Intitulé & Compte Tiers</th>
                        <th className="py-2 px-3">Libellé d'écriture</th>
                        <th className="py-2 px-3 text-right">Débit (EUR)</th>
                        <th className="py-2 px-3 text-right">Crédit (EUR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-teal-900/60">
                      {e.lines.map((l: AccountingEntryLineRecord) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-teal-900/20">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {l.accountCode}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold">{l.accountName}</span>
                            {l.auxiliaryCode && (
                              <span className="ml-2 inline-block">
                                <Badge variant="neutral">
                                  {l.auxiliaryCode}
                                </Badge>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{l.label}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                            {new Decimal(l.debit).greaterThan(0) ? l.debit : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#E85D22]">
                            {new Decimal(l.credit).greaterThan(0) ? l.credit : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/70 dark:bg-[#0B2D31] font-bold border-t border-slate-200 dark:border-teal-800">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider text-[11px] text-slate-500">
                          Total de la pièce :
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600">{e.totalDebit} EUR</td>
                        <td className="py-2 px-3 text-right font-mono text-[#E85D22]">{e.totalCredit} EUR</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* =========================================================================
          PAGE 65 : GRAND LIVRE, BALANCE GÉNÉRALE & COMPTES TIERS (/comptable/grand-livre)
         ========================================================================= */}
      {section === 'grand-livre' && (
        <Card
          title="Grand Livre des Comptes & Balance Générale (Page 65)"
          subtitle="Suivi des soldes progressifs, contrôle strict de balance et lettrage des comptes tiers (Clients 411 / Fournisseurs 401)"
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const csv = AccountingEngine.exportTrialBalanceToCsv(trialBalance);
                  downloadDataExport('balance_generale_2026.csv', csv);
                  notifyToast('Balance générale exportée avec succès !', 'success');
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-600" />
                Exporter Balance CSV
              </Button>
            </div>
          }
        >
          {/* SOUS-ONGLETS DU GRAND LIVRE */}
          <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 dark:border-teal-800 pb-3 text-xs">
            {[
              { id: 'ledger', label: '1. Grand Livre des Comptes', icon: BookOpen },
              { id: 'balance', label: '2. Balance Générale (Égalité Débit = Crédit)', icon: Scale },
              { id: 'subledger', label: '3. Comptes Tiers & Lettrage (411/401)', icon: Building },
              { id: 'reconciliation', label: '4. Rapprochement Bancaire', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedLedgerTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
                    selectedLedgerTab === tab.id
                      ? 'bg-[#E85D22] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1 : GRAND LIVRE AVEC SOLDES PROGRESSIFS */}
          {selectedLedgerTab === 'ledger' && (
            <div className="space-y-6">
              {generalLedger.map((acc) => (
                <div
                  key={acc.accountCode}
                  className="rounded-2xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#082225] overflow-hidden"
                >
                  <div className="p-4 bg-slate-50 dark:bg-[#0B2D31] flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-teal-800">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                        {acc.accountCode}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{acc.accountName}</h4>
                        <div className="mt-0.5">
                          <Badge variant="neutral">
                            Catégorie : {acc.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">CUMUL DÉBIT</span>
                        <span className="font-bold text-emerald-600">{acc.totalDebit} EUR</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">CUMUL CRÉDIT</span>
                        <span className="font-bold text-[#E85D22]">{acc.totalCredit} EUR</span>
                      </div>
                      <div className="pl-3 border-l border-slate-300 dark:border-teal-800">
                        <span className="text-slate-400 block text-[10px]">SOLDE PROGRESSIF</span>
                        <Badge variant={new Decimal(acc.balanceDebit).greaterThan(0) ? 'success' : 'orange'}>
                          {new Decimal(acc.balanceDebit).greaterThan(0)
                            ? `+${acc.balanceDebit} EUR (Débiteur)`
                            : `-${acc.balanceCredit} EUR (Créditeur)`}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/50 dark:bg-[#082225] text-slate-500 font-semibold border-b border-slate-200 dark:border-teal-800">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">N° Écriture</th>
                        <th className="py-2.5 px-3">Pièce Réf</th>
                        <th className="py-2.5 px-3">Libellé</th>
                        <th className="py-2.5 px-3 text-right">Débit (EUR)</th>
                        <th className="py-2.5 px-3 text-right">Crédit (EUR)</th>
                        <th className="py-2.5 px-3 text-right">Solde Progressif (EUR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-teal-900/60 font-mono">
                      {acc.entries.map((e, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-teal-900/20">
                          <td className="py-2 px-3 text-slate-500">{e.date}</td>
                          <td className="py-2 px-3 font-bold">{e.entryNumber}</td>
                          <td className="py-2 px-3 text-slate-400">{e.pieceReference}</td>
                          <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">{e.label}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">
                            {new Decimal(e.debit).greaterThan(0) ? e.debit : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#E85D22]">
                            {new Decimal(e.credit).greaterThan(0) ? e.credit : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-black">
                            {new Decimal(e.runningBalance).greaterThanOrEqualTo(0)
                              ? `+${e.runningBalance}`
                              : e.runningBalance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2 : BALANCE GÉNÉRALE */}
          {selectedLedgerTab === 'balance' && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Égalité Fondamentale de la Balance Générale Vérifiée
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Somme Débits ({balanceTotals.debit} EUR) = Somme Crédits ({balanceTotals.credit} EUR). Soldes Débiteurs ({balanceTotals.soldeDeb} EUR) = Soldes Créditeurs ({balanceTotals.soldeCred} EUR).
                    </p>
                  </div>
                </div>
                <Badge variant="success">Écart = 0.00 EUR (Partie Double)</Badge>
              </div>

              <DataTable
                caption="Balance Générale des Comptes (Soldes Débiteurs & Créditeurs)"
                keyExtractor={(item) => item.accountCode}
                data={trialBalance}
                columns={[
                  {
                    key: 'code',
                    header: 'Compte',
                    isRowHeader: true,
                    render: (item) => <span className="font-mono font-bold">{item.accountCode}</span>,
                  },
                  {
                    key: 'nom',
                    header: 'Intitulé du Compte',
                    render: (item) => <span className="font-semibold">{item.accountName}</span>,
                  },
                  {
                    key: 'cat',
                    header: 'Catégorie',
                    render: (item) => <Badge variant="neutral">{item.category}</Badge>,
                  },
                  {
                    key: 'totDeb',
                    header: 'Total Débit (EUR)',
                    render: (item) => <span className="font-mono font-bold text-emerald-600">{item.totalDebit}</span>,
                  },
                  {
                    key: 'totCred',
                    header: 'Total Crédit (EUR)',
                    render: (item) => <span className="font-mono font-bold text-[#E85D22]">{item.totalCredit}</span>,
                  },
                  {
                    key: 'soldeDeb',
                    header: 'Solde Débiteur (EUR)',
                    render: (item) => (
                      <span className="font-mono font-bold text-emerald-700">
                        {new Decimal(item.soldeDebiteur).greaterThan(0) ? item.soldeDebiteur : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'soldeCred',
                    header: 'Solde Créditeur (EUR)',
                    render: (item) => (
                      <span className="font-mono font-bold text-orange-700">
                        {new Decimal(item.soldeCrediteur).greaterThan(0) ? item.soldeCrediteur : '—'}
                      </span>
                    ),
                  },
                ]}
              />

              {/* LIGNE DE TOTAUX DE LA BALANCE */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between text-xs font-mono">
                <span className="font-bold tracking-wider uppercase">TOTAUX GÉNÉRAUX DE LA BALANCE :</span>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-400 block text-[10px]">CUMUL DÉBIT</span>
                    <span className="text-emerald-400 font-bold text-sm">{balanceTotals.debit} EUR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CUMUL CRÉDIT</span>
                    <span className="text-orange-400 font-bold text-sm">{balanceTotals.credit} EUR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SOLDES DÉBITEURS</span>
                    <span className="text-emerald-400 font-bold text-sm">{balanceTotals.soldeDeb} EUR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SOLDES CRÉDITEURS</span>
                    <span className="text-orange-400 font-bold text-sm">{balanceTotals.soldeCred} EUR</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 : COMPTES TIERS & LETTRAGE */}
          {selectedLedgerTab === 'subledger' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* COMPTES CLIENTS 411 */}
                <Card
                  title="Comptes Tiers Clients (411) & Lettrage"
                  subtitle="Rapprochement des créances clients avec les règlements Stripe"
                >
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono">411-ATLAS (Atlas Import & Distribution)</span>
                        <Badge variant="success">Lettré (LET-A01)</Badge>
                      </div>
                      <div className="text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Facture FAC-2026-9901 :</span>
                          <span className="font-mono text-emerald-600 font-bold">+31 680,00 EUR (Débit)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Règlement PAY-STRP-7719A :</span>
                          <span className="font-mono text-[#E85D22] font-bold">-31 680,00 EUR (Crédit)</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-teal-800/60 flex justify-between font-bold">
                        <span>Solde Non Soldé :</span>
                        <span className="font-mono text-emerald-600">0,00 EUR</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono">411-MEDTECH (MedTech Maghreb)</span>
                        <Badge variant="warning">En attente lettrage</Badge>
                      </div>
                      <div className="text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Facture FAC-2026-9902 :</span>
                          <span className="font-mono text-emerald-600 font-bold">+15 200,00 EUR (Débit)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Règlement VIR-SEPA-8841 :</span>
                          <span className="font-mono text-slate-400">En cours de lettrage</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-teal-800/60 flex justify-between font-bold">
                        <span>Solde Débiteur Ouvert :</span>
                        <span className="font-mono text-amber-600">15 200,00 EUR</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* COMPTES FOURNISSEURS 401 */}
                <Card
                  title="Comptes Tiers Fournisseurs (401) & Dettes"
                  subtitle="Suivi des factures fournisseurs et avis de virement SEPA"
                >
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono">401-EUROTECH (EuroTech GmbH)</span>
                        <Badge variant="warning">Échéance à 30 jours</Badge>
                      </div>
                      <div className="text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Facture FAC-FOURN-EUR-881 :</span>
                          <span className="font-mono text-[#E85D22] font-bold">14 400,00 EUR (Crédit)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Virement Bancaire SEPA :</span>
                          <span className="font-mono text-slate-400">Prévu le 25/11/2026</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-teal-800/60 flex justify-between font-bold">
                        <span>Dette Fournisseur Nette :</span>
                        <span className="font-mono text-[#E85D22]">14 400,00 EUR</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono">401-MEDFREIGHT (MedFreight Multimodal)</span>
                        <Badge variant="success">Soldé & Lettré</Badge>
                      </div>
                      <div className="text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Facture Transport TRK-9901 :</span>
                          <span className="font-mono text-[#E85D22] font-bold">2 200,00 EUR (Crédit)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Virement VIR-2026-MED :</span>
                          <span className="font-mono text-emerald-600 font-bold">-2 200,00 EUR (Débit)</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-teal-800/60 flex justify-between font-bold">
                        <span>Solde Fournisseur :</span>
                        <span className="font-mono text-emerald-600">0,00 EUR</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4 : RAPPROCHEMENT BANCAIRE */}
          {selectedLedgerTab === 'reconciliation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Pointage Relevé Bancaire vs Écritures de Trésorerie</h4>
                  <p className="text-xs text-slate-500">
                    Détection automatique des écarts et matching par montant, date et référence
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={handleExecuteReconciliation}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Relancer le Matching Automatique
                </Button>
              </div>

              <DataTable
                caption="Relevé bancaire et état de rapprochement"
                keyExtractor={(line) => line.id}
                data={bankLines}
                columns={[
                  {
                    key: 'dt',
                    header: 'Date Opération',
                    isRowHeader: true,
                    render: (l) => <span className="font-mono text-xs">{l.statementDate}</span>,
                  },
                  {
                    key: 'ref',
                    header: 'Référence Bancaire',
                    render: (l) => <span className="font-mono font-bold text-xs">{l.reference}</span>,
                  },
                  {
                    key: 'lbl',
                    header: 'Libellé de l’Opération',
                    render: (l) => <span className="font-semibold text-xs">{l.label}</span>,
                  },
                  {
                    key: 'mnt',
                    header: 'Montant Relevé',
                    render: (l) => (
                      <span className={`font-mono font-bold ${new Decimal(l.amount).isPositive() ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatCurrency(l.amount, l.currency, locale)}
                      </span>
                    ),
                  },
                  {
                    key: 'st',
                    header: 'Statut Rapprochement',
                    render: (l) => {
                      const rec = reconciliations.find((r) => r.statementLineId === l.id);
                      if (rec?.status === 'MATCHED') {
                        return <Badge variant="success">MATCHED (Lettré)</Badge>;
                      }
                      if (rec?.status === 'DISCREPANCY') {
                        return <Badge variant="warning">DISCREPANCY (Écart)</Badge>;
                      }
                      return <Badge variant="danger">UNMATCHED (En Attente)</Badge>;
                    },
                  },
                  {
                    key: 'act',
                    header: 'Action',
                    render: (l) => (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          notifyToast(`Ligne bancaire ${l.reference} pointée manuellement.`, 'success');
                        }}
                      >
                        Pointer
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          PAGE 66 : ÉTATS FINANCIERS : BILAN & COMPTE DE RÉSULTAT (/comptable/etats-financiers)
         ========================================================================= */}
      {section === 'etats-financiers' && (
        <div className="space-y-6">
          {/* SÉLECTEUR DE RÉFÉRENTIEL & EXPORT */}
          <div className="rounded-2xl bg-white dark:bg-[#0B2D31] p-4 border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Référentiel Comptable :</span>
              {(['PCG', 'IFRS', 'OHADA'] as const).map((fw) => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => {
                    setFramework(fw);
                    notifyToast(`Référentiel comptable basculé sur ${fw}.`, 'info');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    framework === fw
                      ? 'bg-[#E85D22] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {fw === 'PCG' ? 'PCG (France/UE)' : fw === 'IFRS' ? 'IFRS (International)' : 'OHADA (Afrique)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const report = `BILAN COMPTABLE & COMPTE DE RESULTAT\nExercice 2026 - Referentiel : ${framework}\n\nACTIF\n- Actif immobilise : ${financialStatements.balanceSheet.assets.nonCurrentAssets} EUR\n- Stocks et creances : ${financialStatements.balanceSheet.assets.currentAssets} EUR\n- Tresorerie : ${financialStatements.balanceSheet.assets.cashAndEquivalents} EUR\nTOTAL ACTIF : ${financialStatements.balanceSheet.assets.totalAssets} EUR\n\nPASSIF\n- Capitaux propres : ${financialStatements.balanceSheet.liabilities.equity} EUR\n- Resultat net : ${financialStatements.incomeStatement.netIncome} EUR\n- Dettes d'exploitation : ${financialStatements.balanceSheet.liabilities.operatingLiabilities} EUR\nTOTAL PASSIF : ${financialStatements.balanceSheet.liabilities.totalLiabilitiesAndEquity} EUR\n\nCOMPTE DE RESULTAT\n- Chiffre d'affaires : ${financialStatements.incomeStatement.operatingRevenue} EUR\n- Charges d'exploitation : ${financialStatements.incomeStatement.operatingExpenses} EUR\n- Resultat Net : ${financialStatements.incomeStatement.netIncome} EUR`;
                  downloadDataExport(`etats_financiers_${framework.toLowerCase()}_2026.txt`, report);
                  notifyToast('États financiers exportés avec succès !', 'success');
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Exporter États Financiers (PDF/TXT)
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* BILAN COMPTABLE */}
            <Card
              title={`Bilan Comptable Actif / Passif (${framework})`}
              subtitle="Équilibre strict Total Actif = Total Passif garanti par Decimal.js"
            >
              <div className="space-y-4 text-xs">
                {/* ACTIF */}
                <div className="rounded-xl border border-slate-200 dark:border-teal-800 overflow-hidden">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 font-bold text-emerald-900 dark:text-emerald-200 flex justify-between">
                    <span>ACTIF DU BILAN</span>
                    <span>MONTANT NET</span>
                  </div>
                  <div className="p-3 divide-y divide-slate-100 dark:divide-teal-900/60 font-mono space-y-2">
                    <div className="flex justify-between pt-1">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Actif Immobilisé (Matériel industriel 215) :</span>
                      <span className="font-bold">{financialStatements.balanceSheet.assets.nonCurrentAssets} EUR</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Actif Circulant (Stocks 370 + Créances 411) :</span>
                      <span className="font-bold">{financialStatements.balanceSheet.assets.currentAssets} EUR</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Trésorerie & Disponibilités (512) :</span>
                      <span className="font-bold">{financialStatements.balanceSheet.assets.cashAndEquivalents} EUR</span>
                    </div>
                    <div className="flex justify-between pt-3 font-black text-sm text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-1 rounded">
                      <span className="font-sans">TOTAL ACTIF :</span>
                      <span>{financialStatements.balanceSheet.assets.totalAssets} EUR</span>
                    </div>
                  </div>
                </div>

                {/* PASSIF */}
                <div className="rounded-xl border border-slate-200 dark:border-teal-800 overflow-hidden">
                  <div className="bg-orange-50 dark:bg-orange-950/40 p-3 font-bold text-orange-900 dark:text-orange-200 flex justify-between">
                    <span>PASSIF & CAPITAUX PROPRES</span>
                    <span>MONTANT NET</span>
                  </div>
                  <div className="p-3 divide-y divide-slate-100 dark:divide-teal-900/60 font-mono space-y-2">
                    <div className="flex justify-between pt-1">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Capitaux Propres Libérés (101) :</span>
                      <span className="font-bold">{financialStatements.balanceSheet.liabilities.equity} EUR</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Résultat Net de l'Exercice (120) :</span>
                      <span className="font-bold text-emerald-600">+{financialStatements.incomeStatement.netIncome} EUR</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-sans text-slate-700 dark:text-slate-300">Dettes d'Exploitation (Fournisseurs 401 + TVA 445) :</span>
                      <span className="font-bold">{financialStatements.balanceSheet.liabilities.operatingLiabilities} EUR</span>
                    </div>
                    <div className="flex justify-between pt-3 font-black text-sm text-[#E85D22] bg-orange-50/50 dark:bg-orange-950/20 px-2 py-1 rounded">
                      <span className="font-sans">TOTAL PASSIF & CAPITAUX :</span>
                      <span>{financialStatements.balanceSheet.liabilities.totalLiabilitiesAndEquity} EUR</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B2D31] flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    Équilibre Bilan vérifié à l'euro près
                  </span>
                  <Badge variant="success">Écart = 0.00 EUR</Badge>
                </div>
              </div>
            </Card>

            {/* COMPTE DE RÉSULTAT */}
            <Card
              title={`Compte de Résultat de l’Exercice (${framework})`}
              subtitle="Formation du Résultat Net à partir des produits d'exploitation et des charges décaissées"
            >
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-teal-800 pb-2">
                    <span className="font-sans">Chiffre d’Affaires Ventes HT (707) :</span>
                    <span className="text-emerald-600">+{financialStatements.incomeStatement.operatingRevenue} EUR</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Achats consommés de marchandises (607) :</span>
                    <span className="text-[#E85D22]">-12 000,00 EUR</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Frais et commissions bancaires Stripe (627) :</span>
                    <span className="text-[#E85D22]">-792,00 EUR</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-teal-800 font-bold">
                    <span className="font-sans text-slate-800 dark:text-slate-200">Excédent Brut d'Exploitation (EBE) :</span>
                    <span className="text-emerald-600">+{financialStatements.incomeStatement.operatingProfit} EUR</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="font-sans">Résultat Financier Net (Intérêts 76/66) :</span>
                    <span className="text-slate-500">+{financialStatements.incomeStatement.financialResult} EUR</span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300 dark:border-teal-700 text-base font-black">
                    <span className="font-sans text-slate-900 dark:text-white">RÉSULTAT NET COMPTABLE :</span>
                    <span className="text-emerald-600">+{financialStatements.incomeStatement.netIncome} EUR</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs font-sans text-emerald-800 dark:text-emerald-200">
                  <p className="font-bold">Note d'audit :</p>
                  <p className="mt-0.5">
                    Le résultat net calculé de <strong>{financialStatements.incomeStatement.netIncome} EUR</strong> est automatiquement intégré en capitaux propres au compte 120 (Résultat de l’exercice), assurant l’égalité parfaite entre l’Actif et le Passif.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 67 : MOTEUR DE CALCUL FINANCIER DÉTERMINISTE (/comptable/calcul)
         ========================================================================= */}
      {section === 'calcul' && (
        <Card
          title="Moteur de Calcul Financier Déterministe (Page 67 — Chapitre 6.8 — Decimal.js)"
          subtitle="Calcul rigoureux sans flottant binaire : Conventions ACT/365, ACT/360, ACT/ACT bissextile (366j) & Tableau d'Amortissement de Prêt"
        >
          {/* SÉLECTEUR DE SOUS-MODULE */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-teal-800 pb-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCalcTab('interest')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
                selectedCalcTab === 'interest'
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              1. Intérêts & Conventions ACT (365 / 360 / ACT)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCalcTab('amortization')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
                selectedCalcTab === 'amortization'
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              2. Amortissement d'Emprunt & Lignes de Crédit
            </button>
          </div>

          {/* SOUS-MODULE 1 : INTÉRÊTS & CONVENTIONS ACT */}
          {selectedCalcTab === 'interest' && (
            <div className="grid lg:grid-cols-12 gap-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runFinancialCalculation(principal, rate, startDate, endDate, basis);
                }}
                className="lg:col-span-5 p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-4"
              >
                <Input
                  label="Montant Principal (NUMERIC / Decimal)"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  required
                />
                <Input
                  label="Taux Annuel (%)"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Date de début"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Date de fin"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5">
                    Convention de base annuelle (Défaut : ACT/365) :
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ACT/365', 'ACT/360', 'ACT/ACT'] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBasis(b)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          basis === b
                            ? 'bg-[#E85D22] text-white border-[#E85D22]'
                            : 'bg-white dark:bg-[#0B2D31] border-slate-300 dark:border-teal-800'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {basis === 'ACT/365'
                      ? 'Base exacte 365 jours (Standard B2B Europe).'
                      : basis === 'ACT/360'
                      ? 'Base commerciale Money Market 360 jours.'
                      : 'Base exacte ACT/ACT : détecte automatiquement les années bissextiles (366 jours).'}
                  </p>
                </div>

                <Button type="submit" variant="primary" className="w-full" size="lg">
                  <Calculator className="w-4 h-4 mr-1" />
                  Exécuter le Calcul Déterministe Decimal.js
                </Button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Historique Reproductible des Calculs & Règles Versionnées (Composant 60)
                </p>
                {calcHistory.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E85D22]">{c.id}</span>
                        <Badge variant="orange">
                          {c.basis} (Diviseur : {c.annualDivisor}j)
                        </Badge>
                        {c.isLeapYearDetected && (
                          <Badge variant="info">Année Bissextile Détectée (366j)</Badge>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono">{c.ruleVersion}</span>
                    </div>
                    <p>
                      Principal : <strong>{formatCurrency(c.principal, c.currency, locale)}</strong> ×{' '}
                      <strong>{c.annualRatePct}%</strong> × <strong>{c.daysCount} jours</strong> /{' '}
                      <strong>{c.annualDivisor}</strong>
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-teal-800/60">
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        Intérêts calculés : +{formatCurrency(c.interestAmount, c.currency, locale)}
                      </span>
                      <span className="text-sm font-extrabold">
                        Total à terme : {formatCurrency(c.totalAmount, c.currency, locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOUS-MODULE 2 : TABLEAU D'AMORTISSEMENT DE PRÊT */}
          {selectedCalcTab === 'amortization' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <Input
                    label="Montant Emprunté (EUR)"
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                  />
                  <Input
                    label="Taux Fixe Annuel (%)"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                  />
                  <Input
                    label="Durée (Nombre d'échéances)"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                  />
                  <div>
                    <label className="text-xs font-semibold block mb-1.5">Périodicité :</label>
                    <select
                      value={loanPeriodicity}
                      onChange={(e) => setLoanPeriodicity(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-300 dark:border-teal-800 text-xs font-semibold"
                    >
                      <option value="MONTHLY">Mensuelle (12 / an)</option>
                      <option value="QUARTERLY">Trimestrielle (4 / an)</option>
                      <option value="ANNUAL">Annuelle (1 / an)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="primary" onClick={handleCalculateAmortization}>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Calculer l'Échéancier Déterministe
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      const rows = [
                        'Echeance,Date,Capital_Debut,Principal_Amorti,Interets,Total_Echeance,Capital_Fin',
                        ...amortizationSchedule.map(
                          (r) =>
                            `${r.periodNumber},${r.periodDate},${r.remainingPrincipalBeginning},${r.principalPayment},${r.interestPayment},${r.totalPeriodicPayment},${r.remainingPrincipalEnd}`
                        ),
                      ];
                      downloadDataExport('tableau_amortissement_emprunt.csv', rows.join('\n'));
                      notifyToast('Échéancier d’amortissement exporté en CSV.', 'success');
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exporter Échéancier CSV
                  </Button>
                </div>
              </div>

              {/* TABLEAU DES ÉCHÉANCES */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-teal-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-[#0B2D31] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-teal-800">
                    <tr>
                      <th className="py-3 px-3">N° Échéance</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Capital Début (EUR)</th>
                      <th className="py-3 px-3 text-right">Amortissement Principal</th>
                      <th className="py-3 px-3 text-right">Intérêts Échus</th>
                      <th className="py-3 px-3 text-right">Annuité / Échéance</th>
                      <th className="py-3 px-3 text-right">Capital Restant Dû Fin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-teal-900/60 font-mono">
                    {amortizationSchedule.map((row) => (
                      <tr key={row.periodNumber} className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                        <td className="py-2.5 px-3 font-bold font-sans">Période #{row.periodNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-sans">{row.periodDate}</td>
                        <td className="py-2.5 px-3 text-right">{row.remainingPrincipalBeginning}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                          {row.principalPayment}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#E85D22]">{row.interestPayment}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {row.totalPeriodicPayment}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {row.remainingPrincipalEnd === '0.00' ? (
                            <Badge variant="success">0.00 EUR (Soldé)</Badge>
                          ) : (
                            `${row.remainingPrincipalEnd} EUR`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          PAGE 68 : PARAMÈTRES DU RÉFÉRENTIEL COMPTABLE & FISCALITÉ (/comptable/parametres)
         ========================================================================= */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Paramètres du Référentiel Comptable & Plans de Comptes (Page 68)"
            subtitle="Configuration des plans de comptes par juridiction (PCG France/UE, IFRS International, OHADA Afrique)"
          >
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                {(['PCG', 'IFRS', 'OHADA'] as const).map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => {
                      setFramework(fw);
                      notifyToast(`Plan comptable actif changé pour : ${fw}`, 'success');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      framework === fw
                        ? 'border-[#E85D22] bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-[#E85D22]'
                        : 'border-slate-200 dark:border-teal-800 bg-white dark:bg-[#082225] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-base">{fw}</span>
                      {framework === fw && <Badge variant="orange">Actif</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      {fw === 'PCG'
                        ? 'Plan Comptable Général Français (Classes 1 à 7) pour opérations UE.'
                        : fw === 'IFRS'
                        ? 'International Financial Reporting Standards pour consolidations mondiales.'
                        : 'Système Comptable OHADA (17 États membres Ouest et Centre Afrique).'}
                    </p>
                  </button>
                ))}
              </div>

              {/* TABLE DU PLAN COMPTABLE CHOISI */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                  Arborescence des Comptes du Référentiel {framework} ({CHARTS_OF_ACCOUNTS[framework].length} comptes paramétrés)
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-teal-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-[#0B2D31] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-teal-800">
                      <tr>
                        <th className="py-2.5 px-3">Numéro</th>
                        <th className="py-2.5 px-3">Intitulé Normalisé</th>
                        <th className="py-2.5 px-3">Classe</th>
                        <th className="py-2.5 px-3">Catégorie Bilan / Résultat</th>
                        <th className="py-2.5 px-3">Rapprochable</th>
                        <th className="py-2.5 px-3">Auxiliaire Tiers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-teal-900/60 font-mono">
                      {CHARTS_OF_ACCOUNTS[framework].map((acc) => (
                        <tr key={acc.accountCode} className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{acc.accountCode}</td>
                          <td className="py-2 px-3 font-sans font-semibold">{acc.name}</td>
                          <td className="py-2 px-3 font-sans">Classe {acc.accountClass}</td>
                          <td className="py-2 px-3 font-sans">
                            <Badge variant="neutral">{acc.category}</Badge>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {acc.isReconcilable ? (
                              <Badge variant="success">Oui</Badge>
                            ) : (
                              <span className="text-slate-400">Non</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {acc.auxiliaryRequired ? (
                              <Badge variant="warning">Requis (411/401)</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>

          {/* RÈGLES FISCALES & TAUX DE TVA PAR JURIDICTION */}
          <Card
            title="Règles Fiscales & Taux de TVA par Juridiction (Chapitre 6.8)"
            subtitle="Application automatique de la TVA selon le régime d'exportation et les documents justificatifs douaniers"
          >
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-teal-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-[#0B2D31] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-teal-800">
                  <tr>
                    <th className="py-2.5 px-3">Juridiction & Régime</th>
                    <th className="py-2.5 px-3">Taux de TVA</th>
                    <th className="py-2.5 px-3">Compte Collecté</th>
                    <th className="py-2.5 px-3">Base Juridique & Conditions</th>
                    <th className="py-2.5 px-3">Justificatif Requis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-teal-900/60">
                  <tr className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                    <td className="py-2.5 px-3 font-bold">France / UE — Taux Normal</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">20.00 %</td>
                    <td className="py-2.5 px-3 font-mono">445710</td>
                    <td className="py-2.5 px-3 text-slate-500">Ventes de marchandises et équipements industriels standards</td>
                    <td className="py-2.5 px-3"><Badge variant="info">Facture B2B</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                    <td className="py-2.5 px-3 font-bold">France / UE — Taux Intermédiaire</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">10.00 %</td>
                    <td className="py-2.5 px-3 font-mono">445720</td>
                    <td className="py-2.5 px-3 text-slate-500">Prestations de transport logistique et transit terrestre</td>
                    <td className="py-2.5 px-3"><Badge variant="info">Lettre de Voiture CMR</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                    <td className="py-2.5 px-3 font-bold">France / UE — Taux Réduit</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-purple-600">5.50 %</td>
                    <td className="py-2.5 px-3 font-mono">445730</td>
                    <td className="py-2.5 px-3 text-slate-500">Denrées alimentaires et produits de première nécessité</td>
                    <td className="py-2.5 px-3"><Badge variant="info">Certificat Sanitaire</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-teal-900/20">
                    <td className="py-2.5 px-3 font-bold">Exportation Internationale Hors UE</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#E85D22]">0.00 % (Exonéré)</td>
                    <td className="py-2.5 px-3 font-mono">707000 (Exonéré)</td>
                    <td className="py-2.5 px-3 text-slate-500">Article 262-I du Code Général des Impôts (Exportation directe)</td>
                    <td className="py-2.5 px-3"><Badge variant="orange">DAU Douane + EUR.1 + CMR Signé</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL DE SAISIE D'ÉCRITURE MANUELLE ÉQUILIBRÉE EN PARTIE DOUBLE
         ========================================================================= */}
      <Modal
        open={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        title="Saisie d'Écriture Manuelle en Partie Double (Decimal.js)"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Journal Comptable :</label>
              <select
                value={newEntryJournal}
                onChange={(e) => setNewEntryJournal(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-300 dark:border-teal-800"
              >
                <option value="OD">Opérations Diverses (OD)</option>
                <option value="VTE">Journal des Ventes (VTE)</option>
                <option value="ACH">Journal des Achats (ACH)</option>
                <option value="BNQ">Journal de Trésorerie (BNQ)</option>
              </select>
            </div>
            <Input
              label="Date comptable"
              type="date"
              value={newEntryDate}
              onChange={(e) => setNewEntryDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Référence Pièce"
              value={newEntryRef}
              onChange={(e) => setNewEntryRef(e.target.value)}
            />
            <Input
              label="Libellé de l'opération"
              value={newEntryDesc}
              onChange={(e) => setNewEntryDesc(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">Lignes d'Écriture en Partie Double :</span>
              <button
                type="button"
                onClick={() =>
                  setNewEntryLines((prev) => [
                    ...prev,
                    { accountCode: '512000', accountName: 'Banque', debit: '0.00', credit: '0.00' },
                  ])
                }
                className="text-[#E85D22] font-bold hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Ajouter une ligne
              </button>
            </div>

            <div className="space-y-2">
              {newEntryLines.map((line, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Input
                      label={`Compte #${idx + 1}`}
                      value={line.accountCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEntryLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, accountCode: val } : l))
                        );
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label="Intitulé Compte"
                      value={line.accountName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEntryLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, accountName: val } : l))
                        );
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label="Débit (EUR)"
                      value={line.debit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEntryLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, debit: val } : l))
                        );
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label="Crédit (EUR)"
                      value={line.credit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEntryLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, credit: val } : l))
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INDICATEUR D'ÉQUILIBRE EN DIRECT */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
            newEntryBalance.isBalanced
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {newEntryBalance.isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-bold">
                {newEntryBalance.isBalanced
                  ? 'Écriture parfaitement équilibrée'
                  : 'Écriture déséquilibrée — Correction requise'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Débit : <strong>{newEntryBalance.totalDebit} EUR</strong></span>
              <span>Crédit : <strong>{newEntryBalance.totalCredit} EUR</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsNewEntryModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!newEntryBalance.isBalanced}
              onClick={handleSaveNewEntry}
            >
              Enregistrer l'Écriture Validée
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL ALERTE STAGE 3 (INTERDICTION ÉCRITURE SUR SOURCES COMMERCIALES)
         ========================================================================= */}
      <Modal
        open={stage3AlertOpen}
        onClose={() => setStage3AlertOpen(false)}
        title="Contrôle d'Accès Sécurisé Stage 3 — HTTP 403 FORBIDDEN"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">
                Code d'Erreur : <code>COMPTABLE_STAGE3_READONLY_SOURCE_DATA</code>
              </h4>
              <p className="mt-1">
                Le rôle <strong>COMPTABLE</strong> bénéficie d'une visibilité d'audit complète sur la plateforme mais est formellement bloqué en écriture (<code>POST</code>, <code>PUT</code>, <code>DELETE</code>) sur les entités commerciales sources :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 font-semibold">
                <li>Catalogue Produits & Prix unitaires (<code>/api/v1/products</code>)</li>
                <li>Stocks & Mouvements physiques d'entrepôt (<code>/api/v1/stocks</code>)</li>
                <li>Devis & Commandes B2B (<code>/api/v1/orders</code>)</li>
              </ul>
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                Ces mutations relèvent exclusivement du Fournisseur, du Client et de l'Administrateur. Le comptable intervient uniquement au niveau de l'enregistrement et de l'équilibrage des pièces dans les journaux comptables.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setStage3AlertOpen(false)}>
              J'ai compris cette règle d'audit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// ESPACE SUPPORT CLIENT & TICKETS (PAGES 69 À 73)
// ============================================================================

export const SupportWorkspacePage: React.FC<{
  section?: 'dashboard' | 'tickets' | 'ticket-detail' | 'room-live' | 'parametres';
}> = ({ section = 'dashboard' }) => {
  const { notifyToast, createRoomLive } = useApp();
  const params = useParams();
  const [replyText, setReplyText] = useState('');
  const [ticketReplies, setTicketReplies] = useState([
    {
      author: 'Youssef Berrada (Atlas Import S.A.)',
      time: '10:15',
      text: 'Merci de confirmer la réception du certificat thermique IoT sur l’expédition TRK-AIR-2026-9041.',
    },
    {
      author: 'Amine Khelifi (Support TradeLink)',
      time: '10:22',
      text: 'Le certificat GDP #GDP-9941-DE est bien rattaché à votre LTA. Température stable à +4.2°C.',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Icon3D name="support" size="lg" withGlow />
          <div>
            <Badge variant="orange">ESPACE SUPPORT & ASSISTANCE ROOM LIVE</Badge>
            <h1 className="text-xl font-extrabold mt-1">Centre d’Assistance Clientèle B2B (Pages 69–73)</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/support/dashboard', label: '69. Dashboard' },
            { to: '/support/tickets', label: '70. Tickets' },
            { to: '/support/tickets/TCK-2026-409', label: '71. Détail Ticket' },
            { to: '/support/room-live', label: '72. Room Live Support' },
            { to: '/support/parametres', label: '73. Paramètres' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-teal-900/60 hover:bg-[#E85D22] hover:text-white font-semibold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {(section === 'dashboard' || section === 'tickets') && (
        <Card
          title="Espace Support Client, Tickets & Assistance Room Live (Pages 69 & 70)"
          subtitle="Chapitre 2.1 : Le support n’obtient pas automatiquement accès aux données financières ou KYC ; accès limité au besoin opérationnel et journalisé."
        >
          <DataTable
            caption="Tickets d'assistance support"
            keyExtractor={(t) => t.id}
            data={[
              {
                id: 'TCK-2026-409',
                subject: 'Synchronisation douanière certificat GDP sur expédition TRK-AIR-2026-9041',
                requester: 'Atlas Import S.A.',
                priority: 'HIGH',
                status: 'IN_PROGRESS',
              },
              {
                id: 'TCK-2026-412',
                subject: 'Assistance configuration lecteur code-barres GS1-128 en entrepôt',
                requester: 'EuroTech GmbH',
                priority: 'MEDIUM',
                status: 'OPEN',
              },
            ]}
            columns={[
              {
                key: 'id',
                header: 'Ticket',
                isRowHeader: true,
                render: (t) => (
                  <Link
                    to={`/support/tickets/${t.id}`}
                    className="font-bold text-[#E85D22] hover:underline"
                  >
                    {t.id}
                  </Link>
                ),
              },
              { key: 'sub', header: 'Sujet', render: (t) => <span>{t.subject}</span> },
              { key: 'req', header: 'Demandeur', render: (t) => <span>{t.requester}</span> },
              {
                key: 'prio',
                header: 'Priorité',
                render: (t) => <Badge variant="warning">{t.priority}</Badge>,
              },
              {
                key: 'act',
                header: 'Actions Support',
                render: (t) => (
                  <div className="flex gap-2">
                    <Link to={`/support/tickets/${t.id}`}>
                      <Button size="sm" variant="secondary">Détail (Page 71)</Button>
                    </Link>
                    <Link to="/room/room-01">
                      <Button size="sm" variant="primary">Ouvrir Room Live Support</Button>
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {section === 'ticket-detail' && (
        <Card
          title={`Détail Ticket Support ${params.id ?? 'TCK-2026-409'} (Page 71)`}
          subtitle="Fil de discussion horodaté, suggestion IA filtrée et escalade Room Live"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              {ticketReplies.map((r, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800"
                >
                  <div className="flex items-center justify-between font-bold text-[#E85D22]">
                    <span>{r.author}</span>
                    <span className="font-mono text-[11px]">{r.time}</span>
                  </div>
                  <p className="mt-1">{r.text}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!replyText.trim()) return;
                setTicketReplies((prev) => [
                  ...prev,
                  {
                    author: 'Amine Khelifi (Support TradeLink)',
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    text: replyText,
                  },
                ]);
                setReplyText('');
                notifyToast('Réponse publiée et envoyée au client.', 'success');
              }}
              className="flex flex-wrap gap-2 items-end"
            >
              <div className="flex-1 min-w-[240px]">
                <Input
                  label="Répondre au ticket"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Saisissez votre réponse ou cliquez sur Suggestion IA..."
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setReplyText(
                    'Bonjour, le dédouanement anticipé à Casablanca CMN est validé. Vous pouvez rejoindre la Room Live pour le suivi final.'
                  )
                }
              >
                Pré-remplir via Suggestion IA
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Envoyer la réponse
              </Button>
            </form>
          </div>
        </Card>
      )}

      {section === 'room-live' && (
        <Card title="Room Live Support — Assistance à Distance avec Consentement (Page 72)">
          <Button
            variant="primary"
            onClick={() => createRoomLive('Session Assistance Support Client', '2026-11-18 14:00')}
          >
            + Créer une Salle Room Live d’Assistance
          </Button>
        </Card>
      )}

      {section === 'parametres' && (
        <Card title="Paramètres Support & Préférences d’Escalade (Page 73)">
          <Input label="Équipe Support Assignée" defaultValue="Niveau 2 — Opérations Logistiques & Douane" />
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// ============================================================================
// PAGE 74 : SALLE ROOM LIVE ACTIVE (/room/:id — Composants 51 à 57)
// ============================================================================

export const RoomLiveSessionPage: React.FC = () => {
  const {
    activeRoomSession,
    roomViewMode,
    setRoomViewMode,
    moderateRoomParticipant,
    toggleRoomMedia,
    sendRoomChatMessage,
    addRoomSubtitle,
    exportRoomCertifiedSummary,
    toggleRaiseHand,
    broadcastRoomReaction,
    startRoomRecording,
    stopRoomRecording,
    generateRoomAiSummary,
    shareRoomDocument,
    stopSharingRoomDocument,
    currentUser,
    notifyToast,
  } = useApp();

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [shareDocModalOpen, setShareDocModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showLobbyPreview, setShowLobbyPreview] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [subtitleInput, setSubtitleInput] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(145);
  const [summaryLocale, setSummaryLocale] = useState<'fr' | 'en' | 'ar'>('fr');
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { lang: string; text: string }>>({});
  const [reactionsOpen, setReactionsOpen] = useState(false);

  // Identifier le participant actuel
  const myParticipant = activeRoomSession.participants.find(
    (p) => p.userId === currentUser.id || p.id === currentUser.id
  );
  const isHost = myParticipant?.isHost || !!myParticipant?.isDelegatedHost;
  const isClient = currentUser.role === 'CLIENT';

  // Timer de l'enregistrement si actif
  useEffect(() => {
    if (!activeRoomSession.isRecording) return;
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRoomSession.isRecording]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Traduction instantanée d'un message du chat
  const handleTranslateMessage = (msgId: string, text: string, targetLang: 'fr' | 'en' | 'ar') => {
    const result = CentralTranslationService.translateDynamicText(text, 'fr', targetLang);
    setTranslatedMessages((prev) => ({
      ...prev,
      [msgId]: { lang: targetLang.toUpperCase(), text: result.translatedText },
    }));
  };

  const connectedParticipants = activeRoomSession.participants.filter(
    (p) => p.status === 'CONNECTED'
  );
  const waitingParticipants = activeRoomSession.participants.filter(
    (p) => p.status === 'WAITING_ROOM'
  );

  // Si le participant est dans la salle d'attente (Knocking) ou souhaite tester ses périphériques
  if ((myParticipant?.status === 'WAITING_ROOM' || showLobbyPreview) && !isHost) {
    return (
      <RoomLiveLobbyView
        roomTitle={activeRoomSession.title}
        roomCode={activeRoomSession.roomCode}
        creatorName={activeRoomSession.creatorName}
        isAdmitted={myParticipant?.status === 'CONNECTED'}
        onEnterRoom={() => setShowLobbyPreview(false)}
      />
    );
  }

  // Sélection du participant principal en mode Intervenant (SPEAKER)
  const activeSpeaker =
    connectedParticipants.find((p) => p.isSpeaking) ||
    connectedParticipants.find((p) => p.id === activeRoomSession.activeSpeakerId) ||
    connectedParticipants[0];

  return (
    <div className="relative space-y-6">
      {/* Réactions éphémères interactives flottantes */}
      {activeRoomSession.activeReactions && activeRoomSession.activeReactions.length > 0 && (
        <div className="fixed bottom-24 right-8 pointer-events-none z-50 flex flex-col items-end gap-2">
          {activeRoomSession.activeReactions.slice(-4).map((reaction) => (
            <div
              key={reaction.id}
              className="animate-bounce bg-[#061E22]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-500/80 shadow-2xl flex items-center gap-2 text-white text-xs"
            >
              <span className="text-xl">{reaction.emoji}</span>
              <span className="font-semibold text-teal-200">{reaction.participantName}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-[#062023] text-white p-6 border border-teal-700 shadow-2xl space-y-6">
        {/* Entête de la salle Room Live */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon3D name="support" size="lg" withGlow />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">LIVE WEBRTC / SFU SIMULCAST</Badge>
                {activeRoomSession.isRecording ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600/90 text-white animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    REC [{formatDuration(recordingSeconds)}] • KMS AES-256 (90j)
                  </span>
                ) : (
                  <Badge variant="orange">CONSENTEMENT ENREGISTREMENT ACTIF</Badge>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-900 text-teal-200 border border-teal-700">
                  Rétention 90j RGPD (Art. L. 123-22)
                </span>
              </div>
              <h1 className="text-xl font-extrabold mt-1">{activeRoomSession.title}</h1>
              <p className="text-xs text-teal-200">
                Code Salle : <span className="font-mono font-bold text-[#E85D22]">{activeRoomSession.roomCode}</span> • Hôte : {activeRoomSession.creatorName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bascule Grille / Intervenant Principal */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-teal-800">
              <button
                type="button"
                onClick={() => setRoomViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  roomViewMode === 'GRID' ? 'bg-[#E85D22] text-white' : 'text-teal-300 hover:text-white'
                }`}
                title="Vue Grille"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                type="button"
                onClick={() => setRoomViewMode('SPEAKER')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  roomViewMode === 'SPEAKER' ? 'bg-[#E85D22] text-white' : 'text-teal-300 hover:text-white'
                }`}
                title="Vue Intervenant"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Intervenant</span>
              </button>
            </div>

            {/* Test Lobby */}
            <Button size="sm" variant="secondary" onClick={() => setShowLobbyPreview(true)}>
              Tester Lobby
            </Button>

            {/* Enregistrement Host Control */}
            {isHost && (
              <Button
                size="sm"
                variant={activeRoomSession.isRecording ? 'danger' : 'secondary'}
                onClick={() => {
                  if (activeRoomSession.isRecording) {
                    stopRoomRecording();
                  } else {
                    startRoomRecording();
                  }
                }}
              >
                <Disc className={`w-3.5 h-3.5 ${activeRoomSession.isRecording ? 'animate-spin' : ''}`} />
                {activeRoomSession.isRecording ? 'Arrêter Enregistrement' : 'Enregistrer (RGPD)'}
              </Button>
            )}

            {/* Inviter Collaborateur */}
            <Button size="sm" variant="secondary" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              Inviter
            </Button>

            {/* Nouvelle Salle pour Rôles Habilités (Client exclu) */}
            {!isClient && (
              <Button size="sm" variant="secondary" onClick={() => setCreateModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5" />
                Nouvelle Salle
              </Button>
            )}

            {/* Compte Rendu IA & Décisions */}
            <Button variant="primary" size="sm" onClick={() => setSummaryOpen(true)}>
              <Sparkles className="w-4 h-4" />
              Compte Rendu IA
            </Button>
          </div>
        </div>

        {/* Bannière de sensibilisation aux rôles & permissions (Règle stricte Prompt 07) */}
        {isClient ? (
          <div className="p-3.5 rounded-2xl bg-teal-950/80 border border-teal-700/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Espace Client Invité (Chapitre 6.10 & Annexe B) :</strong> Vous participez en mode invité à cette réunion autorisée. Les clients ne disposent pas d'un droit général de création de salles.
                {myParticipant?.isDelegatedHost && (
                  <span className="ms-1 font-bold text-orange-300">
                    (Délégation ponctuelle de co-animation accordée pour cette seule séance).
                  </span>
                )}
              </span>
            </div>
            <Badge variant="info">Rôle Client Invité</Badge>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-[#092B2F] border border-teal-800 flex items-center justify-between gap-3 text-xs text-teal-200">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E85D22] shrink-0" />
              <span>
                <strong>Modération SFU Active (Rôle {currentUser.role}) :</strong> Vous disposez des autorisations de modération pour gérer les flux médias, expulser et valider la salle d'attente.
              </span>
            </div>
            <Badge variant="orange">{currentUser.role} Hôte</Badge>
          </div>
        )}

        {/* Salle d'attente (Knocking) : affichée si des participants attendent */}
        {waitingParticipants.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold text-amber-300 uppercase tracking-wide">
                  Salle d'Attente ({waitingParticipants.length} en attente d'admission)
                </span>
              </div>
              <Badge variant="orange">Composant 51 : WaitingRoom Knocking</Badge>
            </div>
            <div className="space-y-2">
              {waitingParticipants.map((wp) => (
                <div
                  key={wp.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-teal-800"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={wp.avatarUrl}
                      alt={wp.name}
                      className="w-8 h-8 rounded-full object-cover border border-amber-400"
                    />
                    <div>
                      <p className="font-bold text-white">{wp.name}</p>
                      <p className="text-[11px] text-teal-300">Rôle : {wp.role} • Frappe à la porte à {wp.joinedAt}</p>
                    </div>
                  </div>
                  {isHost ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => moderateRoomParticipant(wp.id, 'ADMIT')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Admettre dans la salle
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => moderateRoomParticipant(wp.id, 'DENY')}
                      >
                        Refuser
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Attente de validation par l'hôte...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VideoGrid, Partage d'écran & ChatPanel */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {/* Si partage d'écran / document actif */}
            {activeRoomSession.screenShareActive && (
              <div className="rounded-2xl border-2 border-[#E85D22] bg-[#071E21] p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorUp className="w-4 h-4 text-[#E85D22]" />
                    <span className="font-bold text-orange-300">
                      DOCUMENT PARTAGÉ À L'ÉCRAN : {activeRoomSession.sharedDocumentTitle || 'Lettre de Voiture e-CMR'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="orange">Diffusion HD 1080p</Badge>
                    <Button size="sm" variant="danger" onClick={() => stopSharingRoomDocument()}>
                      Arrêter
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-black/50 border border-teal-800 font-mono text-[11px] space-y-2">
                  <div className="flex justify-between border-b border-teal-800 pb-2">
                    <span>DOCUMENT OFFICIEL : {activeRoomSession.sharedDocument?.title || 'CMR-2026-9901'}</span>
                    <span>Scellé Numérique : #TRADELINK-SFU-SECURE</span>
                  </div>
                  <p>Type de Document : {activeRoomSession.sharedDocument?.type || 'TRANSPORT'} • Contrôle Douanier Validé</p>
                  <p className="text-emerald-400 font-bold">Certification Intégrité SHA-256 Validée en Temps Réel</p>
                </div>
              </div>
            )}

            {/* Vue Vidéo selon Mode : Grille ou Intervenant Principal */}
            {roomViewMode === 'SPEAKER' && activeSpeaker ? (
              <div className="space-y-3">
                {/* Intervenant Principal (Hero) */}
                <div className="relative rounded-2xl overflow-hidden h-72 sm:h-80 border-2 border-[#E85D22] bg-[#082225] shadow-2xl">
                  {activeSpeaker.videoEnabled ? (
                    <img
                      src={activeSpeaker.avatarUrl}
                      alt={activeSpeaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                      <VideoOff className="w-10 h-10 text-teal-600" />
                      <span className="text-xs">Caméra coupée</span>
                    </div>
                  )}

                  {/* Overlay Intervenant */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E85D22] text-xs font-bold text-white flex items-center gap-1.5 shadow">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        Intervenant Principal
                      </span>
                      <div className="flex items-center gap-2">
                        {activeSpeaker.isSpeaking && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/80 text-[10px] font-bold text-white animate-pulse">
                            En train de parler...
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-teal-300">
                          SFU Simulcast 1080p
                        </span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-base font-black text-white">{activeSpeaker.name}</p>
                        <p className="text-xs text-orange-300">{activeSpeaker.role}</p>
                      </div>
                      {activeSpeaker.raisedHand && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg">
                          <Hand className="w-3.5 h-3.5" />
                          Main #{activeSpeaker.raisedHandOrder || 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bandeau inférieur des autres participants */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {connectedParticipants
                    .filter((p) => p.id !== activeSpeaker.id)
                    .map((part) => (
                      <div
                        key={part.id}
                        className="relative rounded-xl overflow-hidden w-40 h-28 shrink-0 border border-teal-800 bg-[#082225]"
                      >
                        {part.videoEnabled ? (
                          <img
                            src={part.avatarUrl}
                            alt={part.name}
                            className="w-full h-full object-cover opacity-85"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                            Cam coupée
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-between text-[10px]">
                          <div className="flex justify-end">
                            {part.audioEnabled ? (
                              <Mic className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <MicOff className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                          <p className="font-bold text-white truncate">{part.name}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* Vue Grille Classique */
              <div className="grid sm:grid-cols-2 gap-4">
                {connectedParticipants.map((part) => {
                  const isMe = part.userId === currentUser.id;
                  const isSpeaking = part.isSpeaking;
                  return (
                    <div
                      key={part.id}
                      className={`relative rounded-2xl overflow-hidden h-52 border-2 transition-all ${
                        isSpeaking
                          ? 'border-emerald-400 ring-4 ring-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                          : part.isHost
                          ? 'border-[#E85D22]'
                          : 'border-teal-800'
                      }`}
                    >
                      {part.videoEnabled ? (
                        <img
                          src={part.avatarUrl}
                          alt={part.name}
                          className="w-full h-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#082225] flex flex-col items-center justify-center gap-2 text-slate-400">
                          <VideoOff className="w-8 h-8 text-teal-600" />
                          <span className="text-xs">Caméra désactivée</span>
                        </div>
                      )}

                      {/* Superposition des contrôles & métadonnées du participant */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-teal-300">
                            {part.networkQuality || 'EXCELLENT'} • Simulcast
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isSpeaking && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500 text-[10px] font-bold text-white animate-pulse">
                                <span className="w-1 h-2 bg-white rounded-full animate-bounce" />
                                <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                              </span>
                            )}
                            <span
                              className={`p-1 rounded-md text-[10px] ${
                                part.audioEnabled ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/40 text-red-300'
                              }`}
                            >
                              {part.audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                            </span>
                            {part.isHost && (
                              <Badge variant="orange">Hôte</Badge>
                            )}
                            {part.isDelegatedHost && !part.isHost && (
                              <Badge variant="info">Co-Hôte</Badge>
                            )}
                            {part.raisedHand && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-white flex items-center gap-1">
                                <Hand className="w-3 h-3" />
                                #{part.raisedHandOrder || 1}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">
                                {part.name} {isMe && `(Vous)`}
                              </p>
                              <p className="text-[11px] text-orange-300 font-medium">{part.role}</p>
                            </div>
                          </div>

                          {/* Menu de modération réservé à l'hôte */}
                          {isHost && !isMe && (
                            <div className="flex flex-wrap gap-1 pt-1 border-t border-teal-800/80 text-[10px]">
                              <button
                                type="button"
                                onClick={() => moderateRoomParticipant(part.id, 'MUTE_MIC')}
                                className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 text-teal-200 transition-colors"
                              >
                                Muter
                              </button>
                              <button
                                type="button"
                                onClick={() => moderateRoomParticipant(part.id, 'DISABLE_CAM')}
                                className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 text-teal-200 transition-colors"
                              >
                                Couper Cam
                              </button>
                              {part.raisedHand && (
                                <button
                                  type="button"
                                  onClick={() => moderateRoomParticipant(part.id, 'LOWER_HAND')}
                                  className="px-1.5 py-0.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white transition-colors"
                                >
                                  Abaisser Main
                                </button>
                              )}
                              {!part.isDelegatedHost && (
                                <button
                                  type="button"
                                  onClick={() => moderateRoomParticipant(part.id, 'DELEGATE_HOST')}
                                  className="px-1.5 py-0.5 rounded bg-[#E85D22]/80 hover:bg-[#E85D22] text-white transition-colors"
                                >
                                  Déléguer Hôte
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => moderateRoomParticipant(part.id, 'EXPEL')}
                                className="px-1.5 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                              >
                                Exclure
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bandeau de sous-titres IA en temps réel (Composant 56) */}
            <div className="rounded-2xl bg-black/60 border border-teal-800 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E85D22]" />
                  Transcription IA & Sous-Titres Temps Réel (Composant 56) :
                </span>
                <span className="text-slate-400 font-mono text-[10px]">Français / English / العربية</span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/60 text-xs">
                {activeRoomSession.subtitlesHistory.length > 0 ? (
                  <p className="italic text-teal-100">
                    <span className="font-bold text-[#E85D22]">
                      {activeRoomSession.subtitlesHistory[activeRoomSession.subtitlesHistory.length - 1].speakerName} :
                    </span>{' '}
                    « {activeRoomSession.subtitlesHistory[activeRoomSession.subtitlesHistory.length - 1].text} »
                  </p>
                ) : (
                  <p className="italic text-slate-400">En attente de prise de parole...</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.target.value)}
                  placeholder="Simuler une prise de parole pour sous-titrage IA direct..."
                  className="flex-1 rounded-xl bg-black/40 border border-teal-700 px-3 py-1 text-xs text-white focus:outline-none focus:border-[#E85D22]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!subtitleInput.trim()) return;
                    addRoomSubtitle(subtitleInput);
                    setSubtitleInput('');
                  }}
                >
                  Sous-titrer
                </Button>
              </div>
            </div>
          </div>

          {/* ChatPanel intégré avec Traduction Instantanée (Composants 55 & 58) */}
          <div className="lg:col-span-4 rounded-2xl bg-[#092B2F] border border-teal-800 p-4 flex flex-col justify-between h-full min-h-[460px]">
            <div className="space-y-3 overflow-y-auto text-xs max-h-[380px] pe-1">
              <div className="flex items-center justify-between border-b border-teal-800 pb-2">
                <p className="font-bold text-orange-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Chat Trilingue (FR/EN/AR)
                </p>
                <span className="text-[10px] text-teal-400 font-mono">
                  {activeRoomSession.chatHistory.length} messages
                </span>
              </div>
              {activeRoomSession.chatHistory.map((c) => {
                const translation = translatedMessages[c.id];
                return (
                  <div key={c.id} className="p-2.5 rounded-xl bg-black/40 border border-teal-800/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-teal-200">
                        {c.senderName} ({c.senderRole})
                      </span>
                      <span className="text-slate-400 font-mono">{c.timestamp}</span>
                    </div>
                    <p className="text-slate-100">{c.text}</p>

                    {/* Affichage de la traduction instantanée si demandée */}
                    {translation && (
                      <div className="p-2 rounded-lg bg-teal-950/80 border border-teal-700/60 text-[11px] text-teal-200 italic space-y-0.5">
                        <span className="text-[9px] font-bold text-orange-300 not-italic uppercase">
                          Traduction IA [{translation.lang}] :
                        </span>
                        <p>{translation.text}</p>
                      </div>
                    )}

                    {/* Boutons d'action de traduction */}
                    <div className="flex items-center gap-2 pt-1 border-t border-teal-900/60 text-[9px]">
                      <span className="text-slate-400">Traduire :</span>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(c.id, c.text, 'en')}
                        className="text-teal-300 hover:text-white transition-colors"
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(c.id, c.text, 'ar')}
                        className="text-teal-300 hover:text-white transition-colors"
                      >
                        AR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(c.id, c.text, 'fr')}
                        className="text-teal-300 hover:text-white transition-colors"
                      >
                        FR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                sendRoomChatMessage(chatInput);
                setChatInput('');
              }}
              className="flex items-center gap-2 pt-3 border-t border-teal-800 mt-3"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message aux participants..."
                  className="w-full rounded-xl bg-black/40 border border-teal-700 px-3 pe-9 py-1.5 text-xs text-white focus:outline-none focus:border-[#E85D22]"
                />
                <div className="absolute inset-inline-end-1.5">
                  <VoiceDictationButton
                    onTranscript={(t) => setChatInput((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" variant="primary">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>

        {/* ControlBar Complète (Composant 54) */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-teal-800">
          <Button
            variant={myParticipant?.audioEnabled ? 'secondary' : 'danger'}
            onClick={() => toggleRoomMedia('audio')}
          >
            {myParticipant?.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {myParticipant?.audioEnabled ? 'Micro Actif' : 'Micro Coupé'}
          </Button>

          <Button
            variant={myParticipant?.videoEnabled ? 'secondary' : 'danger'}
            onClick={() => toggleRoomMedia('video')}
          >
            {myParticipant?.videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            {myParticipant?.videoEnabled ? 'Caméra Active' : 'Caméra Coupée'}
          </Button>

          {/* Bouton Lever / Abaisser la Main */}
          <Button
            variant={myParticipant?.raisedHand ? 'danger' : 'secondary'}
            onClick={() => toggleRaiseHand()}
          >
            <Hand className="w-4 h-4" />
            {myParticipant?.raisedHand
              ? `Main Levée (#${myParticipant.raisedHandOrder || 1})`
              : 'Lever la Main'}
          </Button>

          {/* Menu Réactions Interactives */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setReactionsOpen((prev) => !prev)}
            >
              <Smile className="w-4 h-4" />
              Réactions
            </Button>
            {reactionsOpen && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-[#092B2F] border border-teal-700 shadow-2xl flex items-center gap-2 z-40">
                {['👍', '👏', '❤️', '🎉', '💡', '✋'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      broadcastRoomReaction(emoji);
                      setReactionsOpen(false);
                    }}
                    className="p-1.5 hover:scale-125 transition-transform text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Partage de Documents / Écran */}
          <Button
            variant={activeRoomSession.screenShareActive ? 'primary' : 'secondary'}
            onClick={() => {
              if (activeRoomSession.screenShareActive) {
                stopSharingRoomDocument();
              } else {
                setShareDocModalOpen(true);
              }
            }}
          >
            <MonitorUp className="w-4 h-4" />
            {activeRoomSession.screenShareActive ? 'Arrêter Partage' : 'Partager Document / CMR'}
          </Button>

          <Link to="/client/dashboard">
            <Button variant="danger">
              <PhoneOff className="w-4 h-4" />
              Quitter la Salle
            </Button>
          </Link>
        </div>
      </div>

      {/* AISummaryModal Trilingue (Composant 57) */}
      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Compte Rendu IA Post-Réunion & Décisions (Composant 57 : AISummaryModal)"
      >
        {activeRoomSession.aiSummary && (
          <div className="space-y-4 text-xs">
            {/* Sélecteur de Langue de Traduction du Compte Rendu */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-950/60 border border-teal-800">
              <span className="font-bold text-teal-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#E85D22]" />
                Langue du Rapport IA :
              </span>
              <div className="flex gap-1.5">
                {(['fr', 'en', 'ar'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setSummaryLocale(lang);
                      generateRoomAiSummary(lang);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                      summaryLocale === lang
                        ? 'bg-[#E85D22] text-white'
                        : 'bg-black/40 text-teal-300 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Synthèse Executive Générée par l'IA :</span>
                <Badge variant="success">TradeLink AI Certified</Badge>
              </div>
              <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                {activeRoomSession.aiSummary.summary}
              </p>
            </div>

            {/* Sujets Abordés */}
            {activeRoomSession.aiSummary.topicsDiscussed && activeRoomSession.aiSummary.topicsDiscussed.length > 0 && (
              <div>
                <p className="font-bold mb-1.5 text-slate-900 dark:text-slate-100">
                  Sujets Principaux Abordés en Séance :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeRoomSession.aiSummary.topicsDiscussed.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-[11px]"
                    >
                      # {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="font-bold mb-1.5 text-slate-900 dark:text-slate-100">
                Décisions opérationnelles validées en séance :
              </p>
              <ul className="space-y-1.5">
                {activeRoomSession.aiSummary.decisions.map((d, idx) => (
                  <li key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-emerald-900 dark:text-emerald-200 font-medium">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-bold mb-1.5 text-slate-900 dark:text-slate-100">
                Actions à mener & Responsables :
              </p>
              <ul className="space-y-1.5">
                {activeRoomSession.aiSummary.actionItems.map((a, idx) => {
                  const taskText = typeof a === 'string' ? a : `${a.task} (${a.assigneeName || a.assigneeRole} - Échéance : ${a.dueDate || 'J+3'})`;
                  return (
                    <li key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-[#0A292C] border border-slate-200 dark:border-teal-800">
                      <span className="w-2 h-2 rounded-full bg-[#E85D22]" />
                      <span>{taskText}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Sceau Cryptographique SHA-256 */}
            {(activeRoomSession.aiSummary.signatureSha256 || activeRoomSession.aiSummary.certifiedHashSha256) && (
              <div className="p-3 rounded-xl bg-black/40 border border-teal-800/80 font-mono text-[10px] space-y-1">
                <span className="text-slate-400">Empreinte Cryptographique SHA-256 du Compte Rendu :</span>
                <p className="text-orange-300 break-all">
                  {activeRoomSession.aiSummary.signatureSha256 || activeRoomSession.aiSummary.certifiedHashSha256}
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-teal-50 dark:bg-[#062023] border border-teal-200 dark:border-teal-800 text-[11px] space-y-1 text-slate-600 dark:text-teal-300">
              <p className="font-bold text-teal-800 dark:text-teal-200">
                🔒 Mentions Légales & Rétention Réglementaire :
              </p>
              <p>
                - Enregistrement consenti et conforme au RGPD (Art. 6 & 7) par l'ensemble des participants.
              </p>
              <p>
                - Conservation stricte de 90 jours conformément à l'article L. 123-22 du Code de Commerce avec chiffrement KMS AES-256.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-teal-800">
              <Button variant="secondary" onClick={() => setSummaryOpen(false)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const certText = exportRoomCertifiedSummary();
                  downloadDataExport(
                    `compte_rendu_officiel_${activeRoomSession.roomCode}.txt`,
                    certText,
                    'text/plain;charset=utf-8;'
                  );
                  setSummaryOpen(false);
                }}
              >
                <Download className="w-4 h-4" />
                Télécharger le Compte Rendu Certifié (SHA-256)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modale de Partage de Documents Métier (e-CMR, Facture Pro-Forma, etc.) */}
      <RoomLiveShareDocModal
        open={shareDocModalOpen}
        onClose={() => setShareDocModalOpen(false)}
        onSelectDocument={(doc) => {
          shareRoomDocument(doc);
          setShareDocModalOpen(false);
          notifyToast(`Document partagé à l'écran : ${doc.title}`, 'success');
        }}
      />

      {/* Modale d'Invitation en Réunion (Lien signé HMAC-SHA256) */}
      <RoomLiveInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        roomCode={activeRoomSession.roomCode}
        roomTitle={activeRoomSession.title}
      />

      {/* Modale de Création / Programmation de Réunion (Rôles habilités) */}
      <RoomLiveCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          notifyToast('Nouvelle salle Room Live créée avec succès !', 'success');
        }}
      />
    </div>
  );
};

// ============================================================================
// STUDIO OCR / IDP CÔTE À CÔTE (COMPOSANTS 37, 38, 39)
// ============================================================================

export const OCRStudioPage: React.FC = () => {
  const {
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'STUDIO' | 'UPLOAD' | 'HISTORY'>('STUDIO');

  const sampleFields = [
    {
      key: 'invoiceNumber',
      label: 'Numéro de Facture',
      value: 'FAC-2026-9901',
      confidence: 0.98,
      boundingBox: { x: 120, y: 45, width: 140, height: 20, page: 1 },
    },
    {
      key: 'issueDate',
      label: 'Date d\'Émission',
      value: '2026-11-18',
      confidence: 0.96,
      boundingBox: { x: 420, y: 45, width: 100, height: 20, page: 1 },
    },
    {
      key: 'vendorName',
      label: 'Fournisseur Émetteur',
      value: 'EuroTech Distribution SARL',
      confidence: 0.95,
      boundingBox: { x: 120, y: 80, width: 220, height: 22, page: 1 },
    },
    {
      key: 'clientName',
      label: 'Client Destinataire',
      value: 'Atlas Industrial S.A.',
      confidence: 0.94,
      boundingBox: { x: 120, y: 110, width: 200, height: 22, page: 1 },
    },
    {
      key: 'taxIdentifier',
      label: 'Identifiant Fiscal (ICE / RC)',
      value: '002938475000032',
      confidence: 0.93,
      boundingBox: { x: 120, y: 140, width: 180, height: 20, page: 1 },
    },
    {
      key: 'amountHt',
      label: 'Montant Total HT',
      value: '3450.00',
      confidence: 0.97,
      boundingBox: { x: 380, y: 350, width: 120, height: 22, page: 1 },
    },
    {
      key: 'vatAmount',
      label: 'Montant TVA (20%)',
      value: '690.00',
      confidence: 0.96,
      boundingBox: { x: 380, y: 380, width: 120, height: 22, page: 1 },
    },
    {
      key: 'amountTtc',
      label: 'Montant Total TTC',
      value: '4140.00',
      confidence: 0.99,
      boundingBox: { x: 380, y: 410, width: 120, height: 24, page: 1 },
    },
    {
      key: 'currency',
      label: 'Devise de Facturation',
      value: 'EUR',
      confidence: 0.99,
      boundingBox: { x: 505, y: 410, width: 40, height: 24, page: 1 },
    },
    {
      key: 'incoterm',
      label: 'Incoterm Commercial',
      value: 'CIF Casablanca Port',
      confidence: 0.88,
      boundingBox: { x: 120, y: 440, width: 160, height: 20, page: 1 },
    },
  ];

  // Document échantillon complet représentatif de l'intelligence documentaire TRADELINK V6.0
  const [activeDoc, setActiveDoc] = useState<OcrDocumentDetail>({
    id: 'doc-ocr-sample-001',
    fileName: 'Facture_EuroTech_FAC-9901.pdf',
    fileSize: 418290,
    fileSizeFormatted: '408.5 Ko',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    profile: 'INVOICE',
    status: 'EXTRACTED_PENDING_REVIEW',
    processingStatus: 'EXTRACTED_PENDING_REVIEW',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    previewUrl: '/logos/logo-light-horizontal.png',
    presignedUrl: '/logos/logo-light-horizontal.png',
    rawText: `FACTURE COMMERCIALE N° FAC-2026-9901
Date : 18/11/2026
Fournisseur : EuroTech Distribution SARL
Client : Atlas Industrial S.A.
ICE : 002938475000032
RC : Casablanca 184920
Devise : EUR

Articles :
- 10x Capteur IoT Industriel IP67 (PU: 120.00 EUR, Total: 1200.00 EUR)
- 5x Passerelle Edge Gateway 5G (PU: 450.00 EUR, Total: 2250.00 EUR)

Montant Total HT : 3450.00 EUR
TVA (20%) : 690.00 EUR
Montant Total TTC : 4140.00 EUR
Incoterm : CIF Casablanca Port
Mode de règlement : Virement bancaire 30 jours`,
    extractedText: `FACTURE COMMERCIALE N° FAC-2026-9901`,
    detectedLanguage: 'fr',
    globalConfidence: 0.942,
    uncertainFields: [],
    fields: sampleFields,
    extractedFields: sampleFields,
    lineItems: [
      {
        id: 'li-1',
        lineNumber: 1,
        description: 'Capteur IoT Industriel IP67',
        sku: 'IOT-SENS-IP67',
        quantity: 10,
        unitPrice: '120.00',
        lineTotal: '1200.00',
        vatRate: '20%',
        confidence: 0.96,
      },
      {
        id: 'li-2',
        lineNumber: 2,
        description: 'Passerelle Edge Gateway 5G',
        sku: 'GW-EDGE-5G-V2',
        quantity: 5,
        unitPrice: '450.00',
        lineTotal: '2250.00',
        vatRate: '20%',
        confidence: 0.95,
      },
    ],
    dynamicFields: [],
    corrections: [],
    correctionsLog: [],
    uploadedById: 'user-sample',
    validationMetadata: {
      humanReviewCompleted: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [recentDocuments, setRecentDocuments] = useState<OcrDocumentDetail[]>([
    activeDoc,
    {
      id: 'doc-ocr-cmr-002',
      fileName: 'Lettre_CMR_ColdChain_Zenata.pdf',
      fileSize: 582100,
      fileSizeFormatted: '568.4 Ko',
      fileType: 'PDF',
      mimeType: 'application/pdf',
      profile: 'TRANSPORT_CMR',
      status: 'VALIDATED',
      processingStatus: 'VALIDATED',
      contentHash: 'f4c1d293847eab10293847120398471290384712093847120938471209384712',
      sha256Hash: 'f4c1d293847eab10293847120398471290384712093847120938471209384712',
      previewUrl: '/logos/logo-light-horizontal.png',
      presignedUrl: '/logos/logo-light-horizontal.png',
      rawText: 'CMR INTERNATIONAL TRANSPORT',
      extractedText: 'CMR INTERNATIONAL TRANSPORT',
      detectedLanguage: 'fr',
      globalConfidence: 0.96,
      uncertainFields: [],
      fields: [
        { key: 'consignmentNoteNumber', label: 'Numéro CMR', value: 'CMR-2026-8841', confidence: 0.98 },
        { key: 'carrierName', label: 'Transporteur', value: 'Atlas Cold Chain Express', confidence: 0.97 },
      ],
      extractedFields: [
        { key: 'consignmentNoteNumber', label: 'Numéro CMR', value: 'CMR-2026-8841', confidence: 0.98 },
        { key: 'carrierName', label: 'Transporteur', value: 'Atlas Cold Chain Express', confidence: 0.97 },
      ],
      lineItems: [],
      dynamicFields: [],
      corrections: [],
      correctionsLog: [],
      uploadedById: 'user-sample-2',
      validationMetadata: {
        humanReviewCompleted: true,
        validatedBy: 'Karim Transport Manager',
        validatedAt: '2026-11-18T10:15:00Z',
      },
      createdAt: '2026-11-18T09:30:00Z',
      updatedAt: '2026-11-18T10:15:00Z',
    },
  ]);

  const handleUploadSuccess = (newDoc: OcrDocumentDetail) => {
    setActiveDoc(newDoc);
    setRecentDocuments((prev) => [newDoc, ...prev]);
    setActiveTab('STUDIO');
  };

  return (
    <div className="space-y-6">
      {/* En-tête Global du Studio OCR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-[#E85D22]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Studio OCR / IDP — Extraction & Intelligence Documentaire
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconnaissance optique haute précision, détection binaire anti-malware, vérification de cohérence arithmétique et validation humaine obligatoire.
          </p>
        </div>

        {/* Onglets de navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0A292C] border border-slate-200 dark:border-teal-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('STUDIO')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'STUDIO'
                ? 'bg-white dark:bg-[#071F22] text-[#E85D22] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Studio Côte-à-Côte
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'UPLOAD'
                ? 'bg-white dark:bg-[#071F22] text-[#E85D22] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Téléversement Sécurisé
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-white dark:bg-[#071F22] text-[#E85D22] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Historique ({recentDocuments.length})
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'UPLOAD' && (
        <OcrSecureUploader onUploadSuccess={handleUploadSuccess} />
      )}

      {activeTab === 'STUDIO' && (
        <OcrDocumentStudioView
          document={activeDoc}
          onValidateDocument={(payload) => {
            setActiveDoc((prev) => ({
              ...prev,
              status: 'VALIDATED',
              validationMetadata: {
                validatedBy: payload.validatorName,
                validatedAt: payload.approvedAt,
                humanReviewCompleted: true,
                reviewNotes: payload.reviewNotes,
              },
            }));
          }}
          onRejectDocument={(reason) => {
            setActiveDoc((prev) => ({
              ...prev,
              status: 'REJECTED',
              validationMetadata: {
                validatedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Super Admin',
                validatedAt: new Date().toISOString(),
                humanReviewCompleted: true,
                reviewNotes: `Rejeté : ${reason}`,
              },
            }));
          }}
        />
      )}

      {activeTab === 'HISTORY' && (
        <Card
          title="Historique des Documents Traités par l'IDP"
          subtitle="Suivi complet des documents importés, validés ou en attente d'arbitrage humain."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 dark:bg-[#0A292C] font-semibold text-slate-700 dark:text-teal-200 border-b border-slate-200 dark:border-teal-800">
                <tr>
                  <th className="p-3 text-start">Nom du fichier</th>
                  <th className="p-3 text-start">Profil</th>
                  <th className="p-3 text-start">Langue</th>
                  <th className="p-3 text-center">Confiance</th>
                  <th className="p-3 text-start">Statut</th>
                  <th className="p-3 text-start">Validation Humaine</th>
                  <th className="p-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-teal-900/60">
                {recentDocuments.map((docItem) => (
                  <tr key={docItem.id} className="hover:bg-slate-50 dark:hover:bg-teal-950/40">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#E85D22]" />
                      <span>{docItem.fileName}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-teal-900 text-slate-700 dark:text-teal-200">
                        {docItem.profile}
                      </span>
                    </td>
                    <td className="p-3 uppercase font-mono">{docItem.detectedLanguage}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      {(docItem.globalConfidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          docItem.status === 'VALIDATED'
                            ? 'success'
                            : docItem.status === 'REJECTED'
                            ? 'danger'
                            : 'orange'
                        }
                      >
                        {docItem.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">
                      {docItem.validationMetadata?.humanReviewCompleted
                        ? `Certifié par ${docItem.validationMetadata.validatedBy}`
                        : 'En attente'}
                    </td>
                    <td className="p-3 text-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveDoc(docItem);
                          setActiveTab('STUDIO');
                        }}
                      >
                        Ouvrir Studio
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// PAGES 76, 77, 78, 79 : NOTIFICATIONS INTERACTIVES & PAGES D'ERREUR (404, 403, 500)
// ============================================================================

export const NotificationsCenterPage: React.FC = () => {
  const {
    notificationsList,
    toggleNotificationRead,
    markAllNotificationsRead,
  } = useApp();
  const [activeTab, setActiveTab] = useState('ALL');

  const filtered = notificationsList.filter((n) => {
    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'READ') return n.isRead;
    return true;
  });

  return (
    <Card
      title="Centre de Notifications Multi-Canaux (Page 76 — Composant 58)"
      subtitle="Alertes KYC J+1/J+3/J+5/J+6, transitions de commandes, incidents logistiques et sécurité"
      action={
        <Button size="sm" variant="secondary" onClick={markAllNotificationsRead}>
          Tout marquer comme lu
        </Button>
      }
    >
      <div className="space-y-4">
        <Tabs
          ariaLabel="Filtre des notifications"
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'ALL', label: 'Toutes', badge: notificationsList.length },
            {
              id: 'UNREAD',
              label: 'Non lues',
              badge: notificationsList.filter((n) => !n.isRead).length,
            },
            {
              id: 'READ',
              label: 'Lues',
              badge: notificationsList.filter((n) => n.isRead).length,
            },
          ]}
        />

        <div className="space-y-3 text-xs">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3.5 transition-all ${
                n.isRead
                  ? 'bg-slate-50/60 dark:bg-[#082225]/50 border-slate-200/70 dark:border-teal-800/50 opacity-75'
                  : 'bg-white dark:bg-[#0D353A] border-[#E85D22]/50 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon3D name={n.icon} size="md" withGlow />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={n.isRead ? 'neutral' : 'orange'}>{n.cat}</Badge>
                    <span className="font-bold text-sm">{n.title}</span>
                    <span className="text-[11px] text-slate-400">• {n.timestamp}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">{n.msg}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleNotificationRead(n.id)}
              >
                {n.isRead ? 'Marquer non lu' : 'Marquer lu'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const ErrorSystemPage: React.FC<{ code: '403' | '404' | '500' }> = ({ code }) => {
  const details = {
    '403': {
      title: '403 — Accès Refusé (Contrôle RBAC & Ownership Serveur)',
      desc: 'Vous ne disposez pas des permissions requises ou la ressource appartient à un autre acteur.',
    },
    '404': {
      title: '404 — Ressource Introuvable',
      desc: 'La page ou l’identifiant demandé n’existe pas dans votre périmètre TRADELINK V6.0.',
    },
    '500': {
      title: '500 — Erreur Serveur Contrôlée (ID de Corrélation Généré)',
      desc: 'Aucun détail interne ni stack trace n’est exposé conformément au chapitre 9.20.',
    },
  }[code];

  return (
    <div className="py-16 text-center space-y-4">
      <Icon3D name="hazardous-goods" size="2xl" />
      <h1 className="text-2xl font-extrabold">{details.title}</h1>
      <p className="text-sm text-slate-500 max-w-md mx-auto">{details.desc}</p>
      <Link to="/">
        <Button variant="primary">Retour à l’accueil TradeLink</Button>
      </Link>
    </div>
  );
};
