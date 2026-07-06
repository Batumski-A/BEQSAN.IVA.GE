import data from './seoRoutes.json';

/**
 * Single source of truth for per-route, per-language SEO metadata. Consumed by
 * the runtime <Seo> component AND (as plain JSON) by the build-time prerender +
 * sitemap scripts, so hydrated and prerendered heads stay identical across all
 * three languages.
 *
 * URL scheme: ka is the default and lives at the root (/about). en/ru are
 * path-prefixed (/en/about, /ru/about). ka is x-default.
 */
export type Locale = 'ka' | 'en' | 'ru';
export type Localized = Record<Locale, string>;

export type RouteMeta = {
  path: string;
  priority: number;
  changefreq: string;
  title: Localized;
  description: Localized;
};

type SeoData = {
  site: {
    url: string;
    brand: string;
    brandKa: string;
    defaultLocale: Locale;
    locales: Locale[];
    ogLocale: Record<Locale, string>;
    ogImage: string;
  };
  routes: RouteMeta[];
  noindexRoutes: string[];
};

const seo = data as SeoData;

export const SITE = seo.site;
export const LOCALES = seo.site.locales;
export const DEFAULT_LOCALE = seo.site.defaultLocale;
export const ROUTES = seo.routes;
export const NOINDEX_ROUTES = seo.noindexRoutes;

const byPath = new Map(seo.routes.map((r) => [r.path, r] as const));

/** Look up canonical meta for a known route path (language-agnostic). */
export function seoForPath(path: string): RouteMeta | undefined {
  return byPath.get(path);
}

/** Pick a localized string, falling back to Georgian. */
export function pick(loc: Localized | undefined, lang: string): string {
  if (!loc) return '';
  return loc[(lang as Locale)] ?? loc.ka;
}

/** URL path prefix for a locale ('' for ka, '/en', '/ru'). */
export function localePrefix(lang: string): string {
  return lang === DEFAULT_LOCALE ? '' : `/${lang}`;
}

/** Absolute canonical URL for a route path in a given language. */
export function canonicalUrl(path: string, lang: string): string {
  const prefix = localePrefix(lang);
  if (path === '/') return `${SITE.url}${prefix}` || SITE.url;
  return `${SITE.url}${prefix}${path.replace(/\/$/, '')}`;
}

/** hreflang alternates for a route path: one per locale + x-default (ka). */
export function hreflangAlternates(path: string): { hreflang: string; href: string }[] {
  const alts: { hreflang: string; href: string }[] = LOCALES.map((l) => ({
    hreflang: l as string,
    href: canonicalUrl(path, l),
  }));
  alts.push({ hreflang: 'x-default', href: canonicalUrl(path, DEFAULT_LOCALE) });
  return alts;
}
