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

  it('uses each editorial span so the grid stays asymmetric', () => {
    const spans = FLOWER_VARIETIES.map((v) => v.span);
    expect(spans).toContain('tall');
    expect(spans).toContain('wide');
    expect(spans).toContain('regular');
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
