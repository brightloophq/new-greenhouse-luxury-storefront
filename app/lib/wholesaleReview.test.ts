import {describe, it, expect, vi} from 'vitest';
import {
  readReviewConfig,
  isReviewConfigured,
  decisionUrl,
  isDecidable,
  buildDecisionMetafields,
  commitReviewDecision,
} from './wholesaleReview';

describe('readReviewConfig', () => {
  it('defaults TTL to 48h and trims the base URL', () => {
    const c = readReviewConfig({WHOLESALE_REVIEW_BASE_URL: 'https://x.com//'});
    expect(c.ttlSeconds).toBe(172800);
    expect(c.baseUrl).toBe('https://x.com');
    expect(c.signingSecret).toBe('');
  });

  it('parses a positive TTL and rejects invalid ones', () => {
    expect(readReviewConfig({WHOLESALE_REVIEW_LINK_TTL_SECONDS: '3600'}).ttlSeconds).toBe(3600);
    expect(readReviewConfig({WHOLESALE_REVIEW_LINK_TTL_SECONDS: '-5'}).ttlSeconds).toBe(172800);
    expect(readReviewConfig({WHOLESALE_REVIEW_LINK_TTL_SECONDS: 'abc'}).ttlSeconds).toBe(172800);
  });

  it('isReviewConfigured requires both secret and base URL', () => {
    expect(isReviewConfigured({signingSecret: 's', ttlSeconds: 1, baseUrl: 'u'})).toBe(true);
    expect(isReviewConfigured({signingSecret: '', ttlSeconds: 1, baseUrl: 'u'})).toBe(false);
    expect(isReviewConfigured({signingSecret: 's', ttlSeconds: 1, baseUrl: ''})).toBe(false);
  });
});

describe('decisionUrl', () => {
  it('builds the internal review URL and url-encodes the token', () => {
    expect(decisionUrl('https://x.com', 'TOK')).toBe(
      'https://x.com/internal/wholesale/review?token=TOK',
    );
    expect(decisionUrl('https://x.com/', 'a b')).toContain('token=a%20b');
  });
});

describe('isDecidable', () => {
  it('only missing or pending are decidable', () => {
    expect(isDecidable('')).toBe(true);
    expect(isDecidable(null)).toBe(true);
    expect(isDecidable('  Pending  ')).toBe(true);
    expect(isDecidable('approved')).toBe(false);
    expect(isDecidable('rejected')).toBe(false);
    expect(isDecidable('more_information_required')).toBe(false);
  });
});

describe('buildDecisionMetafields', () => {
  const CID = 'gid://shopify/Customer/1';
  it('approve writes only wholesale_status = approved', () => {
    expect(buildDecisionMetafields(CID, 'approved', '')).toEqual([
      {
        ownerId: CID,
        namespace: 'custom',
        key: 'wholesale_status',
        type: 'single_line_text_field',
        value: 'approved',
      },
    ]);
  });

  it('reject writes status = rejected + the review note, never business_notes', () => {
    const mfs = buildDecisionMetafields(CID, 'rejected', 'incomplete TRN');
    expect(mfs.map((m) => m.key)).toEqual(['wholesale_status', 'wholesale_review_note']);
    expect(mfs.find((m) => m.key === 'wholesale_review_note')?.value).toBe('incomplete TRN');
    expect(mfs.some((m) => String(m.key) === 'business_notes')).toBe(false);
  });
});

describe('commitReviewDecision', () => {
  it('pending → approved writes and reports success', async () => {
    const writeDecision = vi.fn().mockResolvedValue({ok: true});
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'pending',
      writeDecision,
    });
    expect(res.view).toBe('success');
    expect(writeDecision).toHaveBeenCalledWith('approved', '');
  });

  it('missing status may be decided', async () => {
    const writeDecision = vi.fn().mockResolvedValue({ok: true});
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => '',
      writeDecision,
    });
    expect(res.view).toBe('success');
  });

  it('pending → rejected with a reason writes', async () => {
    const writeDecision = vi.fn().mockResolvedValue({ok: true});
    const res = await commitReviewDecision({
      action: 'rejected',
      reason: 'no documents',
      readStatus: async () => 'pending',
      writeDecision,
    });
    expect(res.view).toBe('success');
    expect(writeDecision).toHaveBeenCalledWith('rejected', 'no documents');
  });

  it('reject without a reason → reason_required and NO write', async () => {
    const writeDecision = vi.fn();
    const res = await commitReviewDecision({
      action: 'rejected',
      reason: '',
      readStatus: async () => 'pending',
      writeDecision,
    });
    expect(res.view).toBe('reason_required');
    expect(writeDecision).not.toHaveBeenCalled();
  });

  it('already approved → decided and NO overwrite (idempotent replay)', async () => {
    const writeDecision = vi.fn();
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'approved',
      writeDecision,
    });
    expect(res).toEqual({view: 'decided', status: 'approved'});
    expect(writeDecision).not.toHaveBeenCalled();
  });

  it('already rejected → decided and NO overwrite', async () => {
    const writeDecision = vi.fn();
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'rejected',
      writeDecision,
    });
    expect(res.view).toBe('decided');
    expect(writeDecision).not.toHaveBeenCalled();
  });

  it('more_information_required → decided and NO overwrite', async () => {
    const writeDecision = vi.fn();
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'more_information_required',
      writeDecision,
    });
    expect(res.view).toBe('decided');
    expect(writeDecision).not.toHaveBeenCalled();
  });

  it('read failure → error and NO write', async () => {
    const writeDecision = vi.fn();
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => {
        throw new Error('read failed');
      },
      writeDecision,
    });
    expect(res.view).toBe('error');
    expect(writeDecision).not.toHaveBeenCalled();
  });

  it('write failure (ok:false) → error, never success', async () => {
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'pending',
      writeDecision: async () => ({ok: false}),
    });
    expect(res.view).toBe('error');
  });

  it('write throwing → error', async () => {
    const res = await commitReviewDecision({
      action: 'approved',
      reason: '',
      readStatus: async () => 'pending',
      writeDecision: async () => {
        throw new Error('boom');
      },
    });
    expect(res.view).toBe('error');
  });
});
