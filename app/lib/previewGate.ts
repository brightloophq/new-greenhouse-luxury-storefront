/**
 * Private-preview gate.
 *
 * A single env flag, `PREVIEW_MODE`, decides whether the whole storefront is
 * held behind a launch page. When it is anything other than the string
 * `'true'` the gate is INERT — `previewGateResponse` returns null and the site
 * behaves exactly as it does in production today. That fail-safe is the point:
 * forgetting to set the variable can never accidentally lock the store, and
 * turning the flag off on launch day restores the public site with no code
 * change and no deletion.
 *
 * The check runs in `server.ts` before routing (like the experience-entry
 * policy), so it costs one cookie read on the edge and never touches the
 * React Router tree.
 */

export const PREVIEW_COOKIE = 'preview_access';
export const PREVIEW_PATH = '/preview';

/** Preview access lasts seven days, per launch brief. */
const PREVIEW_MAX_AGE = 60 * 60 * 24 * 7;

type PreviewEnv = {PREVIEW_MODE?: string; PREVIEW_PASSWORD?: string};

/** Narrow the generated `Env` to just the preview bindings we read. */
export function readPreviewEnv(env: unknown): PreviewEnv {
  return (env ?? {}) as PreviewEnv;
}

/** The gate is active ONLY when the flag is exactly `'true'`. */
export function isPreviewMode(env: unknown): boolean {
  return readPreviewEnv(env).PREVIEW_MODE === 'true';
}

/**
 * Paths that must stay reachable while gated: the launch page itself, crawler
 * and PWA manifests, and every static asset (so the launch page can actually
 * load its own CSS, fonts and imagery). Everything else is gated.
 */
function isAlwaysPublic(pathname: string): boolean {
  if (pathname === PREVIEW_PATH) return true;
  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/build/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/video/')
  ) {
    return true;
  }
  // Any request for a file with an asset-like extension.
  return /\.(?:css|js|mjs|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4|webm|json|txt|xml|pdf)$/i.test(
    pathname,
  );
}

/** True when the visitor already holds a valid preview cookie. */
export function hasPreviewAccess(request: Request): boolean {
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie
    .split(';')
    .some((part) => part.trim() === `${PREVIEW_COOKIE}=true`);
}

/**
 * Returns a 302 to the launch page for gated requests, or null to fall through
 * to normal routing. Null whenever the gate is disabled, the path is public, or
 * the visitor already has access — so the common (ungated) path adds nothing.
 */
export function previewGateResponse(
  request: Request,
  env: unknown,
): Response | null {
  if (!isPreviewMode(env)) return null;

  const url = new URL(request.url);
  if (isAlwaysPublic(url.pathname)) return null;
  if (hasPreviewAccess(request)) return null;

  const to = new URL(PREVIEW_PATH, url.origin);
  const next = url.pathname + url.search;
  if (next && next !== '/') to.searchParams.set('next', next);
  return new Response(null, {
    status: 302,
    headers: {Location: to.toString(), 'X-Robots-Tag': 'noindex, nofollow'},
  });
}

/** The Set-Cookie granting seven days of preview access. HttpOnly + Secure. */
export function buildPreviewCookie(): string {
  return `${PREVIEW_COOKIE}=true; Max-Age=${PREVIEW_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Validate a post-login return path. Same-origin absolute paths only — never a
 * protocol-relative `//host` or a loop back onto the gate — so the gate can
 * never be turned into an open redirect.
 */
export function safePreviewNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.startsWith(PREVIEW_PATH)) return '/';
  return next;
}

/** Constant-time-ish password compare (avoids trivial length/early-exit leaks). */
export function passwordMatches(
  submitted: string,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  if (submitted.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < submitted.length; i += 1) {
    diff |= submitted.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
