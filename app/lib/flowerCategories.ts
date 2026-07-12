/**
 * Approved flower varieties — the single source of truth for flower-variety
 * navigation, catalog filters, footer links, and home-page category sections.
 *
 * `handle` is the slug used both as the catalog filter value (`?flower=<handle>`
 * → Storefront tag `flower:<handle>`) and as the intended per-flower collection
 * handle should dedicated collections be created in Shopify later.
 *
 * Flower-variety links resolve to the filtered "all flowers" collection
 * (`/collections/all-flowers?flower=<handle>`) so they never 404 and degrade
 * gracefully to the catalog empty-state when a variety has no products yet.
 */
export interface FlowerCategory {
  name: string;
  handle: string;
}

export const FLOWER_CATEGORIES = [
  {name: 'Alstroemeria', handle: 'alstroemeria'},
  {name: 'Asters', handle: 'asters'},
  {name: "Baby's Breath", handle: 'babys-breath'},
  {name: 'Calla Lilies', handle: 'calla-lilies'},
  {name: 'Carnations', handle: 'carnations'},
  {name: 'Chrysanthemums', handle: 'chrysanthemums'},
  {name: 'Delphinium', handle: 'delphinium'},
  {name: 'Eucalyptus', handle: 'eucalyptus'},
  {name: 'Fillers', handle: 'fillers'},
  {name: 'Gerbera Daisies', handle: 'gerbera-daisies'},
  {name: 'Gift Bouquets', handle: 'gift-bouquets'},
  {name: 'Greenery', handle: 'greenery'},
  {name: 'Hydrangea', handle: 'hydrangea'},
  {name: 'Hypericum', handle: 'hypericum'},
  {name: 'Lilies', handle: 'lilies'},
  {name: 'Lisianthus', handle: 'lisianthus'},
  {name: 'Novelties', handle: 'novelties'},
  {name: 'Orchids', handle: 'orchids'},
  {name: 'Ranunculus', handle: 'ranunculus'},
  {name: 'Roses - In Stock', handle: 'roses-in-stock'},
  {name: 'Snapdragon', handle: 'snapdragon'},
  {name: 'Spray Roses', handle: 'spray-roses'},
  {name: 'Stock', handle: 'stock'},
  {name: 'Tropicals', handle: 'tropicals'},
  {name: 'Tulips', handle: 'tulips'},
] as const satisfies readonly FlowerCategory[];

/**
 * Flower varieties shown in the mega-menu "Flower Varieties" column. Gift
 * Bouquets is a member of the approved set but is surfaced under "Featured
 * Shopping" in navigation, so it is excluded from this variety-only list.
 */
export const FLOWER_VARIETIES: readonly FlowerCategory[] = FLOWER_CATEGORIES.filter(
  (c) => c.handle !== 'gift-bouquets',
);

/** Path to the filtered catalog for a given flower variety (never a 404). */
export function flowerCategoryPath(handle: string): string {
  return `/collections/all-flowers?flower=${handle}`;
}

/** Path to a flower family's image library page (`/flowers/<handle>`). */
export function flowerFamilyPath(handle: string): string {
  return `/flowers/${handle}`;
}
