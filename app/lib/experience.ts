/**
 * Dual-experience state — the single source of truth for Classic vs Deluxe.
 *
 * Persistence is a cookie read server-side (SSR-safe: no window/localStorage on
 * the server), rendered as `<html data-experience>` so the correct palette is
 * present on first paint (no hydration flash). See docs/DUAL_EXPERIENCE_AUDIT.md.
 */
export type ExperienceMode = 'classic' | 'deluxe';

export const EXPERIENCES: readonly ExperienceMode[] = ['classic', 'deluxe'];

/** Default when no cookie/entry is present (client decision: Classic). */
export const DEFAULT_EXPERIENCE: ExperienceMode = 'classic';

export const EXPERIENCE_COOKIE = 'ng_experience';

/** One year. */
export const EXPERIENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isExperience(value: unknown): value is ExperienceMode {
  return value === 'classic' || value === 'deluxe';
}

/**
 * The ONLY route that activates the elevated (Premium/Deluxe) visual theme.
 * Everything else is the one green botanical brand. Visual theme is resolved
 * from the route here — deliberately decoupled from product classification and
 * from any cookie, so Mixed/Occasion (whose products are Deluxe-classified)
 * still render green.
 */
export const PREMIUM_ROUTE = '/arrangements/premium-deluxe';

/** Resolve the visual theme for a pathname (green everywhere but the premium catalogue). */
export function themeForPath(pathname: string): ExperienceMode {
  return pathname.startsWith(PREMIUM_ROUTE) ? 'deluxe' : 'classic';
}

/** Read the active experience from a request's Cookie header. */
export function getExperienceFromRequest(request: Request): ExperienceMode {
  return experienceFromCookieHeader(request.headers.get('Cookie'));
}

/** Parse the experience out of a raw Cookie header string. */
export function experienceFromCookieHeader(
  cookieHeader: string | null | undefined,
): ExperienceMode {
  if (!cookieHeader) return DEFAULT_EXPERIENCE;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${EXPERIENCE_COOKIE}=([^;]+)`),
  );
  const value = match?.[1]?.trim();
  return isExperience(value) ? value : DEFAULT_EXPERIENCE;
}

/** Serialize a Set-Cookie value persisting the chosen experience. */
export function experienceCookie(mode: ExperienceMode): string {
  return `${EXPERIENCE_COOKIE}=${mode}; Path=/; Max-Age=${EXPERIENCE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
