// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — BULLE DE MESSAGE AVEC TRADUCTION IA AUTOMATIQUE (PROMPT TRADUCTION)
// Affiche le message traduit avec conservation intégrale du texte original
// et basculement interactif en un clic (Toggle Original / Traduit).
// ============================================================================

import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { SupportedLocale } from '../types';
import { useApp } from '../contexts/AppContext';

interface TranslatedMessageBubbleProps {
  id: string;
  senderName: string;
  senderRole: string;
  originalText: string;
  sourceLang: SupportedLocale;
  translatedText?: string;
  targetLang?: SupportedLocale;
  timestamp: string;
  isCurrentUser: boolean;
  glossaryApplied?: boolean;
  engineVersion?: string;
}

export const TranslatedMessageBubble: React.FC<TranslatedMessageBubbleProps> = ({
  id,
  senderName,
  senderRole,
  originalText,
  sourceLang,
  translatedText,
  targetLang,
  timestamp,
  isCurrentUser,
  glossaryApplied = true,
  engineVersion = 'tradelink-neural-v6.0-enterprise',
}) => {
  const { locale, isRtl } = useApp();
  const currentTargetLang = targetLang || locale;

  // L'utilisateur peut basculer entre l'original et la traduction
  const [showOriginal, setShowOriginal] = useState(false);

  // La traduction est affichée si disponible et si la langue source est différente de la langue cible
  const hasTranslation = Boolean(translatedText && translatedText !== originalText && sourceLang !== currentTargetLang);
  const textToDisplay = hasTranslation && !showOriginal ? translatedText! : originalText;

  const getLangBadge = (code: SupportedLocale) => {
    switch (code) {
      case 'fr':
        return 'FR 🇫🇷';
      case 'en':
        return 'EN 🇬🇧';
      case 'ar':
        return 'AR 🇲🇦';
      default: {
        const val: string = code;
        return val.toUpperCase();
      }
    }
  };

  return (
    <div
      data-message-id={id}
      title={`Moteur IA : ${engineVersion}`}
      className={`flex flex-col my-2 max-w-xl ${isCurrentUser ? (isRtl ? 'me-auto' : 'ms-auto') : (isRtl ? 'ms-auto' : 'me-auto')}`}
    >
      {/* En-tête de message : Auteur, Rôle & Horodatage */}
      <div className={`flex items-center gap-2 mb-1 text-xs text-slate-500 dark:text-slate-400 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <span className="font-semibold text-slate-800 dark:text-slate-200">{senderName}</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {senderRole}
        </span>
        <span>•</span>
        <span>{timestamp}</span>
      </div>

      {/* Corps du message */}
      <div
        className={`p-3.5 rounded-2xl shadow-xs transition-all relative ${
          isCurrentUser
            ? 'bg-indigo-600 text-white rounded-br-xs dark:bg-indigo-700'
            : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs'
        }`}
      >
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${showOriginal && sourceLang === 'ar' ? 'text-right' : ''}`}>
          {textToDisplay}
        </p>

        {/* Barre d'état de traduction sous le message */}
        {hasTranslation && (
          <div
            className={`mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
              isCurrentUser
                ? 'border-indigo-500/50 text-indigo-100'
                : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {showOriginal
                  ? `Langue d'origine (${getLangBadge(sourceLang)})`
                  : `Traduit de ${getLangBadge(sourceLang)} vers ${getLangBadge(currentTargetLang)}`}
              </span>
              {glossaryApplied && !showOriginal && (
                <span
                  title="Glossaire officiel du commerce international appliqué"
                  className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Glossaire B2B
                </span>
              )}
            </div>

            {/* Bouton Toggle Original / Traduction */}
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                isCurrentUser
                  ? 'bg-indigo-700/80 hover:bg-indigo-800 text-white'
                  : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {showOriginal ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Afficher la traduction</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Voir texte original ({sourceLang.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
