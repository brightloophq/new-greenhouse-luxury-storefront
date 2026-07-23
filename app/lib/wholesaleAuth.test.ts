import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Editorial wholesale authentication. Step 8 introduced the invitation modal;
 * Step 15 consolidated it into the shared `AuthModal` (variant="wholesale") so
 * the trade card, the /wholesale gate and the masthead all use one component.
 * These lock what must survive: the Shopify hand-off, the dialog a11y contract,
 * and the untouched approval logic.
 */
describe('wholesale invitation modal (shared AuthModal, wholesale variant)', () => {
  const modal = read('app/components/auth/AuthModal.tsx');

  it('preserves the Shopify auth hand-off and never collects credentials', () => {
    // The hand-off URL is built by loginHref() — always /account/login.
    expect(modal).toMatch(/loginHref/);
    expect(modal).toMatch(/href=\{href\}/);
    expect(modal).not.toMatch(/type="password"|<input/); // never collects credentials
  });

  it('keeps the wholesale copy on the wholesale variant', () => {
    expect(modal).toMatch(/A private trade conservatory/);
    expect(modal).toMatch(/Trade pricing by the bunch & box/);
    expect(modal).toMatch(/40\+ years supplying Jamaica/);
    expect(modal).toMatch(/access is immediate/);
  });

  it('keeps the dialog accessibility contract', () => {
    expect(modal).toMatch(/role="dialog"/);
    expect(modal).toMatch(/aria-modal="true"/);
    expect(modal).toMatch(/aria-labelledby="ng-trade-title"/);
    expect(modal).toMatch(/aria-label="Close"/);
  });

  it('traps focus, closes on Escape + backdrop, and returns focus to the opener', () => {
    expect(modal).toMatch(/event\.key !== 'Tab'/); // Tab focus trap
    expect(modal).toMatch(/last\.focus\(\)/);
    expect(modal).toMatch(/first\.focus\(\)/);
    expect(modal).toMatch(/event\.key === 'Escape'[\s\S]{0,60}requestClose\(\)/);
    expect(modal).toMatch(/event\.target === event\.currentTarget\) requestClose\(\)/);
    expect(modal).toMatch(/openerRef\.current = document\.activeElement/);
    expect(modal).toMatch(/opener\?\.isConnected/);
  });

  it('locks scroll and reuses the existing dynamic GSAP, guarded by reduced motion', () => {
    expect(modal).toMatch(/document\.body\.style\.overflow = 'hidden'/);
    expect(modal).toMatch(/await import\('gsap'\)/); // no new animation library
    expect(modal).toMatch(/prefersReducedMotion\(\)/);
  });

  it('shows an editorial loading affordance while the hand-off opens', () => {
    expect(modal).toMatch(/setStatus\('opening'\)/);
    expect(modal).toMatch(/status === 'opening'/);
    expect(modal).toMatch(/ng-trade-loading/);
  });

  it('carries no mockup branding', () => {
    expect(modal).not.toMatch(/verdant|wildstem|lorem|placeholder/i);
  });
});

describe('wholesale gate (signed-out /wholesale)', () => {
  const gate = read('app/components/wholesale/WholesaleGate.tsx');
  const route = read('app/routes/wholesale._index.tsx');

  it('opens the shared modal instead of navigating straight to Shopify', () => {
    expect(gate).toMatch(/AuthModal/);
    expect(gate).toMatch(/variant="wholesale"/);
    expect(gate).toMatch(/onClick=\{\(\) => setAuthOpen\(true\)\}/);
    expect(gate).not.toMatch(/href="\/account\/login"/); // the modal owns the hand-off
  });

  it('preserves the approved trade copy', () => {
    expect(gate).toMatch(/florists, event planners, hotels and venues/); // approved body
    expect(gate).toMatch(/Trade pricing by the bunch/); // approved perk
    expect(gate).toMatch(/40\+ years supplying Jamaica/);
    expect(gate).toMatch(/useReveal/); // existing reveal, no new system
  });

  it('is still gated by the existing access check (guest vs authenticated)', () => {
    expect(route).toMatch(/getWholesaleAccess/);
    expect(route).toMatch(/access !== 'authenticated'/);
    expect(route).toMatch(/WholesaleGate/);
  });
});

describe('approval logic is untouched — no fabricated pending state', () => {
  const wholesale = read('app/lib/wholesale.ts');

  it('resolves only guest or authenticated (immediate access), no pending gate', () => {
    expect(wholesale).toMatch(/'guest' \| 'authenticated'/);
    expect(wholesale).not.toMatch(/pending|approvalPending|wholesale_approved/i);
  });
});

describe('wholesale stylesheet stays scoped + on-brand', () => {
  const css = read('app/styles/wholesale.css');

  it('gives the modal a full-height mobile sheet', () => {
    expect(css).toMatch(/@media \(max-width: 48em\)[\s\S]*?\.ng-trade-modal \{[\s\S]*?grid-template-columns: 1fr/);
  });

  it('honours reduced motion for the loading indicator', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?ng-trade-loading-bar/);
  });

  it('leaks no premium token and stays fully class-scoped', () => {
    expect(css).not.toMatch(/--ng-premium-/);
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = stripped.split('\n').filter((l) => /^[a-z][\w-]*\s*[,{]/.test(l));
    expect(bare).toEqual([]);
  });
});
