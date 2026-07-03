import data from './seoRoutes.json';

/**
 * Single source of truth for per-route SEO metadata. Consumed by the runtime
 * <Seo> component AND (as plain JSON) by the build-time prerender + sitemap
 * scripts, so the hydrated head and the prerendered head stay identical.
 */
export type RouteMeta = {
  path: string;
  title: string;
  description: string;
  type: string;
  priority: number;
  changefreq: string;
};

type SeoData = {
  site: {
    url: string;
    brand: string;
    brandKa: string;
    locale: string;
    ogImage: string;
    twitter: string;
  };
  routes: RouteMeta[];
  noindexRoutes: string[];
};

const seo = data as SeoData;

export const SITE = seo.site;
export const ROUTES = seo.routes;
export const NOINDEX_ROUTES = seo.noindexRoutes;

const byPath = new Map(seo.routes.map((r) => [r.path, r] as const));

/** Look up canonical meta for a known route path. */
export function seoForPath(path: string): RouteMeta | undefined {
  return byPath.get(path);
}

/** Absolute canonical URL for a route path on the beqsan.iva.ge host. */
export function canonicalUrl(path: string): string {
  return `${SITE.url}${path === '/' ? '' : path.replace(/\/$/, '')}` || SITE.url;
}
