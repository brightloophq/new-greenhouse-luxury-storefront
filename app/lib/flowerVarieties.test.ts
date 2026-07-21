import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {describe, expect, it, vi} from 'vitest';
import {
  FLOWER_VARIETIES,
  loadFlowerVarieties,
  varietyPath,
  varietyNote,
  varietyFacetAlias,
  VARIETY_AVAILABILITY_QUERY,
} from './flowerVarieties';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * @param handles      collection availability, for handle-backed varieties
 * @param facetsInStock tags whose one-product probe should return a hit; omit to
 *                      default every facet variety to "in stock"
 */
function storefront(
  handles: {handle: string; empty?: boolean}[],
  facetsInStock?: string[],
) {
  const facetVarieties = FLOWER_VARIETIES.filter((v) => v.facet);
  const inStock = new Set(
    facetsInStock ?? facetVarieties.map((v) => v.facet!.tag),
  );
  const probes: Record<string, {nodes: {id: string}[]}> = {};
  for (const v of facetVarieties) {
    probes[`facet_${v.facet!.tag}`] = {
      nodes: inStock.has(v.facet!.tag) ? [{id: 'gid://p'}] : [],
    };
  }
  return {
    query: vi.fn().mockResolvedValue({
      collections: {
        nodes: handles.map((h) => ({
          handle: h.handle,
          products: {nodes: h.empty ? [] : [{id: 'gid://1'}]},
        })),
      },
      ...probes,
    }),
  };
}

// Handle-backed varieties only — facet varieties are resolved by their probes.
const ALL_STOCKED = FLOWER_VARIETIES.filter((v) => !v.facet).map((v) => ({
  handle: v.handle,
}));

