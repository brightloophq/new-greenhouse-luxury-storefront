import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const MODAL = read('app/components/auth/AuthModal.tsx');
const ENTRY = read('app/components/auth/AccountEntry.tsx');
const HEADER = read('app/components/Header.tsx');
const LAYOUT = read('app/components/PageLayout.tsx');
const ACCOUNT = read('app/routes/($locale).account.tsx');
const LOGIN = read('app/routes/($locale).account_.login.tsx');
const AUTHORIZE = read('app/routes/($locale).account_.authorize.tsx');
const LOGOUT = read('app/routes/($locale).account_.logout.tsx');
const SESSION = read('app/lib/session.ts');

/**
 * Step 15 — the customer authentication experience.
 *
 * The rule these lock: the storefront brands the ENTRY to authentication and
 * nothing else. Shopify's Customer Accounts OAuth owns credentials, tokens and
 * the session; if a future change starts re-implementing any of that, these
 * fail loudly.
 */
describe('Shopify OAuth remains the only authentication mechanism', () => {
  it('keeps /account/login a server-side hand-off into Shopify', () => {
    expect(LOGIN).toMatch(/context\.customerAccount\.login\(/);
    expect(LOGIN).not.toMatch(/export default/); // loader only — no page, no form
  });

  it('keeps the callback on Hydrogen’s authorize()', () => {
    expect(AUTHORIZE).toMatch(/context\.customerAccount\.authorize\(\)/);
    expect(AUTHORIZE).not.toMatch(/exchange|client_secret|code_verifier/i);
  });

  it('never renders a credential field anywhere in the auth surface', () => {
    for (const source of [MODAL, ENTRY, ACCOUNT]) {
      expect(source).not.toMatch(/type="password"/);
      expect(source).not.toMatch(/client_secret|access_token|api_key/i);
    }
  });

  it('passes only parameters Hydrogen’s LoginOptions supports', () => {
    // acr_values / login_hint / login_hint_mode / locale — nothing invented.
    const params = LOGIN.match(/searchParams\.get\('([a-z_]+)'\)/g) ?? [];
    expect(params.sort()).toEqual(
      [
        "searchParams.get('acr_values')",
        "searchParams.get('locale')",
        "searchParams.get('login_hint')",
        "searchParams.get('login_hint_mode')",
      ].sort(),
    );
  });

  it('offers a single hand-off action — there is no create-account endpoint', () => {
    // Hydrogen's LoginOptions has no registration parameter, so a second button
    // would be decoration pretending to be a different flow.
    expect(MODAL.match(/href=\{href\}/g)?.length).toBe(2); // primary + retry
    expect(MODAL).toMatch(/created in the same step|created in the same secure step/);
  });
});

describe('branded entry replaces direct guest navigation', () => {
  it('the masthead renders the shared AccountEntry, not a bare account link', () => {
    expect(HEADER).toMatch(/<AccountEntry/);
    expect(HEADER).not.toMatch(/className="ng-masthead-account"[\s\S]{0,80}to="\/account"/);
  });

  it('the mobile drawer renders the same component and keeps closing on navigate', () => {
    expect(LAYOUT).toMatch(/<AccountEntry/);
    expect(LAYOUT).toMatch(/onNavigate=\{close\}/);
  });

  it('routes a guest to the modal and a member to /account', () => {
    expect(ENTRY).toMatch(/loggedIn \?[\s\S]{0,120}accountLink\(memberLabel\)/);
    expect(ENTRY).toMatch(/<button[\s\S]{0,240}onClick=\{\(\) => setOpen\(true\)\}/);
    // Icon-only below the desktop breakpoint, so the name is explicit.
    expect(ENTRY).toMatch(/aria-label=\{guestLabel\}/);
    expect(ENTRY).toMatch(/aria-haspopup="dialog"/);
    expect(ENTRY).toMatch(/<AuthModal[\s\S]{0,120}variant="account"/);
  });

  it('falls back to the account link while isLoggedIn is still deferred', () => {
    // Works without JS and never strands a guest on a dead control.
    expect(ENTRY).toMatch(/<Suspense fallback=\{accountLink\(guestLabel\)\}/);
    expect(ENTRY).toMatch(/errorElement=\{accountLink\(guestLabel\)\}/);
  });

  it('is one component, not two — the old wholesale-only modal is gone', () => {
    expect(() => read('app/components/wholesale/WholesaleAuthModal.tsx')).toThrow();
    expect(read('app/components/home/ExperienceChooser.tsx')).toMatch(
      /AuthModal[\s\S]{0,200}variant="wholesale"/,
    );
  });
});

describe('return-to handling', () => {
  it('the modal hands the current location to the gated builder', () => {
    expect(MODAL).toMatch(/loginHref\(/);
    expect(MODAL).toMatch(/location\.pathname\}\$\{location\.search\}/);
    // Never string-concatenated straight into the URL.
    expect(MODAL).not.toMatch(/return_to=\$\{/);
  });

  it('the trade card returns a customer to the wholesale area', () => {
    expect(read('app/components/home/ExperienceChooser.tsx')).toMatch(
      /returnTo="\/wholesale"/,
    );
  });
});

describe('loading, duplicate submission and failure', () => {
  it('guards against a second navigation while the hand-off is opening', () => {
    expect(MODAL).toMatch(/if \(status === 'opening'\)[\s\S]{0,80}preventDefault\(\)/);
  });

  it('announces the loading state politely', () => {
    expect(MODAL).toMatch(/role="status" aria-live="polite"/);
  });

  it('surfaces a retry if the redirect never lands', () => {
    expect(MODAL).toMatch(/HANDOFF_TIMEOUT_MS/);
    expect(MODAL).toMatch(/setStatus\('failed'\)/);
    expect(MODAL).toMatch(/role="alert"/);
    expect(MODAL).toMatch(/Try again/);
    // The customer is told nothing was submitted — no ambiguity about state.
    expect(MODAL).toMatch(/nothing was submitted/);
  });

  it('portals to <body> so the drawer’s stacking context cannot bury it', () => {
    // Opened from the mobile drawer, an in-tree modal rendered *under* the
    // drawer scrim — unusable on touch. This is the fix; keep it.
    expect(MODAL).toMatch(/createPortal\(/);
    expect(MODAL).toMatch(/document\.body,/);
  });

  it('keeps the dialog labelled in every state', () => {
    expect(MODAL.match(/id="ng-trade-title"/g)?.length).toBe(3);
  });
});

describe('session and logout', () => {
  it('keeps the httpOnly, signed cookie session untouched', () => {
    expect(SESSION).toMatch(/httpOnly: true/);
    expect(SESSION).toMatch(/sameSite: 'lax'/);
    expect(SESSION).toMatch(/secrets/);
    expect(SESSION).toMatch(/destroySession/);
  });

  it('signs out through the existing Hydrogen action', () => {
    expect(LOGOUT).toMatch(/context\.customerAccount\.logout\(\)/);
    expect(LOGOUT).toMatch(/export async function action/);
    expect(ACCOUNT).toMatch(/method="POST" action="\/account\/logout"/);
  });
});

describe('storefront-controlled account pages carry the house language', () => {
  it('drops the Shopify scaffold from the account shell', () => {
    expect(ACCOUNT).not.toMatch(/&nbsp;/);
    expect(ACCOUNT).not.toMatch(/<br \/>/);
    expect(ACCOUNT).not.toMatch(/isActiveStyle|fontWeight:|color: isPending/);
  });

  it('uses the scoped account stylesheet', () => {
    expect(ACCOUNT).toMatch(/className="ng-account"/);
    expect(read('app/root.tsx')).toMatch(/styles\/account\.css/);
    const css = read('app/styles/account.css');
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = stripped.split('\n').filter((l) => /^[a-z][\w-]*\s*[,{]/.test(l));
    expect(bare).toEqual([]);
  });

  it('gives the account index a real heading order', () => {
    expect(ACCOUNT).toMatch(/<h1 className="ng-account-title/);
    expect(read('app/routes/($locale).account.orders._index.tsx')).toMatch(
      /<h3 className="ng-account-order-number"/,
    );
  });
});
