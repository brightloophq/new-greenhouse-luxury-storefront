import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';
import {FLOWER_CATEGORIES} from '~/lib/flowerCategories';

/**
 * Shared product fragment for catalog/collection grids. Includes a 2nd image for
 * hover transitions, availability for sold-out state, compare-at for sale pricing,
 * and a truncated description for quick view.
 */
export const CATALOG_PRODUCT_FRAGMENT = `#graphql
  fragment CatalogMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment CatalogProductItem on Product {
    id
    handle
    title
    vendor
    productType
    tags
    availableForSale
    description(truncateAt: 200)
    featuredImage {
      id
      altText
      url
      width
      height
    }
    images(first: 2) {
      nodes {
        id
        altText
        url
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        ...CatalogMoney
      }
      maxVariantPrice {
        ...CatalogMoney
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...CatalogMoney
      }
    }
  }
` as const;

/**
 * Catalog facet + sort configuration for the collection/catalog experience (M4).
 * Facet vocabularies mirror the tag taxonomy from the Catalog Production Sprint
 * (see catalog/tag-taxonomy.md). Categorical facets are single-select: each maps to
 * exactly one Storefront `ProductFilter` tag, so multiple active facets combine with
 * a correct logical AND (Shopify AND-s the `filters` array).
 */

export type FacetKey = 'flower' | 'color' | 'occasion' | 'channel';

export interface FacetOption {
  value: string; // tag suffix, e.g. "rose"
  label: string; // human label, e.g. "Roses"
}

export interface FacetDef {
  key: FacetKey;
  label: string;
  tagPrefix: string; // e.g. "flower" → tag "flower:rose"
  options: FacetOption[];
}

export const FACETS: FacetDef[] = [
  {
    key: 'channel',
    label: 'Buying Option',
    tagPrefix: 'channel',
    options: [
      {value: 'retail', label: 'Retail'},
      {value: 'wholesale', label: 'Wholesale'},
    ],
  },
  {
    key: 'flower',
    label: 'Flower Type',
    tagPrefix: 'flower',
    // Sourced from the single approved flower list (app/lib/flowerCategories.ts).
    // Each value is the tag suffix filtered as `flower:<handle>`.
    options: FLOWER_CATEGORIES.map((c) => ({value: c.handle, label: c.name})),
  },
  {
    key: 'color',
    label: 'Color',
    tagPrefix: 'color',
    options: [
      {value: 'white-ivory', label: 'White & Ivory'},
      {value: 'red', label: 'Red'},
      {value: 'pink', label: 'Pink'},
      {value: 'yellow-orange', label: 'Yellow & Orange'},
      {value: 'purple', label: 'Purple'},
      {value: 'green', label: 'Green'},
      {value: 'mixed', label: 'Mixed'},
    ],
  },
  {
    key: 'occasion',
    label: 'Occasion',
    tagPrefix: 'occasion',
    options: [
      {value: 'birthday', label: 'Birthday'},
      {value: 'anniversary', label: 'Anniversary'},
      {value: 'romance', label: 'Love & Romance'},
      {value: 'sympathy', label: 'Sympathy'},
      {value: 'congratulations', label: 'Congratulations'},
      {value: 'new-baby', label: 'New Baby'},
      {value: 'get-well', label: 'Get Well'},
      {value: 'corporate', label: 'Corporate'},
      {value: 'wedding', label: 'Wedding'},
      {value: 'everyday', label: 'Everyday'},
    ],
  },
];

export interface SortOption {
  value: string;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  {value: 'featured', label: 'Featured'},
  {value: 'newest', label: 'Newest'},
  {value: 'price-asc', label: 'Price: Low to High'},
  {value: 'price-desc', label: 'Price: High to Low'},
  {value: 'title', label: 'Alphabetical'},
];

export const DEFAULT_SORT = 'featured';

export interface AppliedFilters {
  flower?: string;
  color?: string;
  occasion?: string;
  channel?: string;
  available: boolean;
  minPrice?: number;
  maxPrice?: number;
}

