// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — CONFIGURATION OFFICIELLE I18NEXT & REACT-I18NEXT (FR / EN / AR)
// Support natif du Français (défaut), Anglais et Arabe avec sens RTL automatique
// ============================================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import esTranslations from './locales/es.json';
import { translations as legacyTranslations } from './translations';

export const defaultNS = 'translation';
export const resources = {
  fr: {
    translation: {
      ...legacyTranslations.fr,
      ...frTranslations,
    },
  },
  en: {
    translation: {
      ...legacyTranslations.en,
      ...enTranslations,
    },
  },
  ar: {
    translation: {
      ...legacyTranslations.ar,
      ...arTranslations,
    },
  },
  es: {
    translation: {
      ...legacyTranslations.fr,
      ...esTranslations,
    },
  },
} as const;

// Détection de la langue initiale depuis le localStorage ou suggestion du navigateur (Français par défaut)
const getInitialLocale = (): 'fr' | 'en' | 'ar' | 'es' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradelink_preferred_locale');
    if (saved === 'fr' || saved === 'en' || saved === 'ar' || saved === 'es') {
      return saved;
    }
  }
  return 'fr';
};

const initialLocale = getInitialLocale();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLocale,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'ar', 'es'],
    interpolation: {
      escapeValue: false, // React gère nativement la protection XSS
    },
    react: {
      useSuspense: false,
    },
  });

// Synchronisation du document DOM HTML (lang et directionnalité RTL)
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocale;
  document.documentElement.dir = initialLocale === 'ar' ? 'rtl' : 'ltr';
}

i18n.on('languageChanged', (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('tradelink_preferred_locale', lng);
  }
});

export default i18n;
