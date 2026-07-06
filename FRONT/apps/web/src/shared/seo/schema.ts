/**
 * schema.org JSON-LD builders for BEQSAN — a single connected @graph anchored
 * on one Organization/LocalBusiness @id. Everything is self-referential on
 * https://beqsan.iva.ge (beqsan is its own brand entity, a "child" of iva.ge
 * but never claims to be iva.ge). Prices are intentionally OFF the public
 * funnel, so NO Offer/price nodes appear anywhere — the funnel is WhatsApp.
 *
 * These objects are rendered into the document head by <Seo> and captured
 * into static HTML by the build-time prerender, so non-JS crawlers and AI
 * engines see them.
 */

export const SITE_URL = 'https://beqsan.iva.ge';
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const PHONE = '+995593644673';
const EMAIL = 'hello@beqsan.ge';
const LOGO = `${SITE_URL}/img/beqsan-logo.png`;
const OG_IMAGE = `${SITE_URL}/og/og-default.png`;
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=41.6168,41.6367';

/** Adjara service area — city + municipality entities for local relevance. */
const AREA_SERVED = [
  { '@type': 'City', name: 'ბათუმი' },
  { '@type': 'City', name: 'ქობულეთი' },
  { '@type': 'City', name: 'ხელვაჩაური' },
  { '@type': 'City', name: 'ქედა' },
  { '@type': 'City', name: 'შუახევი' },
  { '@type': 'City', name: 'ხულო' },
  { '@type': 'City', name: 'ჩაქვი' },
  { '@type': 'AdministrativeArea', name: 'აჭარა' },
];

/**
 * Sitewide @graph: LocalBusiness (HomeAndConstructionBusiness) + WebSite.
 * Injected on every indexable page so the entity is unambiguous everywhere.
 */
export function organizationGraph(): object[] {
  return [
    {
      '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
      '@id': ORG_ID,
      name: 'BEQSAN',
      alternateName: ['ბექსანი', 'BEQSAN LTD'],
      legalName: 'BEQSAN LTD',
      url: SITE_URL,
      logo: LOGO,
      image: OG_IMAGE,
      description:
        'ხელით აწყობილი ალუმინისა და მეტალოპლასტმასის კარ-ფანჯარა ბათუმის ფაბრიკაში 1998 წლიდან.',
      slogan: 'ხელით აწყობილი კარ-ფანჯარა ბათუმის ფაბრიკაში',
      telephone: PHONE,
      email: EMAIL,
      foundingDate: '1998',
      founder: { '@type': 'Person', name: 'რომან შარაშიძე' },
      priceRange: '$$',
      currenciesAccepted: 'GEL',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'სალიბაურის გზა 42',
        addressLocality: 'ბათუმი',
        postalCode: '6000',
        addressRegion: 'აჭარა',
        addressCountry: 'GE',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 41.6168, longitude: 41.6367 },
      hasMap: MAPS_URL,
      areaServed: AREA_SERVED,
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '19:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Saturday',
          opens: '10:00',
          closes: '15:00',
        },
      ],
      knowsAbout: [
        'ალუმინის ფანჯარა',
        'მეტალოპლასტმასის ფანჯარა',
        'PVC კარ-ფანჯარა',
        'აივნის შემინვა',
        'პანორამული შემინვა',
        'სლაიდინგ სისტემები',
      ],
      // sameAs is populated once the Facebook/Instagram pages go live.
      sameAs: [] as string[],
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: 'BEQSAN',
      inLanguage: 'ka',
      publisher: { '@id': ORG_ID },
    },
  ];
}

/** A product-type page's Service node, tied to the org as provider. */
export function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  category?: string;
}): object {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    serviceType: opts.category ?? 'კარ-ფანჯრის წარმოება და მონტაჟი',
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    inLanguage: 'ka',
  };
}

/** BreadcrumbList from an ordered [{ name, path }] trail. URLs are prefixed
 *  with the page's locale ('' for ka, '/en', '/ru') so a localized page's
 *  breadcrumb links to same-language pages. */
export function breadcrumbSchema(
  items: { name: string; path: string }[],
  lang = 'ka',
): object {
  const prefix = lang === 'ka' ? '' : `/${lang}`;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.path === '/' ? `${SITE_URL}${prefix}` : `${SITE_URL}${prefix}${it.path}`,
    })),
  };
}

/** FAQPage — great for rich results + AI Overview citation. Price-free. */
export function faqSchema(qas: { q: string; a: string }[]): object {
  return {
    '@type': 'FAQPage',
    mainEntity: qas.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  };
}

/** Wrap one or more schema nodes into a single @graph document. */
export function graphDocument(nodes: object[]): object {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
