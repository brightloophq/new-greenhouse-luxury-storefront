import {describe, expect, it} from 'vitest';
import {loginHref, safeReturnTo, LOGIN_PATH} from '~/lib/authReturnTo';

/**
 * Step 15 — the return-to gate in front of the Shopify OAuth hand-off. Every
 * case here is an open-redirect shape a signed-out customer could be walked
 * into, so these are security tests, not formatting tests.
 */
describe('safeReturnTo', () => {
  it('accepts same-origin paths, with or without a query string', () => {
    expect(safeReturnTo('/wholesale')).toBe('/wholesale');
    expect(safeReturnTo('/arrangements/occasion/birthday')).toBe(
      '/arrangements/occasion/birthday',
    );
    expect(safeReturnTo('/search?q=roses&page=2')).toBe('/search?q=roses&page=2');
  });

  it('drops the hash — the server never receives it', () => {
    expect(safeReturnTo('/product/roses#reviews')).toBe('/product/roses');
  });

  it('rejects absolute URLs to another origin', () => {
    expect(safeReturnTo('https://evil.example/steal')).toBeNull();
    expect(safeReturnTo('http://evil.example')).toBeNull();
    expect(safeReturnTo('//evil.example/steal')).toBeNull();
    expect(safeReturnTo('/\\evil.example')).toBeNull();
  });

  it('rejects scheme-bearing and relative shapes', () => {
    expect(safeReturnTo('javascript:alert(1)')).toBeNull();
    expect(safeReturnTo('data:text/html,<script>')).toBeNull();
    expect(safeReturnTo('wholesale')).toBeNull();
    expect(safeReturnTo('../account')).toBeNull();
  });

  it('rejects control characters and whitespace (header-splitting shapes)', () => {
    expect(safeReturnTo('/wholesale\nLocation: https://evil.example')).toBeNull();
    expect(safeReturnTo('/whole sale')).toBeNull();
    expect(safeReturnTo(`/wholesale${String.fromCharCode(13)}`)).toBeNull();
    expect(safeReturnTo(`/wholesale${String.fromCharCode(0)}`)).toBeNull();
  });

  it('refuses to loop a customer back into the auth routes', () => {
    expect(safeReturnTo('/account/login')).toBeNull();
    expect(safeReturnTo('/account/authorize')).toBeNull();
    expect(safeReturnTo('/account/logout')).toBeNull();
    // …but the account area itself is a legitimate destination.
    expect(safeReturnTo('/account/orders')).toBe('/account/orders');
  });

  it('rejects empty, non-string and over-long values', () => {
    expect(safeReturnTo('')).toBeNull();
    expect(safeReturnTo('   ')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo(`/${'a'.repeat(600)}`)).toBeNull();
  });
});

describe('loginHref', () => {
  it('always targets the server-side Shopify hand-off', () => {
    expect(loginHref('/wholesale')).toMatch(new RegExp(`^${LOGIN_PATH}\\?`));
    expect(LOGIN_PATH).toBe('/account/login');
  });

  it('encodes the destination Hydrogen reads back as redirectPath', () => {
    expect(loginHref('/search?q=roses')).toBe(
      '/account/login?return_to=%2Fsearch%3Fq%3Droses',
    );
  });

  it('falls back to a bare hand-off when the destination is unsafe', () => {
    expect(loginHref('//evil.example')).toBe(LOGIN_PATH);
    expect(loginHref('/account/login')).toBe(LOGIN_PATH);
    expect(loginHref(undefined)).toBe(LOGIN_PATH);
  });
});
