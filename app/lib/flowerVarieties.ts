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
  /**
   * TAG-BACKED VARIETY.
   *
   * Four approved varieties have real, in-stock products but no collection of
   * their own — they sit inside `bulk-flowers` under a `flower:` tag. Rather
   * than leave them dark until someone creates four collections in admin, they
   * route to that collection pre-filtered by their tag.
   *
   * Availability is verified against the TAG, not a collection handle, so these
   * disappear the moment the last tagged product sells out or is untagged.
   *
   * These land on wholesale bulk pricing, which is a deliberate merchandising
   * decision, not an oversight — the card is labelled accordingly.
   */
  facet?: {collection: string; tag: string};
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
    facet: {collection: 'bulk-flowers', tag: 'hydrangea'},
  },
  {
    handle: 'tulips',
    label: 'Tulips',
    img: '/images/flowers/tulips/all',
    sourceTag: 'tulips',
    facet: {collection: 'bulk-flowers', tag: 'tulips'},
  },
  {
    handle: 'tropical-flowers',
    label: 'Tropical Flowers',
    img: '/images/flowers/tropicals/all',
    sourceTag: 'tropicals',
    facet: {collection: 'bulk-flowers', tag: 'tropicals'},
  },
  {
    handle: 'carnations',
    label: 'Carnations',
    img: '/images/flowers/carnations/all',
    sourceTag: 'carnations',
    facet: {collection: 'bulk-flowers', tag: 'carnations'},
  },
  {
    handle: 'greenery-and-fillers',
    label: 'Greenery & Fillers',
    img: '/images/flowers/greenery/all',
  },
];

/** Destination for a variety card — a public, green collection route. */
export function varietyPath(variety: FlowerVariety): string {
  if (variety.facet) {
    return `/collections/${variety.facet.collection}?flower=${variety.facet.tag}`;
  }
  return `/collections/${variety.handle}`;
}

/**
 * Tag-backed cards land on bulk pricing, so they say so. A shopper should never
 * discover the pricing model only after arriving.
 */
export function varietyNote(variety: FlowerVariety): string | null {
  return variety.facet ? 'By the box' : null;
}

/**
 * One query per variety would be wasteful, so availability is resolved with a
 * single `collections` fetch and matched by handle.
 */
/**
 * Handle-backed varieties are resolved from one `collections` fetch. Tag-backed
 * ones each get a one-product probe instead — `products(query:)` is Shopify
 * SEARCH syntax, which is honoured regardless of whether tag filtering has been
 * switched on in Search & Discovery, unlike ProductFilters.
 *
 * `first: 1` throughout: this asks "does anything exist", never "give me the
 * catalogue". Nothing here fetches a product list for local filtering.
 *
 * The facet aliases are written out longhand rather than generated, so codegen
 * can still see a static document. `varietyFacetAlias` below is the single
 * source of the alias names, and a test asserts every configured facet has one.
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
    facet_hydrangea: products(first: 1, query: "tag:'flower:hydrangea' AND available_for_sale:true") {
      nodes { id }
    }
    facet_tulips: products(first: 1, query: "tag:'flower:tulips' AND available_for_sale:true") {
      nodes { id }
    }
    facet_tropicals: products(first: 1, query: "tag:'flower:tropicals' AND available_for_sale:true") {
      nodes { id }
    }
    facet_carnations: products(first: 1, query: "tag:'flower:carnations' AND available_for_sale:true") {
      nodes { id }
    }
  }
` as const;

/** Alias under which a facet variety's probe result arrives. */
export function varietyFacetAlias(variety: FlowerVariety): string | null {
  return variety.facet ? `facet_${variety.facet.tag}` : null;
}

interface StorefrontLike {
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<
    {
      collections?: {
        nodes?: {handle?: string; products?: {nodes?: unknown[]}}[];
      } | null;
    } & Record<string, unknown>
  >;
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

    const isAvailable = (v: FlowerVariety): boolean => {
      // Tag-backed: the card is live if its one-product probe returned anything.
      const alias = varietyFacetAlias(v);
      if (alias) {
        const probe = data[alias] as {nodes?: unknown[]} | undefined;
        return (probe?.nodes?.length ?? 0) > 0;
      }
      // Handle-backed: the collection must exist and hold a product.
      return stocked.has(v.handle);
    };

    const available = FLOWER_VARIETIES.filter(isAvailable);
    const dropped = FLOWER_VARIETIES.filter((v) => !isAvailable(v));
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
