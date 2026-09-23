/**
 * Catalogue data — the single map from an approved route to its Shopify
 * collection. Deliberately separate from visual theme (see `themeForPath`):
 * membership here never implies premium styling.
 */

import {
  buildProductFilters,
  buildProductQueryString,
  matchesFacetTags,
  matchesQuery,
  parseCatalogSearchParams,
  toCatalogSort,
  toCollectionSort,
  type AppliedFilters,
  type FilterContext,
} from '~/lib/catalog';
import {CLASSIC_FLOWER_TYPES, isSupplyProduct} from '~/lib/experienceClassify';

/** Flower shopping contexts: their grids must never show Floral Supply products. */
const FLOWER_CONTEXTS = new Set<FilterContext>([
  'retail-flowers',
  'wholesale-flowers',
]);

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

/**
 * Wholesale and Retail catalogues. Both are PUBLIC — a wholesale buyer shops as
 * a guest (name + email at checkout); the Business Account is a separate,
 * optional relationship (see `/wholesale`). Trade pricing lives on the Shopify
 * product, so each side points at its own collection and prices can diverge.
 *
 * Flowers: `bulk-flowers` (wholesale bunches/boxes) vs `all-flowers` (retail) —
 * genuinely different products, so two collections is right.
 *
 * Supplies: the same physical item (a vase, a spool of ribbon) at a trade
 * price — NOT a different product. Cloning `floral-supplies` into a parallel
 * collection would force every supply to be maintained twice. So the wholesale
 * supplies route PREFERS a dedicated wholesale-priced collection but FALLS BACK
 * to the shared retail one until the owner creates it — see
 * `loadCatalogueWithFallback`. Pointing at the preferred handle is safe even
 * before it exists: the page serves the fallback today and auto-upgrades the
 * moment the collection appears in Shopify, with no code change.
 *
 * OWNER-DEPENDENT: create a wholesale-priced supplies collection in Shopify. If
 * you name it something other than `wholesale-supplies`, tell me the handle —
 * it's a one-line change to `wholesaleSupplies` below. No pricing is invented
 * here; the numbers come entirely from whatever collection you create.
 */
export const TRADE_COLLECTIONS = {
  wholesaleFlowers: 'bulk-flowers',
  /** Preferred dedicated wholesale supplies collection (may not exist yet). */
  wholesaleSupplies: 'wholesale-supplies',
  /** Served until the dedicated wholesale supplies collection exists. */
  wholesaleSuppliesFallback: 'floral-supplies',
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
  /** Request origin, for building absolute self-canonicals in route meta. */
  origin: string;
}

interface StorefrontLike {
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{
    collection?: {products?: {nodes?: unknown[]}} | null;
    products?: {nodes?: unknown[]} | null;
  }>;
}

/**
 * The four fresh-flower product types. A flower-VARIETY page (e.g. "Carnations",
 * "Eucalyptus") is a by-the-stem concept: it must show the fresh single-variety
 * products, never arrangements that merely list the flower as a component
 * ingredient. Constraining the search to these types keeps arrangements out
 * regardless of how they are tagged. Single source of truth: experienceClassify.
 */
export const FRESH_FLOWER_TYPE_QUERY = `(${CLASSIC_FLOWER_TYPES.map(
  (t) => `product_type:'${t}'`,
).join(' OR ')})`;

/**
 * Top-level product search. Unlike `collection.products(filters:)` — whose `tag`
 * filters Shopify SILENTLY IGNORES unless they are enabled in Search & Discovery
 * (so a collection-based facet only ever filters the first page it fetched, and
 * returns a sparse, arbitrary subset) — this connection filters SERVER-SIDE across
 * the whole catalogue, so a tag query is both complete and exact. It is the same
 * mechanism the flower hub uses.
 */
