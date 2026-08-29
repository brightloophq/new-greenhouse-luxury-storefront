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
  articleSchema,
  breadcrumbSchema,
  canonicalTag,
  catalogueMeta,
  organizationSchema,
  pageMeta,
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

describe('pageMeta', () => {
  const tags = pageMeta({
    origin: ORIGIN,
    path: '/retail',
    title: 'Shop Retail | The New Greenhouse',
    description: 'Retail flowers, arrangements and supplies in Kingston, Jamaica.',
  });
  it('emits an absolute self-canonical to the base path', () => {
    const c = tags.find(
      (t) => (t as {rel?: string}).rel === 'canonical',
    ) as {href: string};
    expect(c.href).toBe(`${ORIGIN}/retail`);
  });
  it('does NOT append a BreadcrumbList (that is catalogueMeta-only)', () => {
    expect(tags.some((t) => 'script:ld+json' in t)).toBe(false);
  });
});

describe('breadcrumbSchema', () => {
  const crumbs = [
    {name: 'Home', path: '/'},
    {name: 'Retail', path: '/retail'},
    {name: 'Flowers', path: '/retail/flowers'},
  ];
  const schema = breadcrumbSchema(ORIGIN, crumbs) as Record<string, unknown>;
  const items = schema.itemListElement as Array<Record<string, unknown>>;

  it('is a BreadcrumbList with sequential positions', () => {
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
  });
  it('uses absolute item URLs and the given names', () => {
    expect(items[0]).toMatchObject({name: 'Home', item: `${ORIGIN}/`});
    expect(items[2]).toMatchObject({
      name: 'Flowers',
      item: `${ORIGIN}/retail/flowers`,
    });
  });
});

describe('catalogueMeta with breadcrumbs', () => {
  it('appends exactly one BreadcrumbList JSON-LD when breadcrumbs are given', () => {
    const tags = catalogueMeta({
      origin: ORIGIN,
      path: '/retail/flowers',
      title: 't',
      description: 'd',
      breadcrumbs: [
        {name: 'Home', path: '/'},
        {name: 'Retail', path: '/retail'},
        {name: 'Flowers', path: '/retail/flowers'},
      ],
    });
    const ld = tags.filter((t) => 'script:ld+json' in t);
    expect(ld).toHaveLength(1);
    expect(
      ((ld[0] as Record<string, unknown>)['script:ld+json'] as Record<
        string,
        unknown
      >)['@type'],
    ).toBe('BreadcrumbList');
  });
  it('is unchanged (no JSON-LD) when breadcrumbs are omitted', () => {
    const tags = catalogueMeta({
      origin: ORIGIN,
      path: '/retail/flowers',
      title: 't',
      description: 'd',
    });
    expect(tags.some((t) => 'script:ld+json' in t)).toBe(false);
  });
});

describe('pageMeta ogType', () => {
  it('defaults og:type to website and can override to article', () => {
    const site = pageMeta({origin: ORIGIN, path: '/x', title: 't', description: 'd'});
    expect(
      site.find((t) => (t as {property?: string}).property === 'og:type'),
    ).toMatchObject({content: 'website'});
    const art = pageMeta({
      origin: ORIGIN,
      path: '/x',
      title: 't',
      description: 'd',
      ogType: 'article',
    });
    expect(
      art.find((t) => (t as {property?: string}).property === 'og:type'),
    ).toMatchObject({content: 'article'});
  });
});

