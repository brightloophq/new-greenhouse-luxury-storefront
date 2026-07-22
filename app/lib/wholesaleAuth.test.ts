import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 8 — editorial wholesale authentication (presentation only). These lock
 * the behaviour that must survive the redesign: the auth hand-off, the dialog
 * a11y contract, and the untouched approval logic.
 */
describe('wholesale invitation modal', () => {
  const modal = read('app/components/wholesale/WholesaleAuthModal.tsx');

  it('preserves the Shopify auth hand-off (both actions → /account/login)', () => {
    expect(modal).toMatch(/AUTH_HREF = '\/account\/login'/);
    // Two actions, both pointing at the hand-off — no in-app credential capture.
    expect(modal.match(/href=\{AUTH_HREF\}/g)?.length).toBe(2);
    expect(modal).not.toMatch(/type="password"|<input/); // never collects credentials
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

  it('preserves the auth actions and approved trade copy', () => {
    expect(gate.match(/href="\/account\/login"/g)?.length).toBe(2);
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
