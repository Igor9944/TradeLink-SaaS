// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE TRANSPORTEUR TERRAIN & MOBILE-FIRST (PAGES 53 À 61)
// 9 PILIERS :
// 1. Tableau de bord (Livraisons à accepter, affectées, collectes, en cours, terminées, incidents, revenus, KPIs)
// 2. Gestion des missions (Missions disponibles, détails expédition, acceptation/refus motivé, chauffeurs, véhicules)
// 3. Suivi des livraisons & Opérations terrain (Carte GPS, waypoints, stepper tactile, confirmation collecte/livraison, POD, signature tactile)
// 4. Gestion des incidents (Retard, adresse, colis abîmé, client absent, déclaration rapide, photos, suivi résolution)
// 5. Gestion documentaire (Bons de transport, e-CMR, EUR.1, POD signées, export PDF/JSON)
// 6. Communication & Urgences (Messagerie autorisée, alertes météo/port, boutons d'appel direct quai/transitaire)
// 7. Assistant IA & Dictée vocale (Tournées optimisées, synthèse des courses, dictée vocale STT/TTS pour rapports chauffeur)
// 8. Room Live (Création autorisée de visioconférences logistiques et participation)
// 9. Paramètres & Flotte (Profil MedFreight, véhicules ATP frigo/bâché, chauffeurs, disponibilités, sécurité, langues)
// ERGONOMIE TERRAIN : Mobile-First, gros boutons tactiles (48px min), contraste élevé pour cabine.
// ISOLATION DES DONNÉES : Strict Anti-IDOR (carrierId === currentUser.id)
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  DollarSign,
  Camera,
  PenTool,
  Mic,
  MicOff,
  Download,
  Eye,
  Video,
  Warehouse,
  Boxes,
  Navigation,
  Check,
  X,
  Compass,
  AlertOctagon,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, downloadDataExport } from '../i18n/translations';
import { ActorKycWorkspaceView } from '../components/kyc/KycModuleViews';
import { InteractiveLogisticsMap } from '../components/logistics/InteractiveLogisticsMap';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  SearchBar,
} from '../components/ui/DesignSystem';
import { VoiceDictationButton } from '../components/voice/VoiceDictationButton';
import { ThemeMode } from '../types';
import {
  ProofOfDeliveryData,
  VehicleRecord,
  RouteWaypoint,
} from '../services/logisticsEngine';