export const PRODUCT_SEARCH_QUERY = `#graphql
  query CatalogueProductSearch(
    $query: String!
    $first: Int!
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
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
` as const;

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
  const base = {filters, sort, origin: url.origin};

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
    const dropSupplies = FLOWER_CONTEXTS.has(context);
    return {
      products: nodes.filter(
        (node) =>
          matchesFacetTags(node, filters) &&
          matchesQuery(node, filters.q) &&
          !(dropSupplies && isSupplyProduct(node)),
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

/** True when the shopper has narrowed the catalogue (search, a facet or price). */
function hasNarrowingFilters(f: AppliedFilters): boolean {
  return Boolean(
    f.q ||
      f.flower ||
      f.color ||
      f.occasion ||
      f.channel ||
      f.minPrice != null ||
      f.maxPrice != null,
  );
}

/**
 * Load a catalogue that PREFERS a dedicated collection but FALLS BACK to a
 * shared one when the preferred one isn't ready.
 *
 * This lets a route point at a not-yet-created (or still-being-populated)
 * collection safely: the page serves the fallback until the preferred one has
 * products, then takes it over automatically — no code change, no blank page.
 *
 * The fallback triggers when the preferred collection is MISSING, or exists but
 * shows NOTHING on an UNFILTERED view (e.g. a trade collection created empty and
 * populated later). Two cases never fall back: a query FAILURE surfaces as-is
 * (never masked), and a genuine zero-result FILTER on the real collection is
 * respected — an empty result the shopper asked for is the honest answer, not a
 * reason to show unrelated fallback products.
 */
export async function loadCatalogueWithFallback<
  T extends {
    title?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: readonly string[] | null;
  },
>(
  storefront: StorefrontLike,
  handles: {preferred: string; fallback: string},
  request: Request,
  context: FilterContext,
): Promise<CatalogueLoadResult<T>> {
  const primary = await loadCatalogue<T>(
    storefront,
    handles.preferred,
    request,
    context,
  );
  // A failed query, or a real collection with products, is served as-is.
  if (primary.failed) return primary;
  if (!primary.missing && primary.products.length > 0) return primary;
  // Empty preferred result: respect a shopper's own zero-result filter, but for
  // an unfiltered empty (or a missing collection) fall back so the page never
  // blanks while the trade collection is still being populated.
  if (!primary.missing && hasNarrowingFilters(primary.filters)) return primary;
  return loadCatalogue<T>(storefront, handles.fallback, request, context);
}

/**
 * Load a catalogue whose membership is defined by a fixed TAG, assembled from the
 * reliable top-level product search (see `PRODUCT_SEARCH_QUERY`) rather than a
 * curated collection. Supplies are always excluded — these surfaces (flower
 * varieties, occasions) never sell vases. Filters/sort come from the URL; the
 * caller supplies the tag query via `buildQuery`.
 */
async function loadTaggedProducts<
  T extends {
    title?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: readonly string[] | null;
  },
>(
  storefront: StorefrontLike,
  request: Request,
  context: FilterContext,
  buildQuery: (filters: AppliedFilters) => string,
): Promise<CatalogueLoadResult<T>> {
  const url = new URL(request.url);
  const {filters, sort} = parseCatalogSearchParams(url.searchParams, context);
  const {sortKey, reverse} = toCatalogSort(sort);
  const base = {filters, sort, origin: url.origin};

  try {
    const {products} = await storefront.query(PRODUCT_SEARCH_QUERY, {
      variables: {
        query: buildQuery(filters),
        first: CATALOGUE_PAGE_SIZE,
        sortKey,
        reverse,
      },
    });
    const nodes = (products?.nodes ?? []) as T[];
    return {
      products: nodes.filter(
        (node) => matchesQuery(node, filters.q) && !isSupplyProduct(node),
      ),
      missing: false,
      failed: false,
      ...base,
    };
  } catch (error) {

    console.error('[catalogue] product search failed', error);
    return {products: [], missing: false, failed: true, ...base};
  }
}

/**
 * The fresh single-variety products for the applied flower facet (e.g.
 * `?flower=carnations`) — reliable and complete, and arrangement-free (a variety
 * page shows stems, not the bouquets that merely contain them). Call only when a
 * flower facet is applied; the base collection view stays on `loadCatalogue`.
 */
export function loadFlowerVarietyCatalogue<
  T extends {
    title?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: readonly string[] | null;
  },
>(
  storefront: StorefrontLike,
  request: Request,
  context: FilterContext,
): Promise<CatalogueLoadResult<T>> {
  return loadTaggedProducts<T>(storefront, request, context, (filters) =>
    [buildProductQueryString(filters), FRESH_FLOWER_TYPE_QUERY]
      .filter(Boolean)
      .join(' AND '),
  );
}

/**
 * Everything tagged for an occasion (fresh stems AND arrangements), minus
 * supplies. Sourced from the occasion TAG, not a curated collection, so the page
 * fills from the catalogue even when the Shopify occasion collection is empty or
 * mis-membered. Any exposed facet (colour, price) narrows it further.
 */
export function loadOccasionCatalogue<
  T extends {
    title?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: readonly string[] | null;
  },
>(
  storefront: StorefrontLike,
  occasionSlug: string,
  request: Request,
  context: FilterContext,
): Promise<CatalogueLoadResult<T>> {
  return loadTaggedProducts<T>(storefront, request, context, (filters) =>
    [`tag:'occasion:${occasionSlug}'`, buildProductQueryString(filters)]
      .filter(Boolean)
      .join(' AND '),
  );
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
