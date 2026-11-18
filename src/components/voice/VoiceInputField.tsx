// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — COMPOSANT INPUT & TEXTAREA AVEC DICTÉE VOCALE INTÉGRÉE (PROMPT 04)
// Intégration transparente du microphone, directionnalité LTR/RTL, conformité RGPD.
// ============================================================================

import React, { useId, useRef } from 'react';
import { VoiceDictationButton } from './VoiceDictationButton';
import type { VoiceLanguage } from '../../types';

export interface VoiceInputFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  language?: VoiceLanguage;
  autoFormatPunctuation?: boolean;
  className?: string;
  id?: string;
}

export const VoiceInputField: React.FC<VoiceInputFieldProps> = ({
  label,
  error,
  helperText,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  disabled = false,
  required = false,
  language,
  autoFormatPunctuation = true,
  className = '',
  id,
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleTranscriptReceived = (transcript: string) => {
    // Si la valeur actuelle existe déjà, insérer avec espace
    if (value && value.trim().length > 0) {
      const separator = value.endsWith(' ') || value.endsWith('\n') ? '' : ' ';
      onChange(value + separator + transcript);
    } else {
      onChange(transcript);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            required={required}
            className={`w-full rounded-2xl border px-3.5 py-2.5 pe-12 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none focus:ring-2 focus:ring-[#E85D22]/20 transition-all ${
              error ? 'border-red-500' : ''
            }`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={inputId}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`w-full rounded-2xl border px-3.5 py-2 pe-12 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none focus:ring-2 focus:ring-[#E85D22]/20 transition-all ${
              error ? 'border-red-500' : ''
            }`}
          />
        )}

        {/* Bouton de dictée vocale positionné à la fin du champ */}
        <div
          className={`absolute inset-inline-end-2 ${
            multiline ? 'top-2.5' : 'top-1/2 -translate-y-1/2'
          }`}
        >
          <VoiceDictationButton
            targetRef={inputRef}
            targetInputId={inputId}
            onTranscript={handleTranscriptReceived}
            language={language}
            autoFormatPunctuation={autoFormatPunctuation}
            size="sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