describe('flower variety data', () => {
  it('routes every card to a public page, never to an auth-gated one', () => {
    for (const variety of FLOWER_VARIETIES) {
      const path = varietyPath(variety);
      if (variety.facet) {
        // Tag-backed: lands on a public FLOWER_HUB, pre-filtered by tag. The
        // hub (bulk-flowers) is publicly readable — it is NOT one of the
        // auth-gated `wholesale-*` collections.
        expect(path).toBe(
          `/collections/${variety.facet.collection}?flower=${variety.facet.tag}`,
        );
        expect(variety.facet.collection).not.toMatch(/^wholesale/);
      } else {
        expect(path).toBe(`/collections/${variety.handle}`);
        expect(variety.handle).not.toMatch(/wholesale/);
      }
    }
  });

  it('flags tag-backed varieties as bulk, so pricing is never a surprise', () => {
    // A shopper following a facet card lands on by-the-box pricing; the card
    // must say so up front. Handle-backed varieties carry no note.
    for (const variety of FLOWER_VARIETIES) {
      expect(varietyNote(variety)).toBe(variety.facet ? 'By the box' : null);
    }
  });

  it('gives every facet variety a matching probe alias in the query', () => {
    // The availability query resolves facet cards by a per-tag alias; a facet
    // whose alias is missing from the document would silently never light up.
    for (const variety of FLOWER_VARIETIES) {
      const alias = varietyFacetAlias(variety);
      if (variety.facet) {
        expect(alias).toBe(`facet_${variety.facet.tag}`);
        expect(VARIETY_AVAILABILITY_QUERY).toContain(`${alias}: products(`);
        // Probes ask "does anything exist", never fetch a catalogue for local
        // filtering.
        expect(VARIETY_AVAILABILITY_QUERY).toContain(
          `tag:'flower:${variety.facet.tag}' AND available_for_sale:true`,
        );
      } else {
        expect(alias).toBeNull();
      }
    }
  });

  it('ships imagery at the widths the flower library actually generates', () => {
    // The library is 200/300/400/800 — not the 400/600/800 set used elsewhere.
    const component = read('app/components/home/ShopByVariety.tsx');
    expect(component).toMatch(/\[300, 400, 800\]/);
    for (const variety of FLOWER_VARIETIES) {
      for (const width of [300, 400, 800]) {
        const file = join(ROOT, 'public', `${variety.img}-${width}.webp`);
        expect(existsSync(file), `${variety.img}-${width}.webp`).toBe(true);
      }
    }
  });

  it('every span pattern fills its rows exactly — no orphaned card', () => {
    // The bug this replaces: spans were fixed in the data for eight cards, so
    // with only four in stock the last card sat alone 482px short of the grid
    // edge. Layout is now chosen from the count, and every row must sum to 12.
    // AREA, not width: `tall` is 5 columns × 2 rows, so it contributes 10 and
    // pairs with the two 7-wide regulars beside it (10 + 7 + 7 = 24 = two full
    // rows). A pattern whose total area is not a multiple of 12 must leave a
    // hole somewhere.
    const AREA = {tall: 10, regular: 7, half: 6, wide: 12} as const;
    const source = read('app/components/home/ShopByVariety.tsx');
    const patterns = [
      ...source.matchAll(/^\s+(\d+): \[([^\]]+)\],$/gm),
    ].map(([, count, body]) => ({
      count: Number(count),
      spans: body.split(',').map((s) => s.trim().replace(/'/g, '')),
    }));

    expect(patterns.length).toBeGreaterThanOrEqual(8);

    for (const {count, spans} of patterns) {
      expect(spans, `pattern ${count} length`).toHaveLength(count);
      let area = 0;
      for (const span of spans) {
        const cells = AREA[span as keyof typeof AREA];
        expect(cells, `unknown span "${span}" in pattern ${count}`).toBeDefined();
        area += cells;
      }
      expect(area % 12, `pattern ${count} leaves a ragged row`).toBe(0);
    }
  });

  it('defines every span the patterns use', () => {
    const css = read('app/styles/home.css');
    for (const span of ['tall', 'regular', 'half', 'wide']) {
      expect(css, `.ng-variety-cell--${span}`).toContain(
        `.ng-variety-cell--${span}`,
      );
    }
  });

  it('resets EVERY cell at tablet, so no wide card strands its neighbour', () => {
    // The bug this guards: at 768px only tall/regular/half were reset to 6
    // columns while `wide` stayed at 12, so it wrapped to its own row and left
    // a 360px hole beside the card before it.
    // Scope the search to the VARIETY section. `indexOf` from the top of the
    // file is brittle: any earlier section that adds its own breakpoint (the
    // hero now does) would silently move these boundaries.
    const css = read('app/styles/home.css');
    const varietyBlock = css.slice(css.indexOf('Shop by Flower Variety'));
    const tablet = varietyBlock.slice(
      varietyBlock.indexOf('@media (max-width: 64em)'),
      varietyBlock.indexOf('@media (max-width: 45em)'),
    );
    // A bare `.ng-variety-cell {` rule — not a span-specific one.
    expect(tablet).toMatch(/\.ng-variety-cell \{[^}]*grid-column: span 6/);
    // And an odd trailing card must fill its row.
    expect(tablet).toMatch(/:last-child:nth-child\(odd\)[^}]*grid-column: span 12/);
  });

  it('keeps layout out of the data — spans are a presentation concern', () => {
    const data = read('app/lib/flowerVarieties.ts');
    expect(data).not.toMatch(/^\s+span:/m);
  });

  it('keeps the Admin script in step with the storefront config', () => {
    // Every variety that needs a collection built must be in the script, and
    // the script must not invent handles the storefront does not render.
    const script = read('scripts/shopify/varieties.mjs');
    for (const variety of FLOWER_VARIETIES.filter((v) => v.sourceTag)) {
      expect(script, variety.handle).toContain(`handle: '${variety.handle}'`);
      expect(script, variety.sourceTag).toContain(`tag: '${variety.sourceTag}'`);
    }
    const scriptHandles = [...script.matchAll(/handle: '([a-z-]+)',\n\s*title:/g)].map(
      (m) => m[1],
    );
    const configured = new Set(FLOWER_VARIETIES.map((v) => v.handle));
    for (const handle of scriptHandles) expect(configured.has(handle)).toBe(true);
  });

  it('never deletes: the script only creates, adds and tags', () => {
    const script = read('scripts/shopify/varieties.mjs');
    expect(script).not.toMatch(/collectionDelete|productDelete|tagsRemove/);
    expect(script).toMatch(/collectionAddProducts/);
    expect(script).toMatch(/tagsAdd/);
  });
});

