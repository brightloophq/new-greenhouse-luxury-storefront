/**
 * Return-to handling for the Shopify Customer Accounts hand-off.
 *
 * `/account/login` is a server redirect into Shopify's hosted OAuth flow.
 * Hydrogen reads `?return_to=` (falling back to the Referer) and stores it in
 * the session as `redirectPath`, which `/account/authorize` redirects to once
 * the token exchange succeeds. So the storefront's only job is to hand over a
 * destination that is safe to trust.
 *
 * Hydrogen validates the path again on its side; this is the storefront's own
 * gate, kept deliberately strict:
 *
 *   - same-origin paths only — a single leading `/`
 *   - never protocol-relative (`//evil.com`, `/\evil.com`) — the classic open
 *     redirect, since browsers resolve both as an absolute host
 *   - no control characters or whitespace (CR/LF header-splitting shapes)
 *   - never an auth route itself, which would bounce the customer in a loop
 *
 * Anything that fails a check is dropped, not repaired: the customer simply
 * lands on the account page instead of somewhere unexpected.
 */

export const LOGIN_PATH = '/account/login';

/** Auth plumbing — returning a customer here after sign-in would loop them. */
const AUTH_ROUTES = ['/account/login', '/account/authorize', '/account/logout'];

/** Generous for a real product/collection URL, short enough to bound abuse. */
const MAX_LENGTH = 512;

/** Space, every C0 control (CR/LF/NUL included) and DEL. */
function hasControlOrSpace(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

/**
 * Narrow an arbitrary candidate to a safe, same-origin path, or `null`.
 * Accepts `pathname` + optional `search`; any hash is dropped (the server
 * never receives it, so carrying it through the redirect is theatre).
 */
export function safeReturnTo(
  candidate: string | null | undefined,
): string | null {
  if (typeof candidate !== 'string') return null;

  // Deliberately untrimmed: a candidate carrying stray whitespace or a trailing
  // CR is malformed, and repairing it would hide the shape rather than refuse it.
  const value = candidate;
  if (!value || value.length > MAX_LENGTH) return null;

  // Same-origin absolute paths only.
  if (!value.startsWith('/')) return null;
  // Protocol-relative: `//host` and the backslash variant browsers normalise.
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  if (hasControlOrSpace(value)) return null;

  const [pathAndSearch] = value.split('#');
  const [pathname] = pathAndSearch.split('?');
  if (AUTH_ROUTES.includes(pathname)) return null;

  return pathAndSearch || null;
}

/**
 * Build the hand-off URL. Always `/account/login`; the destination rides along
 * as `?return_to=` only when it survives {@link safeReturnTo}.
 */
export function loginHref(returnTo?: string | null): string {
  const safe = safeReturnTo(returnTo);
  return safe ? `${LOGIN_PATH}?return_to=${encodeURIComponent(safe)}` : LOGIN_PATH;
}
