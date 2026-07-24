import {describe, expect, it} from 'vitest';
import {
  buildPreviewCookie,
  hasPreviewAccess,
  isPreviewMode,
  passwordMatches,
  previewGateResponse,
  safePreviewNext,
} from './previewGate';

const req = (url: string, cookie?: string) =>
  new Request(url, cookie ? {headers: {Cookie: cookie}} : undefined);

describe('preview gate — the master switch is fail-safe', () => {
  it('is inert unless PREVIEW_MODE is exactly "true"', () => {
    expect(isPreviewMode({})).toBe(false);
    expect(isPreviewMode({PREVIEW_MODE: 'false'})).toBe(false);
    expect(isPreviewMode({PREVIEW_MODE: '1'})).toBe(false);
    expect(isPreviewMode({PREVIEW_MODE: 'TRUE'})).toBe(false);
    expect(isPreviewMode({PREVIEW_MODE: 'true'})).toBe(true);
  });

  it('returns null (no change) for every request when disabled', () => {
    expect(previewGateResponse(req('https://x.co/'), {})).toBeNull();
    expect(
      previewGateResponse(req('https://x.co/collections/roses'), {
        PREVIEW_MODE: 'false',
      }),
    ).toBeNull();
  });
});

describe('preview gate — when enabled', () => {
  const env = {PREVIEW_MODE: 'true', PREVIEW_PASSWORD: 'secret'};

  it('redirects a gated page to /preview and remembers the intended path', () => {
    const res = previewGateResponse(req('https://x.co/wholesale?a=1'), env);
    expect(res?.status).toBe(302);
    const loc = new URL(res!.headers.get('Location')!);
    expect(loc.pathname).toBe('/preview');
    expect(loc.searchParams.get('next')).toBe('/wholesale?a=1');
    expect(res!.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('lets the launch page, assets and system files through', () => {
    for (const p of [
      '/preview',
      '/favicon.ico',
      '/robots.txt',
      '/manifest.webmanifest',
      '/fonts/raleway.woff2',
      '/images/collection-heroes/best-sellers-1600.webp',
      '/video/hero.mp4',
      '/build/entry.client.js',
      '/whatever.css',
    ]) {
      expect(previewGateResponse(req(`https://x.co${p}`), env)).toBeNull();
    }
  });

  it('lets a visitor with the access cookie through', () => {
    expect(
      previewGateResponse(req('https://x.co/', 'preview_access=true'), env),
    ).toBeNull();
    expect(hasPreviewAccess(req('https://x.co/', 'other=1; preview_access=true'))).toBe(
      true,
    );
    expect(hasPreviewAccess(req('https://x.co/'))).toBe(false);
  });
});

describe('preview gate — security helpers', () => {
  it('rejects open-redirect return targets', () => {
    expect(safePreviewNext('/wholesale')).toBe('/wholesale');
    expect(safePreviewNext('//evil.com')).toBe('/');
    expect(safePreviewNext('https://evil.com')).toBe('/');
    expect(safePreviewNext('/preview?x=1')).toBe('/');
    expect(safePreviewNext(null)).toBe('/');
  });

  it('matches the password only when it is set and equal', () => {
    expect(passwordMatches('secret', 'secret')).toBe(true);
    expect(passwordMatches('secret', 'nope')).toBe(false);
    expect(passwordMatches('secret', undefined)).toBe(false);
    // An empty/unset PREVIEW_PASSWORD must never grant access.
    expect(passwordMatches('', '')).toBe(false);
  });

  it('issues a 7-day secure, http-only cookie', () => {
    const c = buildPreviewCookie();
    expect(c).toContain('preview_access=true');
    expect(c).toContain('Max-Age=604800');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
  });
});
