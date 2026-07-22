import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 11 — the unified greenhouse design language. These lock the two identity
 * decisions that make every room feel like the same greenhouse: ONE soft corner
 * (no page is square while another is round) and ONE primary-button recipe that
 * every filled CTA reads from. They are presentation-only invariants; nothing
 * here touches routes, data or Shopify logic.
 */
describe('one corner across the store', () => {
  const experience = read('app/styles/experience.css');
  const design = read('app/styles/design-system.css');

  it('classic no longer zeroes the radius tokens (soft corners inherited)', () => {
    // The old override `--ng-radius-sm: 0;` inside the classic block is gone, so
    // catalogue controls, cards and panels share the soft base scale.
    expect(experience).not.toMatch(/--ng-radius-sm:\s*0\s*;/);
    expect(experience).not.toMatch(/--ng-radius-md:\s*0\s*;/);
  });

  it('base radius scale stays soft', () => {
    expect(design).toMatch(/--ng-radius-sm:\s*4px/);
    expect(design).toMatch(/--ng-radius-md:\s*6px/);
  });
});

describe('one primary button across the store', () => {
  const design = read('app/styles/design-system.css');
  const experience = read('app/styles/experience.css');

  it('defines the shared button tokens (base + classic re-theme)', () => {
    expect(design).toMatch(/--ng-btn-primary-bg:/);
    expect(design).toMatch(/--ng-btn-primary-fg:/);
    expect(design).toMatch(/--ng-btn-radius:/);
    // Classic re-themes the one recipe to the editorial green-deep.
    expect(experience).toMatch(/--ng-btn-primary-bg:\s*var\(--ng-green-deep\)/);
  });

  it('the .ng-button family reads from the tokens and never lifts on hover', () => {
    expect(design).toMatch(/\.ng-button-primary\s*\{[\s\S]*?background:\s*var\(--ng-btn-primary-bg\)/);
    // Colour-only hover — no page's button moves differently.
    const hover = design.match(/\.ng-button:hover[\s\S]*?\}/)?.[0] ?? '';
    expect(hover).not.toMatch(/translateY/);
  });

  it('every filled CTA converges on the same token recipe', () => {
    for (const [file, path] of [
      ['cart', 'app/styles/cart.css'],
      ['product add-to-cart / related', 'app/styles/product.css'],
      ['flowers', 'app/styles/flowers.css'],
    ] as const) {
      expect(read(path), `${file} CTA should use --ng-btn-primary-bg`).toMatch(
        /background:\s*var\(--ng-btn-primary-bg\)/,
      );
    }
  });

  it('the cart empty-state CTA is the system button, not the retired gold-shimmer', () => {
    const cartMain = read('app/components/CartMain.tsx');
    expect(cartMain).toMatch(/className="ng-button ng-button-primary"/);
    expect(cartMain).not.toMatch(/greenhouse-button/);
  });
});
