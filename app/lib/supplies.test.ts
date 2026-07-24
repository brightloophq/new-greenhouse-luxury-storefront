import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {SUPPLY_CATEGORIES} from '~/lib/catalogues';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 5 — Supplies migration (presentation only). These lock the two things
 * that matter: Supplies inherits the homepage/retail language, and nothing about
 * its destinations, journey, or the SHARED catalogue's other contexts changes.
 */
describe('supplies landing', () => {
  const landing = read('app/components/supplies/SuppliesLanding.tsx');
  const route = read('app/routes/supplies._index.tsx');

  it('is the editorial supplies landing, replacing the generic pathway selector', () => {
    expect(route).toMatch(/SuppliesLanding/);
    expect(route).not.toMatch(/PathwaySelector/);
  });

  it('drives its departments from the single SUPPLY_CATEGORIES source of truth', () => {
    // No hard-coded destination list to drift from Shopify.
    expect(landing).toMatch(/SUPPLY_CATEGORIES/);
    expect(landing).toMatch(/to:\s*`\/supplies\/\$\{c\.slug\}`/);
    // Every real category has editorial copy (keyed by slug) so none renders blank.
    for (const c of SUPPLY_CATEGORIES) {
      expect(landing).toContain(c.slug);
    }
  });

  it('presents departments as image-led panels in the homepage register', () => {
    expect(landing).toMatch(/EditorialPanel/); // shared image-led panel primitive
    expect(landing).toMatch(/className="ng-supplies-panel"/); // keeps its own visual language
    expect(landing).toMatch(/EditorialSectionHeader/); // shared masthead (glazing seam lives here)
    expect(landing).toMatch(/ng-flourish/); // the italic accent word
    expect(landing).toMatch(/focalStyle\(/); // focal-point crops
    expect(landing).toMatch(/useReveal/); // existing GSAP reveal, no new system
  });

  it('cross-sells to a real route, not a placeholder', () => {
    expect(landing).toMatch(/to="\/retail"/);
  });

  it('carries no mockup branding or placeholder copy', () => {
    expect(landing).not.toMatch(/verdant|wildstem|one garden|Fraunces|Jost|lorem/i);
  });
});

describe('supplies listing scope', () => {
  const view = read('app/components/catalogue/CatalogueView.tsx');
  const css = read('app/styles/supplies.css');

  it('applies the editorial register by the standalone `supplies` CONTEXT', () => {
    expect(view).toMatch(/context\.startsWith\('supplies'\)/);
    expect(view).toMatch(/ng-shopcat--supplies/);
  });

  it('leaves the retail modifier — and thus retail — untouched', () => {
    expect(view).toMatch(/context\.startsWith\('retail'\)/);
    expect(view).toMatch(/ng-shopcat--retail/);
  });

  it('warms the supplies listing ground and de-boxes its cards', () => {
    // the ground override wins via a same-specificity compound selector
    expect(css).toMatch(/\.ng-shopcat\.ng-shopcat--supplies \{[\s\S]*?--ng-ground-warm/);
    expect(css).toMatch(
      /\.ng-shopcat--supplies \.ng-shopcat-card-body \{[\s\S]*?border-top: 1px solid var\(--ng-green-line\)/,
    );
    // the gallery spans the width via a scoped <main> release
    expect(css).toMatch(/main:has\(> \.ng-shopcat--supplies\)/);
  });

  it('leaves the shared catalogue behaviour untouched', () => {
    // Still one CatalogueView; the toolbar/filters/search/sort are unchanged.
    expect(view).toMatch(/CatalogToolbar/);
    expect(view).toMatch(/FilterPanel/);
    expect(view).toMatch(/CatalogueSearch/);
    expect(view).toMatch(/products\.map/);
  });
});
