import React, { useState } from 'react';
import { RouteWaypoint, VehicleRecord } from '../../services/logisticsEngine';
import { ShipmentRecord } from '../../types';
import { Badge, Button } from '../ui/DesignSystem';
import {
  Anchor,
  Compass,
  MapPin,
  Navigation,
  ShieldCheck,
  Thermometer,
  Truck,
} from 'lucide-react';

interface InteractiveLogisticsMapProps {
  shipment?: ShipmentRecord;
  waypoints?: RouteWaypoint[];
  vehicle?: VehicleRecord;
  title?: string;
  className?: string;
}

export const InteractiveLogisticsMap: React.FC<InteractiveLogisticsMapProps> = ({
  shipment,
  waypoints = [],
  vehicle,
  title = 'Carte Interactive & Télémétrie en Temps Réel',
  className = '',
}) => {
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number>(0);
  const [showTelemetryHUD, setShowTelemetryHUD] = useState<boolean>(true);

  // Vérifier si des coordonnées géographiques sont disponibles
  const hasGeoData =
    waypoints.length > 0 &&
    waypoints.some((w) => typeof w.latitude === 'number' && typeof w.longitude === 'number');

  if (!hasGeoData) {
    return (
      <div className={`p-8 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-center space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-teal-900/60 mx-auto flex items-center justify-center text-slate-400">
          <Compass className="w-6 h-6 animate-spin" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Données Géographiques & Télémétrie Indisponibles
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Aucun tracé GPS n'est actuellement actif pour cette expédition. La carte s'affichera automatiquement dès l'émission de la première balise par le boîtier télématique IoT embarqué.
        </p>
      </div>
    );
  }

  // Calcul du cadre de délimitation géographique pour le rendu SVG (Projection Mercator simplifiée)
  const lats = waypoints.map((w) => w.latitude);
  const lons = waypoints.map((w) => w.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Dimensions SVG
  const width = 800;
  const height = 400;
  const padding = 60;

  // Conversion latitude/longitude en pixels SVG
  const projectPoint = (lat: number, lon: number) => {
    const latSpan = maxLat - minLat || 1;
    const lonSpan = maxLon - minLon || 1;
    // La latitude est inversée sur l'axe Y SVG (haut = nord)
    const x = padding + ((lon - minLon) / lonSpan) * (width - 2 * padding);
    const y = height - padding - ((lat - minLat) / latSpan) * (height - 2 * padding);
    return { x, y };
  };

  const points = waypoints.map((w) => projectPoint(w.latitude, w.longitude));

  // Construction du chemin SVG (Polyline ou Bezier)
  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    return `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const selectedWaypoint = waypoints[selectedWaypointIndex] ?? waypoints[0];

  return (
    <div className={`rounded-3xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#071f22] overflow-hidden shadow-sm ${className}`}>
      {/* EN-TÊTE DE LA CARTE */}
      <div className="p-4 bg-slate-50 dark:bg-[#0A282C] border-b border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#E85D22]/10 text-[#E85D22]">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3>
              {shipment && <Badge variant="orange">{shipment.trackingNumber}</Badge>}
              <span className="animate-pulse inline-block">
                <Badge variant="success">
                  GPS LIVE • 4G/IRIDIUM
                </Badge>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {waypoints.length} points de contrôle géoréférencés • Trajet multimodal Euro-Méditerranée
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowTelemetryHUD(!showTelemetryHUD)}
          >
            {showTelemetryHUD ? 'Masquer Télémétrie' : 'Afficher Télémétrie'}
          </Button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DU CANVAS SVG DE LA CARTE */}
      <div className="relative bg-gradient-to-b from-slate-900 via-[#0B2529] to-[#041719] overflow-hidden">
        {/* GRILLE GÉOGRAPHIQUE EN FOND */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2DD4BF" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        {/* REPRÉSENTATION DU TRACÉ ET DES WAYPOINTS */}
        <div className="relative w-full aspect-[2/1] min-h-[340px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* LIGNE LUMINESCENTE */}
              <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#E85D22" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* TRACÉ DE ROUTE PRINCIPAL (Halo lumineux) */}
            <path
              d={pathD}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
              filter="url(#glow)"
            />

            {/* TRACÉ VECTORIEL DE ROUTE */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#route-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
            />

            {/* MARQUEURS DES WAYPOINTS */}
            {waypoints.map((wp, idx) => {
              const pt = points[idx];
              const isSelected = selectedWaypointIndex === idx;
              const isPassed = !!wp.actualPassedAt;
              const isCustoms = wp.customsTerminal;

              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-transform"
                  onClick={() => setSelectedWaypointIndex(idx)}
                >
                  {/* Halo de sélection */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="#E85D22"
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Cercle extérieur */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCustoms ? 10 : 8}
                    fill={
                      isCustoms
                        ? '#F59E0B'
                        : isPassed
                        ? '#10B981'
                        : isSelected
                        ? '#E85D22'
                        : '#38BDF8'
                    }
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />

                  {/* Étiquette du waypoint */}
                  <text
                    x={pt.x}
                    y={pt.y - 14}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="drop-shadow-md select-none font-sans"
                  >
                    {wp.name.split('(')[0].trim()}
                  </text>

                  {/* Indicateur Douane si terminal frontalier */}
                  {isCustoms && (
                    <rect
                      x={pt.x - 24}
                      y={pt.y + 12}
                      width="48"
                      height="14"
                      rx="4"
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                    />
                  )}
                  {isCustoms && (
                    <text
                      x={pt.x}
                      y={pt.y + 22}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      className="select-none"
                    >
                      DOUANE
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* HUD TÉLÉMÉTRIE EN DIRECT (SUPERPOSITION EN HAUT À DROITE) */}
        {showTelemetryHUD && (
          <div className="absolute top-4 right-4 max-w-xs w-full bg-slate-900/90 backdrop-blur-md border border-teal-500/40 rounded-2xl p-3.5 text-white shadow-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-teal-800/80 pb-2">
              <span className="font-bold flex items-center gap-1.5 text-teal-300">
                <Truck className="w-4 h-4 text-[#E85D22]" />
                Télémétrie Caisse Frigorifique
              </span>
              <Badge variant="success">ATP CONFORME</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-slate-400 block">Température Caisson</span>
                <span className="text-base font-black text-emerald-400 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  +3.8 °C
                </span>
                <span className="text-[9px] text-slate-500">Consigne : +4°C (±2°C)</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-slate-400 block">Vitesse Instantanée</span>
                <span className="text-base font-black text-sky-400">78 km/h</span>
                <span className="text-[9px] text-slate-500">Régulateur actif</span>
              </div>
            </div>

            <div className="text-[11px] space-y-1 text-slate-300 pt-1 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Véhicule assigné :</span>
                <span className="font-mono font-bold text-white">
                  {vehicle ? `${vehicle.registrationPlate} (${vehicle.brandModel.split(' ')[0]})` : '12845-A-6 (Volvo FH)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scellé Douanier :</span>
                <span className="font-mono text-amber-400 font-bold">SEAL-MA-884102</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Agrément ATP Frigo :</span>
                <span className="text-emerald-400 font-semibold">Valide (Jusqu'au 30/06/2028)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DÉTAIL DU WAYPOINT SÉLECTIONNÉ (PIED DE CARTE) */}
      <div className="p-4 bg-slate-50 dark:bg-[#0A282C] border-t border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-teal-900/60 text-slate-700 dark:text-slate-200">
            {selectedWaypoint.customsTerminal ? (
              <ShieldCheck className="w-5 h-5 text-amber-500" />
            ) : selectedWaypoint.country === 'International' ? (
              <Anchor className="w-5 h-5 text-blue-500" />
            ) : (
              <MapPin className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Étape #{selectedWaypointIndex + 1} : {selectedWaypoint.name}
              </h4>
              <Badge variant={selectedWaypoint.actualPassedAt ? 'success' : 'info'}>
                {selectedWaypoint.actualPassedAt ? 'Passage Confirmé' : 'Étape Estimée'}
              </Badge>
              {selectedWaypoint.customsTerminal && <Badge variant="warning">Poste Douanier Scellé</Badge>}
            </div>
            <p className="text-slate-500 mt-0.5">
              Pays : <strong>{selectedWaypoint.country}</strong> • Coordonnées :{' '}
              <span className="font-mono">
                {selectedWaypoint.latitude.toFixed(4)}° N, {selectedWaypoint.longitude.toFixed(4)}° E
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">HORAIRE DE PASSAGE</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {selectedWaypoint.actualPassedAt
                ? `Confirmé : ${selectedWaypoint.actualPassedAt}`
                : `Estimé (ETA) : ${selectedWaypoint.estimatedPassedAt}`}
            </span>
          </div>

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedWaypointIndex === 0}
              onClick={() => setSelectedWaypointIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Précédent
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedWaypointIndex === waypoints.length - 1}
              onClick={() => setSelectedWaypointIndex((prev) => Math.min(waypoints.length - 1, prev + 1))}
            >
              Suivant →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
