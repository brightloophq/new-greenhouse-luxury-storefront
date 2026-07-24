import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Shared editorial primitives (extraction guard). These lock the STRUCTURE the
 * Retail and Supplies rooms depend on — the visual language stays in each
 * surface's own `${className}-*` rules, so the components must derive every child
 * class from the passed root class and change no markup.
 */
describe('EditorialPanel', () => {
  const src = read('app/components/editorial/EditorialPanel.tsx');

  it('derives every child class from the passed root className', () => {
    for (const part of ['-media', '-scrim', '-text', '-kicker', '-title', '-blurb', '-cue', '-cue-rule']) {
      expect(src).toContain(`\${className}${part}`);
    }
  });

  it('keeps the image-led, accessible structure', () => {
    expect(src).toMatch(/alt=""/); // decorative photo
    expect(src).toMatch(/loading="lazy"/);
    expect(src).toMatch(/decoding="async"/);
    expect(src).toMatch(/aria-hidden="true"/); // scrim + cue are decorative
    expect(src).toMatch(/style=\{style\}/); // focal-point object-position passes through
  });
});

describe('EditorialSectionHeader', () => {
  const src = read('app/components/editorial/EditorialSectionHeader.tsx');

  it('renders the glazing seam and the flourished, labelled title', () => {
    expect(src).toMatch(/GlasshouseDivider/);
    expect(src).toMatch(/ng-section-seam/);
    expect(src).toMatch(/data-reveal-heading/); // the existing GSAP reveal hook
    expect(src).toContain('${prefix}-head');
    expect(src).toContain('${prefix}-eyebrow');
    expect(src).toContain('${prefix}-title ng-editorial-title');
    expect(src).toContain('${prefix}-lede');
  });
});

describe('EditorialCrossSell', () => {
  const src = read('app/components/editorial/EditorialCrossSell.tsx');

  it('is a <div> rail (not an <aside>) with derived child classes', () => {
    expect(src).toMatch(/<div className=\{className\} data-reveal-item>/);
    expect(src).not.toMatch(/<aside/);
    expect(src).toContain('${className}-text');
    expect(src).toContain('${className}-link');
  });
});
