import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ka from './locales/ka.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const SUPPORTED_LOCALES = ['ka', 'en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// First-visit users land in Georgian regardless of browser language —
// BEQSAN's primary market is Georgian and the kickoff calls Georgian
// the canonical surface. Once the user picks a language (top-header
// switcher writes to localStorage), that choice sticks across visits.
// Removed `navigator` from the detector order so a Latvian-locale
// Chrome doesn't ship them en/ru just because they don't have ka set.
void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ka',
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    resources: {
      ka: { translation: ka },
      en: { translation: en },
      ru: { translation: ru },
    },
    detection: {
      order: ['localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18next;
