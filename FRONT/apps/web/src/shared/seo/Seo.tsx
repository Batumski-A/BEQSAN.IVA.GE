import { Helmet } from 'react-helmet-async';

import { SITE, seoForPath, canonicalUrl } from './routeMeta';
import { organizationGraph, graphDocument, breadcrumbSchema } from './schema';

type Crumb = { name: string; path: string };

type SeoProps = {
  /** Known route path — pulls title/description from seoRoutes.json. */
  route?: string;
  /** Explicit overrides (used for dynamic routes or when route is unknown). */
  title?: string;
  description?: string;
  /** Canonical path (defaults to `route`). Always self-referential on beqsan.iva.ge. */
  canonicalPath?: string;
  /** OG image path (absolute-ized against SITE.url). Defaults to the brand OG. */
  image?: string;
  ogType?: string;
  /** Suppress indexing (private / legacy / duplicate routes). */
  noindex?: boolean;
  /** Extra JSON-LD nodes (Service, FAQPage, ImageObject…) merged into the @graph. */
  jsonLd?: object | object[];
  /** Breadcrumb trail — emitted as BreadcrumbList in the @graph. */
  breadcrumb?: Crumb[];
  /** Emit the sitewide Organization/WebSite graph (default true). */
  includeOrg?: boolean;
  /** Preload the LCP image (e.g. the hero) with high priority. */
  preloadImage?: string;
};

/**
 * Single emitter for all head SEO: title, description, canonical, robots,
 * OpenGraph, Twitter card, and the JSON-LD @graph. Wired into every public
 * page; the prerender captures its output into static HTML.
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
  const meta = route ? seoForPath(route) : undefined;
  const resolvedTitle = title ?? meta?.title ?? SITE.brand;
  const resolvedDesc = description ?? meta?.description ?? '';
  const path = canonicalPath ?? route ?? '/';
  const canonical = canonicalUrl(path);
  const ogImage = `${SITE.url}${image ?? SITE.ogImage}`;

  const nodes: object[] = [];
  if (includeOrg) nodes.push(...organizationGraph());
  if (breadcrumb?.length) nodes.push(breadcrumbSchema(breadcrumb));
  if (jsonLd) nodes.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));

  return (
    <Helmet>
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

      {/* OpenGraph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE.brand} />
      <meta property="og:locale" content={SITE.locale} />
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
