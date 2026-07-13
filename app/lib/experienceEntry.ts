import {redirect} from 'react-router';
import {experienceCookie, type ExperienceMode} from '~/lib/experience';

/**
 * Entry-route logic for `/classic`, `/deluxe` and their deep-link splats
 * (Option A — see docs/FOCUSED_DUAL_STORE_AUDIT.md). These routes exist to:
 *   1. set the `ng_experience` cookie so the shopper persists in the chosen
 *      experience across navigation and refresh, and
 *   2. 302 to the canonical, unprefixed in-store path so marketing deep links
 *      never create duplicate-content URLs.
 *
 * The cart is never touched; prices are never changed. Only same-origin,
 * absolute-path targets are honoured.
 */

/**
 * Friendly Classic deep-link slugs → canonical store paths. Keeps marketing
 * URLs (`/classic/wholesale`) stable even before dedicated landing pages ship.
 */
const CLASSIC_SLUGS: Record<string, string> = {
  wholesale: '/collections/bulk-flowers',
  supplies: '/collections/floral-supplies',
  greenery: '/collections/greenery-and-fillers',
};

const DELUXE_SLUGS: Record<string, string> = {
  signature: '/collections/all-flowers',
  gifts: '/collections/add-ons',
  premium: '/collections/roses',
  occasions: '/collections/birthday',
};

/** Sanitize an arbitrary target to a safe, same-origin absolute path. */
function safePath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
  return candidate;
}

/**
 * Resolve `/classic` or `/deluxe` (optionally `?to=`) to a canonical redirect
 * that also sets the experience cookie.
 */
export function enterExperience(request: Request, mode: ExperienceMode) {
  const url = new URL(request.url);
  const to = safePath(url.searchParams.get('to')) ?? '/';
  return redirect(to, {headers: {'Set-Cookie': experienceCookie(mode)}});
}

/**
 * Resolve a deep link splat (`/classic/*`, `/deluxe/*`) to a canonical store
 * path and set the experience cookie. Handles friendly slugs, `collections/*`
 * and `pages/*` pass-through, and `?to=` override; falls back to the homepage.
 */
export function enterExperienceDeepLink(
  request: Request,
  mode: ExperienceMode,
  splat: string | undefined,
) {
  const url = new URL(request.url);
  const override = safePath(url.searchParams.get('to'));
  const rest = (splat ?? '').replace(/^\/+/, '');
  const slugs = mode === 'deluxe' ? DELUXE_SLUGS : CLASSIC_SLUGS;

  let to = override ?? '/';
  if (!override && rest) {
    if (slugs[rest]) {
      to = slugs[rest];
    } else if (rest.startsWith('collections/') || rest.startsWith('pages/')) {
      to = `/${rest}${url.search}`;
    }
  }

  return redirect(to, {headers: {'Set-Cookie': experienceCookie(mode)}});
}