describe('loadFlowerVarieties', () => {
  it('returns every variety whose collection has stock', async () => {
    const result = await loadFlowerVarieties(storefront(ALL_STOCKED));
    expect(result).toHaveLength(FLOWER_VARIETIES.length);
  });

  it('drops a variety whose collection is EMPTY rather than rendering it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadFlowerVarieties(
      storefront([{handle: 'roses', empty: true}, ...ALL_STOCKED.slice(1)]),
    );

    expect(result.map((v) => v.handle)).not.toContain('roses');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('drops a variety whose collection is MISSING entirely', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Only orchids stocked, and no facet probe returns a hit.
    const result = await loadFlowerVarieties(
      storefront([{handle: 'orchids'}], []),
    );

    expect(result.map((v) => v.handle)).toEqual(['orchids']);
    warn.mockRestore();
  });

  it('lights up a facet variety on its tag probe, not a collection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // No handle-backed collections, but the tulips tag probe returns a hit —
    // so tulips (and only tulips) should appear.
    const result = await loadFlowerVarieties(storefront([], ['tulips']));

    expect(result.map((v) => v.handle)).toEqual(['tulips']);
    warn.mockRestore();
  });

  it('drops a facet variety whose tag has sold out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Every handle collection stocked, but the carnations tag probe is empty.
    const result = await loadFlowerVarieties(storefront(ALL_STOCKED, ['tulips']));

    const handles = result.map((v) => v.handle);
    expect(handles).toContain('tulips');
    expect(handles).not.toContain('carnations');
    expect(handles).not.toContain('hydrangea');
    warn.mockRestore();
  });

  it('does not blank the section when the availability query fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await loadFlowerVarieties({
      query: vi.fn().mockRejectedValue(new Error('network')),
    });

    expect(result).toEqual(FLOWER_VARIETIES);
    error.mockRestore();
  });
});

describe('homepage composition', () => {
  const HOMEPAGE = read('app/routes/($locale)._index.tsx');
  const VARIETY = read('app/components/home/ShopByVariety.tsx');

  it('renders variety discovery AFTER the four shopping paths', () => {
    expect(HOMEPAGE).toMatch(
      /<BrandHero[\s\S]*<ExperienceChooser[\s\S]*<ShopByVariety/,
    );
  });

  it('renders nothing at all when no variety is available', () => {
    // An empty heading over an empty grid is worse than no section.
    expect(VARIETY).toMatch(/if \(!varieties\.length\) return null/);
  });

  it('carries no marketing copy — an eyebrow and a title, nothing else', () => {
    // The supporting sentence is gone: the gallery masthead is now a two-word
    // eyebrow over the heading, which says less than the line it replaced.
    const eyebrows = [...VARIETY.matchAll(/className="ng-variety-eyebrow">([^<]*)</g)];
    expect(eyebrows).toHaveLength(1);
    expect(eyebrows[0][1].trim().split(/\s+/).length).toBeLessThanOrEqual(3);
    // No paragraph of body copy anywhere in the section.
    expect(VARIETY).not.toMatch(/ng-variety-sub/);
  });

  it('places the label on the ground, not in a box over the photograph', () => {
    expect(VARIETY).toMatch(/ng-variety-card-foot/);
    const css = read('app/styles/home.css');
    // The foot sits after the media in the flow with a hairline rule.
    expect(css).toMatch(/\.ng-variety-card-foot[\s\S]*?border-top/);
  });
});

describe('motion system', () => {
  const REVEAL = read('app/lib/useReveal.ts');

  it('imports GSAP dynamically so it stays off the critical path', () => {
    expect(REVEAL).toMatch(/await Promise\.all\(\[\s*import\('gsap'\)/);
    expect(REVEAL).not.toMatch(/^import \{gsap\}/m);
  });

  it('short-circuits on reduced motion BEFORE loading the library', () => {
    const guardIndex = REVEAL.indexOf('prefersReducedMotion()');
    const importIndex = REVEAL.indexOf("import('gsap')");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(importIndex);
  });

  it('never leaves content hidden when a trigger does not fire', () => {
    // This caught a real bug: a plain `.from()` applies opacity:0 the instant
    // the tween is built, so a ScrollTrigger that never fires leaves the whole
    // section permanently invisible. fromTo + immediateRender:false defers the
    // hidden state until the reveal actually runs.
    expect(REVEAL).toMatch(/fromTo\(/);
    expect(REVEAL).toMatch(/immediateRender: false/);
    // A bare .from( on the timeline would reintroduce the bug.
    expect(REVEAL).not.toMatch(/timeline\.from\(/);
  });

  it('refreshes triggers once late images have settled the layout', () => {
    expect(REVEAL).toMatch(/ScrollTrigger\.refresh\(\)/);
  });

  it('reverts its gsap context on unmount so ScrollTriggers cannot accumulate', () => {
    expect(REVEAL).toMatch(/gsap\.context\(/);
    expect(REVEAL).toMatch(/ctx\?\.revert\(\)/);
  });

  it('reads all timing from the central motion tokens', () => {
    // No component may hardcode its own durations or easings.
    expect(REVEAL).toMatch(/DURATION\.section/);
    expect(REVEAL).toMatch(/EASE\.out/);
    expect(REVEAL).toMatch(/STAGGER\.cards/);
    expect(REVEAL).not.toMatch(/duration: [0-9]/);
    expect(REVEAL).not.toMatch(/ease: '/);
  });

  it('does not pull Three.js into the bundle', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies).not.toHaveProperty('three');
  });
});
