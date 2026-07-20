/**
 * Catalogue data — the single map from an approved route to its Shopify
 * collection. Deliberately separate from visual theme (see `themeForPath`):
 * membership here never implies premium styling.
 */

import {
  buildProductFilters,
  matchesFacetTags,
  matchesQuery,
  parseCatalogSearchParams,
  toCollectionSort,
  type AppliedFilters,
  type FilterContext,
} from '~/lib/catalog';

export const CATALOGUE_QUERY = `#graphql
  query CatalogueCollection(
    $handle: String!
    $first: Int!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      products(
        first: $first
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        nodes {
          id
          handle
          title
          vendor
          productType
          tags
          availableForSale
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

/** Wholesale (auth-required) and Retail (guest) catalogues. */
export const TRADE_COLLECTIONS = {
  wholesaleFlowers: 'bulk-flowers',
  wholesaleSupplies: 'floral-supplies',
  retailFlowers: 'all-flowers',
  retailSupplies: 'floral-supplies',
} as const;

/** Arrangements pathways. */
export const ARRANGEMENT_COLLECTIONS = {
  mixed: 'best-sellers',
} as const;

/**
 * Premium / Deluxe categories (the ONLY premium-themed catalogues).
 * These use DEDICATED Shopify collections — no substitute content. If a handle
 * does not exist yet the catalogue renders an intentional empty state and logs
 * a development warning (see `loadCatalogue`).
 */
export const PREMIUM_CATEGORIES = [
  {
    slug: 'handcrafted',
    label: 'Handcrafted',
    handle: 'premium-handcrafted',
    img: '/images/collections/luxury-bouquets',
  },
  {
    slug: 'vase',
    label: 'Vase',
    handle: 'premium-vase',
    img: '/images/collections/signature-collection',
  },
  {
    slug: 'heart-box',
    label: 'Heart Box',
    handle: 'premium-heart-box',
    img: '/images/collections/add-ons',
  },
] as const;

/** Approved occasions (owner-approved list). */
export const OCCASIONS = [
  {slug: 'birthday', label: 'Birthday', handle: 'birthday', img: '/images/occasions/birthday'},
  {slug: 'romance', label: 'Romance', handle: 'love-and-romance', img: '/images/occasions/love-and-romance'},
  {slug: 'sympathy', label: 'Sympathy', handle: 'sympathy-and-funeral', img: '/images/occasions/sympathy-and-funeral'},
  {slug: 'thank-you', label: 'Thank You', handle: 'thank-you', img: '/images/occasions/thank-you'},
  {slug: 'get-well', label: 'Get Well', handle: 'get-well', img: '/images/occasions/get-well'},
  {slug: 'new-baby', label: 'New Baby', handle: 'new-baby', img: '/images/occasions/new-baby'},
] as const;

/** Approved supply categories (already in the Shopify catalogue). */
export const SUPPLY_CATEGORIES = [
  {slug: 'vases-and-containers', label: 'Vases & Containers', handle: 'vases-and-containers', img: '/images/supplies/vases'},
  {slug: 'ribbon', label: 'Ribbon', handle: 'ribbon', img: '/images/supplies/ribbon'},
  {slug: 'wrapping-and-packaging', label: 'Wrapping & Packaging', handle: 'wrapping-and-packaging', img: '/images/supplies/wrapping'},
  {slug: 'tools-and-accessories', label: 'Tools & Accessories', handle: 'tools-and-accessories', img: '/images/supplies/tools'},
  {slug: 'florist-essentials', label: 'Florist Essentials', handle: 'florist-essentials', img: '/images/supplies/essentials'},
] as const;

export interface CatalogueLoadResult<T> {
  products: T[];
  /** True when the Shopify collection handle does not exist (not merely empty). */
  missing: boolean;
  /** True when the Storefront query threw — the UI shows a retryable error. */
  failed: boolean;
  /** Applied filter/search state, parsed from the URL. */
  filters: AppliedFilters;
  /** Applied sort value (one of SORT_OPTIONS). */
  sort: string;
}

interface StorefrontLike {
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{collection?: {products?: {nodes?: unknown[]}} | null}>;
}

/** How many products one catalogue page requests. */
const CATALOGUE_PAGE_SIZE = 48;

/**
 * Load one catalogue collection with the shopper's filters and sort applied
 * SERVER-SIDE (Shopify `filters` + `sortKey`/`reverse`). Keyword search narrows
 * the returned page only — see `matchesQuery`.
 *
 * Distinguishes three outcomes so the UI can be honest about each:
 *   missing  — the handle does not exist in Shopify (intentional empty state)
 *   failed   — the query threw (error state, offer retry)
 *   empty    — the collection exists but matched nothing
 *
 * It never substitutes unrelated products for any of them.
 */
export async function loadCatalogue<
  T extends {
    title?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: readonly string[] | null;
  },
>(
  storefront: StorefrontLike,
  handle: string,
  request: Request,
  context: FilterContext,
): Promise<CatalogueLoadResult<T>> {
  const url = new URL(request.url);
  const {filters, sort} = parseCatalogSearchParams(url.searchParams, context);
  const {sortKey, reverse} = toCollectionSort(sort);
  const base = {filters, sort};

  try {
    const {collection} = await storefront.query(CATALOGUE_QUERY, {
      variables: {
        handle,
        first: CATALOGUE_PAGE_SIZE,
        filters: buildProductFilters(filters),
        sortKey,
        reverse,
      },
    });
    if (!collection) {
       
      console.warn(
        `[catalogue] Shopify collection "${handle}" was not found. The catalogue ` +
          `renders an empty state. Create this collection in Shopify admin.`,
      );
      return {products: [], missing: true, failed: false, ...base};
    }
    const nodes = (collection.products?.nodes ?? []) as T[];
    return {
      products: nodes.filter(
        (node) => matchesFacetTags(node, filters) && matchesQuery(node, filters.q),
      ),
      missing: false,
      failed: false,
      ...base,
    };
  } catch (error) {
     
    console.error(`[catalogue] query failed for "${handle}"`, error);
    return {products: [], missing: false, failed: true, ...base};
  }
}

export function findBySlug<T extends {slug: string}>(
  list: readonly T[],
  slug: string | undefined,
): T | undefined {
  return list.find((i) => i.slug === slug);
}

/** Responsive src/srcSet for a `<base>-{400,600,800}.webp` image set. */
export function cardImage(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}
