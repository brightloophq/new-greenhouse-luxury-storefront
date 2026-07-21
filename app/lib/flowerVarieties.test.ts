import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {describe, expect, it, vi} from 'vitest';
import {
  FLOWER_VARIETIES,
  loadFlowerVarieties,
  varietyPath,
} from './flowerVarieties';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

function storefront(handles: {handle: string; empty?: boolean}[]) {
  return {
    query: vi.fn().mockResolvedValue({
      collections: {
        nodes: handles.map((h) => ({
          handle: h.handle,
          products: {nodes: h.empty ? [] : [{id: 'gid://1'}]},
        })),
      },
    }),
  };
}

const ALL_STOCKED = FLOWER_VARIETIES.map((v) => ({handle: v.handle}));

describe('flower variety data', () => {
  it('routes every card to a public collection page, never to wholesale', () => {
    for (const variety of FLOWER_VARIETIES) {
      expect(varietyPath(variety)).toBe(`/collections/${variety.handle}`);
      // Wholesale stock is auth-gated — a homepage card must never land a guest
      // on a sign-in wall.
      expect(variety.handle).not.toMatch(/wholesale|bulk/);
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

  it('defines and collapses every span the patterns use', () => {
    const css = read('app/styles/home.css');
    const tablet = css.slice(css.indexOf('@media (max-width: 64em)'));
    const mobile = css.slice(css.indexOf('@media (max-width: 45em)'));
    for (const span of ['tall', 'regular', 'half', 'wide']) {
      expect(css, `.ng-variety-cell--${span}`).toContain(
        `.ng-variety-cell--${span}`,
      );
      if (span === 'wide') continue; // already full width
      expect(tablet, `tablet ${span}`).toContain(`.ng-variety-cell--${span}`);
      expect(mobile, `mobile ${span}`).toContain(`.ng-variety-cell--${span}`);
    }
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
    const result = await loadFlowerVarieties(storefront([{handle: 'orchids'}]));

    expect(result.map((v) => v.handle)).toEqual(['orchids']);
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

  it('keeps one supporting line, not marketing copy', () => {
    const paragraphs = [...VARIETY.matchAll(/<p className="ng-variety-sub">([^<]*)</g)];
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0][1].length).toBeLessThan(60);
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
