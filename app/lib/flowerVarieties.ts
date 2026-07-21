/**
 * "Shop by Flower Variety" — homepage discovery.
 *
 * DATA RULE: every entry here is a Shopify collection that was verified to
 * exist, be publicly readable through the Storefront API, and contain products.
 * No handle is invented and no card ever falls back to an unrelated collection.
 * The loader re-checks availability on every request and drops anything empty,
 * so a collection emptied in admin removes its card instead of rendering a
 * dead tile (see `loadFlowerVarieties`).
 *
 * WHY THIS LIST IS FOUR, NOT EIGHT
 * The brief suggested Roses, Lilies, Orchids, Hydrangea, Carnations, Tulips,
 * Tropical Flowers and Baby's Breath. An audit of the live store found only the
 * first three exist as retail-facing collections. The remainder are either
 * absent, or exist only as WHOLESALE stock behind authentication:
 *
 *   hydrangea / tulips / tropicals / carnations  → only in `bulk-flowers`
 *                                                   (auth-gated, plural tags)
 *   tropical-flowers                             → collection exists, 0 products
 *   babys-breath                                 → 1 product, no collection
 *
 * Pointing a public homepage card at auth-gated wholesale stock would send a
 * guest into a sign-in wall, so those are excluded until the merchant creates
 * retail collections for them (see docs/MERCHANT-ACTIONS.md).
 */

export interface FlowerVariety {
  /** Verified Shopify collection handle. */
  handle: string;
  label: string;
  /** Base path for the `-400/-600/-800.webp` responsive set under /public. */
  img: string;
  /** Editorial weight in the asymmetric grid. */
  span: 'tall' | 'wide' | 'regular';
}

export const FLOWER_VARIETIES: FlowerVariety[] = [
  {
    handle: 'roses',
    label: 'Roses',
    img: '/images/flowers/roses-in-stock/all',
    span: 'tall',
  },
  {
    handle: 'orchids',
    label: 'Orchids',
    img: '/images/flowers/orchids/all',
    span: 'regular',
  },
  {
    handle: 'lilies',
    label: 'Lilies',
    img: '/images/flowers/lilies/all',
    span: 'regular',
  },
  {
    handle: 'greenery-and-fillers',
    label: 'Greenery & Fillers',
    img: '/images/flowers/greenery/all',
    span: 'wide',
  },
];

/** Destination for a variety card — a public, green collection route. */
export function varietyPath(variety: FlowerVariety): string {
  return `/collections/${variety.handle}`;
}

/**
 * One query per variety would be wasteful, so availability is resolved with a
 * single `collections` fetch and matched by handle.
 */
export const VARIETY_AVAILABILITY_QUERY = `#graphql
  query VarietyAvailability($first: Int!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: $first) {
      nodes {
        handle
        products(first: 1) {
          nodes {
            id
          }
        }
      }
    }
  }
` as const;

interface StorefrontLike {
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{
    collections?: {
      nodes?: {handle?: string; products?: {nodes?: unknown[]}}[];
    } | null;
  }>;
}

/**
 * Return only the varieties whose collection currently exists AND has at least
 * one product. A variety that fails either check is silently omitted from the
 * grid (never rendered broken) and logged once for the developer.
 *
 * If the availability query itself fails we return the full configured list
 * rather than an empty section — a transient Storefront error should degrade to
 * "cards may 404" rather than "the homepage lost a section".
 */
export async function loadFlowerVarieties(
  storefront: StorefrontLike,
): Promise<FlowerVariety[]> {
  try {
    const data = await storefront.query(VARIETY_AVAILABILITY_QUERY, {
      variables: {first: 250},
    });
    const stocked = new Set(
      (data.collections?.nodes ?? [])
        .filter((node) => (node.products?.nodes?.length ?? 0) > 0)
        .map((node) => node.handle),
    );

    const available = FLOWER_VARIETIES.filter((v) => stocked.has(v.handle));
    const dropped = FLOWER_VARIETIES.filter((v) => !stocked.has(v.handle));
    if (dropped.length) {
      console.warn(
        `[varieties] hidden (collection missing or empty): ${dropped
          .map((v) => v.handle)
          .join(', ')}`,
      );
    }
    return available;
  } catch (error) {
    console.error('[varieties] availability check failed', error);
    return FLOWER_VARIETIES;
  }
}
