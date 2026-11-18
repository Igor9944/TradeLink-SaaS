// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — PANNEAU DE CONFIGURATION DES PRÉFÉRENCES LINGUISTIQUES (PROMPT 9)
// Permet à l'utilisateur de configurer sa langue d'interface, sa langue d'alertes,
// sa langue de messagerie et son mode d'affichage préféré avec persistance.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Bell, MessageSquare, Eye, Save, CheckCircle2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { SupportedLocale, UserLanguagePreferenceRecord } from '../types';

export const UserLanguageSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { locale, setLocale, notifyToast, currentUser } = useApp();
  const { i18n } = useTranslation();

  const [preferredLocale, setPreferredLocale] = useState<SupportedLocale>(locale as SupportedLocale);
  const [notificationLocale, setNotificationLocale] = useState<SupportedLocale>('fr');
  const [communicationLocale, setCommunicationLocale] = useState<SupportedLocale>('fr');
  const [autoTranslateMessages, setAutoTranslateMessages] = useState<boolean>(true);
  const [displayOriginalByDefault, setDisplayOriginalByDefault] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Chargement des préférences sauvegardées
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tradelink_user_lang_prefs');
      if (saved) {
        const parsed: UserLanguagePreferenceRecord = JSON.parse(saved);
        setPreferredLocale(parsed.preferredLocale);
        setNotificationLocale(parsed.notificationLocale);
        setCommunicationLocale(parsed.communicationLocale);
        setAutoTranslateMessages(parsed.autoTranslateMessages);
        setDisplayOriginalByDefault(parsed.displayOriginalByDefault);
      }
    } catch {
      // Ignorer si parsing échoue
    }
  }, []);

  const handleSave = () => {
    const record: UserLanguagePreferenceRecord = {
      id: `pref-${currentUser.id}`,
      userId: currentUser.id,
      preferredLocale,
      notificationLocale,
      communicationLocale,
      autoTranslateMessages,
      displayOriginalByDefault,
      rtlEnabled: preferredLocale === 'ar',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('tradelink_user_lang_prefs', JSON.stringify(record));
    setLocale(preferredLocale);
    i18n.changeLanguage(preferredLocale);

    setIsSaved(true);
    notifyToast(
      preferredLocale === 'ar'
        ? 'تم حفظ تفضيلات اللغة بنجاح'
        : preferredLocale === 'en'
        ? 'Language preferences updated successfully'
        : 'Préférences linguistiques enregistrées avec succès',
      'success'
    );

    setTimeout(() => setIsSaved(false), 3000);
  };

  const languagesList: { code: SupportedLocale; name: string; flag: string }[] = [
    { code: 'fr', name: 'Français (Défaut)', flag: '🇫🇷' },
    { code: 'en', name: 'English (International)', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية (RTL مدمج)', flag: '🇲🇦' },
  ];

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Préférences Linguistiques & Affichage B2B
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configurez vos langues de travail pour l’interface, les notifications automatiques et la traduction des échanges.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Langue d'interface principale */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            Langue principale de l’interface
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {languagesList.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setPreferredLocale(lang.code)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-start transition-all ${
                  preferredLocale === lang.code
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-xs">{lang.name}</span>
                </div>
                {preferredLocale === lang.code && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Langues des notifications et communications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              Langue de réception des alertes & emails
            </label>
            <select
              value={notificationLocale}
              onChange={(e) => setNotificationLocale(e.target.value as SupportedLocale)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {languagesList.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Langue de communication commerciale
            </label>
            <select
              value={communicationLocale}
              onChange={(e) => setCommunicationLocale(e.target.value as SupportedLocale)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {languagesList.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Options d'automatisation de la traduction */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={autoTranslateMessages}
              onChange={(e) => setAutoTranslateMessages(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Traduire automatiquement les messages reçus dans ma langue préférée
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Le message original reste toujours consultable en 1 clic sans altération.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={displayOriginalByDefault}
              onChange={(e) => setDisplayOriginalByDefault(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                Afficher le texte original par défaut avec traduction repliée
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Recommandé pour les équipes bilingues souhaitant vérifier l'exactitude de la rédaction source.
              </span>
            </div>
          </label>
        </div>

        {/* Bouton d'enregistrement */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          {isSaved && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Préférences enregistrées
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            Enregistrer les préférences
          </button>
        </div>
      </div>
    </div>
  );
};
