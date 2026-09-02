import {describe, it, expect} from 'vitest';
import {
  RETIRED_COLLECTION_REDIRECTS,
  retiredCollectionTarget,
} from '~/lib/collectionRedirects';

// Phase-1 Batch C — retired duplicate collection → canonical 301 map.
// write_url_redirects is NOT granted, so these redirects live in storefront code.

const CANONICALS = [
  '/collections/birthday',
  '/collections/anniversary',
  '/collections/love-and-romance',
  '/collections/corporate-gifting',
  '/collections/sympathy-and-funeral',
];

describe('retired collection redirects', () => {
  it('maps exactly the six retired handles', () => {
    expect(Object.keys(RETIRED_COLLECTION_REDIRECTS).sort()).toEqual(
      [
        'anniversary-flowers',
        'birthday-flowers',
        'corporate-flowers',
        'corporate-gifts',
        'love-romance',
        'sympathy',
      ].sort(),
    );
  });

  it('sends each retired handle to its canonical collection path', () => {
    expect(retiredCollectionTarget('birthday-flowers')).toBe('/collections/birthday');
    expect(retiredCollectionTarget('anniversary-flowers')).toBe('/collections/anniversary');
    expect(retiredCollectionTarget('love-romance')).toBe('/collections/love-and-romance');
    expect(retiredCollectionTarget('corporate-gifts')).toBe('/collections/corporate-gifting');
    expect(retiredCollectionTarget('corporate-flowers')).toBe('/collections/corporate-gifting');
    expect(retiredCollectionTarget('sympathy')).toBe('/collections/sympathy-and-funeral');
  });

  it('is case-insensitive on the handle', () => {
    expect(retiredCollectionTarget('Birthday-Flowers')).toBe('/collections/birthday');
    expect(retiredCollectionTarget('SYMPATHY')).toBe('/collections/sympathy-and-funeral');
  });

  it('returns null for a canonical or unknown handle (no redirect loop)', () => {
    expect(retiredCollectionTarget('birthday')).toBeNull();
    expect(retiredCollectionTarget('love-and-romance')).toBeNull();
    expect(retiredCollectionTarget('corporate-gifting')).toBeNull();
    expect(retiredCollectionTarget('sympathy-and-funeral')).toBeNull();
    expect(retiredCollectionTarget('roses')).toBeNull();
    expect(retiredCollectionTarget('')).toBeNull();
  });

  it('never targets a retired handle (no chained/loop redirects)', () => {
    const retired = new Set(Object.keys(RETIRED_COLLECTION_REDIRECTS));
    for (const dest of Object.values(RETIRED_COLLECTION_REDIRECTS)) {
      const destHandle = dest.replace('/collections/', '');
      expect(retired.has(destHandle)).toBe(false);
    }
  });

  it('targets only real canonical collection paths', () => {
    for (const dest of Object.values(RETIRED_COLLECTION_REDIRECTS)) {
      expect(CANONICALS).toContain(dest);
    }
  });
});
