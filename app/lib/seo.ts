/**
 * Shared technical-SEO helpers.
 *
 * Two jobs:
 *  1. Build ABSOLUTE canonical / Open-Graph URLs from the request origin
 *     (never a hard-coded production host — the origin is passed in from each
 *     loader's `new URL(request.url).origin`, so preview and production hosts
 *     both self-canonicalise correctly).
 *  2. Emit truthful Organization / Florist / WebSite structured data built ONLY
 *     from the merchant-approved facts in `companyContent.ts`.
 *
 * Deliberately NOT here (pending verified source data — do not fabricate):
 *   openingHoursSpecification, priceRange, aggregateRating, review.
 */
import type {MetaDescriptor} from 'react-router';
import {COMPANY, CONTACT} from './companyContent';

/** Site-wide constants. Assets are site-relative and resolved to absolute at use. */
export const SITE = {
  name: COMPANY.name,
  /** Social sharing image (exists at public/og-image.png). */
  ogImagePath: '/og-image.png',
  /** Brand logo used for Organization.logo (exists in public/). */
  logoPath: '/og-image.png',
  /** Stable schema.org node ids (fragment on the origin — one entity per site). */
  organizationId: '#organization',
  websiteId: '#website',
} as const;

/**
 * Build an absolute URL from a request origin + a site-relative path. Falls back
 * to the relative path when the origin is unknown (e.g. an error render where the
 * loader data is missing) so we never emit a broken `undefined`-host URL.
 */
export function absoluteUrl(origin: string | undefined, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

/**
 * A canonical `<link>` MetaDescriptor for a base path. The path is always a clean
 * route path with NO query string, so sort/filter/cursor facets can never spawn a
 * duplicate canonical — the faceted URL points back to this base route.
 */
export function canonicalTag(
  origin: string | undefined,
  path: string,
): MetaDescriptor {
  return {tagName: 'link', rel: 'canonical', href: absoluteUrl(origin, path)};
}

/** One step in a breadcrumb trail. `path` is a clean site-relative route path. */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface PageSeoInput {
  /** Request origin, from the loader (`new URL(request.url).origin`). */
  origin: string | undefined;
  /** Clean base path for this page, e.g. `/retail/flowers` (no query). */
  path: string;
  /** Full document title (already includes the brand). */
  title: string;
  /** Meta description — unique, natural, no keyword stuffing. */
  description: string;
  /** Optional absolute-or-relative OG image; defaults to the site OG image. */
  image?: string;
}

export interface CatalogueSeoInput extends PageSeoInput {
  /**
   * Optional breadcrumb trail (Home → … → current). When present, a
   * `BreadcrumbList` JSON-LD node is appended. Built from the route hierarchy —
   * no fabricated data.
   */
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Base metadata for any public page: title, description, an ABSOLUTE
 * self-canonical to the base path (query/facets stripped), and Open-Graph /
 * Twitter tags. Used by informational/landing routes so they stop falling back
 * to the generic root defaults.
 */
export function pageMeta(input: PageSeoInput): MetaDescriptor[] {
  const {origin, path, title, description} = input;
  const url = absoluteUrl(origin, path);
  const image = input.image
    ? absoluteUrl(origin, input.image)
    : absoluteUrl(origin, SITE.ogImagePath);
  return [
    {title},
    {name: 'description', content: description},
    canonicalTag(origin, path),
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    {property: 'og:site_name', content: SITE.name},
    {property: 'og:image', content: image},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
  ];
}

/**
 * `BreadcrumbList` structured data from a route hierarchy. Item URLs are absolute
 * where the origin is known. Purely positional/navigational — no business facts.
 */
export function breadcrumbSchema(
  origin: string | undefined,
  items: BreadcrumbItem[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(origin, item.path),
    })),
  };
}

/**
 * Metadata for a public catalogue route — `pageMeta` plus an optional
 * `BreadcrumbList`. Output is identical to `pageMeta` when no breadcrumbs are
 * given, so existing callers are unchanged.
 */
export function catalogueMeta(input: CatalogueSeoInput): MetaDescriptor[] {
  const tags = pageMeta(input);
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    tags.push({
      'script:ld+json': breadcrumbSchema(input.origin, input.breadcrumbs),
    } as MetaDescriptor);
  }
  return tags;
}

/**
 * Organization / Florist structured data — truthful, source-backed fields only.
 * `@id` is stable (`<origin>/#organization`) so the WebSite node and any future
 * Product/Breadcrumb node can reference the same business entity.
 *
 * Intentionally omitted until verified: openingHoursSpecification, priceRange,
 * aggregateRating, review.
 */
export function organizationSchema(origin: string | undefined): object {
  const base = origin ?? '';
  const primaryPhone = CONTACT.phones[0]?.href?.replace(/^tel:/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'Florist',
    '@id': `${base}/${SITE.organizationId}`,
    name: SITE.name,
    url: absoluteUrl(origin, '/'),
    logo: absoluteUrl(origin, SITE.logoPath),
    image: absoluteUrl(origin, SITE.ogImagePath),
    email: CONTACT.email,
    ...(primaryPhone ? {telephone: primaryPhone} : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.address.line1,
      addressLocality: 'Kingston',
      addressRegion: 'Kingston',
      addressCountry: 'JM',
    },
    // Delivery footprint stated as fact in companyContent (Kingston & St. Andrew).
    areaServed: ['Kingston', 'St. Andrew'],
    sameAs: [CONTACT.social.instagram, CONTACT.social.facebook],
  };
}

/**
 * WebSite structured data with a SearchAction. The `/search` route genuinely
 * accepts a `q` query parameter (input `name="q"`), so the query-template target
 * is honest. `publisher` references the Organization/Florist node by @id.
 */
export function websiteSchema(origin: string | undefined): object {
  const base = origin ?? '';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/${SITE.websiteId}`,
    url: absoluteUrl(origin, '/'),
    name: SITE.name,
    publisher: {'@id': `${base}/${SITE.organizationId}`},
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl(origin, '/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
