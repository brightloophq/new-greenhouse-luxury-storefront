/**
 * Legacy entry-URL redirects, resolved in the Oxygen worker (server.ts) BEFORE
 * React Router runs.
 *
 * The storefront is now ONE green brand — there is no Classic/Deluxe mode and no
 * theme cookie. These handlers only:
 *   - keep the real Classic content pages (`/classic/wholesale`, `/classic/
 *     supplies`) rendering, and map friendly `/classic/*` deep links to their
 *     live green collections/pages;
 *   - redirect every obsolete `/deluxe*` link to the premium catalogue that now
 *     lives inside Arrangements (`/arrangements/premium-deluxe`).
 * Only same-origin absolute paths are honoured; the cart is never touched.
 */

/** Friendly Classic deep-link slugs → canonical green store paths. */
const CLASSIC_SLUGS: Record<string, string> = {
  greenery: '/collections/greenery-and-fillers',
  flowers: '/collections/bulk-flowers',
};

/** Content routes under `/classic/*` that must render (not redirect). */
const CLASSIC_LANDING = new Set(['wholesale', 'supplies']);

/** The premium catalogue's canonical home (inside Arrangements). */
const PREMIUM_CATALOGUE = '/arrangements/premium-deluxe';

/** Sanitize an arbitrary target to a safe, same-origin absolute path. */
function safePath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
  return candidate;
}

function redirectTo(location: string): Response {
  return new Response(null, {status: 302, headers: {Location: location}});
}

/**
 * If `request` is a legacy entry URL, return a 302; otherwise `null`.
 */
export function experienceEntryResponse(request: Request): Response | null {
  const url = new URL(request.url);

  // Single-fetch data requests must never be answered with a bare 302 here.
  if (url.pathname.endsWith('.data')) return null;

  const match = url.pathname.match(/^\/(classic|deluxe)(?:\/(.*))?$/);
  if (!match) return null;

  const mode = match[1];
  const rest = (match[2] ?? '').replace(/^\/+|\/+$/g, '');

  // Deluxe is no longer a storefront mode — it is the premium catalogue inside
  // Arrangements. Every legacy /deluxe* link redirects there.
  if (mode === 'deluxe') return redirectTo(PREMIUM_CATALOGUE);

  // Real Classic content pages render (green).
  if (CLASSIC_LANDING.has(rest)) return null;

  const override = safePath(url.searchParams.get('to'));
  let to = override ?? '/';
  if (!override && rest) {
    if (CLASSIC_SLUGS[rest]) {
      to = CLASSIC_SLUGS[rest];
    } else if (rest.startsWith('collections/') || rest.startsWith('pages/')) {
      to = `/${rest}${url.search}`;
    }
  }
  return redirectTo(to);
}
