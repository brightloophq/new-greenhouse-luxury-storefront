/**
 * SEO technical-foundation regression tests.
 *
 * Two layers:
 *  - Unit tests for the pure helpers in `seo.ts` (canonical/OG/schema shape).
 *  - Source-string guards that lock the per-route wiring in place (canonical
 *    present, catalogue routes go through the shared helper, index-safety
 *    directives preserved). These mirror the repo's storefrontRegression style.
 *
 * They also assert what must NOT appear: no fabricated opening hours, ratings,
 * reviews or price range in the structured data.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  absoluteUrl,
  canonicalTag,
  catalogueMeta,
  organizationSchema,
  websiteSchema,
} from './seo';

const ORIGIN = 'https://shop.example.test';
const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('absoluteUrl', () => {
  it('joins origin and path', () => {
    expect(absoluteUrl(ORIGIN, '/retail/flowers')).toBe(
      `${ORIGIN}/retail/flowers`,
    );
  });
  it('adds a leading slash when missing', () => {
    expect(absoluteUrl(ORIGIN, 'search')).toBe(`${ORIGIN}/search`);
  });
  it('falls back to a relative path when origin is unknown', () => {
    expect(absoluteUrl(undefined, '/cart')).toBe('/cart');
  });
});

describe('canonicalTag', () => {
  it('emits an absolute canonical link descriptor', () => {
    expect(canonicalTag(ORIGIN, '/supplies')).toEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `${ORIGIN}/supplies`,
    });
  });
});

describe('catalogueMeta', () => {
  const tags = catalogueMeta({
    origin: ORIGIN,
    path: '/retail/flowers',
    title: 'Retail Flowers | The New Greenhouse',
    description: 'Fresh retail flowers delivered across Kingston, Jamaica.',
  });

  const canonical = tags.find(
    (t) => 'rel' in t && (t as {rel?: string}).rel === 'canonical',
  ) as {href: string} | undefined;

  it('includes a title and description', () => {
    expect(tags.some((t) => 'title' in t)).toBe(true);
    expect(
      tags.some((t) => (t as {name?: string}).name === 'description'),
    ).toBe(true);
  });

  it('canonical is the absolute base path with NO query parameters', () => {
    expect(canonical?.href).toBe(`${ORIGIN}/retail/flowers`);
    expect(canonical?.href).not.toContain('?');
    // The facet params CatalogueView reads must never appear in the canonical.
    for (const p of ['sort', 'cursor', 'minp', 'maxp', 'flower', 'q']) {
      expect(canonical?.href).not.toContain(p + '=');
    }
  });

  it('provides Open Graph url + image', () => {
    expect(
      tags.some(
        (t) =>
          (t as {property?: string}).property === 'og:url' &&
          (t as {content?: string}).content === `${ORIGIN}/retail/flowers`,
      ),
    ).toBe(true);
    expect(
      tags.some((t) => (t as {property?: string}).property === 'og:image'),
    ).toBe(true);
  });

  it('degrades to a relative canonical when origin is missing', () => {
    const t = catalogueMeta({
      origin: undefined,
      path: '/supplies',
      title: 't',
      description: 'd',
    });
    const c = t.find(
      (x) => (x as {rel?: string}).rel === 'canonical',
    ) as {href: string};
    expect(c.href).toBe('/supplies');
  });
});

describe('organizationSchema', () => {
  const org = organizationSchema(ORIGIN) as Record<string, unknown>;

  it('is a Florist with a stable, origin-based @id', () => {
    expect(org['@type']).toBe('Florist');
    expect(org['@id']).toBe(`${ORIGIN}/#organization`);
  });

  it('uses only source-backed contact facts', () => {
    expect(org.name).toBe('The New Greenhouse');
    expect(org.email).toBe('info@thenewgreenhouseja.com');
    expect(org.telephone).toBe('+18768438964');
    expect((org.address as Record<string, unknown>).addressCountry).toBe('JM');
    expect(org.sameAs).toEqual([
      'https://www.instagram.com/newgreenhouse',
      'https://www.facebook.com/TheNewGreenhouse/',
    ]);
  });

  it('does NOT fabricate hours, ratings, reviews or price range', () => {
    expect(org).not.toHaveProperty('openingHours');
    expect(org).not.toHaveProperty('openingHoursSpecification');
    expect(org).not.toHaveProperty('aggregateRating');
    expect(org).not.toHaveProperty('review');
    expect(org).not.toHaveProperty('priceRange');
  });
});

describe('websiteSchema', () => {
  const site = websiteSchema(ORIGIN) as Record<string, unknown>;

  it('is a WebSite linked to the Organization node', () => {
    expect(site['@type']).toBe('WebSite');
    expect(site['@id']).toBe(`${ORIGIN}/#website`);
    expect((site.publisher as Record<string, unknown>)['@id']).toBe(
      `${ORIGIN}/#organization`,
    );
  });

  it('SearchAction targets the real /search?q= endpoint', () => {
    const action = site.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('SearchAction');
    const target = action.target as Record<string, unknown>;
    expect(target.urlTemplate).toBe(
      `${ORIGIN}/search?q={search_term_string}`,
    );
    expect(action['query-input']).toContain('search_term_string');
  });
});

describe('route wiring (source guards)', () => {
  it('homepage sets a canonical, a description and a Kingston/Jamaica title', () => {
    const src = stripComments(read('app/routes/($locale)._index.tsx'));
    expect(src).toContain("rel: 'canonical'");
    expect(src).toMatch(/name: 'description'/);
    expect(src).toContain('Florist in Kingston, Jamaica');
  });

  it('public catalogue routes go through the shared catalogueMeta helper', () => {
    const routes = [
      'retail.flowers.tsx',
      'retail.supplies.tsx',
      'supplies._index.tsx',
      'supplies.$category.tsx',
      'arrangements._index.tsx',
      'arrangements.mixed.tsx',
      'arrangements.occasion.$occasion.tsx',
      'arrangements.premium-deluxe.$category.tsx',
    ];
    for (const r of routes) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} should import catalogueMeta`).toContain(
        "from '~/lib/seo'",
      );
      expect(src, `${r} should call catalogueMeta`).toContain('catalogueMeta(');
    }
  });

  it('the PDP canonical is absolute and the Product node has a stable @id', () => {
    const src = stripComments(
      read('app/routes/($locale).products.$handle.tsx'),
    );
    expect(src).toContain("rel: 'canonical', href: url");
    expect(src).toContain("'@id': `${url}#product`");
  });

  it('root renders Organization + WebSite JSON-LD site-wide', () => {
    const src = stripComments(read('app/root.tsx'));
    expect(src).toContain('organizationSchema');
    expect(src).toContain('websiteSchema');
    expect(src).toContain('application/ld+json');
  });

  it('cart is noindex', () => {
    const src = stripComments(read('app/routes/($locale).cart.tsx'));
    expect(src).toMatch(/robots.*noindex/);
  });

  it('search stays noindex', () => {
    const src = stripComments(read('app/routes/($locale).search.tsx'));
    expect(src).toMatch(/robots.*noindex/);
  });

  it('design-system stays noindex', () => {
    const src = stripComments(read('app/routes/($locale).design-system.tsx'));
    expect(src).toMatch(/robots.*noindex/);
  });
});
