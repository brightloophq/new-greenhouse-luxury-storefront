import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {OCCASIONS, PREMIUM_CATEGORIES} from '~/lib/catalogues';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 6 — Arrangements (presentation only). The signature gallery inherits the
 * editorial language via the shared primitives, and nothing about destinations,
 * the guest journey, Premium, or the shared catalogue's other contexts changes.
 */
describe('arrangements landings', () => {
  const hub = read('app/routes/arrangements._index.tsx');
  const occasion = read('app/routes/arrangements.occasion._index.tsx');
  const premium = read('app/routes/arrangements.premium-deluxe._index.tsx');
  const gallery = read('app/components/arrangements/ArrangementsGallery.tsx');

  it('replace the generic pathway selector with the editorial gallery', () => {
    for (const route of [hub, occasion, premium]) {
      expect(route).toMatch(/ArrangementsGallery/);
      expect(route).not.toMatch(/PathwaySelector/);
    }
  });

  it('the hub keeps the three real pathways and their destinations', () => {
    expect(hub).toMatch(/to: '\/arrangements\/premium-deluxe'/);
    expect(hub).toMatch(/to: '\/arrangements\/mixed'/);
    expect(hub).toMatch(/to: '\/arrangements\/occasion'/);
  });

  it('the occasion exhibition is driven by OCCASIONS, as labels', () => {
    expect(occasion).toMatch(/OCCASIONS/);
    expect(occasion).toMatch(/labelsOnly/);
    expect(occasion).toMatch(/\/arrangements\/occasion\/\$\{o\.slug\}/);
    for (const o of OCCASIONS) expect(occasion).toContain(o.slug);
  });

  it('the deluxe room is driven by PREMIUM_CATEGORIES and reads as elevated', () => {
    expect(premium).toMatch(/PREMIUM_CATEGORIES/);
    expect(premium).toMatch(/\/arrangements\/premium-deluxe\/\$\{c\.slug\}/);
    expect(premium).toMatch(/cue="Enter"/); // a cinematic entrance, not "Explore"
    for (const c of PREMIUM_CATEGORIES) expect(premium).toContain(c.slug);
  });

  it('the gallery composes the existing editorial primitives (no new system)', () => {
    expect(gallery).toMatch(/EditorialSectionHeader/);
    expect(gallery).toMatch(/EditorialPanel/);
    expect(gallery).toMatch(/EditorialCrossSell/);
    expect(gallery).toMatch(/useReveal/); // existing GSAP reveal
    expect(gallery).toMatch(/focalStyle\(/); // focal-point crops
    expect(gallery).toMatch(/cardImage\(/); // shared responsive srcSet
  });
});

describe('arrangements listing scope', () => {
  const view = read('app/components/catalogue/CatalogueView.tsx');
  const css = read('app/styles/arrangements.css');

  it('applies the editorial register by the `arrangements` CONTEXT (Mixed + Occasion)', () => {
    expect(view).toMatch(/context\.startsWith\('arrangements'\)/);
    expect(view).toMatch(/ng-shopcat--arrangements/);
  });

  it('leaves Retail, Supplies and Premium modifiers as they were', () => {
    expect(view).toMatch(/context\.startsWith\('retail'\)/);
    expect(view).toMatch(/context\.startsWith\('supplies'\)/);
    // Premium is context="premium" — it never matches arrangements, so it keeps
    // its own elevated catalogue.
    expect(view).not.toMatch(/context\.startsWith\('premium'\)/);
  });

  it('warms the listing ground, de-boxes cards, and spans the width', () => {
    expect(css).toMatch(/\.ng-shopcat\.ng-shopcat--arrangements \{[\s\S]*?--ng-ground-warm/);
    expect(css).toMatch(
      /\.ng-shopcat--arrangements \.ng-shopcat-card-body \{[\s\S]*?border-top: 1px solid var\(--ng-green-line\)/,
    );
    expect(css).toMatch(/main:has\(> \.ng-shopcat--arrangements\)/);
  });

  it('elevates the deluxe room via a scoped override, not a new identity', () => {
    // The premium landing is the SAME .ng-arr gallery, repainted under the
    // elevated theme with the premium palette.
    expect(css).toMatch(/\[data-experience='deluxe'\] \.ng-arr \{[\s\S]*?--ng-premium-ground/);
  });

  it('leaves the shared catalogue behaviour untouched', () => {
    expect(view).toMatch(/CatalogToolbar/);
    expect(view).toMatch(/FilterPanel/);
    expect(view).toMatch(/CatalogueSearch/);
    expect(view).toMatch(/products\.map/);
  });
});
