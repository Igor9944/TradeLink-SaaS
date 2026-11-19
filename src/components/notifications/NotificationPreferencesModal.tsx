// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import React, { useState } from 'react';
import {
  NotificationPreferencesRecord,
  NotificationChannel,
  NotificationCategory,
  NotificationDigestFrequency,
} from '../../types';
import { Button } from '../ui/DesignSystem';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferencesRecord;
  onSave: (updated: Partial<NotificationPreferencesRecord>) => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSave,
}) => {
  const [enabledChannels, setEnabledChannels] = useState<Record<NotificationChannel, boolean>>({
    ...preferences.enabledChannels,
  });
  const [enabledCategories, setEnabledCategories] = useState<Record<NotificationCategory, boolean>>({
    ...preferences.enabledCategories,
  });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(preferences.quietHoursEnabled);
  const [quietHoursStart, setQuietHoursStart] = useState(preferences.quietHoursStart || '22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState(preferences.quietHoursEnd || '08:00');
  const [digestFrequency, setDigestFrequency] = useState<NotificationDigestFrequency>(
    preferences.digestFrequency || 'INSTANT'
  );
  const [smsPhone, setSmsPhone] = useState(preferences.smsPhoneNumber || '+33 6 12 34 56 78');

  if (!isOpen) return null;

  const handleChannelToggle = (ch: NotificationChannel) => {
    setEnabledChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleCategoryToggle = (cat: NotificationCategory) => {
    setEnabledCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSave = () => {
    onSave({
      enabledChannels,
      enabledCategories,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      digestFrequency,
      smsPhoneNumber: smsPhone,
    });
    onClose();
  };

  const channelLabels: Record<NotificationChannel, { title: string; desc: string }> = {
    IN_APP: { title: 'Dans l’application (In-App)', desc: 'Badge cloche et centre de notifications en direct' },
    EMAIL: { title: 'Notification par Email', desc: 'Gabarit HTML responsive avec lien d’action direct' },
    WEB_PUSH: { title: 'Notification Web Push', desc: 'Alertes navigateur W3C même hors onglet actif' },
    SMS: { title: 'Alertes SMS Urgentes', desc: 'Passerelle SMS configurable (Twilio / Orange)' },
  };

  const categoryLabels: Record<NotificationCategory, string> = {
    COMMERCIAL: 'Commandes, Catalogues & Devis',
    KYC: 'Conformité KYC & Relances réglementaires',
    LOGISTIQUE: 'Expéditions, Télémétrie & Preuves POD',
    FINANCE: 'Facturation, Séquestre Escrow & Règlements',
    SÉCURITÉ: 'Alertes de connexion, Brute-force & MFA',
    SUPPORT: 'Tickets & Assistance technique',
    ROOM_LIVE: 'Invitations & Synthèses Room Live',
    MESSAGE: 'Messagerie B2B & Nouveaux échanges',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-prefs-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#0A2540] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-teal-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-teal-900/60 flex items-center justify-between bg-slate-50 dark:bg-[#071d33]">
          <div>
            <h2 id="notif-prefs-title" className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚙️ Préférences de Notifications Multi-Canaux</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configurez vos canaux de diffusion, catégories d'alertes et plages d'heures silencieuses.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-lg transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Canaux de diffusion */}
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">
              1. Canaux de diffusion actifs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(channelLabels) as NotificationChannel[]).map((ch) => (
                <label
                  key={ch}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    enabledChannels[ch]
                      ? 'border-[#E85D22] bg-[#E85D22]/5 dark:bg-[#E85D22]/10'
                      : 'border-slate-200 dark:border-teal-900/60 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledChannels[ch]}
                    onChange={() => handleChannelToggle(ch)}
                    className="mt-0.5 rounded text-[#E85D22] focus:ring-[#E85D22]"
                  />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {channelLabels[ch].title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {channelLabels[ch].desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {enabledChannels.SMS && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-teal-900/60">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Numéro de téléphone portable (format E.164 pour SMS) :
                </label>
                <input
                  type="text"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#E85D22]"
                />
              </div>
            )}
          </div>

          {/* Catégories de notifications */}
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">
              2. Catégories d'alertes autorisées
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(categoryLabels) as NotificationCategory[]).map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledCategories[cat]}
                    onChange={() => handleCategoryToggle(cat)}
                    className="rounded text-[#E85D22] focus:ring-[#E85D22]"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {categoryLabels[cat]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Heures Silencieuses (Quiet Hours) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-teal-900/60">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                🌙 Heures silencieuses (Quiet Hours)
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E85D22]"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Suspend les alertes externes (Email, SMS, Push) pendant vos heures de repos.
            </p>

            {quietHoursEnabled && (
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block">Début :</span>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <span className="mt-4 text-slate-400">à</span>
                <div>
                  <span className="text-[11px] text-slate-500 block">Fin :</span>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span>🛡️</span>
              <span>
                <strong>Dérogation de sécurité :</strong> Les alertes prioritaires <strong>CRITICAL</strong> contournent toujours les heures silencieuses.
              </span>
            </div>
          </div>

          {/* Fréquence de Digest */}
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
              3. Fréquence d'envoi des résumés (Digest)
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'INSTANT', label: 'Immédiat (Temps réel)' },
                { id: 'DAILY_DIGEST', label: 'Digest quotidien (Matin 08h00)' },
                { id: 'WEEKLY_DIGEST', label: 'Digest hebdomadaire (Lundi)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDigestFrequency(opt.id as NotificationDigestFrequency)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    digestFrequency === opt.id
                      ? 'border-[#E85D22] bg-[#E85D22] text-white'
                      : 'border-slate-300 dark:border-teal-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-teal-900/60 bg-slate-50 dark:bg-[#071d33] flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Enregistrer les préférences
          </Button>
        </div>
      </div>
    </div>
  );
};
