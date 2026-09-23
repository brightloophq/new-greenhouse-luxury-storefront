import {describe, it, expect} from 'vitest';
import {
  classifyProduct,
  productInExperience,
  isSupplyProduct,
  collectionInExperience,
  collectionBlockedIn,
  selectCollectionGridProducts,
} from './experienceClassify';

describe('classifyProduct', () => {
  it('classifies wholesale flowers + supplies as classic', () => {
    expect(classifyProduct({productType: 'Fresh Flowers'})).toBe('classic');
    expect(classifyProduct({productType: 'Fresh Cut Flowers'})).toBe('classic');
    expect(classifyProduct({productType: 'Greenery'})).toBe('classic');
    expect(classifyProduct({productType: 'Floral Supply'})).toBe('classic');
  });

  it('classifies luxury arrangements + gifts as deluxe', () => {
    expect(classifyProduct({productType: 'Floral Arrangement'})).toBe('deluxe');
    expect(classifyProduct({productType: 'Sympathy Arrangement'})).toBe('deluxe');
    expect(classifyProduct({productType: 'Wedding Flowers'})).toBe('deluxe');
    expect(classifyProduct({productType: 'Gift Add-on'})).toBe('deluxe');
    expect(classifyProduct({productType: 'Gift Basket'})).toBe('deluxe');
  });

  it('marks Plant as ambiguous (hidden from both primary storefronts)', () => {
    expect(classifyProduct({productType: 'Plant'})).toBe('ambiguous');
  });

  it('treats an unknown product type as unknown (fail-closed)', () => {
    expect(classifyProduct({productType: 'Mystery Box'})).toBe('unknown');
  });

  it('lets an explicit single experience tag override productType', () => {
    expect(
      classifyProduct({productType: 'Fresh Flowers', tags: ['experience:deluxe']}),
    ).toBe('deluxe');
    expect(
      classifyProduct({productType: 'Floral Arrangement', tags: ['experience:classic']}),
    ).toBe('classic');
  });

  it('falls back to productType when both channel tags are present (no leak)', () => {
    // The real catalog has 40 products carrying BOTH channel tags — the bug that
    // a channel-tag filter would leak. productType keeps them classified.
    expect(
      classifyProduct({
        productType: 'Floral Supply',
        tags: ['channel:wholesale', 'channel:retail'],
      }),
    ).toBe('classic');
    expect(
      classifyProduct({
        productType: 'Sympathy Arrangement',
        tags: ['channel:wholesale', 'channel:retail'],
      }),
    ).toBe('deluxe');
  });
});

describe('experience isolation (products)', () => {
  it('Classic excludes Deluxe products', () => {
    expect(productInExperience({productType: 'Floral Arrangement'}, 'classic')).toBe(false);
    expect(productInExperience({productType: 'Gift Basket'}, 'classic')).toBe(false);
  });

  it('Deluxe excludes Classic products (flowers AND supplies)', () => {
    expect(productInExperience({productType: 'Fresh Flowers'}, 'deluxe')).toBe(false);
    expect(productInExperience({productType: 'Floral Supply'}, 'deluxe')).toBe(false);
  });

  it('keeps each experience its own products', () => {
    expect(productInExperience({productType: 'Fresh Flowers'}, 'classic')).toBe(true);
    expect(productInExperience({productType: 'Floral Arrangement'}, 'deluxe')).toBe(true);
  });

  it('ambiguous + unknown are excluded from BOTH', () => {
    for (const exp of ['classic', 'deluxe'] as const) {
      expect(productInExperience({productType: 'Plant'}, exp)).toBe(false);
      expect(productInExperience({productType: 'Mystery Box'}, exp)).toBe(false);
    }
  });

  it('isSupplyProduct separates supplies from wholesale flowers', () => {
    expect(isSupplyProduct({productType: 'Floral Supply'})).toBe(true);
    expect(isSupplyProduct({productType: 'Fresh Flowers'})).toBe(false);
  });
});

