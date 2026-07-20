import {describe, it, expect} from 'vitest';
import {
  CONTEXT_FACETS,
  facetsForContext,
  parseCatalogSearchParams,
} from './catalog';
import {navFor} from './navigation';

/* -------------------------------------------------------------------------- */
/* Filter-context isolation (Phase 4/5)                                       */
/* -------------------------------------------------------------------------- */
describe('filter context facets', () => {
  it('Classic Wholesale filters never include occasion or channel', () => {
    expect(CONTEXT_FACETS['classic-wholesale']).toContain('flower');
    expect(CONTEXT_FACETS['classic-wholesale']).toContain('color');
    expect(CONTEXT_FACETS['classic-wholesale']).not.toContain('occasion');
    expect(CONTEXT_FACETS['classic-wholesale']).not.toContain('channel');
  });

  it('Classic Supply filters never include flower or occasion', () => {
    expect(CONTEXT_FACETS['classic-supply']).toContain('color');
    expect(CONTEXT_FACETS['classic-supply']).not.toContain('flower');
    expect(CONTEXT_FACETS['classic-supply']).not.toContain('occasion');
  });

  it('Deluxe filters are occasion + colour only (no channel, no flower family)', () => {
    expect(CONTEXT_FACETS.deluxe).toContain('occasion');
    expect(CONTEXT_FACETS.deluxe).toContain('color');
    expect(CONTEXT_FACETS.deluxe).not.toContain('channel');
    expect(CONTEXT_FACETS.deluxe).not.toContain('flower');
  });

  it('facetsForContext returns only the allowed facet defs', () => {
    const classicKeys = facetsForContext('classic-wholesale').map((f) => f.key);
    expect(classicKeys).not.toContain('occasion');
    const supplyKeys = facetsForContext('classic-supply').map((f) => f.key);
    expect(supplyKeys).toEqual(['color']);
    const deluxeKeys = facetsForContext('deluxe').map((f) => f.key);
    expect(deluxeKeys).toContain('occasion');
  });
});

describe('context-scoped param parsing (switching clears incompatible filters)', () => {
  it('ignores an occasion param on a Classic wholesale page', () => {
    const params = new URLSearchParams(
      'occasion=romance&flower=alstroemeria&color=red',
    );
    const {filters} = parseCatalogSearchParams(params, 'classic-wholesale');
    expect(filters.occasion).toBeUndefined(); // not carried in
    expect(filters.flower).toBe('alstroemeria');
    expect(filters.color).toBe('red');
  });

  it('ignores flower + occasion params on a Classic supply page', () => {
    const params = new URLSearchParams(
      'flower=alstroemeria&occasion=birthday&color=green',
    );
    const {filters} = parseCatalogSearchParams(params, 'classic-supply');
    expect(filters.flower).toBeUndefined();
    expect(filters.occasion).toBeUndefined();
    expect(filters.color).toBe('green');
  });

  it('ignores a flower param on a Deluxe page but keeps occasion', () => {
    const params = new URLSearchParams('flower=rose&occasion=anniversary');
    const {filters} = parseCatalogSearchParams(params, 'deluxe');
    expect(filters.flower).toBeUndefined();
    expect(filters.occasion).toBe('anniversary');
  });
});

/* -------------------------------------------------------------------------- */
/* Navigation isolation (Phase 7)                                             */
/* -------------------------------------------------------------------------- */
function allLabels(exp: 'classic' | 'deluxe'): string[] {
  const nav = navFor(exp);
  return [
    ...nav.primary.map((i) => i.label),
    ...nav.mega.flatMap((c) => [c.title, ...c.links.map((l) => l.label)]),
    ...nav.footerShop.map((l) => l.label),
    ...nav.footerServices.map((l) => l.label),
  ];
}

describe('navigation isolation', () => {
  it('Classic primary nav has no Collections and no Occasions', () => {
    const primary = navFor('classic').primary.map((i) => i.label);
    expect(primary).not.toContain('Collections');
    expect(primary).not.toContain('Occasions');
  });

  it('is one unified green nav — navFor returns the same nav regardless of arg', () => {
    // Unified brand: there is no separate luxury/Deluxe navigation.
    expect(navFor('deluxe')).toBe(navFor('classic'));
    expect(navFor()).toBe(navFor('classic'));
  });

  it('nav never exposes a global Premium/Deluxe destination', () => {
    const labels = allLabels('classic').join(' | ').toLowerCase();
    expect(labels).not.toContain('deluxe');
    expect(labels).not.toContain('premium');
    expect(labels).not.toContain('luxury');
  });

  it('exposes exactly the approved primary nav', () => {
    const primary = navFor().primary.map((i) => i.label);
    expect(primary).toEqual([
      'Home',
      'Wholesale',
      'Retail',
      'Arrangements',
      'Supplies',
      'About',
    ]);
  });

  it('About is a dropdown with About Us, Contact Us and Reviews', () => {
    const nav = navFor();
    expect(nav.primary.find((i) => i.label === 'About')?.mega).toBe(true);
    const about = nav.mega.flatMap((c) => c.links.map((l) => l.label));
    expect(about).toEqual(['About Us', 'Contact Us', 'Reviews']);
  });
});
