// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — BANDEAU DE SOUS-TITRES ET TRADUCTION ROOM LIVE EN DIRECT
// Affiche la parole transcrite (STT) et sa traduction instantanée dans la langue
// préférée de chaque participant avec indicateur de latence et certification.
// ============================================================================

import React, { useState } from 'react';
import { Mic, Languages, Sparkles, Globe } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { SupportedLocale } from '../types';

export interface LiveSubtitleEntry {
  id: string;
  speakerName: string;
  speakerRole: string;
  originalText: string;
  sourceLang: SupportedLocale;
  translatedText: string;
  targetLang: SupportedLocale;
  timestamp: string;
  confidence: number;
}

interface LiveSubtitleOverlayProps {
  currentSubtitle?: LiveSubtitleEntry;
  subtitlesHistory?: LiveSubtitleEntry[];
  isActive?: boolean;
}

export const LiveSubtitleOverlay: React.FC<LiveSubtitleOverlayProps> = ({
  currentSubtitle,
  subtitlesHistory = [],
  isActive = true,
}) => {
  const { locale } = useApp();
  const [showOriginal, setShowOriginal] = useState(false);

  if (!isActive && !currentSubtitle) {
    return null;
  }

  // Sous-titre courant ou le plus récent
  const activeSub =
    currentSubtitle || (subtitlesHistory.length > 0 ? subtitlesHistory[subtitlesHistory.length - 1] : null);

  if (!activeSub) {
    return null;
  }

  const displayText = showOriginal ? activeSub.originalText : activeSub.translatedText;

  return (
    <div className="w-full max-w-3xl mx-auto my-2 px-4 transition-all animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 dark:bg-black/90 backdrop-blur-md border border-slate-700/60 p-4 shadow-xl text-white">
        {/* En-tête : Orateur, Rôle, Détection & Contrôles */}
        <div className="flex items-center justify-between gap-3 mb-2 text-xs text-slate-300 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white">{activeSub.speakerName}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
              {activeSub.speakerRole}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>
                {activeSub.sourceLang.toUpperCase()} ➔ {locale.toUpperCase()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <Languages className="w-3 h-3 text-amber-400" />
              <span>{showOriginal ? 'Voir traduction' : 'Voir original'}</span>
            </button>
          </div>
        </div>

        {/* Texte du sous-titre */}
        <div className="min-h-[44px] flex items-center">
          <p
            dir={showOriginal && activeSub.sourceLang === 'ar' ? 'rtl' : locale === 'ar' && !showOriginal ? 'rtl' : 'ltr'}
            className="text-base sm:text-lg font-medium tracking-wide text-slate-100 leading-snug"
          >
            {displayText}
          </p>
        </div>

        {/* Pied : Mention IA & Indicateur de confiance */}
        <div className="mt-2.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Sous-titrage IA direct — TradeLink Live V6.0 (Confiance: {Math.round(activeSub.confidence * 100)}%)</span>
          </div>
          <span>{activeSub.timestamp}</span>
        </div>
      </div>
    </div>
  );
};
