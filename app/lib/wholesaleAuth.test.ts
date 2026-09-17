import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Wholesale is PUBLIC — a wholesale buyer purchases as a guest (name + email at
 * checkout), and the Business Account is a separate, optional relationship. The
 * old sign-in-wall modal (`WholesaleAuthModal`) has been removed; these guards
 * lock the new contract in place.
 */
describe('wholesale is public — optional business account, not a gate', () => {
  const invite = read('app/components/wholesale/BusinessAccountInvite.tsx');
  const route = read('app/routes/wholesale._index.tsx');

  it('the Business Account invite keeps the Shopify auth hand-off + business copy', () => {
    expect(invite.match(/href="\/account\/login"/g)?.length).toBe(2); // create + sign in
    expect(invite).toMatch(/Business Account · optional/);
    expect(invite).toMatch(/open to everyone/); // wholesale needs no account
    expect(invite).toMatch(/useReveal/); // existing reveal, no new system
    // No invented discount promise (no hardcoded percentage off).
    expect(invite).not.toMatch(/\d+\s*%\s*(off|discount)/i);
  });

  it('the /wholesale route is public: shop for everyone, business account optional', () => {
    // The shop selector renders unconditionally — never behind an approval gate.
    expect(route).toMatch(/PathwaySelector/);
    expect(route).not.toMatch(/access !== 'approved'/); // no shopping gate
    expect(route).not.toMatch(/throw redirect/); // no gate redirect
    // Business-account state only tailors the OPTIONAL block below the shop.
    expect(route).toMatch(/getWholesaleAccess/);
    expect(route).toMatch(/access === 'guest'/); // → BusinessAccountInvite
    expect(route).toMatch(/BusinessAccountInvite/);
    expect(route).toMatch(/WholesaleStatusNotice/);
  });

  it('the wholesale sub-catalogues no longer require sign-in or approval', () => {
    for (const p of ['wholesale.flowers.tsx', 'wholesale.supplies.tsx']) {
      const src = read(join('app/routes', p));
      expect(src).not.toMatch(/requireWholesaleProfile/);
      expect(src).not.toMatch(/access !== 'approved'/);
      expect(src).not.toMatch(/throw redirect\('\/wholesale'\)/);
    }
  });
});

describe('wholesale_status resolves as an eligibility flag (manual decision)', () => {
  const wholesale = read('app/lib/wholesale.ts');

  it('resolves guest + the four manual decision states (no sign-in-only access)', () => {
    expect(wholesale).toMatch(/'guest' \| WholesaleDecision/);
    expect(wholesale).toMatch(/'approved'/);
    expect(wholesale).toMatch(/'pending'/);
    expect(wholesale).toMatch(/'rejected'/);
    expect(wholesale).toMatch(/'more_information_required'/);
    // Sign-in alone must NOT grant access any more.
    expect(wholesale).not.toMatch(/immediate access/i);
  });

  it('fails closed — an unknown/blank/failed status is treated as pending', () => {
    expect(wholesale).toMatch(/normalizeWholesaleStatus/);
    expect(wholesale).toMatch(/treating as pending/);
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