describe('articleSchema', () => {
  const full = articleSchema({
    origin: ORIGIN,
    url: `${ORIGIN}/blogs/journal/spring-roses`,
    headline: 'Spring Roses',
    description: 'A guide to spring roses.',
    image: `${ORIGIN}/img.jpg`,
    datePublished: '2026-03-01T00:00:00Z',
    authorName: 'Jane Bloom',
  }) as Record<string, unknown>;

  it('is a BlogPosting with a stable @id and org publisher reference', () => {
    expect(full['@type']).toBe('BlogPosting');
    expect(full['@id']).toBe(`${ORIGIN}/blogs/journal/spring-roses#article`);
    expect((full.publisher as Record<string, unknown>)['@id']).toBe(
      `${ORIGIN}/#organization`,
    );
  });

  it('emits only the truthful fields it is given', () => {
    expect(full.headline).toBe('Spring Roses');
    expect(full.datePublished).toBe('2026-03-01T00:00:00Z');
    expect((full.author as Record<string, unknown>).name).toBe('Jane Bloom');
    expect(full.image).toEqual([`${ORIGIN}/img.jpg`]);
  });

  it('NEVER fabricates dateModified, and omits absent author/date/image', () => {
    expect(full).not.toHaveProperty('dateModified');
    const sparse = articleSchema({
      origin: ORIGIN,
      url: `${ORIGIN}/blogs/journal/x`,
      headline: 'X',
    }) as Record<string, unknown>;
    expect(sparse).not.toHaveProperty('author');
    expect(sparse).not.toHaveProperty('datePublished');
    expect(sparse).not.toHaveProperty('image');
    expect(sparse).not.toHaveProperty('dateModified');
    // publisher relationship is always present.
    expect((sparse.publisher as Record<string, unknown>)['@id']).toBe(
      `${ORIGIN}/#organization`,
    );
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

describe('Sprint 2 — commercial on-page wiring (source guards)', () => {
  it('catalogue routes emit BreadcrumbList trails', () => {
    const routes = [
      'retail.flowers.tsx',
      'retail.supplies.tsx',
      'supplies.$category.tsx',
      'arrangements._index.tsx',
      'arrangements.mixed.tsx',
      'arrangements.occasion.$occasion.tsx',
      'arrangements.premium-deluxe.$category.tsx',
    ];
    for (const r of routes) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} should pass breadcrumbs`).toContain('breadcrumbs:');
    }
  });

  it('the /retail and /wholesale landings now carry description + canonical', () => {
    for (const r of ['retail._index.tsx', 'wholesale._index.tsx']) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} should use catalogueMeta`).toContain('catalogueMeta(');
    }
  });

  it('the /flowers guide routes use absolute canonicals (origin-based)', () => {
    for (const r of [
      '($locale).flowers._index.tsx',
      '($locale).flowers.$family.tsx',
    ]) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} should canonicalTag on origin`).toContain(
        'canonicalTag(data?.origin',
      );
    }
  });

  it('the footer links the previously weakly-linked Delivery + Journal pages', () => {
    const src = stripComments(read('app/components/Footer.tsx'));
    expect(src).toContain("to: '/pages/delivery-information'");
    expect(src).toContain("to: '/blogs'");
  });
});

describe('Sprint 3 — local + editorial wiring (source guards)', () => {
  it('About and Contact carry an absolute canonical + BreadcrumbList', () => {
    for (const r of ['about.tsx', 'contact.tsx']) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} should use catalogueMeta`).toContain('catalogueMeta(');
      expect(src, `${r} should pass breadcrumbs`).toContain('breadcrumbs:');
      expect(src, `${r} should provide origin`).toContain(
        'new URL(request.url).origin',
      );
    }
  });

  it('Contact metadata references delivery relevance (source-backed)', () => {
    const src = stripComments(read('app/routes/contact.tsx'));
    expect(src).toMatch(/Kingston and St\. Andrew/);
  });

  it('the legacy /pages/delivery-information route 301-redirects to /contact', () => {
    const src = stripComments(
      read('app/routes/($locale).pages.delivery-information.tsx'),
    );
    expect(src).toContain("redirect('/contact', 301)");
  });

  it('blog index + blog handle carry canonical + breadcrumbs', () => {
    for (const r of [
      '($locale).blogs._index.tsx',
      '($locale).blogs.$blogHandle._index.tsx',
    ]) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} catalogueMeta`).toContain('catalogueMeta(');
      expect(src, `${r} breadcrumbs`).toContain('breadcrumbs:');
      expect(src, `${r} origin`).toContain('new URL(request.url).origin');
    }
  });

  it('articles emit BlogPosting + breadcrumb from live loader data', () => {
    const src = stripComments(
      read('app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx'),
    );
    expect(src).toContain('articleSchema(');
    expect(src).toContain('breadcrumbSchema(');
    // Truthful fields wired from the loader — no fabricated dateModified.
    expect(src).toContain('datePublished: article.publishedAt');
    expect(src).toContain('authorName: article.author?.name');
    expect(src).not.toContain('dateModified');
  });

  it('collections + flower guide carry BreadcrumbList', () => {
    for (const r of [
      '($locale).collections.$handle.tsx',
      '($locale).flowers._index.tsx',
      '($locale).flowers.$family.tsx',
    ]) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} breadcrumbSchema`).toContain('breadcrumbSchema(');
    }
  });

  it('indexation safety unchanged: search / cart / design-system stay noindex', () => {
    for (const r of [
      '($locale).search.tsx',
      '($locale).cart.tsx',
      '($locale).design-system.tsx',
    ]) {
      const src = stripComments(read(join('app/routes', r)));
      expect(src, `${r} noindex`).toMatch(/robots.*noindex/);
    }
  });
});
