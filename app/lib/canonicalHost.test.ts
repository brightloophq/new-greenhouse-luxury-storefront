import {describe, expect, it} from 'vitest';
import {canonicalHostRedirect, CANONICAL_HOST} from './canonicalHost';

const req = (url: string) => new Request(url);

describe('canonicalHostRedirect', () => {
  it('301s the bare apex to the canonical host, preserving path + query', () => {
    const res = canonicalHostRedirect(
      req('https://thenewgreenhouseja.com/wholesale/flowers?sort=price-desc'),
    );
    expect(res?.status).toBe(301);
    expect(res?.headers.get('Location')).toBe(
      `https://${CANONICAL_HOST}/wholesale/flowers?sort=price-desc`,
    );
  });

  it('301s the www apex too', () => {
    const res = canonicalHostRedirect(req('https://www.thenewgreenhouseja.com/'));
    expect(res?.status).toBe(301);
    expect(res?.headers.get('Location')).toBe(`https://${CANONICAL_HOST}/`);
  });

  it('forces https even if the apex was reached over http', () => {
    const res = canonicalHostRedirect(req('http://thenewgreenhouseja.com/about'));
    expect(res?.headers.get('Location')).toBe(`https://${CANONICAL_HOST}/about`);
  });

  it('does NOT redirect the canonical host itself (no loop)', () => {
    expect(canonicalHostRedirect(req(`https://${CANONICAL_HOST}/`))).toBeNull();
    expect(
      canonicalHostRedirect(req(`https://${CANONICAL_HOST}/wholesale`)),
    ).toBeNull();
  });

  it('leaves Oxygen previews and localhost alone', () => {
    expect(
      canonicalHostRedirect(
        req('https://new-greenhouse-luxury-storefront-abc123.o2.myshopify.dev/'),
      ),
    ).toBeNull();
    expect(canonicalHostRedirect(req('http://localhost:3000/retail'))).toBeNull();
  });
});
