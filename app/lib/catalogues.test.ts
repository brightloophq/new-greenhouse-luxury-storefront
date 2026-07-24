import {describe, expect, it, vi} from 'vitest';
import {
  ARRANGEMENT_COLLECTIONS,
  OCCASIONS,
  PREMIUM_CATEGORIES,
  SUPPLY_CATEGORIES,
  TRADE_COLLECTIONS,
  findBySlug,
  loadCatalogue,
} from './catalogues';
import {FACETS} from './catalog';

const PRODUCT = {
  id: 'gid://1',
  handle: 'red-roses',
  title: 'Red Roses',
  productType: 'Fresh Flowers',
  vendor: 'The New Greenhouse',
};

function storefront(collection: unknown) {
  return {
    query: vi.fn().mockResolvedValue({collection}),
  };
}

function req(search = '') {
  return new Request(`https://example.com/retail/flowers${search}`);
}

describe('catalogue mapping', () => {
  it('maps premium categories to DEDICATED premium-* handles', () => {
    expect(PREMIUM_CATEGORIES.map((c) => c.handle)).toEqual([
      'premium-handcrafted',
      'premium-vase',
      'premium-heart-box',
    ]);
  });

  it('never reuses a premium handle for a green catalogue', () => {
    const premium = new Set<string>(PREMIUM_CATEGORIES.map((c) => c.handle));
    const green = [
      ...Object.values(TRADE_COLLECTIONS),
      ...Object.values(ARRANGEMENT_COLLECTIONS),
      ...OCCASIONS.map((o) => o.handle),
      ...SUPPLY_CATEGORIES.map((s) => s.handle),
    ];
    for (const handle of green) expect(premium.has(handle)).toBe(false);
  });

  it('keeps the occasion FACET vocabulary aligned with approved occasions', () => {
    // A facet value the approved list does not contain is unreachable; an
    // approved occasion the facet omits silently drops the shopper's filter.
    const facet = FACETS.find((f) => f.key === 'occasion');
    expect(facet?.options.map((o) => o.value).sort()).toEqual(
      OCCASIONS.map((o) => o.slug).sort(),
    );
  });

  it('resolves slugs and rejects unknown ones', () => {
    expect(findBySlug(OCCASIONS, 'romance')?.handle).toBe('love-and-romance');
    expect(findBySlug(OCCASIONS, 'wedding')).toBeUndefined();
  });
});

describe('loadCatalogue', () => {
  it('flags a MISSING collection instead of substituting products', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadCatalogue(
      storefront(null),
      'premium-vase',
      req(),
      'premium',
    );

    expect(result.missing).toBe(true);
    expect(result.failed).toBe(false);
    expect(result.products).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('distinguishes an EMPTY existing collection from a missing one', async () => {
    const result = await loadCatalogue(
      storefront({products: {nodes: []}}),
      'birthday',
      req(),
      'arrangements',
    );
    expect(result.missing).toBe(false);
    expect(result.failed).toBe(false);
  });

  it('reports a FAILED query without crashing the route', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await loadCatalogue(
      {query: vi.fn().mockRejectedValue(new Error('network'))},
      'all-flowers',
      req(),
      'retail-flowers',
    );

    expect(result.failed).toBe(true);
    expect(result.missing).toBe(false);
    expect(result.products).toEqual([]);
    error.mockRestore();
  });

  it('passes filters and sort to Shopify (server-side, not local)', async () => {
    const sf = storefront({products: {nodes: [PRODUCT]}});
    await loadCatalogue(sf, 'all-flowers', req('?color=red&sort=price-desc'), 'retail-flowers');

    const variables = sf.query.mock.calls[0][1].variables;
    expect(variables.filters).toContainEqual({tag: 'color:red'});
    expect(variables.sortKey).toBe('PRICE');
    expect(variables.reverse).toBe(true);
  });

  it('ignores a facet that the context does not expose', async () => {
    const sf = storefront({products: {nodes: [PRODUCT]}});
    // occasion is NOT a wholesale facet — it must not reach the query.
    await loadCatalogue(sf, 'bulk-flowers', req('?occasion=romance'), 'wholesale-flowers');

    const variables = sf.query.mock.calls[0][1].variables;
    expect(variables.filters).toEqual([]);
  });

  it('enforces facet tags locally when Shopify ignores the tag filter', async () => {
    // Shopify honours `tag` ProductFilters only when they are enabled as
    // storefront filters; until then it returns the unfiltered collection.
    const sf = storefront({
      products: {
        nodes: [
          {...PRODUCT, tags: ['occasion:thank-you']},
          {...PRODUCT, id: 'gid://2', title: 'Corporate Elegance', tags: ['occasion:corporate']},
        ],
      },
    });
    const result = await loadCatalogue(
      sf,
      'all-flowers',
      req('?occasion=thank-you'),
      'retail-flowers',
    );

    expect(result.products).toHaveLength(1);
    expect(result.products[0].title).toBe('Red Roses');
  });

  it('does not drop untagged products it cannot verify', async () => {
    const sf = storefront({products: {nodes: [{...PRODUCT, tags: []}]}});
    const result = await loadCatalogue(
      sf,
      'all-flowers',
      req('?color=red'),
      'retail-flowers',
    );
    expect(result.products).toHaveLength(1);
  });

  it('narrows the loaded page by keyword search', async () => {
    const sf = storefront({
      products: {nodes: [PRODUCT, {...PRODUCT, id: 'gid://2', title: 'White Lilies'}]},
    });
    const result = await loadCatalogue(sf, 'all-flowers', req('?q=roses'), 'retail-flowers');

    expect(result.products).toHaveLength(1);
    expect(result.products[0].title).toBe('Red Roses');
    expect(result.filters.q).toBe('roses');
  });
});
