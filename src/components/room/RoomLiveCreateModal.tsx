// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MODAL DE CRÉATION & PROGRAMMATION ROOM LIVE (PROMPT 07)
// Permet aux acteurs habilités (Admin, Fournisseur, Transporteur, Comptable, Support)
// d'ouvrir une réunion immédiate ou de programmer une visioconférence sécurisée.
// Le Client ne peut pas créer de salle (Règle d'or vérifiée côté UI & Backend).
// ============================================================================

import React, { useState } from 'react';
import {
  Video,
  Calendar,
  ShieldAlert,
  Check,
  X,
  Globe,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button, Modal } from '../ui/DesignSystem';
import { MeetingProvider } from '../../types';

interface RoomLiveCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RoomLiveCreateModal: React.FC<RoomLiveCreateModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { currentUser, createRoomLive, notifyToast, locale } = useApp();

  const [title, setTitle] = useState('Négociation Commerciale & Audit Chaîne du Froid');
  const [description, setDescription] = useState(
    'Point de synchronisation tripartite sur le protocole thermique GDP et la libération du séquestre bancaire.'
  );
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('2026-11-20 14:30');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isPrivate, setIsPrivate] = useState(true);
  const [hasWaitingRoom, setHasWaitingRoom] = useState(true);
  const [meetingProvider, setMeetingProvider] = useState<MeetingProvider>('GOOGLE_MEET');
  const [invitedEmailInput, setInvitedEmailInput] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([
    'client.atlas@tradelink-saas.com',
    'transit.tanger@tradelink-saas.com',
  ]);

  const isClient = currentUser.role === 'CLIENT' || currentUser.role === 'VISITEUR';

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const handleAddEmail = () => {
    const trimmed = invitedEmailInput.trim();
    if (trimmed && !invitedEmails.includes(trimmed)) {
      setInvitedEmails([...invitedEmails, trimmed]);
      setInvitedEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInvitedEmails(invitedEmails.filter((e) => e !== email));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isClient) {
      notifyToast(
        "Accès refusé : Le profil Client ne dispose pas d'un droit général de création de salle Room Live.",
        'error'
      );
      return;
    }

    if (!title.trim()) {
      notifyToast('Veuillez spécifier un titre pour la réunion.', 'warning');
      return;
    }

    const res = createRoomLive({
      title: title.trim(),
      description: description.trim(),
      scheduledAt: isImmediate ? new Date().toISOString().replace('T', ' ').slice(0, 16) : scheduledAt,
      durationMinutes: Number(durationMinutes) || 60,
      isImmediate,
      isPrivate,
      hasWaitingRoom,
      allowedUserIds: ['usr-admin-01', 'usr-client-01', 'usr-supp-01', 'usr-trans-01', currentUser.id],
      invitedEmails,
      meetingProvider,
    });

    if (res.ok) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Ouvrir ou Programmer une Salle Room Live', 'Open or Schedule a Room Live', 'فتح أو جدولة قاعة Room Live')}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Alerte si le Client essaie d'ouvrir la modale */}
        {isClient && (
          <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-red-900 dark:text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <span>{t('Droit de création réservé', 'Creation rights restricted', 'حق الإنشاء مقيد')}</span>
            </div>
            <p className="leading-relaxed">
              {t(
                'Conformément aux règles de sécurité B2B TRADELINK (Annexe B), le profil Client participe en mode invité aux visioconférences organisées par ses fournisseurs, transporteurs ou l’équipe support, mais ne peut pas initier de nouvelles salles.',
                'In accordance with TRADELINK B2B security policy, Client users participate as invited guests and cannot create new meeting rooms.',
                'وفقاً لسياسة أمان منصة تريد لينك، ينضم العميل كمدعو فقط ولا يملك صلاحية إنشاء غرف جديدة.'
              )}
            </p>
          </div>
        )}

        {/* Titre & Description */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 dark:text-slate-300">
            {t('Titre de la Visioconférence *', 'Meeting Title *', 'عنوان الاجتماع *')}
          </label>
          <input
            type="text"
            required
            disabled={isClient}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Coordination Douane & Transport Frigorifique"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#E85D22]"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-slate-700 dark:text-slate-300">
            {t('Description / Ordre du jour', 'Description / Agenda', 'جدول الأعمال / الوصف')}
          </label>
          <textarea
            rows={2}
            disabled={isClient}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Points clés à aborder, clauses à négocier..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#E85D22]"
          />
        </div>

        {/* Type : Immédiate vs Programmée */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={isClient}
            onClick={() => setIsImmediate(true)}
            className={`p-3 rounded-2xl border-2 text-start transition-all ${
              isImmediate
                ? 'border-[#E85D22] bg-[#E85D22]/10 dark:bg-[#E85D22]/20 font-bold'
                : 'border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#071E22]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Video className="w-4 h-4 text-[#E85D22]" />
              <span className="text-slate-900 dark:text-white">{t('Salle Immédiate', 'Instant Meeting', 'قاعة فورية')}</span>
            </div>
            <p className="text-[11px] text-slate-500">{t('Ouvrir et rejoindre maintenant', 'Launch & enter immediately', 'بدء الاجتماع فوراً')}</p>
          </button>

          <button
            type="button"
            disabled={isClient}
            onClick={() => setIsImmediate(false)}
            className={`p-3 rounded-2xl border-2 text-start transition-all ${
              !isImmediate
                ? 'border-[#E85D22] bg-[#E85D22]/10 dark:bg-[#E85D22]/20 font-bold'
                : 'border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#071E22]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-teal-500" />
              <span className="text-slate-900 dark:text-white">{t('Programmer', 'Schedule for Later', 'جدولة لاحقاً')}</span>
            </div>
            <p className="text-[11px] text-slate-500">{t('Définir date et heure', 'Pick date and duration', 'تحديد الموعد والمدة')}</p>
          </button>
        </div>

        {/* Choix de la technologie de visioconférence (Google Meet vs WebRTC SFU) */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
            {t('Technologie de Visioconférence :', 'Videoconference Provider:', 'تقنية مؤتمر الفيديو :')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isClient}
              onClick={() => setMeetingProvider('GOOGLE_MEET')}
              className={`p-3 rounded-2xl border-2 text-start transition-all ${
                meetingProvider === 'GOOGLE_MEET'
                  ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 font-bold'
                  : 'border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#071E22]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-900 dark:text-white">Google Meet Officiel</span>
              </div>
              <p className="text-[11px] text-slate-500">{t('Espace officiel & lien meet.google.com', 'Official Google Meet Space & URL', 'رابط رسمي من جوجل ميت')}</p>
            </button>

            <button
              type="button"
              disabled={isClient}
              onClick={() => setMeetingProvider('SFU_WEBRTC')}
              className={`p-3 rounded-2xl border-2 text-start transition-all ${
                meetingProvider === 'SFU_WEBRTC'
                  ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-500/20 font-bold'
                  : 'border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#071E22]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-teal-500" />
                <span className="text-slate-900 dark:text-white">TradeLink SFU Interne</span>
              </div>
              <p className="text-[11px] text-slate-500">{t('WebRTC souverain chiffré de bout en bout', 'Sovereign end-to-end encrypted WebRTC', 'ويب آر تي سي سيادي مشفر')}</p>
            </button>
          </div>
        </div>

        {/* Date & Durée si programmée */}
        {!isImmediate && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('Date & Heure :', 'Date & Time:', 'التاريخ والوقت :')}
              </label>
              <input
                type="text"
                disabled={isClient}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                placeholder="AAAA-MM-JJ HH:MM"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('Durée (minutes) :', 'Duration (minutes):', 'المدة (بالدقائق) :')}
              </label>
              <select
                disabled={isClient}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-medium"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 heure)</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes (2 heures)</option>
              </select>
            </div>
          </div>
        )}

        {/* Paramètres d'Accès : Privée & Salle d'attente */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2.5">
          <p className="font-bold text-slate-900 dark:text-white">
            {t('Sécurité & Contrôle d’Accès', 'Security & Access Control', 'الأمان والتحكم بالدخول')}
          </p>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t('Salle d’attente (Lobby Knocking)', 'Waiting Room (Lobby Knocking)', 'غرفة الانتظار')}
              </p>
              <p className="text-[11px] text-slate-500">
                {t('Les participants doivent être admis par l’hôte avant d’entrer.', 'Host must admit guests before they enter.', 'يتعين على المضيف قبول الضيوف قبل دخولهم.')}
              </p>
            </div>
            <input
              type="checkbox"
              disabled={isClient}
              checked={hasWaitingRoom}
              onChange={(e) => setHasWaitingRoom(e.target.checked)}
              className="w-4 h-4 rounded text-[#E85D22] focus:ring-[#E85D22]"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-teal-800">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {t('Salle Privée Restreinte', 'Private Restricted Room', 'قاعة خاصة مقيدة')}
              </p>
              <p className="text-[11px] text-slate-500">
                {t('Seuls les utilisateurs et e-mails explicitement invités peuvent se connecter.', 'Only invited users can connect.', 'المدعوون فقط يمكنهم الاتصال.')}
              </p>
            </div>
            <input
              type="checkbox"
              disabled={isClient}
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded text-[#E85D22] focus:ring-[#E85D22]"
            />
          </div>
        </div>

        {/* Liste des invités */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 dark:text-slate-300">
            {t('Invitations par E-mail :', 'Invite by Email:', 'الدعوة بالبريد الإلكتروني :')}
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              disabled={isClient}
              value={invitedEmailInput}
              onChange={(e) => setInvitedEmailInput(e.target.value)}
              placeholder="partenaire@entreprise.com"
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleAddEmail} disabled={isClient}>
              {t('Ajouter', 'Add', 'إضافة')}
            </Button>
          </div>

          {invitedEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {invitedEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/30 text-[11px]"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-teal-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('Annuler', 'Cancel', 'إلغاء')}
          </Button>
          <Button type="submit" variant="primary" disabled={isClient}>
            <Check className="w-4 h-4" />
            {isImmediate ? t('Créer & Lancer la Salle', 'Create & Enter', 'إنشاء وبدء الجلسة') : t('Programmer la Réunion', 'Schedule Meeting', 'جدولة الاجتماع')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
