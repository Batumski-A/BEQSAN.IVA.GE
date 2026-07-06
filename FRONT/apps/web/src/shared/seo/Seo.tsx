import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import {
  SITE,
  seoForPath,
  canonicalUrl,
  hreflangAlternates,
  pick,
  type Locale,
} from './routeMeta';
import { organizationGraph, graphDocument, breadcrumbSchema } from './schema';

type Crumb = { name: string; path: string };

type SeoProps = {
  /** Known route path — pulls localized title/description from seoRoutes.json. */
  route?: string;
  /** Explicit overrides (used for dynamic/noindex routes). */
  title?: string;
  description?: string;
  /** Canonical path (defaults to `route`). */
  canonicalPath?: string;
  /** OG image path (absolute-ized against SITE.url). Defaults to the brand OG. */
  image?: string;
  ogType?: string;
  /** Suppress indexing (private / legacy / duplicate routes). */
  noindex?: boolean;
  /** Extra JSON-LD nodes merged into the @graph. */
  jsonLd?: object | object[];
  /** Breadcrumb trail — emitted as BreadcrumbList. */
  breadcrumb?: Crumb[];
  /** Emit the sitewide Organization/WebSite graph (default true). */
  includeOrg?: boolean;
  /** Preload the LCP image (e.g. the hero) with high priority. */
  preloadImage?: string;
};

/**
 * Single emitter for all head SEO: title, description, canonical, robots,
 * hreflang alternates (ka/en/ru + x-default), OpenGraph, Twitter, and the
 * JSON-LD @graph. Language comes from i18next (the router's locale shell sets
 * it per URL), so the prerender bakes the right language into each URL.
 */
export function Seo({
  route,
  title,
  description,
  canonicalPath,
  image,
  ogType = 'website',
  noindex = false,
  jsonLd,
  breadcrumb,
  includeOrg = true,
  preloadImage,
}: SeoProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'ka') as Locale;

  const meta = route ? seoForPath(route) : undefined;
  const resolvedTitle = title ?? (meta ? pick(meta.title, lang) : SITE.brand);
  const resolvedDesc = description ?? (meta ? pick(meta.description, lang) : '');
  const path = canonicalPath ?? route ?? '/';
  const canonical = canonicalUrl(path, lang);
  const ogImage = `${SITE.url}${image ?? SITE.ogImage}`;
  const ogLocale = SITE.ogLocale[lang] ?? SITE.ogLocale.ka;

  // hreflang only for real indexable routes (known path, not noindex).
  const alternates = !noindex && meta ? hreflangAlternates(meta.path) : [];

  const nodes: object[] = [];
  if (includeOrg) nodes.push(...organizationGraph());
  if (breadcrumb?.length) nodes.push(breadcrumbSchema(breadcrumb, lang));
  if (jsonLd) nodes.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{resolvedTitle}</title>
      {resolvedDesc ? <meta name="description" content={resolvedDesc} /> : null}
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}
      />
      {preloadImage ? (
        <link rel="preload" as="image" href={preloadImage} fetchPriority="high" />
      ) : null}

      {/* hreflang alternates */}
      {alternates.map((a) => (
        <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={a.href} />
      ))}

      {/* OpenGraph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE.brand} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:title" content={resolvedTitle} />
      {resolvedDesc ? <meta property="og:description" content={resolvedDesc} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      {resolvedDesc ? <meta name="twitter:description" content={resolvedDesc} /> : null}
      <meta name="twitter:image" content={ogImage} />

      {nodes.length ? (
        <script type="application/ld+json">{JSON.stringify(graphDocument(nodes))}</script>
      ) : null}
    </Helmet>
  );
}