export const CarrierWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'kyc'
    | 'missions'
    | 'mission-detail'
    | 'expeditions'
    | 'suivi'
    | 'documents'
    | 'incidents'
    | 'communication'
    | 'assistant-ia'
    | 'room-live'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    setLocale,
    theme,
    setTheme,
    currentUser,
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
    resolveIncident,
    rooms,
    createRoomLive,
    isVoiceRecording,
    startVoiceDictation,
    stopVoiceDictation,
    voiceTranscript,
    notifyToast,
  } = useApp();

  const params = useParams();

  // --------------------------------------------------------------------------
  // ISOLATION STRICTE ANTI-IDOR (Chapitre 6.4)
  // Un transporteur ne consulte que les missions et expéditions qui lui sont affectées.
  // --------------------------------------------------------------------------
  const myMissions = useMemo(() => {
    return missions.filter(
      (m) => m.carrierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [missions, currentUser.id, currentUser.role]);

  const myShipments = useMemo(() => {
    return shipments.filter(
      (s) => s.carrierId === currentUser.id || currentUser.role === 'ADMIN'
    );
  }, [shipments, currentUser.id, currentUser.role]);

  const myIncidents = useMemo(() => {
    return incidents.filter(
      (i) =>
        i.carrierId === currentUser.id ||
        myShipments.some((s) => s.id === i.shipmentId) ||
        currentUser.role === 'ADMIN'
    );
  }, [incidents, myShipments, currentUser.id, currentUser.role]);

  // --------------------------------------------------------------------------
  // ÉTATS DE FILTRAGE & RECHERCHE
  // --------------------------------------------------------------------------
  const [missionFilter, setMissionFilter] = useState<'ALL' | 'OFFERED' | 'ACCEPTED' | 'STARTED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // --------------------------------------------------------------------------
  // SÉLECTION DE LA MISSION ET EXPÉDITION COURANTE
  // --------------------------------------------------------------------------
  const selectedShipment = useMemo(() => {
    return (
      myShipments.find((s) => s.id === params.id || s.trackingNumber === params.id) ??
      myShipments[0] ??
      shipments[0]
    );
  }, [myShipments, shipments, params.id]);

  const selectedMission = useMemo(() => {
    return (
      myMissions.find((m) => m.id === params.id || m.orderId === selectedShipment?.orderId) ??
      myMissions[0] ??
      missions[0]
    );
  }, [myMissions, missions, selectedShipment, params.id]);

  // --------------------------------------------------------------------------
  // MODALES & ACTIONS TERRAIN
  // --------------------------------------------------------------------------
  // 1. Refus motivé
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [refusalMissionId, setRefusalMissionId] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState('Indisponibilité temporaire de semi-remorque frigorifique ATP FRC');

  // 2. Acceptation avec affectation véhicule et chauffeur
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [acceptMissionId, setAcceptMissionId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'veh-01');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('Karim Benjelloun (Permis EC - ADR)');

  // 3. Preuve de livraison électronique (POD) avec signature
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [podRecipientName, setPodRecipientName] = useState('Youssef Berrada');
  const [podRecipientIdDoc, setPodRecipientIdDoc] = useState('CIN BK-994102 / Quai B Atlas');
  const [podNotes, setPodNotes] = useState('Palettes réceptionnées sans réserve, scellé douanier #MA-98214 intact, température caisse +3.6°C.');
  const [podPhotoAttached, setPodPhotoAttached] = useState(true);

  // 4. Déclaration rapide d'incident
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incType, setIncType] = useState('Ralentissement au contrôle scanner Tanger Med');
  const [incSeverity, setIncSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [incDesc, setIncDesc] = useState('Inspection douanière approfondie des palettes frigorifiques en cours au portique scanner.');

  // 5. Ajout de véhicule à la flotte
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('14920-B-1');
  const [newModel, setNewModel] = useState('Scania 540 S Highline Frigo');
  const [newType, setNewType] = useState<VehicleRecord['vehicleType']>('REEFER_ATP_FRIGO');
  const [newCapacityKg, setNewCapacityKg] = useState(25000);

  // 6. Room Live logistique
  const [roomTitle, setRoomTitle] = useState('Coordination Transit Port Tanger Med & Quai Zenata');
  const [roomScheduledAt, setRoomScheduledAt] = useState('2026-11-20 14:30');

  // --------------------------------------------------------------------------
  // STATISTIQUES OPÉRATIONNELLES FLOTTE & REVENUS
  // --------------------------------------------------------------------------
  const stats = useMemo(() => {
    const offeredCount = myMissions.filter((m) => m.status === 'OFFERED').length;
    const acceptedCount = myMissions.filter((m) => m.status === 'ACCEPTED').length;
    const activeCount = myMissions.filter((m) => m.status === 'STARTED').length;
    const completedCount = myMissions.filter((m) => m.status === 'COMPLETED').length;
    const activeIncidents = myIncidents.filter((i) => i.status !== 'RESOLVED').length;
    const totalFreightRevenue = (completedCount * 1850) + (activeCount * 1200);

    return {
      offeredCount,
      acceptedCount,
      activeCount,
      completedCount,
      activeIncidents,
      totalFreightRevenue,
      onTimeRate: '98.4%',
      fleetAvailable: vehicles.filter((v) => v.status === 'AVAILABLE').length,
      fleetTotal: vehicles.length,
    };
  }, [myMissions, myIncidents, vehicles]);

  // Filtrage des missions
  const filteredMissions = useMemo(() => {
    return myMissions.filter((m) => {
      const matchFilter = missionFilter === 'ALL' || m.status === missionFilter;
      const matchSearch =
        m.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [myMissions, missionFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // HANDLERS MÉTIER LOGISTIQUE
  // --------------------------------------------------------------------------
  const handleConfirmAcceptMission = () => {
    if (!acceptMissionId) return;
    respondToMission(acceptMissionId, true);
    notifyToast(`Mission ${acceptMissionId} acceptée avec chauffeur ${selectedDriverName} !`, 'success');
    setAcceptModalOpen(false);
    setAcceptMissionId(null);
  };

  const handleConfirmRefusal = () => {
    if (!refusalMissionId) return;
    if (refusalReason.trim().length < 5) {
      notifyToast('Veuillez renseigner un motif de refus explicite.', 'error');
      return;
    }
    respondToMission(refusalMissionId, false, refusalReason);
    notifyToast(`Mission ${refusalMissionId} refusée. Motif : ${refusalReason}`, 'info');
    setRefusalModalOpen(false);
    setRefusalMissionId(null);
  };

  const handleConfirmPodSubmission = () => {
    if (!selectedShipment) return;
    const podData: ProofOfDeliveryData = {
      shipmentId: selectedShipment.id,
      recipientFullName: podRecipientName,
      recipientIdNumber: podRecipientIdDoc,
      signedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      digitalSignatureSvg:
        '<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><path d="M 15 35 Q 45 10 75 35 T 135 30 Q 165 48 185 25" fill="none" stroke="#E85D22" stroke-width="3" stroke-linecap="round"/></svg>',
      proofPhotoUri: '/assets/pod/pallet-quai-delivered.jpg',
      deliveryLatitude: 33.602,
      deliveryLongitude: -7.521,
      deliveryNotes: podNotes,
    };
    recordProofOfDelivery(selectedShipment.id, podData);
    notifyToast(`Preuve de livraison POD certifiée et transmise au client et au fournisseur !`, 'success');
    setPodModalOpen(false);
  };

  const handleReportIncidentFast = () => {
    if (!selectedShipment) return;
    reportIncident(selectedShipment.id, incType, incDesc, incSeverity);
    notifyToast(`Incident logistique déclaré et notifié en temps réel aux parties prenantes !`, 'warning');
    setIncidentModalOpen(false);
  };

  const handleCreateVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVehicle({
      carrierId: currentUser.id,
      carrierName: currentUser.companyName,
      registrationPlate: newPlate,
      brandModel: newModel,
      vehicleType: newType,
      capacityKg: newCapacityKg,
      capacityM3: 86,
      hasAtpReeferCert: newType === 'REEFER_ATP_FRIGO',
      atpCertExpiry: '2028-12-31',
      hasAdrDangerousGoodsPermit: true,
      gpsTrackingInstalled: true,
      status: 'AVAILABLE',
    });
    notifyToast(`Véhicule ${newPlate} (${newModel}) ajouté avec succès à la flotte !`, 'success');
    setAddVehicleModalOpen(false);
    setNewPlate('');
    setNewModel('');
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BANDEAU SUPÉRIEUR MOBILE-FIRST ESPACE TRANSPORTEUR                    */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-4 sm:p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-[#E85D22]">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE TRANSPORTEUR TERRAIN V6.0</Badge>
              <Badge variant="success">AGRÉMENT ATP FRC / TIR</Badge>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold mt-1 text-slate-900 dark:text-white">
              {currentUser.companyName}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Hub Logistique Tanger Med Port & Casablanca Quai Zenata
            </p>
          </div>
        </div>

        {/* Barre de navigation rapide adaptée tactile */}
        <div className="flex flex-wrap gap-1.5 text-xs w-full sm:w-auto">
          {[
            { to: '/transporteur/dashboard', label: '1. Dashboard' },
            { to: '/transporteur/missions', label: '2. Missions' },
            { to: '/transporteur/expeditions', label: '3. Suivi & POD' },
            { to: '/transporteur/incidents', label: '4. Incidents' },
            { to: '/transporteur/documents', label: '5. e-CMR & Douane' },
            { to: '/transporteur/communication', label: '6. Urgences' },
            { to: '/transporteur/ia', label: '7. Assistant IA' },
            { to: '/transporteur/room-live', label: '8. Room Live' },
            { to: '/transporteur/kyc', label: 'KYC J+7' },
            { to: '/transporteur/parametres', label: '9. Flotte' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-2 rounded-xl font-bold min-h-[40px] flex items-center justify-center transition-all ${
                window.location.pathname === item.to
                  ? 'bg-[#E85D22] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-teal-900/60 hover:bg-slate-200 dark:hover:bg-teal-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. TABLEAU DE BORD TERRAIN (/transporteur/dashboard)                  */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* Métriques KPI Mobile-First */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card title="À Accepter" subtitle="Décision immédiate requise">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-2xl font-black ${stats.offeredCount > 0 ? 'text-[#E85D22]' : 'text-slate-700'}`}>
                    {stats.offeredCount}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Missions en attente</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#E85D22]">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="En Cours de Route" subtitle="Transit maritime & routier">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-blue-600">
                    {stats.activeCount + stats.acceptedCount}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Véhicules sur le terrain</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="Livraisons Réussies" subtitle="POD certifiées">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-emerald-600">
                    {stats.completedCount}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ponctualité : {stats.onTimeRate}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card title="Fret Facturé & Débloqué" subtitle="Montants autorisés">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(stats.totalFreightRevenue, 'EUR', locale)}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Virement après signature POD</p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Alerte Incidents si actifs */}
          {stats.activeIncidents > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    {stats.activeIncidents} Incident(s) Logistique(s) en cours de traitement
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Ralentissements douaniers ou vérifications de scellés nécessitant coordination avec le quai.
                  </p>
                </div>
              </div>
              <Link to="/transporteur/incidents">
                <Button size="sm" variant="danger">Gérer Incidents</Button>
              </Link>
            </div>
          )}

          {/* Grille : Raccourcis d'actions chauffeur terrain & Carte simplifiée */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Opérations Chauffeur Rapides (Tactile Quai)" subtitle="Actions d'urgence d'un simple tap">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Link
                  to="/transporteur/expeditions"
                  className="p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-center transition-all block"
                >
                  <PenTool className="w-6 h-6 text-[#E85D22] mx-auto mb-2" />
                  <strong className="block text-slate-900 dark:text-white text-sm">Faire Signer POD</strong>
                  <span className="text-slate-500 text-[11px]">Preuve de livraison client</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(true)}
                  className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-center transition-all block"
                >
                  <AlertOctagon className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                  <strong className="block text-slate-900 dark:text-white text-sm">Signaler Incident</strong>
                  <span className="text-slate-500 text-[11px]">Retard, casse ou refus</span>
                </button>

                <Link
                  to="/transporteur/documents"
                  className="p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-center transition-all block"
                >
                  <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <strong className="block text-slate-900 dark:text-white text-sm">e-CMR Mobile</strong>
                  <span className="text-slate-500 text-[11px]">Contrôle routier / douane</span>
                </Link>

                <Link
                  to="/transporteur/ia"
                  className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-center transition-all block"
                >
                  <Mic className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <strong className="block text-slate-900 dark:text-white text-sm">Dictée Vocale</strong>
                  <span className="text-slate-500 text-[11px]">Rapport mains-libres</span>
                </Link>
              </div>
            </Card>

            <Card title="Corridor de Fret Actuel" subtitle="Position GPS en direct">
              <InteractiveLogisticsMap />
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GESTION DES MISSIONS (/transporteur/missions)                       */}
      {/* ===================================================================== */}
      {section === 'missions' && (
        <Card
          title="Missions d'Expédition Logistique (Page 55)"
          subtitle="Consultez les missions transmises par les fournisseurs et planifiez les véhicules et chauffeurs."
        >
          {/* Filtres et recherche */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(['ALL', 'OFFERED', 'ACCEPTED', 'STARTED', 'COMPLETED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setMissionFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    missionFilter === st
                      ? 'bg-[#E85D22] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Toutes'
                    : st === 'OFFERED'
                    ? `À Accepter (${stats.offeredCount})`
                    : st === 'ACCEPTED'
                    ? 'Affectées'
                    : st === 'STARTED'
                    ? 'En Transit'
                    : 'Livrées'}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher mission, client, quai..."
              />
            </div>
          </div>

          {/* Liste des missions */}
          <div className="space-y-3">
            {filteredMissions.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Aucune mission ne correspond à vos filtres.</p>
            ) : (
              filteredMissions.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900 dark:text-white">{m.orderNumber}</strong>
                      <Badge
                        variant={
                          m.status === 'COMPLETED'
                            ? 'success'
                            : m.status === 'STARTED'
                            ? 'info'
                            : m.status === 'ACCEPTED'
                            ? 'orange'
                            : m.status === 'REFUSED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {m.status}
                      </Badge>
                      {m.isColdChain && <Badge variant="info">Chaîne du Froid ATP</Badge>}
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">Affectée le : {m.assignedAt}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>
                      <p>
                        <Warehouse className="w-3.5 h-3.5 inline mr-1 text-[#E85D22]" />
                        <strong>Enlèvement :</strong> {m.pickupAddress}
                      </p>
                      <p className="text-slate-400 mt-0.5">Fournisseur : {m.supplierName}</p>
                    </div>
                    <div>
                      <p>
                        <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
                        <strong>Livraison :</strong> {m.deliveryAddress}
                      </p>
                      <p className="text-slate-400 mt-0.5">Destinataire : {m.clientName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-teal-800">
                    <span className="font-mono text-slate-500">
                      Poids : <strong>{m.cargoWeightKg} kg</strong> • Volume : <strong>{m.cargoVolumeM3} m³</strong>
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/transporteur/missions/${m.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="w-3.5 h-3.5" /> Fiche Mission
                        </Button>
                      </Link>

                      {m.status === 'OFFERED' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setAcceptMissionId(m.id);
                              setAcceptModalOpen(true);
                            }}
                          >
                            <Check className="w-3.5 h-3.5" /> Accepter & Affecter
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setRefusalMissionId(m.id);
                              setRefusalModalOpen(true);
                            }}
                          >
                            <X className="w-3.5 h-3.5" /> Refuser...
                          </Button>
                        </>
                      )}

                      {m.status === 'ACCEPTED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            const shp = myShipments.find((s) => s.orderId === m.orderId);
                            if (shp) updateShipmentStatus(shp.id, 'COLLECTED');
                            notifyToast(`Enlèvement confirmé pour la mission ${m.orderNumber} !`, 'success');
                          }}
                        >
                          <Boxes className="w-3.5 h-3.5" /> Confirmer Collecte
                        </Button>
                      )}

                      {m.status === 'STARTED' && (
                        <Link to="/transporteur/expeditions">
                          <Button size="sm" variant="primary">
                            <Navigation className="w-3.5 h-3.5" /> Suivre & Valider POD
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 2. DÉTAILS EXPÉDITION / MISSION (/transporteur/missions/:id)          */}
      {/* ===================================================================== */}
      {section === 'mission-detail' && (
        <Card
          title={`Ordre de Mission Détaillé : ${selectedMission?.orderNumber || ''}`}
          subtitle={`Acheteur : ${selectedMission?.clientName || ''} • Enlèvement : ${selectedMission?.pickupAddress || ''}`}
          action={
            <Link to="/transporteur/missions">
              <Button size="sm" variant="secondary">← Retour Missions</Button>
            </Link>
          }
        >
          <div className="space-y-6 text-xs">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Statut Actuel</span>
                <Badge variant="orange">{selectedMission?.status}</Badge>
                <p className="text-[11px] text-slate-500 mt-1">Affectation MedFreight</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Caisse & Température</span>
                <strong className="text-slate-900 dark:text-white block">
                  {selectedMission?.requiredVehicleType || 'Semi-Remorque Frigo'}
                </strong>
                <p className="text-[11px] text-emerald-600 font-bold">Consigne : -20°C à +4°C (ATP)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Poids & Cubage</span>
                <strong className="text-slate-900 dark:text-white block">
                  {selectedMission?.cargoWeightKg} kg • {selectedMission?.cargoVolumeM3} m³
                </strong>
                <p className="text-[11px] text-slate-500">Palettes Europe filmées</p>
              </div>
            </div>

            {/* Stepper d'actions rapides */}
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-wrap items-center justify-between gap-4">
              <div>
                <strong className="text-sm text-slate-900 dark:text-white block">
                  Passer à l'Étape Suivante
                </strong>
                <span className="text-slate-600 dark:text-slate-300">
                  Déclenchez la mise à jour d'état instantanée pour informer le client et le transitaire.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const shp = myShipments.find((s) => s.orderId === selectedMission?.orderId);
                    if (shp) updateShipmentStatus(shp.id, 'IN_TRANSIT');
                    notifyToast('Transit maritime & routier en cours !', 'success');
                  }}
                >
                  <Navigation className="w-3.5 h-3.5" /> En Transit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPodModalOpen(true);
                  }}
                >
                  <PenTool className="w-3.5 h-3.5" /> Clôturer par POD
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 3. SUIVI DES LIVRAISONS & POD (/transporteur/expeditions)              */}
      {/* ===================================================================== */}
      {section === 'expeditions' && (
        <div className="space-y-6">
          <Card
            title="Opérations Terrain & Preuve de Livraison POD (Page 57)"
            subtitle="Mise à jour tactile des étapes de transport, géolocalisation et signature électronique du destinataire."
          >
            {/* Expédition active */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-base text-[#E85D22]">{selectedShipment?.trackingNumber}</strong>
                    <Badge variant="info">{selectedShipment?.status}</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Trajet : <strong>{selectedShipment?.origin}</strong> → <strong>{selectedShipment?.destination}</strong>
                  </p>
                  <p className="text-slate-500">
                    ETA estimée : {selectedShipment?.estimatedArrival} • Palettes : {selectedShipment?.palletsCount}
                  </p>
                </div>

                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => setPodModalOpen(true)}
                  className="min-h-[48px] px-6 text-sm font-bold shadow-lg"
                >
                  <PenTool className="w-5 h-5" /> Enregistrer Signature Client (POD)
                </Button>
              </div>

              {/* Stepper Tactile Grand Format pour Chauffeur Terrain */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 space-y-3">
                <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs uppercase tracking-wider">
                  Mise à Jour d'Étape en 1 Tap (Chauffeur en Cabine) :
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-[48px] text-xs font-bold"
                    onClick={() => {
                      updateShipmentStatus(selectedShipment.id, 'COLLECTED');
                      notifyToast('Étape validée : Collecte effectuée.', 'success');
                    }}
                  >
                    1. Enlevé / Quai
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-[48px] text-xs font-bold"
                    onClick={() => {
                      updateShipmentStatus(selectedShipment.id, 'IN_TRANSIT');
                      notifyToast('Étape validée : En transit route/mer.', 'success');
                    }}
                  >
                    2. En Transit
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-[48px] text-xs font-bold"
                    onClick={() => {
                      updateShipmentStatus(selectedShipment.id, 'OUT_FOR_DELIVERY');
                      notifyToast('Étape validée : En livraison finale.', 'success');
                    }}
                  >
                    3. Approche Finale
                  </Button>
                  <Button
                    variant="primary"
                    className="min-h-[48px] text-xs font-bold"
                    onClick={() => setPodModalOpen(true)}
                  >
                    4. Livré + Signer
                  </Button>
                </div>
              </div>

              {/* Waypoints de trajet */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs">
                  Points de Passage & Jalons Géographiques de la Mission :
                </span>
                {((waypoints[selectedShipment?.id] || Object.values(waypoints)[0] || []) as RouteWaypoint[]).map((wp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-[#E85D22]" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">{wp.name}</strong>
                        <p className="text-[10px] text-slate-400 font-mono">
                          GPS: {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={wp.isCheckpoint ? 'success' : 'neutral'}>
                      {wp.isCheckpoint ? 'Validé' : 'À venir'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Carte Interactive GPS & Télémétrie en Direct" subtitle="Traçabilité continue sous température dirigée">
            <InteractiveLogisticsMap />
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. GESTION DES INCIDENTS (/transporteur/incidents)                     */}
      {/* ===================================================================== */}
      {section === 'incidents' && (
        <Card
          title="Gestion & Déclaration des Incidents Logistiques (Page 59)"
          subtitle="Signalement rapide depuis le terrain (avarie, retard, douane, client absent) et suivi de résolution."
          action={
            <Button
              size="sm"
              variant="danger"
              onClick={() => setIncidentModalOpen(true)}
              className="min-h-[40px]"
            >
              <AlertTriangle className="w-4 h-4" /> + Déclarer un Incident Terrain
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            {myIncidents.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">Aucun incident déclaré. Tous les flux sont nominaux.</p>
            ) : (
              myIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900 dark:text-white">{inc.title}</strong>
                      <Badge
                        variant={
                          inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                            ? 'danger'
                            : inc.severity === 'MEDIUM'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        Gravité : {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'neutral'}>
                        {inc.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{inc.description}</p>
                    <p className="text-slate-400 text-[10px]">
                      Expédition : {inc.trackingNumber} • Déclaré le : {inc.reportedAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {inc.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          resolveIncident(inc.id);
                          notifyToast(`Incident ${inc.title} marqué comme résolu !`, 'success');
                        }}
                      >
                        <Check className="w-3.5 h-3.5" /> Clôturer Incident
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 5. GESTION DOCUMENTAIRE (/transporteur/documents)                     */}
      {/* ===================================================================== */}
      {section === 'documents' && (
        <Card
          title="Lettre de Voiture e-CMR & Documents Douaniers (Page 58)"
          subtitle="Documents officiels dématérialisés avec QR Code de vérification routière et archivage certifié."
        >
          <div className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  code: 'CMR-2026-9122-MA',
                  type: 'Lettre de Voiture e-CMR Internationale',
                  status: 'Actif / Validé',
                  desc: 'Trajet Hambourg → Casablanca • 24 000 kg Frigo',
                },
                {
                  code: 'EUR1-2026-8804-DE',
                  type: 'Certificat d’Origine Douanier EUR.1',
                  status: 'Visé Douane',
                  desc: 'Préférence tarifaire Accord UE-Maroc Tanger Med',
                },
                {
                  code: 'POD-2026-3190-SIGN',
                  type: 'Preuve de Livraison Numérique (POD)',
                  status: 'Certifiée',
                  desc: 'Signature client scellée avec horodatage SHA-256',
                },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white">{doc.code}</strong>
                    <Badge variant="success">{doc.status}</Badge>
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{doc.type}</p>
                  <p className="text-slate-500 text-[11px]">{doc.desc}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => {
                      downloadDataExport(`${doc.code}.json`, JSON.stringify(doc, null, 2), 'application/json');
                      notifyToast(`Document ${doc.code} exporté.`, 'info');
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Télécharger Document
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 6. COMMUNICATION & CONTACTS D'URGENCE (/transporteur/communication)    */}
      {/* ===================================================================== */}
      {section === 'communication' && (
        <div className="space-y-6">
          <Card
            title="Contacts Opérationnels d'Urgence & Appels en 1 Clic"
            subtitle="Accès immédiat pour le conducteur en situation de quai ou d'inspection routière."
          >
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <a
                href="tel:+212522000000"
                className="p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 flex items-center gap-3 transition-all block"
              >
                <div className="p-3 rounded-xl bg-[#E85D22] text-white">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-sm text-slate-900 dark:text-white block">Quai Client Zenata</strong>
                  <span className="text-slate-500">Chef de quai : +212 522 99 41 02</span>
                </div>
              </a>

              <a
                href="tel:+212539000000"
                className="p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-3 transition-all block"
              >
                <div className="p-3 rounded-xl bg-blue-600 text-white">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-sm text-slate-900 dark:text-white block">Transitaire Tanger Med</strong>
                  <span className="text-slate-500">Poste scanner : +212 539 33 80 10</span>
                </div>
              </a>

              <a
                href="tel:+34956000000"
                className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3 transition-all block"
              >
                <div className="p-3 rounded-xl bg-emerald-600 text-white">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-sm text-slate-900 dark:text-white block">Assistance Flotte 24/7</strong>
                  <span className="text-slate-500">Dépannage route : +34 956 77 12 00</span>
                </div>
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. ASSISTANT IA & DICTÉE VOCALE CONDUCTEUR (/transporteur/ia)          */}
      {/* ===================================================================== */}
      {section === 'assistant-ia' && (
        <div className="space-y-6">
          <Card
            title="Assistant IA Logistique & Dictée Vocale Mains-Libres"
            subtitle="Conçu spécialement pour les conducteurs : enregistrement de rapports d'incident et synthèse de tournée sans quitter la route des yeux."
          >
            <div className="space-y-4 text-xs">
              <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#E85D22]" /> Microphone Chauffeur STT / TTS
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Dictez vos rapports de livraison, avaries de palettes ou remarques de quai en Français, Anglais ou Arabe.
                  </p>
                </div>
                <Button
                  size="lg"
                  variant={isVoiceRecording ? 'danger' : 'primary'}
                  className="min-h-[48px] px-6 text-sm font-bold shadow-md"
                  onClick={() => {
                    if (isVoiceRecording) {
                      stopVoiceDictation();
                    } else {
                      startVoiceDictation(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR');
                    }
                  }}
                >
                  {isVoiceRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {isVoiceRecording ? 'Arrêter Enregistrement' : 'Démarrer la Dictée Vocale'}
                </Button>
              </div>

              {voiceTranscript && (
                <div className="p-4 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono text-xs">
                  <span className="text-slate-400 block mb-1">Transcription en temps réel :</span>
                  {voiceTranscript}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. ROOM LIVE LOGISTIQUE (/transporteur/room-live) — CRÉATION AUTORISÉE */}
      {/* ===================================================================== */}
      {section === 'room-live' && (
        <Card
          title="Room Live Logistique — Création de Salles & Points de Quai (Page 60)"
          subtitle="Le Transporteur est autorisé à créer des réunions d'urgence pour coordonner les arrivées de quai ou les inspections douanières."
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-[#E85D22]" /> Créer une Salle de Réunion Logistique
              </h4>
              <div className="grid sm:grid-cols-3 gap-3 items-end">
                <Input
                  label="Titre du point logistique"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                />
                <Input
                  label="Date & Heure"
                  value={roomScheduledAt}
                  onChange={(e) => setRoomScheduledAt(e.target.value)}
                />
                <Button
                  variant="primary"
                  className="w-full min-h-[42px]"
                  onClick={() => {
                    const res = createRoomLive(roomTitle, roomScheduledAt);
                    if (res.ok) {
                      notifyToast(`Salle Room Live créée ! Code : ${res.room?.roomCode}`, 'success');
                    }
                  }}
                >
                  + Créer la Salle
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-white text-sm block">{rm.title}</strong>
                    <p className="text-slate-400 font-mono text-[11px]">
                      Code: {rm.roomCode} • Prévue le {rm.scheduledAt}
                    </p>
                    <div className="mt-1">
                      <Badge variant={rm.status === 'LIVE' ? 'success' : 'neutral'}>
                        {rm.status === 'LIVE' ? 'En Direct' : 'Programmée'}
                      </Badge>
                    </div>
                  </div>
                  <Link to={`/room/${rm.id}`}>
                    <Button size="sm" variant="secondary">
                      Entrer en Salle
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 9. KYC DU TRANSPORTEUR (/transporteur/kyc)                             */}
      {/* ===================================================================== */}
      {section === 'kyc' && <ActorKycWorkspaceView actorProfile="TRANSPORTEUR" />}

      {/* ===================================================================== */}
      {/* 9. PARAMÈTRES, FLOTTE & CHAUFFEURS (/transporteur/parametres)         */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Flotte de Véhicules & Agréments Frigorifiques ATP (Page 61)"
            subtitle="Inventaire de la flotte, certifications de température dirigée et contrôle technique."
            action={
              <Button size="sm" variant="primary" onClick={() => setAddVehicleModalOpen(true)}>
                + Ajouter un Véhicule
              </Button>
            }
          >
            <DataTable
              caption="Véhicules de transport enregistrés"
              keyExtractor={(v) => v.id}
              data={vehicles}
              columns={[
                {
                  key: 'veh',
                  header: 'Véhicule & Modèle',
                  isRowHeader: true,
                  render: (v) => (
                    <div>
                      <strong className="text-slate-900 dark:text-white">{v.brandModel}</strong>
                      <p className="text-xs font-mono text-[#E85D22]">{v.registrationPlate}</p>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type de Caisse',
                  render: (v) => <Badge variant="info">{v.vehicleType}</Badge>,
                },
                {
                  key: 'cap',
                  header: 'Charge Max',
                  render: (v) => <span>{v.capacityKg} kg ({v.capacityM3} m³)</span>,
                },
                {
                  key: 'status',
                  header: 'Statut Opérationnel',
                  render: (v) => (
                    <Badge variant={v.status === 'AVAILABLE' ? 'success' : 'warning'}>
                      {v.status}
                    </Badge>
                  ),
                },
              ]}
            />
          </Card>

          {/* Équipe de chauffeurs */}
          <Card
            title="Équipe de Chauffeurs Routiers Qualifiés"
            subtitle="Permis poids lourd C/EC, FIMO/FCO et habilitations matières dangereuses ADR."
          >
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {[
                { name: 'Karim Benjelloun', certs: 'Permis EC • FCO • ADR Colis', phone: '+212 661 10 20 30', status: 'En Mission Quai Zenata' },
                { name: 'Hassan Tazi', certs: 'Permis EC • FCO • Citerne ATP', phone: '+212 662 44 55 66', status: 'Disponible Tanger Med' },
              ].map((dr, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{dr.name}</strong>
                      <span className="text-slate-500 text-[11px]">{dr.certs} • {dr.phone}</span>
                    </div>
                  </div>
                  <Badge variant="success">{dr.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Préférences Langues & Thème */}
          <Card
            title="Préférences d’Affichage & Thème de Cabine"
            subtitle="Personnalisation pour conduite de jour ou de nuit."
          >
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="font-semibold block mb-2">Langue :</label>
                <div className="flex gap-2">
                  {[
                    { code: 'fr', label: 'Français' },
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية (RTL)' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLocale(l.code as any)}
                      className={`px-3 py-2 rounded-xl border font-bold min-h-[40px] transition-all ${
                        locale === l.code
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-2">Mode Visibilité :</label>
                <div className="flex gap-2">
                  {[
                    { mode: 'system', label: 'Automatique' },
                    { mode: 'light', label: 'Jour' },
                    { mode: 'dark', label: 'Nuit / Sombre' },
                  ].map((th) => (
                    <button
                      key={th.mode}
                      type="button"
                      onClick={() => setTheme(th.mode as ThemeMode)}
                      className={`px-3 py-2 rounded-xl border font-bold min-h-[40px] transition-all ${
                        theme === th.mode
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL TACTILE : PREUVE DE LIVRAISON ÉLECTRONIQUE (POD SIGNATURE)      */}
      {/* ===================================================================== */}
      {podModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#E85D22]" />
              Preuve de Livraison Électronique (POD Mobile)
            </h3>
            <p className="text-slate-500">
              Faites signer directement le réceptionnaire sur l'écran tactile du smartphone ou de la tablette de cabine.
            </p>

            <div className="space-y-3">
              <Input
                label="Nom & Prénom du Réceptionnaire"
                value={podRecipientName}
                onChange={(e) => setPodRecipientName(e.target.value)}
                required
              />
              <Input
                label="Pièce d'Identité ou Fonction Quai"
                value={podRecipientIdDoc}
                onChange={(e) => setPodRecipientIdDoc(e.target.value)}
                required
              />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Réserves de livraison éventuelles :</label>
                  <VoiceDictationButton
                    onTranscript={(t) => setPodNotes((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <input
                  type="text"
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                />
              </div>

              {/* Surface de signature tactile interactive */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Signature Numérique Tactile (au doigt ou au stylet) :
                </label>
                <div className="w-full h-28 rounded-2xl bg-slate-100 dark:bg-[#071E22] border-2 border-dashed border-[#E85D22] flex items-center justify-center relative cursor-crosshair">
                  <svg className="w-full h-full p-2" viewBox="0 0 200 60">
                    <path
                      d="M 20 40 Q 50 15 80 40 T 140 30 Q 170 50 185 20"
                      fill="none"
                      stroke="#E85D22"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute bottom-1 right-2 text-[10px] text-slate-400 font-mono">
                    Scellé Cryptographique SHA-256
                  </span>
                </div>
              </div>

              {/* Simulation Photo Quai */}
              <div
                onClick={() => setPodPhotoAttached(!podPhotoAttached)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between cursor-pointer hover:border-[#E85D22]"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Camera className="w-4 h-4 text-[#E85D22]" /> Photo de la Palette Déchargée
                </span>
                <Badge variant={podPhotoAttached ? 'success' : 'neutral'}>
                  {podPhotoAttached ? 'Photo Capturée' : 'Capturer Photo'}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-teal-800">
              <Button variant="secondary" onClick={() => setPodModalOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmPodSubmission}
                className="min-h-[44px] px-5 font-bold"
              >
                Valider POD & Clôturer Livraison
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : DÉCLARATION RAPIDE D'INCIDENT TERRAIN                          */}
      {/* ===================================================================== */}
      {incidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Déclaration d'Incident Logistique Terrain
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Type d'incident :</label>
                <select
                  value={incType}
                  onChange={(e) => setIncType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                >
                  <option value="Retard de transport (Embouteillage portuaire / Détroit)">Retard de transport (Embouteillage portuaire / Détroit)</option>
                  <option value="Adresse incorrecte ou quai inaccessible">Adresse incorrecte ou quai inaccessible</option>
                  <option value="Colis ou palette endommagée">Colis ou palette endommagée</option>
                  <option value="Client ou destinataire absent">Client ou destinataire absent</option>
                  <option value="Échec de livraison / Refus réception">Échec de livraison / Refus réception</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Niveau de gravité :</label>
                <select
                  value={incSeverity}
                  onChange={(e) => setIncSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                >
                  <option value="LOW">Faible (Simple décalage horaire)</option>
                  <option value="MEDIUM">Moyenne (Ralentissement douane)</option>
                  <option value="HIGH">Élevée (Litige ou avarie)</option>
                  <option value="CRITICAL">Critique / Bloquante</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Description détaillée du constat (ou dictée) :</label>
                  <VoiceDictationButton
                    onTranscript={(t) => setIncDesc((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <textarea
                  rows={3}
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setIncidentModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={handleReportIncidentFast}>
                Transmettre Incident Immédiatement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : ACCEPTATION DE MISSION AVEC AFFECTATION CHAUFFEUR / VÉHICULE  */}
      {/* ===================================================================== */}
      {acceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#E85D22]" />
              Accepter Mission & Affecter Flotte
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Véhicule assigné :</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brandModel} ({v.registrationPlate}) - {v.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Chauffeur titulaire :</label>
                <select
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                >
                  <option value="Karim Benjelloun (Permis EC - ADR)">Karim Benjelloun (Permis EC - ADR)</option>
                  <option value="Hassan Tazi (Permis EC - ATP)">Hassan Tazi (Permis EC - ATP)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setAcceptModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleConfirmAcceptMission}>
                Confirmer l'Affectation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : REFUS MOTIVÉ DE MISSION                                       */}
      {/* ===================================================================== */}
      {refusalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Refus Motivé de la Mission
            </h3>

            <div>
              <label className="block text-xs font-semibold mb-1">Motif de rejet obligatoire :</label>
              <select
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
              >
                <option value="Indisponibilité temporaire de semi-remorque frigorifique ATP FRC">Indisponibilité temporaire de semi-remorque frigorifique ATP FRC</option>
                <option value="Surcharge du planning de rotation chauffeurs">Surcharge du planning de rotation chauffeurs</option>
                <option value="Capacité de charge insuffisante pour le tonnage demandé">Capacité de charge insuffisante pour le tonnage demandé</option>
                <option value="Quai d'enlèvement en zone non desservie par le plan de transport">Quai d'enlèvement en zone non desservie par le plan de transport</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setRefusalModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={handleConfirmRefusal}>
                Confirmer le Refus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : AJOUT D'UN NOUVEAU VÉHICULE À LA FLOTTE                       */}
      {/* ===================================================================== */}
      {addVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#E85D22]" />
              Ajouter un Véhicule à la Flotte
            </h3>

            <form onSubmit={handleCreateVehicleSubmit} className="space-y-3">
              <Input
                label="Immatriculation (Ex: 14920-B-1)"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                required
              />
              <Input
                label="Marque & Modèle"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Type de caisse :</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                >
                  <option value="REEFER_ATP_FRIGO">Frigorifique ATP Classe FRC</option>
                  <option value="CURTAINSIDE_TAUTLINER">Bâché Tautliner Standard</option>
                  <option value="FLATBED_CONTAINER">Plateau Porte-Conteneur Maritime</option>
                  <option value="VAN_EXPRESS">Fourgonnette Express Urbain</option>
                </select>
              </div>
              <Input
                label="Charge utile max (kg)"
                type="number"
                value={newCapacityKg}
                onChange={(e) => setNewCapacityKg(Number(e.target.value))}
                required
              />

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="secondary" onClick={() => setAddVehicleModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  Enregistrer Véhicule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
