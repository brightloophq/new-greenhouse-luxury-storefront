import {describe, it, expect} from 'vitest';
import {
  DEFAULT_EXPERIENCE,
  EXPERIENCES,
  isExperience,
  experienceFromCookieHeader,
  getExperienceFromRequest,
  experienceCookie,
  EXPERIENCE_COOKIE,
  themeForPath,
  PREMIUM_ROUTE,
} from '~/lib/experience';

describe('route-based theme (unified brand)', () => {
  it('is green everywhere except the premium catalogue', () => {
    expect(themeForPath('/')).toBe('classic');
    expect(themeForPath('/arrangements')).toBe('classic');
    expect(themeForPath('/arrangements/mixed')).toBe('classic');
    expect(themeForPath('/arrangements/occasion/birthday')).toBe('classic');
    expect(themeForPath('/classic/wholesale')).toBe('classic');
  });

  it('activates the elevated theme only on the premium-deluxe route', () => {
    expect(themeForPath(PREMIUM_ROUTE)).toBe('deluxe');
    expect(themeForPath(`${PREMIUM_ROUTE}/anything`)).toBe('deluxe');
  });
});

describe('experience state', () => {
  it('defaults to classic (client decision)', () => {
    expect(DEFAULT_EXPERIENCE).toBe('classic');
    expect(EXPERIENCES).toEqual(['classic', 'deluxe']);
  });

  it('validates experience values', () => {
    expect(isExperience('classic')).toBe(true);
    expect(isExperience('deluxe')).toBe(true);
    expect(isExperience('standard')).toBe(false);
    expect(isExperience(undefined)).toBe(false);
  });

  it('reads the cookie, falling back to the default', () => {
    expect(experienceFromCookieHeader(null)).toBe('classic');
    expect(experienceFromCookieHeader('')).toBe('classic');
    expect(experienceFromCookieHeader(`${EXPERIENCE_COOKIE}=deluxe`)).toBe('deluxe');
    expect(experienceFromCookieHeader(`${EXPERIENCE_COOKIE}=classic`)).toBe('classic');
    // invalid value → default, never throws
    expect(experienceFromCookieHeader(`${EXPERIENCE_COOKIE}=bogus`)).toBe('classic');
    // co-existing cookies
    expect(
      experienceFromCookieHeader(`cart=abc; ${EXPERIENCE_COOKIE}=deluxe; x=1`),
    ).toBe('deluxe');
  });

  it('reads from a Request', () => {
    const req = new Request('https://x.test/', {
      headers: {Cookie: `${EXPERIENCE_COOKIE}=deluxe`},
    });
    expect(getExperienceFromRequest(req)).toBe('deluxe');
    expect(getExperienceFromRequest(new Request('https://x.test/'))).toBe('classic');
  });

  it('serializes a persistent Set-Cookie value', () => {
    const c = experienceCookie('deluxe');
    expect(c).toContain(`${EXPERIENCE_COOKIE}=deluxe`);
    expect(c).toContain('Path=/');
    expect(c).toContain('SameSite=Lax');
    expect(c).toMatch(/Max-Age=\d+/);
  });
});