describe('experience isolation (collections)', () => {
  it('Deluxe /collections contains only Deluxe collections', () => {
    expect(collectionInExperience('anniversary', 'deluxe')).toBe(true);
    expect(collectionInExperience('luxury-bouquets', 'deluxe')).toBe(true);
    expect(collectionInExperience('bulk-flowers', 'deluxe')).toBe(false);
    expect(collectionInExperience('floral-supplies', 'deluxe')).toBe(false);
  });

  it('Classic collections exclude Deluxe collections', () => {
    expect(collectionInExperience('bulk-flowers', 'classic')).toBe(true);
    expect(collectionInExperience('floral-supplies', 'classic')).toBe(true);
    expect(collectionInExperience('anniversary', 'classic')).toBe(false);
  });

  it('blocks opposite-experience collections from search dropdowns', () => {
    expect(collectionBlockedIn('bulk-flowers', 'deluxe')).toBe(true);
    expect(collectionBlockedIn('floral-supplies', 'deluxe')).toBe(true);
    expect(collectionBlockedIn('anniversary', 'classic')).toBe(true);
    // shared roses/orchids handles are not blocked in classic
    expect(collectionBlockedIn('anniversary', 'deluxe')).toBe(false);
  });
});

describe('selectCollectionGridProducts (production 0-product fix)', () => {
  // Representative live memberships (Admin capture 2026-09):
  //  - birthday/anniversary/love-and-romance: 100% Floral Arrangement (Deluxe)
  //  - sympathy-and-funeral / corporate-gifting: mixed curated
  const deluxeArrangement = {productType: 'Floral Arrangement'};   // deluxe
  const giftBasket = {productType: 'Gift Basket'};                 // deluxe
  const classicGreenery = {productType: 'Greenery'};               // classic
  const classicFiller = {productType: 'Floral Filler'};            // classic
  const plant = {productType: 'Plant'};                            // ambiguous

  // The route always renders /collections/* under the 'classic' visual theme.
  const THEME = 'classic' as const;

  it('1. curated Deluxe collection (guard OFF) keeps Deluxe products on a classic-themed route', () => {
    const nodes = [deluxeArrangement, deluxeArrangement, deluxeArrangement];
    // isHub = false for birthday/anniversary/love-and-romance
    const out = selectCollectionGridProducts(nodes, THEME, false);
    expect(out).toHaveLength(3);
    expect(out).toEqual(nodes); // nothing dropped, order preserved
  });

  it('2. mixed curated collection (guard OFF) keeps Deluxe + Classic + Plant members', () => {
    const nodes = [deluxeArrangement, classicGreenery, plant, giftBasket, classicFiller];
    const out = selectCollectionGridProducts(nodes, THEME, false);
    expect(out).toEqual(nodes); // all five retained, same order
    // explicit: each experience class survives
    expect(out).toContain(deluxeArrangement);
    expect(out).toContain(classicGreenery);
    expect(out).toContain(plant);
  });

  it('3. genuine shared/hub collection (guard ON) still blocks cross-experience leakage', () => {
    const nodes = [deluxeArrangement, classicGreenery, plant, classicFiller];
    // On a classic-themed hub, only classic-classified products survive; Deluxe
    // and ambiguous (Plant) are filtered out — leakage guard intact.
    const classicHub = selectCollectionGridProducts(nodes, 'classic', true);
    expect(classicHub).toEqual([classicGreenery, classicFiller]);
    // And under a deluxe context a hub keeps only Deluxe items.
    const deluxeHub = selectCollectionGridProducts(nodes, 'deluxe', true);
    expect(deluxeHub).toEqual([deluxeArrangement]);
  });

  it('4. a flower hub (guard ON) drops Floral Supply — vases never sit among flowers', () => {
    const vase = {productType: 'Floral Supply'}; // Classic-typed, but a supply
    const nodes = [classicGreenery, vase, classicFiller];
    const out = selectCollectionGridProducts(nodes, 'classic', true);
    expect(out).toEqual([classicGreenery, classicFiller]); // supply removed
    // guard OFF (a curated supplies collection) still keeps the supply
    expect(selectCollectionGridProducts([vase], 'classic', false)).toEqual([vase]);
  });

  it('5. guard OFF is a pure pass-through (no reorder, no drop, no dedupe) — pagination unaffected', () => {
    const nodes = [classicFiller, deluxeArrangement, plant];
    const out = selectCollectionGridProducts(nodes, THEME, false);
    expect(out).toBe(nodes); // same array reference — no copy, no reorder, no filter
    expect(out).toHaveLength(nodes.length);
  });
});
