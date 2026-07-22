import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 10 — editorial cart (presentation only). These lock the one thing that
 * matters: the cart is re-dressed, never re-plumbed. Every Shopify mutation,
 * the checkout handoff, discounts, gift cards, quantity + remove forms and the
 * optimistic cart stay exactly as they were; only the presentation changes.
 */
describe('cart logic is preserved — presentation only', () => {
  const main = read('app/components/CartMain.tsx');
  const line = read('app/components/CartLineItem.tsx');
  const summary = read('app/components/CartSummary.tsx');

  it('CartMain still drives the optimistic cart and never reimplements it', () => {
    expect(main).toMatch(/useOptimisticCart\(originalCart\)/);
    // No cart mutations are performed in the component — those stay in /cart.
    expect(main).not.toMatch(/addLines|updateLines|removeLines|CartForm\.ACTIONS/);
  });

  it('CartLineItem keeps the quantity + remove forms, values and disabled logic', () => {
    expect(line).toMatch(/CartForm\.ACTIONS\.LinesUpdate/);
    expect(line).toMatch(/CartForm\.ACTIONS\.LinesRemove/);
    expect(line).toMatch(/fetcherKey=\{getUpdateKey\(lineIds\)\}/);
    // Stepper values + disabled states untouched.
    expect(line).toMatch(/value=\{prevQuantity\}/);
    expect(line).toMatch(/value=\{nextQuantity\}/);
    expect(line).toMatch(/disabled=\{quantity <= 1 \|\| !!isOptimistic\}/);
    // Accessible control labels preserved.
    expect(line).toMatch(/aria-label="Decrease quantity"/);
    expect(line).toMatch(/aria-label="Increase quantity"/);
  });

  it('CartSummary keeps the checkout handoff, discounts and gift cards intact', () => {
    expect(summary).toMatch(/href=\{checkoutUrl\}/);
    expect(summary).toMatch(/target="_self"/);
    expect(summary).toMatch(/CartForm\.ACTIONS\.DiscountCodesUpdate/);
    expect(summary).toMatch(/CartForm\.ACTIONS\.GiftCardCodesAdd/);
    expect(summary).toMatch(/CartForm\.ACTIONS\.GiftCardCodesRemove/);
    expect(summary).toMatch(/<Money data=\{cart\?\.cost\?\.subtotalAmount\}/);
  });
});

describe('editorial cart presentation', () => {
  const main = read('app/components/CartMain.tsx');
  const line = read('app/components/CartLineItem.tsx');
  const summary = read('app/components/CartSummary.tsx');

  it('scopes the cart under .ng-cart and reveals with the house motion', () => {
    expect(main).toMatch(/cart-main ng-cart/);
    expect(main).toMatch(/prefersReducedMotion\(\)/);
    expect(main).toMatch(/import\('gsap'\)/);
    expect(main).toMatch(/data-cart-reveal/);
  });

  it('gives an editorial empty state, not a generic basket icon', () => {
    expect(main).toMatch(/Your greenhouse is waiting\./);
    expect(main).toMatch(/cart-empty-art/);
    expect(main).toMatch(/cart-empty-title/);
  });

  it('rebuilds the line item as a stepper + editorial remove text', () => {
    expect(line).toMatch(/cart-line-stepper/);
    expect(line).toMatch(/className="cart-line-step"/);
    expect(line).toMatch(/className="cart-line-count"/);
    expect(line).toMatch(/className="cart-line-remove"/);
    expect(line).toMatch(/data-cart-reveal/);
  });

  it('gives the summary a note + architectural checkout button', () => {
    expect(summary).toMatch(/`cart-summary \$\{/);
    expect(summary).toMatch(/cart-summary-note/);
    expect(summary).toMatch(/className="cart-checkout"/);
    expect(summary).toMatch(/cart-checkout-label/);
  });
});

describe('root-cause fix — the legacy fixed-aside geometry is gone', () => {
  const app = read('app/styles/app.css');

  it('drops the phantom --aside-width / --cart-aside-summary-height variables', () => {
    expect(app).not.toMatch(/--aside-width\s*:/);
    expect(app).not.toMatch(/--cart-aside-summary-height/);
  });

  it('no longer positions the cart summary absolutely off hard-coded heights', () => {
    // The old `.cart-summary-aside { position: absolute; width: calc(--aside-width…) }`
    // block is removed; the cart is now flex-column aware in cart.css.
    expect(app).not.toMatch(/\.cart-summary-aside\s*\{/);
    expect(app).not.toMatch(/\.cart-main\s*\{[\s\S]*?overflow-y/);
  });
});

describe('cart stylesheet stays scoped + on-brand', () => {
  const css = read('app/styles/cart.css');

  it('is classic-only — no premium token leak', () => {
    expect(css).not.toMatch(/--ng-premium-/);
  });

  it('names only the brand faces and stays fully class-scoped', () => {
    const families = css.match(/font-family:[^;]+;/g) ?? [];
    for (const f of families) expect(f).toMatch(/var\(--ng-font-(heading|body)\)/);
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = stripped.split('\n').filter((l) => /^[a-z][\w-]*\s*[,{]/.test(l));
    expect(bare).toEqual([]);
  });

  it('docks the drawer summary as a fixed footer over a scrolling body', () => {
    // Header fixed, `.cart-details` scrolls, summary docked outside it.
    expect(css).toMatch(/\.ng-drawer \.ng-cart \.cart-details\s*\{[\s\S]*?overflow-y: auto/);
    expect(css).toMatch(/cart-summary-dock/);
  });

  it('respects reduced motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
