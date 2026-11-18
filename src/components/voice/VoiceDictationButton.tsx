// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — BOUTON DE DICTÉE VOCALE INTELLIGENTE IN-FIELD (PROMPT 04)
// Microphone, ondes sonores animées, décompte 60s, FR/EN/AR avec RTL,
// validation, recommencement, annulation et insertion à l'emplacement du curseur.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { VoiceDictationStatus, VoiceLanguage } from '../../types';
import {
  VoiceDictationClient,
  getStoredVoiceConsent,
  saveStoredVoiceConsent,
  insertTextIntoInputElement,
  TRILINGUAL_VOICE_CONFIGS,
} from '../../services/voiceDictationEngine';
import { VoiceConsentModal } from './VoiceConsentModal';

export interface VoiceDictationButtonProps {
  /** Cible input ou textarea (HTMLInputElement ou HTMLTextAreaElement) */
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  /** ID de l'élément cible dans le DOM si targetRef n'est pas fourni */
  targetInputId?: string;
  /** Callback optionnel pour recevoir le texte final transcrit */
  onTranscript?: (transcript: string) => void;
  /** Langue initiale optionnelle (dérivée de la locale si non spécifiée) */
  language?: VoiceLanguage;
  /** Formatage de la ponctuation activé */
  autoFormatPunctuation?: boolean;
  /** Mode d'insertion dans le champ cible */
  insertionMode?: 'AT_CURSOR' | 'APPEND' | 'REPLACE';
  /** Taille du bouton compact */
  size?: 'sm' | 'md' | 'lg';
  /** Classe CSS additionnelle */
  className?: string;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  targetRef,
  targetInputId,
  onTranscript,
  language: initialLang,
  autoFormatPunctuation = true,
  insertionMode = 'AT_CURSOR',
  size = 'sm',
  className = '',
}) => {
  const { locale } = useApp();

  // Détermination de la langue selon la locale active de l'application
  const defaultVoiceLang: VoiceLanguage =
    initialLang || (locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR');

  const [activeLang, setActiveLang] = useState<VoiceLanguage>(defaultVoiceLang);
  const [status, setStatus] = useState<VoiceDictationStatus>('IDLE');
  const [interimText, setInterimText] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const clientRef = useRef<VoiceDictationClient | null>(null);

  // Synchronisation si la locale globale change et aucune dictée n'est en cours
  useEffect(() => {
    if (status === 'IDLE' && !initialLang) {
      const derived: VoiceLanguage =
        locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR';
      setActiveLang(derived);
    }
  }, [locale, initialLang, status]);

  // Initialisation du client de dictée
  useEffect(() => {
    const client = new VoiceDictationClient({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'LISTENING') {
          setIsPopoverOpen(true);
        }
      },
      onInterimResult: (text) => {
        setInterimText(text);
      },
      onFinalResult: (finalText) => {
        setInterimText(finalText);
        handleInsertText(finalText);
      },
      onError: (msg, code) => {
        if (code === 'CONSENT_REQUIRED') {
          setShowConsentModal(true);
        } else {
          setErrorMessage(msg);
        }
      },
      onAudioLevel: (lvl) => {
        setAudioLevel(lvl);
      },
      onTimeRemaining: (rem) => {
        setTimeRemaining(rem);
      },
    });

    clientRef.current = client;

    return () => {
      client.cancel();
    };
  }, []);

  const handleStart = async () => {
    setErrorMessage(null);

    // Vérifier si le consentement a été donné
    const hasConsent = getStoredVoiceConsent();
    if (!hasConsent) {
      setShowConsentModal(true);
      return;
    }

    try {
      setIsPopoverOpen(true);
      await clientRef.current?.start({
        language: activeLang,
        autoFormatPunctuation,
      });
    } catch {
      setErrorMessage('Erreur lors du démarrage du microphone.');
    }
  };

  const handleStopAndApply = () => {
    clientRef.current?.stop();
    setIsPopoverOpen(false);
  };

  const handleRestart = () => {
    setInterimText('');
    clientRef.current?.restart({
      language: activeLang,
      autoFormatPunctuation,
    });
  };

  const handleCancel = () => {
    clientRef.current?.cancel();
    setInterimText('');
    setIsPopoverOpen(false);
    setStatus('IDLE');
  };

  const handleInsertText = (text: string) => {
    if (!text.trim()) return;

    // 1. Si callback onTranscript
    if (onTranscript) {
      onTranscript(text);
    }

    // 2. Si targetRef ou targetInputId fourni, insertion directe dans le champ DOM
    let element: HTMLInputElement | HTMLTextAreaElement | null = null;
    if (targetRef && targetRef.current) {
      element = targetRef.current;
    } else if (targetInputId) {
      element = document.getElementById(targetInputId) as HTMLInputElement | HTMLTextAreaElement | null;
    }

    if (element) {
      insertTextIntoInputElement(element, text, insertionMode);
    }
  };

  const handleConsentAccept = () => {
    saveStoredVoiceConsent(true);
    setShowConsentModal(false);
    handleStart();
  };

  const handleConsentReject = () => {
    saveStoredVoiceConsent(false);
    setShowConsentModal(false);
    setStatus('IDLE');
  };

  const isListening = status === 'LISTENING';
  const isProcessing = status === 'PROCESSING';

  // Dimensionnement du bouton
  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Bouton principal du micro */}
      <button
        type="button"
        onClick={isListening ? handleStopAndApply : handleStart}
        aria-label={
          isListening
            ? 'Arrêter la dictée vocale et insérer le texte'
            : 'Activer la saisie vocale intelligente'
        }
        title={
          isListening
            ? `En écoute (${timeRemaining}s) — Cliquez pour valider`
            : `Saisie vocale STT (${TRILINGUAL_VOICE_CONFIGS[activeLang].label})`
        }
        className={`group relative inline-flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D22] ${
          sizeClasses[size]
        } ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
            : isProcessing
            ? 'bg-amber-500 text-white'
            : 'bg-orange-500/10 hover:bg-orange-500/20 text-[#E85D22] dark:bg-teal-900/40 dark:hover:bg-teal-800/60 dark:text-teal-300'
        }`}
      >
        {isListening ? (
          <div className="relative flex items-center justify-center">
            <Mic className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-white ring-2 ring-red-500 animate-ping" />
          </div>
        ) : isProcessing ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Mic className="w-4 h-4 transition-transform group-hover:scale-110" />
        )}
      </button>

      {/* Popover interactif flottant pendant la dictée */}
      {isPopoverOpen && (
        <div
          role="region"
          aria-live="polite"
          className="absolute z-50 bottom-full inset-inline-end-0 mb-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#0B3438]/95 backdrop-blur-md border border-slate-200 dark:border-teal-700/70 p-4 shadow-2xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header du Popover */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-teal-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isListening ? 'Écoute active...' : 'Traitement en cours...'}
              </span>
            </div>

            {/* Sélecteur de langue rapide */}
            <div className="flex items-center gap-1">
              {(['fr-FR', 'en-US', 'ar-SA'] as VoiceLanguage[]).map((langCode) => {
                const meta = TRILINGUAL_VOICE_CONFIGS[langCode];
                return (
                  <button
                    key={langCode}
                    type="button"
                    onClick={() => {
                      setActiveLang(langCode);
                      if (isListening) {
                        handleRestart();
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      activeLang === langCode
                        ? 'bg-[#E85D22] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-teal-900/40 text-slate-600 dark:text-teal-300 hover:bg-slate-200'
                    }`}
                  >
                    {meta.flag} {langCode.slice(0, 2).toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Timer décompte 60s */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-teal-950/60 text-[11px] font-mono text-slate-600 dark:text-teal-300">
              <Clock className="w-3 h-3 text-[#E85D22]" />
              <span>{timeRemaining}s</span>
            </div>
          </div>

          {/* Ondes sonores visuelles dynamiques */}
          {isListening && (
            <div className="my-3 flex items-center justify-center gap-1 h-6">
              {[0.4, 0.8, 1.2, 1.5, 1.1, 0.7, 0.3].map((factor, idx) => {
                const height = Math.max(4, Math.min(24, Math.round((audioLevel / 4) * factor)));
                return (
                  <span
                    key={idx}
                    style={{ height: `${height}px` }}
                    className="w-1 rounded-full bg-gradient-to-t from-orange-500 to-amber-400 transition-all duration-75"
                  />
                );
              })}
            </div>
          )}

          {/* Transcription en direct */}
          <div
            dir={TRILINGUAL_VOICE_CONFIGS[activeLang].isRtl ? 'rtl' : 'ltr'}
            className="p-3 rounded-xl bg-slate-50 dark:bg-[#072124] border border-slate-200/60 dark:border-teal-900/60 min-h-[56px] max-h-32 overflow-y-auto text-xs text-slate-800 dark:text-slate-200"
          >
            {interimText ? (
              <p className="whitespace-pre-wrap leading-relaxed">{interimText}</p>
            ) : (
              <p className="text-slate-400 italic">
                {TRILINGUAL_VOICE_CONFIGS[activeLang].samplePhrase}
              </p>
            )}
          </div>

          {/* Message d'erreur s'il y a lieu */}
          {errorMessage && (
            <div className="mt-2 p-2 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Contrôles de validation, reset et annulation */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-teal-800/60">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-teal-800/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRestart}
                title="Recommencer la dictée"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-800/40 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleStopAndApply}
                disabled={!interimText.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E85D22] hover:bg-[#D14B13] text-white shadow-sm disabled:opacity-50 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Valider</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de consentement explicite RGPD / CNDP */}
      <VoiceConsentModal
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onReject={handleConsentReject}
      />
    </div>
  );
};