/** Read applied catalog state from URL search params. */
export function parseCatalogSearchParams(searchParams: URLSearchParams): {
  filters: AppliedFilters;
  sort: string;
} {
  const validFor = (key: FacetKey, v: string | null) =>
    v && FACETS.find((f) => f.key === key)?.options.some((o) => o.value === v) ? v : undefined;

  const minP = Number(searchParams.get('minp'));
  const maxP = Number(searchParams.get('maxp'));
  const sort = searchParams.get('sort') || DEFAULT_SORT;

  return {
    filters: {
      flower: validFor('flower', searchParams.get('flower')),
      color: validFor('color', searchParams.get('color')),
      occasion: validFor('occasion', searchParams.get('occasion')),
      channel: validFor('channel', searchParams.get('channel')),
      available: searchParams.get('avail') === '1',
      minPrice: Number.isFinite(minP) && minP > 0 ? minP : undefined,
      maxPrice: Number.isFinite(maxP) && maxP > 0 ? maxP : undefined,
    },
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? sort : DEFAULT_SORT,
  };
}

/** Build Storefront `ProductFilter[]` from applied filters. */
export function buildProductFilters(f: AppliedFilters): ProductFilter[] {
  const filters: ProductFilter[] = [];
  if (f.channel) filters.push({tag: `channel:${f.channel}`});
  if (f.flower) filters.push({tag: `flower:${f.flower}`});
  if (f.color) filters.push({tag: `color:${f.color}`});
  if (f.occasion) filters.push({tag: `occasion:${f.occasion}`});
  if (f.available) filters.push({available: true});
  if (f.minPrice != null || f.maxPrice != null) {
    filters.push({price: {min: f.minPrice ?? 0, max: f.maxPrice ?? undefined}});
  }
  return filters;
}

/**
 * Build a Storefront product search `query:` string from applied filters, for the
 * top-level `products` connection (which takes `query`, not `filters`).
 */
export function buildProductQueryString(f: AppliedFilters): string {
  const parts: string[] = [];
  if (f.channel) parts.push(`tag:'channel:${f.channel}'`);
  if (f.flower) parts.push(`tag:'flower:${f.flower}'`);
  if (f.color) parts.push(`tag:'color:${f.color}'`);
  if (f.occasion) parts.push(`tag:'occasion:${f.occasion}'`);
  if (f.available) parts.push('available_for_sale:true');
  if (f.minPrice != null) parts.push(`variants.price:>=${f.minPrice}`);
  if (f.maxPrice != null) parts.push(`variants.price:<=${f.maxPrice}`);
  return parts.join(' AND ');
}

/** Map a sort value to Storefront sort variables for a *collection*'s products. */
export function toCollectionSort(sort: string): {sortKey: string; reverse: boolean} {
  switch (sort) {
    case 'newest':
      return {sortKey: 'CREATED', reverse: true};
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'title':
      return {sortKey: 'TITLE', reverse: false};
    default:
      return {sortKey: 'COLLECTION_DEFAULT', reverse: false};
  }
}

/** Map a sort value to Storefront sort variables for the *all products* query. */
export function toCatalogSort(sort: string): {sortKey: string; reverse: boolean} {
  switch (sort) {
    case 'newest':
      return {sortKey: 'CREATED_AT', reverse: true};
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'title':
      return {sortKey: 'TITLE', reverse: false};
    default:
      return {sortKey: 'RELEVANCE', reverse: false};
  }
}

export function countActiveFilters(f: AppliedFilters): number {
  let n = 0;
  if (f.channel) n++;
  if (f.flower) n++;
  if (f.color) n++;
  if (f.occasion) n++;
  if (f.available) n++;
  if (f.minPrice != null || f.maxPrice != null) n++;
  return n;
}

export interface ActiveChip {
  key: string; // search-param key to remove
  label: string; // display label
}

/** Produce removable chips describing the active filters. */
export function activeChips(f: AppliedFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const labelFor = (key: FacetKey, v: string) =>
    FACETS.find((fa) => fa.key === key)?.options.find((o) => o.value === v)?.label ?? v;
  if (f.channel) chips.push({key: 'channel', label: labelFor('channel', f.channel)});
  if (f.flower) chips.push({key: 'flower', label: labelFor('flower', f.flower)});
  if (f.color) chips.push({key: 'color', label: labelFor('color', f.color)});
  if (f.occasion) chips.push({key: 'occasion', label: labelFor('occasion', f.occasion)});
  if (f.available) chips.push({key: 'avail', label: 'In stock'});
  if (f.minPrice != null || f.maxPrice != null) {
    const lo = f.minPrice != null ? `$${f.minPrice}` : '$0';
    const hi = f.maxPrice != null ? `$${f.maxPrice}` : 'Max';
    chips.push({key: 'price', label: `${lo}–${hi}`});
  }
  return chips;
}
