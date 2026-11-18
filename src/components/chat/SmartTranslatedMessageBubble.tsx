// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
import React, { useState } from 'react';
import { Languages, Eye, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { SupportedLocale, SmartTranslatedMessage } from '../../types';

interface SmartTranslatedMessageBubbleProps {
  message: SmartTranslatedMessage;
  isCurrentUserSender?: boolean;
  className?: string;
}

export const SmartTranslatedMessageBubble: React.FC<SmartTranslatedMessageBubbleProps> = ({
  message,
  isCurrentUserSender = false,
  className = '',
}) => {
  const { locale } = useApp();
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const displayText = showOriginal ? message.originalText : message.translatedText;
  const currentTextLang: SupportedLocale = showOriginal ? message.sourceLang : message.targetLang;
  const isCurrentTextRtl = currentTextLang === 'ar';

  const getLanguageLabel = (lang: SupportedLocale) => {
    if (lang === 'fr') return 'Français';
    if (lang === 'en') return 'English';
    return 'العربية';
  };

  return (
    <div
      className={`max-w-md rounded-2xl p-4 transition-all shadow-sm ${
        isCurrentUserSender
          ? 'bg-gradient-to-br from-[#E85D22] to-amber-600 text-white ms-auto'
          : 'bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 text-slate-800 dark:text-slate-100 me-auto'
      } ${className}`}
    >
      {/* En-tête du message */}
      <div className="flex items-center justify-between gap-2 mb-2 text-[11px] opacity-85">
        <span className="font-bold truncate">
          {message.senderName || message.senderRole || (isCurrentUserSender ? t('Vous', 'You', 'أنت') : t('Interlocuteur', 'Sender', 'المتحدث'))}
        </span>
        <span className="text-[10px] font-mono shrink-0">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Corps du message avec directionnalité dynamique (RTL pour Arabe) */}
      <div
        dir={isCurrentTextRtl ? 'rtl' : 'ltr'}
        className={`text-xs leading-relaxed break-words font-medium ${
          isCurrentTextRtl ? 'text-right' : 'text-left'
        }`}
      >
        {displayText}
      </div>

      {/* Barre d'intelligence de traduction (si traduit) */}
      {message.isTranslated && (
        <div
          className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] ${
            isCurrentUserSender
              ? 'border-white/20 text-white/90'
              : 'border-slate-200 dark:border-teal-800/80 text-slate-500 dark:text-teal-300/80'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-semibold">
              {showOriginal
                ? `${t('Original en', 'Original in', 'الأصل بالـ')} ${getLanguageLabel(message.sourceLang)}`
                : `${t('Traduit par IA', 'AI Translated', 'ترجمة آلية')} (${getLanguageLabel(message.sourceLang)} → ${getLanguageLabel(message.targetLang)})`}
            </span>
          </div>

          {/* Bouton de bascule vers le texte original */}
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-all ${
              isCurrentUserSender
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-slate-100 dark:bg-teal-900/40 hover:bg-slate-200 dark:hover:bg-teal-900/70 text-[#E85D22] dark:text-orange-400'
            }`}
          >
            {showOriginal ? (
              <>
                <Languages className="w-3 h-3" />
                <span>{t('Voir la traduction', 'Show Translation', 'عرض الترجمة')}</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span>{t('Voir l\'original', 'Show Original', 'عرض النص الأصلي')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
