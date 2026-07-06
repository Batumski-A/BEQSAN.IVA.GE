import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ka from './locales/ka.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const SUPPORTED_LOCALES = ['ka', 'en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// The URL is the source of truth for language: /en/* and /ru/* are English
// and Russian; everything else is Georgian (the primary market). The 'path'
// detector reads the first path segment (invalid segments like "about" are
// rejected against supportedLngs, so root paths fall through to htmlTag =
// ka). The router's LocaleShell then keeps i18next in sync on client-side
// navigation. No localStorage caching — it would fight the URL.
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
      order: ['path', 'htmlTag'],
      lookupFromPathIndex: 0,
      caches: [],
    },
    returnNull: false,
  });

export default i18next;
