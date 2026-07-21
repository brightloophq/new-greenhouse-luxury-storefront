/**
 * Design-system adherence.
 *
 * The storefront had a 128-token system that component CSS quietly bypassed:
 * home.css alone carried 132 raw hex values against 15 token references, which
 * is why the homepage read as a different design from the rest of the site.
 * These tests keep the palette in one place.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const STYLES = join(ROOT, 'app', 'styles');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Strip comments so documented hexes in prose don't count as usage. */
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const SHEETS = readdirSync(STYLES).filter((f) => f.endsWith('.css'));

/**
 * Files allowed to hold raw hex: the token definitions themselves, the Tailwind
 * theme that feeds them, and the reset.
 */
const PALETTE_SOURCES = new Set([
  'design-system.css',
  'tailwind.css',
  'reset.css',
]);

describe('brand palette lives in the token layer', () => {
  const tokens = strip(read('app/styles/design-system.css'));

  it('names every green the unified brand uses', () => {
    for (const token of [
      '--ng-green-deep',
      '--ng-green-pressed',
      '--ng-green',
      '--ng-green-muted',
      '--ng-green-soft',
      '--ng-green-faint',
      '--ng-ground-sage',
      '--ng-ground-warm',
      '--ng-ground-tint',
      '--ng-ground-panel',
      '--ng-on-green',
      '--ng-gold',
    ]) {
      expect(tokens, token).toContain(`${token}:`);
    }
  });

  it('names the premium register too, so it is not stray hex', () => {
    for (const token of [
      '--ng-premium-ground',
      '--ng-premium-surface',
      '--ng-premium-text',
    ]) {
      expect(tokens, token).toContain(`${token}:`);
    }
  });

  it('keeps --ng-on-green distinct from --ng-premium-text', () => {
    // Same value today, different meanings. Collapsing them would silently
    // repaint every filled green button if the premium register is retuned.
    expect(tokens).toMatch(/--ng-on-green:/);
    expect(tokens).toMatch(/--ng-premium-text:/);
  });
});

describe('component stylesheets inherit rather than redefine', () => {
  const brandHexes = [
    '#2f4a37',
    '#4d6a50',
    '#5a6b58',
    '#eef2e9',
    '#f6f4ee',
    '#c8a96a',
    '#14100c',
  ];

  it.each(SHEETS.filter((f) => !PALETTE_SOURCES.has(f)))(
    '%s uses no brand hex directly',
    (sheet) => {
      const css = strip(readFileSync(join(STYLES, sheet), 'utf8')).toLowerCase();
      const found = brandHexes.filter((hex) => css.includes(hex));
      expect(found, `${sheet} should reference tokens, not ${found.join(', ')}`).toEqual(
        [],
      );
    },
  );

  it('home.css is token-led', () => {
    const css = strip(read('app/styles/home.css'));
    const hex = css.match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
    const tokenRefs = css.match(/var\(--ng-/g) ?? [];
    // Token references must dominate; a handful of one-off local values is fine.
    expect(tokenRefs.length).toBeGreaterThan(hex.length * 3);
  });

  it('carries no leftover local alias layer', () => {
    // `.home--general { --ngh-green: … }` re-declared the palette a second time.
    expect(read('app/styles/home.css')).not.toMatch(/--ngh-/);
  });
});

describe('premium register stays scoped', () => {
  it('every --ng-premium-* use sits inside a [data-experience=deluxe] block', () => {
    const css = read('app/styles/home.css').split('\n');
    let inDeluxe = false;
    const leaks: string[] = [];
    css.forEach((line, i) => {
      if (/\[data-experience=['"]deluxe['"]\]/.test(line)) inDeluxe = true;
      else if (/^\}/.test(line)) inDeluxe = false;
      if (/--ng-premium-/.test(line) && !inDeluxe) leaks.push(`${i + 1}: ${line.trim()}`);
    });
    expect(leaks).toEqual([]);
  });
});

/**
 * The Glasshouse — the signature system.
 *
 * One architectural language shared by every room. These lock the primitives so
 * a future edit can't quietly drop the frame, the divider, or the flourish that
 * make the storefront read as a conservatory rather than a shop.
 */
describe('the Glasshouse signature system', () => {
  const ds = read('app/styles/design-system.css');

  it('names the glazing tokens in the token layer', () => {
    for (const token of [
      '--ng-glass-line',
      '--ng-glass-line-strong',
      '--ng-glass-joint',
      '--ng-font-size-display-2xl',
    ]) {
      expect(ds, token).toContain(`${token}:`);
    }
  });

  it('defines the four signature primitives', () => {
    for (const primitive of [
      '.ng-glass-corners',
      '.ng-glaze-rule',
      '.ng-plate-label',
      '.ng-editorial-title',
      '.ng-flourish',
    ]) {
      expect(
        ds.includes(`${primitive} {`) || ds.includes(`${primitive},`),
        primitive,
      ).toBe(true);
    }
  });

  it('draws the mullion frame with no extra DOM — corners are backgrounds', () => {
    const rule = ds.slice(
      ds.indexOf('.ng-glass-corners,'),
      ds.indexOf('.ng-glaze-rule {'),
    );
    // Eight gradients = four corner brackets, positioned at the four corners.
    expect((rule.match(/linear-gradient/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(rule).toMatch(/background-position:/);
  });

  it('keeps the flourish botanical — green, never a second colour', () => {
    const rule = ds.slice(ds.indexOf('.ng-flourish {'), ds.indexOf('.ng-flourish {') + 140);
    expect(rule).toMatch(/color: var\(--ng-green\)/);
    expect(rule).toMatch(/font-style: italic/);
  });

  it('is worn by the homepage sections and the interior pages alike', () => {
    // Same language across rooms: the entrances, the register, the reviews, the
    // closing band, and the shared interior-page masthead.
    const chooser = read('app/components/home/ExperienceChooser.tsx');
    const variety = read('app/components/home/ShopByVariety.tsx');
    const reviews = read('app/components/home/ReviewsCarousel.tsx');
    const conservatory = read('app/components/home/ConservatoryBand.tsx');
    for (const src of [chooser, variety, reviews, conservatory]) {
      expect(src).toMatch(/ng-plate-label/);
      expect(src).toMatch(/ng-flourish/);
    }
    // The interior masthead inherits the register through shared CSS.
    const home = read('app/styles/home.css');
    const pageTitle = home.slice(home.indexOf('.ng-page-title {'), home.indexOf('.ng-page-title {') + 200);
    expect(pageTitle).toMatch(/--ng-font-heading/);
  });
});
