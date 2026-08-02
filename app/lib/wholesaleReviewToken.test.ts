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
    expect(res.reason).toBe('bad_signature');
  });

  it('a token signed with a different secret fails', async () => {
    const token = await signReviewToken(base, SECRET);
    const res = await verifyReviewToken(token, 'a-different-secret');
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('bad_signature');
  });

  it('an expired token fails', async () => {
    const token = await signReviewToken({...base, exp: nowSeconds() - 1}, SECRET);
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('expired');
  });

  it('rejects malformed tokens', async () => {
    expect((await verifyReviewToken('', SECRET)).reason).toBe('malformed');
    expect((await verifyReviewToken('only-one-part', SECRET)).reason).toBe('malformed');
    expect((await verifyReviewToken('a.b.c', SECRET)).reason).toBe('malformed');
  });

  it('rejects an unsupported action', async () => {
    const token = await signReviewToken(
      {...base, act: 'frobnicate' as unknown as ReviewTokenPayload['act']},
      SECRET,
    );
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('bad_action');
  });

  it('rejects an invalid customer GID', async () => {
    const token = await signReviewToken({...base, cid: 'gid://shopify/Order/42'}, SECRET);
    const res = await verifyReviewToken(token, SECRET);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('bad_customer');
  });

  it('reports not_configured when there is no signing secret', async () => {
    const token = await signReviewToken(base, SECRET);
    expect((await verifyReviewToken(token, '')).reason).toBe('not_configured');
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
