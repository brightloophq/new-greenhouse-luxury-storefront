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
 * SELF-ACTIVATING LIST
 * All eight approved varieties are configured here, but only those whose
 * collection currently holds stock are rendered. Four are live today (roses,
 * orchids, lilies, greenery-and-fillers); the other four light up the moment
 * `npm run shopify:varieties -- --apply` creates and fills their collections.
 * No code change is needed when that happens.
 *
 * Baby's Breath is deliberately absent: one product across the whole store is
 * not a variety worth a homepage plate.
 */

export interface FlowerVariety {
  /** Verified Shopify collection handle. */
  handle: string;
  label: string;
  /** Base path for the `-400/-600/-800.webp` responsive set under /public. */
  img: string;
  /**
   * Wholesale tag whose products seed this collection. Used ONLY by the Admin
   * setup script — the storefront never reads it.
   */
  sourceTag?: string;
}

/** The editorial spans the grid composes with (see `spansFor`). */
export type VarietySpan = 'tall' | 'wide' | 'regular' | 'half';

/** Order drives the editorial rhythm; `spansFor` composes the grid. */
export const FLOWER_VARIETIES: FlowerVariety[] = [
  {
    handle: 'roses',
    label: 'Roses',
    img: '/images/flowers/roses-in-stock/all',
  },
  {
    handle: 'orchids',
    label: 'Orchids',
    img: '/images/flowers/orchids/all',
  },
  {
    handle: 'lilies',
    label: 'Lilies',
    img: '/images/flowers/lilies/all',
  },
  {
    handle: 'hydrangea',
    label: 'Hydrangea',
    img: '/images/flowers/hydrangea/all',
    sourceTag: 'hydrangea',
  },
  {
    handle: 'tulips',
    label: 'Tulips',
    img: '/images/flowers/tulips/all',
    sourceTag: 'tulips',
  },
  {
    handle: 'tropical-flowers',
    label: 'Tropical Flowers',
    img: '/images/flowers/tropicals/all',
    sourceTag: 'tropicals',
  },
  {
    handle: 'carnations',
    label: 'Carnations',
    img: '/images/flowers/carnations/all',
    sourceTag: 'carnations',
  },
  {
    handle: 'greenery-and-fillers',
    label: 'Greenery & Fillers',
    img: '/images/flowers/greenery/all',
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
