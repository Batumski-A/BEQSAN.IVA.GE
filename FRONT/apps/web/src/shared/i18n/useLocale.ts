import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { DEFAULT_LOCALE, LOCALES, localePrefix, type Locale } from '@/shared/seo/routeMeta';

const LOCALE_RE = /^\/(en|ru)(?=\/|$)/;

/** Strip a leading /en or /ru prefix → the bare app path (always leading /). */
export function stripLocale(pathname: string): string {
  const bare = pathname.replace(LOCALE_RE, '');
  return bare === '' ? '/' : bare;
}

/**
 * Locale-aware navigation helpers. `lang` is the active locale, `lp()` prefixes
 * an absolute app path with it (so links stay in-language), and `switchTo()`
 * navigates to the same page in another language (URL is the source of truth).
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = (LOCALES.includes(i18n.language as Locale) ? i18n.language : DEFAULT_LOCALE) as Locale;

  const lp = (path: string): string => {
    if (!path.startsWith('/')) return path;
    const prefix = localePrefix(lang);
    if (path === '/') return prefix || '/';
    return `${prefix}${path}`;
  };

  const switchTo = (target: Locale) => {
    const bare = stripLocale(location.pathname);
    const prefix = target === DEFAULT_LOCALE ? '' : `/${target}`;
    navigate(bare === '/' ? prefix || '/' : `${prefix}${bare}`);
  };

  return { lang, lp, switchTo };
}
