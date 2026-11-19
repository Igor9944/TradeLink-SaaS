// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — COMPOSANT LOBBY & SALLE D'ATTENTE WEBRTC (PROMPT 07)
// Salle d'attente interactive (Knocking), pré-visualisation audio/vidéo,
// sélection des périphériques et contrôle d'accès sécurisé.
// ============================================================================

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  ShieldCheck,
  Clock,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Badge, Button } from '../ui/DesignSystem';

interface RoomLiveLobbyViewProps {
  roomTitle: string;
  roomCode: string;
  creatorName: string;
  isAdmitted: boolean;
  onEnterRoom: () => void;
}

export const RoomLiveLobbyView: React.FC<RoomLiveLobbyViewProps> = ({
  roomTitle,
  roomCode,
  creatorName,
  isAdmitted,
  onEnterRoom,
}) => {
  const { currentUser, locale } = useApp();

  const [micActive, setMicActive] = useState<boolean>(true);
  const [camActive, setCamActive] = useState<boolean>(true);
  const [audioTesting, setAudioTesting] = useState<boolean>(false);
  const [selectedMic, setSelectedMic] = useState<string>('mic-default');
  const [selectedCam, setSelectedCam] = useState<string>('cam-default');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('spk-default');

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const handleTestSpeaker = () => {
    setAudioTesting(true);
    setTimeout(() => setAudioTesting(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-[#061E22] text-white border border-teal-800 shadow-2xl space-y-6">
      {/* En-tête du Lobby */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="orange">LOBBY WEBRTC SFU</Badge>
            <Badge variant="info">Code : {roomCode}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">{roomTitle}</h1>
          <p className="text-xs text-teal-300 mt-1">
            {t('Organisé par', 'Hosted by', 'تنظيم')} : <strong>{creatorName}</strong> • {t('Participant', 'Participant', 'المشارك')} : {currentUser.firstName} {currentUser.lastName} ({currentUser.role})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmitted ? (
            <Badge variant="success">
              <span className="w-2 h-2 rounded-full bg-emerald-400 me-1.5 inline-block" />
              {t('Accès Autorisé', 'Access Granted', 'تمت الموافقة')}
            </Badge>
          ) : (
            <Badge variant="warning">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping me-1.5 inline-block" />
              {t('En attente d’admission', 'Waiting for Host Admission', 'في انتظار قبول المضيف')}
            </Badge>
          )}
        </div>
      </div>

      {/* Grille : Pré-visualisation Média & Sélection des Périphériques */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Colonne Gauche : Aperçu Caméra et Micro */}
        <div className="md:col-span-7 space-y-4">
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/70 border-2 border-teal-800 flex items-center justify-center shadow-inner">
            {camActive ? (
              <div className="relative w-full h-full">
                <img
                  src={currentUser.avatarUrl || '/images/warehouse-operations.jpg'}
                  alt={currentUser.firstName}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                  <span className="text-xs font-bold text-white">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <VideoOff className="w-12 h-12 text-teal-600" />
                <span className="text-xs font-semibold">{t('Caméra coupée', 'Camera disabled', 'الكاميرا معطلة')}</span>
              </div>
            )}

            {/* Indicateur de niveau Micro en direct */}
            {micActive && (
              <div className="absolute top-3 start-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-teal-700/60 flex items-center gap-1.5 text-[11px] text-emerald-400">
                <Mic className="w-3.5 h-3.5" />
                <div className="flex gap-0.5 items-end h-3">
                  <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
                </div>
                <span className="text-[10px] font-mono">OK</span>
              </div>
            )}
          </div>

          {/* Boutons d'activation rapide */}
          <div className="flex items-center justify-center gap-3">
            <Button
              size="sm"
              variant={micActive ? 'primary' : 'danger'}
              onClick={() => setMicActive(!micActive)}
            >
              {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {micActive ? t('Micro Activé', 'Mic On', 'الميكروفون مفعل') : t('Micro Coupé', 'Mic Off', 'الميكروفون مكتوم')}
            </Button>
            <Button
              size="sm"
              variant={camActive ? 'primary' : 'danger'}
              onClick={() => setCamActive(!camActive)}
            >
              {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              {camActive ? t('Caméra Active', 'Camera On', 'الكاميرا مفعلة') : t('Caméra Coupée', 'Camera Off', 'الكاميرا معطلة')}
            </Button>
          </div>
        </div>

        {/* Colonne Droite : Configuration & Périphériques */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-2xl bg-[#092B2F] border border-teal-800 space-y-3.5 text-xs">
            <p className="font-bold text-teal-200 flex items-center gap-1.5 text-sm">
              <Settings className="w-4 h-4 text-[#E85D22]" />
              {t('Test des Périphériques Audio & Vidéo', 'Audio & Video Devices Check', 'فحص الأجهزة الصوتية والمرئية')}
            </p>

            {/* Microphone */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">{t('Microphone :', 'Microphone:', 'الميكروفون :')}</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-teal-700 text-white text-xs font-medium focus:outline-none focus:border-[#E85D22]"
              >
                <option value="mic-default">Microphone par défaut (Realtek High Definition Audio)</option>
                <option value="mic-usb">Microphone Casque USB / Jabra Speak</option>
                <option value="mic-studio">Microphone Studio Haute Fidélité</option>
              </select>
            </div>

            {/* Caméra */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">{t('Caméra :', 'Camera:', 'الكاميرا :')}</label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-teal-700 text-white text-xs font-medium focus:outline-none focus:border-[#E85D22]"
              >
                <option value="cam-default">Webcam HD intégrée 1080p</option>
                <option value="cam-external">Caméra Externe USB 4K Ultra-Wide</option>
              </select>
            </div>

            {/* Haut-parleur & Test sonore */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">{t('Haut-parleur :', 'Speaker:', 'مكبر الصوت :')}</label>
              <div className="flex gap-2">
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-teal-700 text-white text-xs font-medium focus:outline-none focus:border-[#E85D22]"
                >
                  <option value="spk-default">Haut-parleurs principaux (Realtek Audio)</option>
                  <option value="spk-headphones">Casque Audio / Écouteurs</option>
                </select>
                <Button size="sm" variant="secondary" onClick={handleTestSpeaker}>
                  <Volume2 className="w-3.5 h-3.5" />
                  {audioTesting ? t('Test...', 'Testing...', 'فحص...') : t('Tester', 'Test', 'فحص')}
                </Button>
              </div>
            </div>
          </div>

          {/* Bandeau d'état Lobby / Salle d'attente */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {isAdmitted
                  ? t('L’organisateur vous a autorisé à entrer !', 'The host has admitted you into the room!', 'تمت دعوتك للدخول من طرف المضيف !')
                  : t('Frappe à la porte envoyée à l’hôte...', 'Waiting room knocking: host has been notified...', 'تم إشعار المضيف، في انتظار الموافقة...')}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t(
                'Les flux WebRTC transitent via un SFU chiffré de bout en mémoire. Aucune donnée n’est enregistrée sans votre accord explicite.',
                'WebRTC media streams are relayed via encrypted in-memory SFU. No stream is recorded without your explicit consent.',
                'يتم تشفير وتمرير البث عبر خوادم SFU آمنة. لا يتم أي تسجيل دون موافقتك الصريحة.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Barre d'action inférieure */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-teal-800/80">
        <div className="flex items-center gap-2 text-xs text-teal-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t('Protocole de Sécurité TradeLink SFU v6.0 • Chiffrement AES-256', 'TradeLink SFU v6.0 Security Protocol • AES-256 Encrypted', 'بروتوكول أمان TradeLink SFU • تشفير AES-256')}</span>
        </div>

        <Button
          variant="primary"
          onClick={onEnterRoom}
          disabled={!isAdmitted}
        >
          <span>{t('Rejoindre la Salle de Réunion', 'Enter Meeting Room', 'الدخول إلى قاعة الاجتماع')}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
