import {experienceCookie, type ExperienceMode} from '~/lib/experience';

/**
 * Experience entry-URL policy for `/classic`, `/deluxe` and their deep links.
 *
 * Resolved in the Oxygen worker (server.ts) BEFORE React Router runs, for two
 * reasons:
 *   1. `/classic/collections/<h>` and `/classic/pages/<h>` otherwise match the
 *      optional `($locale)` segment (locale = "classic") and 404 in that layout.
 *      Handling them here avoids that collision deterministically.
 *   2. It keeps one entry mechanism instead of a worker intercept AND a set of
 *      redirecting route files fighting flat-route ranking.
 *
 * These entry URLs (a) set the `ng_experience` cookie so the shopper persists in
 * the chosen experience, and (b) 302 to the canonical, unprefixed store path so
 * marketing deep links never create duplicate-content URLs. The cart is never
 * touched; prices are never changed; only same-origin absolute paths are honoured.
 *
 * EXCEPTION — real content pages that live under `/classic/*` and must RENDER
 * (not redirect): `/classic/wholesale` and `/classic/supplies`. For those this
 * returns `null` so React Router serves the landing route, which sets the cookie
 * itself via its loader headers.
 */

/**
 * Friendly Classic/Deluxe deep-link slugs → canonical store paths. Keeps
 * marketing URLs (`/classic/greenery`, `/deluxe/gifts`) stable and pointed at
 * live collections.
 */
const CLASSIC_SLUGS: Record<string, string> = {
  greenery: '/collections/greenery-and-fillers',
  flowers: '/collections/bulk-flowers',
};

const DELUXE_SLUGS: Record<string, string> = {
  signature: '/collections/all-flowers',
  gifts: '/collections/add-ons',
  premium: '/collections/roses',
  occasions: '/collections/birthday',
};

/**
 * Content routes under `/classic/*` that must render in React Router rather than
 * redirect. They set the experience cookie in their own loaders.
 */
const CLASSIC_LANDING = new Set(['wholesale', 'supplies']);

/** Sanitize an arbitrary target to a safe, same-origin absolute path. */
function safePath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
  return candidate;
}

/**
 * If `request` is an experience entry URL, return a 302 response that sets the
 * cookie and points at the canonical store path. Returns `null` when the path is
 * not an entry URL, or is a landing content route that should render instead.
 */
export function experienceEntryResponse(request: Request): Response | null {
  const url = new URL(request.url);

  // React Router single-fetch data requests (`<route>.data`) must NEVER be
  // answered with a raw body-less 302 here — the client decodes them as a
  // turbo-stream and a plain redirect throws "Unable to decode turbo-stream
  // response" (a 500 on client-side navigation, e.g. to /classic/supplies). Let
  // React Router handle all .data requests; the landing loaders set the cookie.
  if (url.pathname.endsWith('.data')) return null;

  const match = url.pathname.match(/^\/(classic|deluxe)(?:\/(.*))?$/);
  if (!match) return null;

  const mode = match[1] as ExperienceMode;
  const rest = (match[2] ?? '').replace(/^\/+|\/+$/g, '');

  // Landing content pages render in React Router (they set the cookie).
  if (mode === 'classic' && CLASSIC_LANDING.has(rest)) return null;

  const override = safePath(url.searchParams.get('to'));
  const slugs = mode === 'deluxe' ? DELUXE_SLUGS : CLASSIC_SLUGS;

  let to = override ?? '/';
  if (!override && rest) {
    if (slugs[rest]) {
      to = slugs[rest];
    } else if (rest.startsWith('collections/') || rest.startsWith('pages/')) {
      to = `/${rest}${url.search}`;
    }
  }

  return new Response(null, {
    status: 302,
    headers: {Location: to, 'Set-Cookie': experienceCookie(mode)},
  });
}
