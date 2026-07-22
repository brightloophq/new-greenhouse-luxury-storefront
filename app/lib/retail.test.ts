import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 4 — Retail migration (presentation only). These lock the two things that
 * matter: Retail inherits the homepage language, and nothing about its
 * destinations, journey, or the SHARED catalogue's other variants changes.
 */
describe('retail landing', () => {
  const landing = read('app/components/retail/RetailLanding.tsx');
  const route = read('app/routes/retail._index.tsx');

  it('is the retail landing, replacing the generic pathway selector', () => {
    expect(route).toMatch(/RetailLanding/);
    expect(route).not.toMatch(/PathwaySelector/);
  });

  it('keeps the exact two departments and their real destinations', () => {
    expect(landing).toMatch(/to: '\/retail\/flowers'/);
    expect(landing).toMatch(/to: '\/retail\/supplies'/);
  });

  it('presents them as image-led panels in the homepage register', () => {
    expect(landing).toMatch(/EditorialPanel/); // shared image-led panel primitive
    expect(landing).toMatch(/className="ng-retail-panel"/); // keeps its own visual language
    expect(landing).toMatch(/ng-flourish/); // the italic accent word
    expect(landing).toMatch(/focalStyle\(/); // focal-point crops
    expect(landing).toMatch(/useReveal/); // existing GSAP reveal, no new system
  });

  it('cross-sells to the real wholesale route, not a placeholder', () => {
    expect(landing).toMatch(/to="\/wholesale"/);
  });

  it('carries no mockup branding or placeholder copy', () => {
    expect(landing).not.toMatch(/verdant|wildstem|one garden|Fraunces|Jost/i);
  });
});

describe('retail listing scope', () => {
  const view = read('app/components/catalogue/CatalogueView.tsx');
  const css = read('app/styles/home.css');

  it('applies the editorial register by CONTEXT, never by variant', () => {
    // variant="retail" is shared with Arrangements — scoping by it would leak.
    expect(view).toMatch(/context\.startsWith\('retail'\)/);
    expect(view).toMatch(/ng-shopcat--retail/);
  });

  it('warms the retail listing ground and de-boxes its cards', () => {
    expect(css).toMatch(/\.ng-shopcat--retail \{[\s\S]*?--ng-ground-warm/);
    // the ground override wins via a same-specificity compound selector
    expect(css).toMatch(/\.ng-shopcat\.ng-shopcat--retail \{[\s\S]*?--ng-ground-warm/);
    expect(css).toMatch(
      /\.ng-shopcat--retail \.ng-shopcat-card-body \{[\s\S]*?border-top: 1px solid var\(--ng-green-line\)/,
    );
  });

  it('leaves the shared catalogue behaviour untouched', () => {
    // Still one CatalogueView; the toolbar/filters/search/sort are unchanged.
    expect(view).toMatch(/CatalogToolbar/);
    expect(view).toMatch(/FilterPanel/);
    expect(view).toMatch(/CatalogueSearch/);
    expect(view).toMatch(/products\.map/);
  });
});
