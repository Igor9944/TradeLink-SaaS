// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — COMPOSANT SÉLECTEUR DE LANGUE OFFICIEL (FR / EN / AR)
// Sélecteur élégant avec drapeaux, badge RTL et synchronisation i18next + AppContext
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { SupportedLocale } from '../types';

interface LanguageOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'fr',
    label: 'Français',
    nativeLabel: 'Français (Défaut)',
    flag: '🇫🇷',
    dir: 'ltr',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English (US/UK)',
    flag: '🇬🇧',
    dir: 'ltr',
  },
  {
    code: 'ar',
    label: 'العربية',
    nativeLabel: 'العربية (RTL)',
    flag: '🇲🇦',
    dir: 'rtl',
  },
];

interface LanguageSwitcherProps {
  variant?: 'header' | 'settings' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { locale, setLocale, isRtl } = useApp();
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  // Fermeture au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
    setIsOpen(false);
  };

  if (variant === 'settings') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {LANGUAGES.map((lang) => {
          const isSelected = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLanguage(lang.code)}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-start ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={lang.label}>
                  {lang.flag}
                </span>
                <div>
                  <div className="text-sm font-semibold">{lang.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{lang.nativeLabel}</div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-start ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
        aria-label="Changer de langue"
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentLang.flag}</span>
        <span className="font-semibold tracking-wide uppercase text-xs">{currentLang.code}</span>
        {currentLang.code === 'ar' && (
          <span className="px-1 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            RTL
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-48 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 backdrop-blur-md ${
            isRtl ? 'start-0' : 'end-0'
          }`}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            {locale === 'ar' ? 'اختر لغة العرض' : locale === 'en' ? 'Select Language' : 'Langue d’affichage'}
          </div>

          {LANGUAGES.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-start transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{lang.flag}</span>
                  <div>
                    <span className="block">{lang.label}</span>
                    <span className="block text-[10px] text-slate-400">{lang.nativeLabel}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
