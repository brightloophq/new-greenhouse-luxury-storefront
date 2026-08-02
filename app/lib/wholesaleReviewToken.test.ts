import {describe, it, expect} from 'vitest';
import {
  signReviewToken,
  verifyReviewToken,
  reviewNonce,
  nowSeconds,
  type ReviewTokenPayload,
} from './wholesaleReviewToken';

const SECRET = 'unit-test-signing-secret';
const base: ReviewTokenPayload = {
  cid: 'gid://shopify/Customer/42',
  act: 'approved',
  exp: nowSeconds() + 3600,
  nonce: 'abc123def456',
};

// Helpers to craft a token with a VALID signature over an arbitrary body — used
// to exercise the post-signature failure paths (decode_failed, json_invalid).
function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hmacB64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}
async function signRawBody(body: string, secret: string): Promise<string> {
  return `${body}.${await hmacB64url(secret, body)}`;
}

describe('signReviewToken / verifyReviewToken', () => {
  it('a freshly signed token verifies and round-trips the payload', async () => {
    const token = await signReviewToken(base, SECRET);
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(true);
    expect(res.payload).toMatchObject({cid: base.cid, act: 'approved', exp: base.exp});
  });

  it('a tampered token fails with bad_signature', async () => {
    const token = await signReviewToken(base, SECRET);
    const [body, sig] = token.split('.');
    const flipped = body.slice(0, -1) + (body.slice(-1) === 'A' ? 'B' : 'A');
    const res = await verifyReviewToken(`${flipped}.${sig}`, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('signature_invalid');
  });

  it('a token signed with a different secret fails', async () => {
    const token = await signReviewToken(base, SECRET);
    const res = await verifyReviewToken(token, 'a-different-secret');
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('signature_invalid');
  });

  it('an expired token fails', async () => {
    const token = await signReviewToken({...base, exp: nowSeconds() - 1}, SECRET);
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('expired');
  });

  it('rejects structurally malformed tokens as payload_invalid', async () => {
    expect((await verifyReviewToken('', SECRET)).reason).toBe('payload_invalid');
    expect((await verifyReviewToken('only-one-part', SECRET)).reason).toBe('payload_invalid');
    expect((await verifyReviewToken('a.b.c', SECRET)).reason).toBe('payload_invalid');
  });

  it('rejects an unsupported action', async () => {
    const token = await signReviewToken(
      {...base, act: 'frobnicate' as unknown as ReviewTokenPayload['act']},
      SECRET,
    );
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('action_invalid');
  });

  it('rejects an invalid customer GID', async () => {
    const token = await signReviewToken({...base, cid: 'gid://shopify/Order/42'}, SECRET);
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('gid_invalid');
  });

  it('reports secret_missing when there is no signing secret', async () => {
    const token = await signReviewToken(base, SECRET);
    expect((await verifyReviewToken(token, '')).reason).toBe('secret_missing');
  });

  it('reports missing_fields when a required field is absent', async () => {
    // exp omitted
    const token = await signReviewToken(
      {cid: base.cid, act: 'approved', nonce: 'n'} as unknown as ReviewTokenPayload,
      SECRET,
    );
    expect((await verifyReviewToken(token, SECRET)).reason).toBe('missing_fields');
  });

  it('reports json_invalid for a validly-signed body that is not JSON', async () => {
    const body = b64url(new TextEncoder().encode('not json {'));
    const token = await signRawBody(body, SECRET);
    expect((await verifyReviewToken(token, SECRET)).reason).toBe('json_invalid');
  });

  it('reports decode_failed for a validly-signed body that is not base64url', async () => {
    const token = await signRawBody('@@@not-base64@@@', SECRET);
    expect((await verifyReviewToken(token, SECRET)).reason).toBe('decode_failed');
  });

  it('the token payload contains ONLY the whitelisted keys — no CRA/TRN or PII', async () => {
    const token = await signReviewToken(
      {...base, ver: '2026-07-28T12:00:00.000Z'},
      SECRET,
    );
    const body = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(body, 'base64').toString('utf8');
    expect(json).not.toContain('123-456-789');
    expect(json).not.toContain('Petal');
    expect(json).not.toContain('@');
    expect(Object.keys(JSON.parse(json) as Record<string, unknown>).sort()).toEqual([
      'act',
      'cid',
      'exp',
      'nonce',
      'ver',
    ]);
  });

  it('reviewNonce is random hex', () => {
    expect(reviewNonce()).not.toBe(reviewNonce());
    expect(reviewNonce()).toMatch(/^[0-9a-f]{24}$/);
  });
});
