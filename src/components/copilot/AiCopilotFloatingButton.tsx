// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — BOUTON FLOTTANT ASSISTANT IA (AI COPILOT FLOATING BUTTON)
// PROMPT 03 : BOUTON FLOTTANT TOUJOURS ACCESSIBLE, LTR/RTL, ANIMATION ET ÉTATS
// ============================================================================

import React from 'react';
import { Bot, Sparkles, X, ChevronUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export interface AiCopilotFloatingButtonProps {
  isOpen: boolean;
  isMinimized: boolean;
  isStreaming: boolean;
  unreadCount?: number;
  onToggleOpen: () => void;
  onRestoreFromMinimized?: () => void;
}

export const AiCopilotFloatingButton: React.FC<AiCopilotFloatingButtonProps> = ({
  isOpen,
  isMinimized,
  isStreaming,
  unreadCount = 0,
  onToggleOpen,
  onRestoreFromMinimized,
}) => {
  const { locale, currentUser } = useApp();

  const buttonTitle =
    locale === 'en'
      ? 'TRADELINK AI Copilot (Contextual Assistant)'
      : locale === 'ar'
      ? 'مساعد تريدلينك الذكي (المساعد السياقي)'
      : 'Assistant IA TradeLink (Copilot Contextuel)';

  const statusLabel = isStreaming
    ? locale === 'en'
      ? 'Thinking...'
      : locale === 'ar'
      ? 'جاري التوليد...'
      : 'En cours de réponse...'
    : locale === 'en'
    ? 'Online'
    : locale === 'ar'
    ? 'متصل'
    : 'Disponible';

  // Si minimisé, proposer un bouton compact de restauration
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 inset-inline-end-6 z-50 transition-all duration-300 transform scale-100 animate-in fade-in"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        <button
          type="button"
          onClick={onRestoreFromMinimized || onToggleOpen}
          title={`${buttonTitle} — Réduit`}
          aria-label="Agrandir l'assistant IA"
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0E393E] to-[#0A262A] text-white shadow-2xl border border-teal-500/40 hover:border-[#E85D22] hover:scale-105 transition-all duration-200"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-[#E85D22]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-xs font-bold font-mono tracking-tight text-teal-100">
            Copilot • {currentUser.role}
          </span>
          <ChevronUp className="w-4 h-4 text-slate-300 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 inset-inline-end-6 z-50 flex items-center gap-3 select-none"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Tooltip d'état contextuel flottant au survol */}
      {!isOpen && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#062023]/95 shadow-lg border border-slate-200 dark:border-teal-800 text-xs text-slate-700 dark:text-slate-200 pointer-events-none transition-all">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-[#E85D22] animate-ping' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium text-[11px]">{statusLabel}</span>
          <span className="text-slate-400 dark:text-teal-600">•</span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-teal-300 uppercase">
            {currentUser.role}
          </span>
        </div>
      )}

      {/* Bouton Flottant Principal avec identité visuelle TradeLink */}
      <button
        type="button"
        onClick={onToggleOpen}
        title={buttonTitle}
        aria-label={isOpen ? 'Fermer l’assistant IA' : 'Ouvrir l’assistant IA TradeLink'}
        aria-expanded={isOpen}
        className={`relative group flex items-center justify-center w-14 h-14 rounded-2xl shadow-2xl transition-all duration-300 transform active:scale-95 ${
          isOpen
            ? 'bg-slate-800 text-white dark:bg-[#0A262A] border border-teal-500/50 rotate-90'
            : 'bg-gradient-to-br from-[#E85D22] via-[#F3702A] to-[#0E393E] text-white hover:scale-105 hover:shadow-orange-500/30 ring-4 ring-orange-500/20'
        }`}
      >
        {/* Anneau de pulsation discret indiquant la disponibilité */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl bg-orange-400/30 animate-ping pointer-events-none" />
        )}

        {isOpen ? (
          <X className="w-6 h-6 transition-transform" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Bot className="w-7 h-7 drop-shadow-md text-white transition-transform group-hover:scale-110" />
            <Sparkles className="w-3.5 h-3.5 absolute -top-1.5 -right-1 text-amber-200 animate-bounce" />
          </div>
        )}

        {/* Indicateur de disponibilité (Point vert / ambre) */}
        {!isOpen && (
          <span
            className={`absolute top-1 inset-inline-end-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#062023] ${
              isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
            }`}
          />
        )}

        {/* Badge de notifications non lues si > 0 */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-md">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
