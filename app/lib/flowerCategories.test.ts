import {describe, it, expect} from 'vitest';
import {
  FLOWER_CATEGORIES,
  FLOWER_VARIETIES,
  flowerCategoryPath,
} from '~/lib/flowerCategories';
import {FACETS} from '~/lib/catalog';

/** The exact approved set — the single source of truth for the whole storefront. */
const APPROVED = [
  'Alstroemeria',
  'Asters',
  "Baby's Breath",
  'Calla Lilies',
  'Carnations',
  'Chrysanthemums',
  'Delphinium',
  'Eucalyptus',
  'Fillers',
  'Gerbera Daisies',
  'Gift Bouquets',
  'Greenery',
  'Hydrangea',
  'Hypericum',
  'Lilies',
  'Lisianthus',
  'Novelties',
  'Orchids',
  'Ranunculus',
  'Roses - In Stock',
  'Snapdragon',
  'Spray Roses',
  'Stock',
  'Tropicals',
  'Tulips',
];

/** Flower varieties that were removed and must never reappear. */
const OBSOLETE = [
  'Anemone',
  'Dahlias',
  'Dried Floral Bunches',
  'Fall Favorites',
  'Freesia',
  'Garden Roses',
  'Garlands and Wreaths',
  'Gladiolus',
  'Holiday Greens',
  'Iris',
  'Kale',
  'Larkspur',
  'Peonies',
  'Scabiosa',
  'Spring Flowers',
  'Succulents',
  'Summer Flowers',
  'Sweetheart Roses',
  'Winter Collection',
  // Old catalog-filter values that were replaced.
  'Anthurium',
  'Heliconia',
  'Bird of Paradise',
];

describe('approved flower categories', () => {
  it('contains exactly 25 entries', () => {
    expect(FLOWER_CATEGORIES).toHaveLength(25);
  });

  it('matches the approved names exactly', () => {
    expect(FLOWER_CATEGORIES.map((c) => c.name)).toEqual(APPROVED);
  });

  it('has unique, kebab-case handles', () => {
    const handles = FLOWER_CATEGORIES.map((c) => c.handle);
    expect(new Set(handles).size).toBe(handles.length);
    for (const h of handles) {
      expect(h).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('contains no removed/obsolete varieties', () => {
    const names = new Set(FLOWER_CATEGORIES.map((c) => c.name));
    for (const gone of OBSOLETE) {
      expect(names.has(gone)).toBe(false);
    }
  });

  it('exposes 24 varieties for the mega-menu (Gift Bouquets is featured separately)', () => {
    expect(FLOWER_VARIETIES).toHaveLength(24);
    expect(FLOWER_VARIETIES.some((c) => c.handle === 'gift-bouquets')).toBe(false);
  });

  it('builds non-404 filter paths (never a bare per-flower collection)', () => {
    expect(flowerCategoryPath('roses-in-stock')).toBe(
      '/collections/all-flowers?flower=roses-in-stock',
    );
  });
});

describe('catalog flower filter', () => {
  const flowerFacet = FACETS.find((f) => f.key === 'flower');

  it('is sourced from the approved list (exactly 25 options)', () => {
    expect(flowerFacet).toBeDefined();
    expect(flowerFacet!.options).toHaveLength(25);
    expect(flowerFacet!.options.map((o) => o.value)).toEqual(
      FLOWER_CATEGORIES.map((c) => c.handle),
    );
  });

  it('no longer offers removed flower filter values', () => {
    const values = new Set(flowerFacet!.options.map((o) => o.value));
    for (const gone of ['anthurium', 'heliconia', 'bird-of-paradise']) {
      expect(values.has(gone)).toBe(false);
    }
  });
});
