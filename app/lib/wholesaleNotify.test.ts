import {describe, expect, it, vi} from 'vitest';
import {
  readNotifyConfig,
  isNotifyConfigured,
  maskCraNumber,
  buildWholesaleNotificationEmail,
  sendWholesaleNotificationEmail,
  resolveWholesaleStatus,
  wholesaleStatusLabel,
  describeMetafieldUserErrors,
  extractCustomerNumericId,
  buildReviewUrl,
  buildReviewActionLinks,
  diagnoseReviewLinks,
  processWholesaleSubmission,
  type WholesaleNotificationPayload,
  type WholesaleNotifyConfig,
} from './wholesaleNotify';

const CONFIG: WholesaleNotifyConfig = {
  resendApiKey: 're_test_key',
  from: 'The New Greenhouse <notifications@notifications.thenewgreenhouseja.com>',
  replyTo: 'wholesale@thenewgreenhouseja.com',
  recipient: 'wholesale@thenewgreenhouseja.com',
  adminStoreHandle: 'the-new-greenhouse',
  reviewSigningSecret: 'test-signing-secret',
  reviewTtlSeconds: 172800,
  reviewBaseUrl: 'https://shop.example.com',
};

const ACTIONS = {
  approveUrl: 'https://shop.example.com/internal/wholesale/review?token=APPROVE',
  rejectUrl: 'https://shop.example.com/internal/wholesale/review?token=REJECT',
};

const PAYLOAD: WholesaleNotificationPayload = {
  businessName: 'Petal & Vine',
  businessType: 'Florist',
  businessPhone: '(876) 555-0100',
  contactEmail: 'owner@petalvine.com',
  craNumber: '123-456-789',
  customerId: 'gid://shopify/Customer/42',
  submittedAt: '2026-07-28T12:00:00.000Z',
  status: 'pending',
};

describe('CRA/TRN masking', () => {
  it('masks everything but the last four digits', () => {
    expect(maskCraNumber('123456789')).toBe('*****6789');
    expect(maskCraNumber('123-456-789')).toBe('*****6789');
    expect(maskCraNumber('12')).toBe('*****');
    expect(maskCraNumber('')).toBe('*****');
  });
});

describe('email builder', () => {
  const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG);

  it('addresses from / reply-to / recipient correctly', () => {
    expect(email.from).toBe(CONFIG.from);
    expect(email.reply_to).toBe('wholesale@thenewgreenhouseja.com');
    expect(email.to).toBe('wholesale@thenewgreenhouseja.com');
    expect(email.subject).toBe('New Wholesale Application');
  });

  it('includes every required field with the FULL CRA/TRN in the body', () => {
    expect(email.text).toContain('Business Name: Petal & Vine');
    expect(email.text).toContain('Business Type: Florist');
    expect(email.text).toContain('Business Phone: (876) 555-0100');
    expect(email.text).toContain('Contact Email: owner@petalvine.com');
    // Internal staff notification → full CRA/TRN, plain + copyable, never masked.
    expect(email.text).toContain('CRA/TRN: 123-456-789');
    expect(email.html).toContain('123-456-789');
    expect(email.text).toContain('Shopify Customer ID: gid://shopify/Customer/42');
    expect(email.text).toContain('Submission Date: 2026-07-28T12:00:00.000Z');
    expect(email.text).toContain('Status: Pending Manual Review');
  });

  it('never puts the CRA/TRN in the subject', () => {
    expect(email.subject).toBe('New Wholesale Application');
    expect(email.subject).not.toContain('123-456-789');
    expect(email.subject).not.toContain('123456789');
  });

  it('reflects an existing staff status without ever writing it', () => {
    const approved = buildWholesaleNotificationEmail(
      {...PAYLOAD, status: 'approved'},
      CONFIG,
    );
    expect(approved.text).toContain('Status: Approved (existing wholesale account)');
    const rejected = buildWholesaleNotificationEmail(
      {...PAYLOAD, status: 'rejected'},
      CONFIG,
    );
    expect(rejected.text).toContain('Status: Rejected (existing decision)');
  });
});

describe('extractCustomerNumericId', () => {
  it('extracts the numeric id from a valid Customer GID', () => {
    expect(extractCustomerNumericId('gid://shopify/Customer/42')).toBe('42');
    expect(extractCustomerNumericId(' gid://shopify/Customer/7350012 ')).toBe(
      '7350012',
    );
  });

  it('rejects anything that is not exactly a Customer GID', () => {
    expect(extractCustomerNumericId('gid://shopify/Order/42')).toBeNull();
    expect(extractCustomerNumericId('gid://shopify/Customer/')).toBeNull();
    expect(extractCustomerNumericId('gid://shopify/Customer/abc')).toBeNull();
    expect(extractCustomerNumericId('42')).toBeNull();
    expect(extractCustomerNumericId('')).toBeNull();
    expect(
      extractCustomerNumericId('gid://shopify/Customer/42/extra'),
    ).toBeNull();
  });
});

describe('buildReviewUrl', () => {
  it('builds the Shopify Admin customer URL from a valid GID + handle', () => {
    expect(
      buildReviewUrl('gid://shopify/Customer/42', 'the-new-greenhouse'),
    ).toBe('https://admin.shopify.com/store/the-new-greenhouse/customers/42');
  });

  it('matches the exact production URL shape (handle ax41k1-k5)', () => {
    expect(buildReviewUrl('gid://shopify/Customer/1234567890', 'ax41k1-k5')).toBe(
      'https://admin.shopify.com/store/ax41k1-k5/customers/1234567890',
    );
  });

  it('accepts a handle that mistakenly includes .myshopify.com', () => {
    expect(
      buildReviewUrl('gid://shopify/Customer/42', 'the-new-greenhouse.myshopify.com'),
    ).toBe('https://admin.shopify.com/store/the-new-greenhouse/customers/42');
  });

  it('returns null for an invalid customer GID', () => {
    expect(buildReviewUrl('gid://shopify/Order/42', 'the-new-greenhouse')).toBeNull();
    expect(buildReviewUrl('not-a-gid', 'the-new-greenhouse')).toBeNull();
  });

  it('returns null when the store handle is missing or invalid', () => {
    expect(buildReviewUrl('gid://shopify/Customer/42', '')).toBeNull();
    expect(buildReviewUrl('gid://shopify/Customer/42', '   ')).toBeNull();
    expect(buildReviewUrl('gid://shopify/Customer/42', undefined)).toBeNull();
    expect(buildReviewUrl('gid://shopify/Customer/42', 'bad handle!')).toBeNull();
  });
});

describe('Review in Shopify button (HTML + text)', () => {
  it('HTML includes the Review in Shopify button linking only to the customer record', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG);
    expect(email.html).toContain('Review in Shopify');
    expect(email.html).toContain(
      'href="https://admin.shopify.com/store/the-new-greenhouse/customers/42"',
    );
  });

  it('plain text includes the review URL when available', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG);
    expect(email.text).toContain(
      'Review in Shopify: https://admin.shopify.com/store/the-new-greenhouse/customers/42',
    );
  });

  it('omits the button (and URL) when the store handle is missing', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, {
      ...CONFIG,
      adminStoreHandle: '',
    });
    expect(email.html).not.toContain('href="https://admin.shopify.com');
    expect(email.text).not.toContain('Review in Shopify: https://');
    // plain customer reference is kept
    expect(email.text).toContain('Shopify Customer ID: gid://shopify/Customer/42');
    expect(email.html).toContain('gid://shopify/Customer/42');
  });

  it('omits the button when the customer GID is invalid', () => {
    const email = buildWholesaleNotificationEmail(
      {...PAYLOAD, customerId: 'gid://shopify/Order/42'},
      CONFIG,
    );
    expect(email.html).not.toContain('href="https://admin.shopify.com');
    expect(email.text).not.toContain('Review in Shopify: https://');
  });

  it('without action links, the only link is the read-only customer record', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG);
    const hrefs = [...email.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      'https://admin.shopify.com/store/the-new-greenhouse/customers/42',
    ]);
  });

  it('with action links, adds Approve + Reject buttons and keeps Review in Shopify', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG, ACTIONS);
    expect(email.html).toContain('Approve Application');
    expect(email.html).toContain('Reject Application');
    expect(email.html).toContain(`href="${ACTIONS.approveUrl}"`);
    expect(email.html).toContain(`href="${ACTIONS.rejectUrl}"`);
    expect(email.text).toContain(`Approve Application: ${ACTIONS.approveUrl}`);
    expect(email.text).toContain(`Reject Application: ${ACTIONS.rejectUrl}`);
    expect(email.html).toContain('Review in Shopify');
  });

  it('the CRA/TRN never appears in any link (href) in the email', () => {
    const email = buildWholesaleNotificationEmail(PAYLOAD, CONFIG, ACTIONS);
    const hrefs = [...email.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      expect(href).not.toContain('123-456-789');
      expect(href).not.toContain('123456789');
    }
  });

  it('HTML-escapes profile values (no injection)', () => {
    const email = buildWholesaleNotificationEmail(
      {...PAYLOAD, businessName: 'A & B <script>'},
      CONFIG,
    );
    expect(email.html).toContain('A &amp; B &lt;script&gt;');
    expect(email.html).not.toContain('<script>');
  });
});

describe('sending still works when the review URL cannot be built', () => {
  it('sends the email even with no store handle (button omitted)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ok: true, status: 200} as Response);
    const result = await sendWholesaleNotificationEmail(
      PAYLOAD,
      {...CONFIG, adminStoreHandle: ''},
      fetchImpl,
    );
    expect(result).toEqual({sent: true});
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe('wholesaleStatusLabel', () => {
  it('labels a first/pending submission as Pending Manual Review', () => {
    expect(wholesaleStatusLabel('pending')).toBe('Pending Manual Review');
  });

  it('labels each staff-set status distinctly', () => {
    expect(wholesaleStatusLabel('approved')).toBe(
      'Approved (existing wholesale account)',
    );
    expect(wholesaleStatusLabel('rejected')).toBe('Rejected (existing decision)');
    expect(wholesaleStatusLabel('more_information_required')).toBe(
      'More Information Required (existing)',
    );
  });
});

describe('readNotifyConfig', () => {
  it('reads every value from env — no hardcoded addresses or secrets', () => {
    const cfg = readNotifyConfig({
      RESEND_API_KEY: 're_x',
      WHOLESALE_NOTIFY_FROM: 'From <from@env.example>',
      WHOLESALE_NOTIFY_REPLY_TO: 'reply@env.example',
      WHOLESALE_INTERNAL_EMAIL: 'inbox@env.example',
    });
    expect(cfg).toEqual({
      resendApiKey: 're_x',
      from: 'From <from@env.example>',
      replyTo: 'reply@env.example',
      recipient: 'inbox@env.example',
      adminStoreHandle: '',
      reviewSigningSecret: '',
      reviewTtlSeconds: 172800,
      reviewBaseUrl: '',
    });
  });

  it('reads the review signing secret, TTL and base URL from env', () => {
    const cfg = readNotifyConfig({
      WHOLESALE_REVIEW_SIGNING_SECRET: 's3cret',
      WHOLESALE_REVIEW_LINK_TTL_SECONDS: '3600',
      WHOLESALE_REVIEW_BASE_URL: 'https://shop.example.com/',
    });
    expect(cfg.reviewSigningSecret).toBe('s3cret');
    expect(cfg.reviewTtlSeconds).toBe(3600);
    // trailing slash trimmed
    expect(cfg.reviewBaseUrl).toBe('https://shop.example.com');
  });

  it('reads the admin store handle from env', () => {
    const cfg = readNotifyConfig({SHOPIFY_ADMIN_STORE_HANDLE: 'the-new-greenhouse'});
    expect(cfg.adminStoreHandle).toBe('the-new-greenhouse');
  });

  it('never invents a default — a fully empty env yields blank config', () => {
    const cfg = readNotifyConfig({});
    expect(cfg).toEqual({
      resendApiKey: '',
      from: '',
      replyTo: '',
      recipient: '',
      adminStoreHandle: '',
      reviewSigningSecret: '',
      reviewTtlSeconds: 172800,
      reviewBaseUrl: '',
    });
    // the previously hardcoded production addresses must NOT reappear
    expect(JSON.stringify(cfg)).not.toContain('thenewgreenhouseja');
    expect(isNotifyConfigured(cfg)).toBe(false);
  });

  it('reports configured only when all four values are present', () => {
    expect(isNotifyConfigured(CONFIG)).toBe(true);
    expect(isNotifyConfigured({...CONFIG, resendApiKey: ''})).toBe(false);
    expect(isNotifyConfigured({...CONFIG, from: '  '})).toBe(false);
    expect(isNotifyConfigured({...CONFIG, replyTo: ''})).toBe(false);
    expect(isNotifyConfigured({...CONFIG, recipient: ''})).toBe(false);
  });
});

describe('wholesale_status preservation (staff-controlled approval)', () => {
  it('initialises an unset / empty / whitespace / unknown status to pending', () => {
    expect(resolveWholesaleStatus(undefined)).toBe('pending');
    expect(resolveWholesaleStatus(null)).toBe('pending');
    expect(resolveWholesaleStatus('')).toBe('pending');
    expect(resolveWholesaleStatus('   ')).toBe('pending');
    expect(resolveWholesaleStatus('something_else')).toBe('pending');
  });

  it('preserves an existing approved status — a customer edit never resets it', () => {
    expect(resolveWholesaleStatus('approved')).toBe('approved');
    // case / padding tolerant, but the stored value is normalised
    expect(resolveWholesaleStatus(' Approved ')).toBe('approved');
  });

  it('preserves pending, rejected and more_information_required', () => {
    expect(resolveWholesaleStatus('pending')).toBe('pending');
    expect(resolveWholesaleStatus('rejected')).toBe('rejected');
    expect(resolveWholesaleStatus('more_information_required')).toBe(
      'more_information_required',
    );
  });

  it('resolves a first submission to pending for display without writing it', () => {
    // The status is used only to label the email; it is never persisted by the
    // customer mutation (see buildProfileMetafields — no wholesale_status entry).
    expect(resolveWholesaleStatus('')).toBe('pending');
    expect(wholesaleStatusLabel(resolveWholesaleStatus(''))).toBe(
      'Pending Manual Review',
    );
  });
});

describe('describeMetafieldUserErrors (dev/test diagnostics)', () => {
  it('surfaces the failing array index / field path and message', () => {
    const out = describeMetafieldUserErrors([
      {field: ['metafields', '2', 'key'], message: 'not allowed'},
      {field: ['metafields', 10, 'value'], message: 'bad value'},
    ]);
    expect(out).toContain('metafields.2.key: not allowed');
    expect(out).toContain('metafields.10.value: bad value');
  });

  it('handles a missing path and an empty list without throwing', () => {
    expect(describeMetafieldUserErrors([{field: null, message: 'x'}])).toContain(
      '(no path): x',
    );
    expect(describeMetafieldUserErrors([])).toBe('no userErrors');
  });

  it('never contains submitted values — it only reads path + message', () => {
    // Even if a caller mistakenly passed a value-like message, the function has
    // no access to the payload; here we prove no CRA digits appear from path.
    const out = describeMetafieldUserErrors([
      {field: ['metafields', '2', 'key'], message: 'Access to this namespace and key is not allowed'},
    ]);
    expect(out).not.toContain('123456789');
  });
});

describe('sendWholesaleNotificationEmail', () => {
  it('POSTs to Resend with the bearer key and the full CRA/TRN in the body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ok: true, status: 200} as Response);
    const result = await sendWholesaleNotificationEmail(PAYLOAD, CONFIG, fetchImpl);
    expect(result.sent).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    // Full CRA/TRN present in the email body (internal, single recipient).
    expect(init.body).toContain('123-456-789');
  });

  it('skips (does not pretend to send) when the key is missing', async () => {
    const fetchImpl = vi.fn();
    const result = await sendWholesaleNotificationEmail(PAYLOAD, {...CONFIG, resendApiKey: ''}, fetchImpl);
    expect(result).toEqual({sent: false, skippedReason: 'not_configured'});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips when any required address is missing/blank — never partially sends', async () => {
    const fetchImpl = vi.fn();
    for (const partial of [
      {from: ''},
      {replyTo: '  '},
      {recipient: ''},
    ]) {
      const result = await sendWholesaleNotificationEmail(
        PAYLOAD,
        {...CONFIG, ...partial},
        fetchImpl,
      );
      expect(result).toEqual({sent: false, skippedReason: 'not_configured'});
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws on a non-OK Resend response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ok: false, status: 422} as Response);
    await expect(sendWholesaleNotificationEmail(PAYLOAD, CONFIG, fetchImpl)).rejects.toThrow(/422/);
  });
});

describe('buildReviewActionLinks', () => {
  it('builds signed Approve/Reject URLs with NO CRA/TRN in the URL or token', async () => {
    const {links, reason} = await buildReviewActionLinks(PAYLOAD, CONFIG);
    expect(reason).toBe('ok');
    expect(links).toBeDefined();
    for (const url of [links!.approveUrl, links!.rejectUrl]) {
      expect(url.startsWith('https://shop.example.com/internal/wholesale/review?token=')).toBe(true);
      expect(url).not.toContain('123-456-789');
      expect(url).not.toContain('123456789');
      expect(url).not.toContain('Petal');
      expect(url).not.toContain('owner@petalvine.com');
    }
    expect(links!.approveUrl).not.toBe(links!.rejectUrl);
  });

  it('reports token_generation_failed WITHOUT throwing when signing fails', async () => {
    const throwingSigner = async () => {
      throw new Error('crypto boom');
    };
    const {links, reason} = await buildReviewActionLinks(PAYLOAD, CONFIG, throwingSigner);
    expect(reason).toBe('token_generation_failed');
    expect(links).toBeUndefined();
  });
});

describe('diagnoseReviewLinks — fixed reason codes (no values)', () => {
  it('ok when secret + base URL + valid GID are present', () => {
    expect(diagnoseReviewLinks(PAYLOAD, CONFIG)).toBe('ok');
  });

  it('review_config_missing when BOTH secret and base URL are blank/whitespace', () => {
    expect(
      diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewSigningSecret: '  ', reviewBaseUrl: ''}),
    ).toBe('review_config_missing');
  });

  it('review_signing_secret_invalid when the secret is blank/whitespace only', () => {
    expect(
      diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewSigningSecret: '   '}),
    ).toBe('review_signing_secret_invalid');
  });

  it('review_base_url_invalid when the base URL is blank or not a URL', () => {
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewBaseUrl: ''})).toBe(
      'review_base_url_invalid',
    );
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewBaseUrl: 'not-a-url'})).toBe(
      'review_base_url_invalid',
    );
  });

  it('review_ttl_invalid when the TTL is non-positive or NaN', () => {
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewTtlSeconds: 0})).toBe('review_ttl_invalid');
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewTtlSeconds: -1})).toBe('review_ttl_invalid');
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewTtlSeconds: Number.NaN})).toBe(
      'review_ttl_invalid',
    );
  });

  it('customer_gid_invalid for a non-Customer GID', () => {
    expect(
      diagnoseReviewLinks({...PAYLOAD, customerId: 'gid://shopify/Order/1'}, CONFIG),
    ).toBe('customer_gid_invalid');
  });

  it('a trailing slash on the base URL is tolerated (still ok)', () => {
    expect(diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewBaseUrl: 'https://shop.example.com/'})).toBe(
      'ok',
    );
  });

  it('a reason code never contains a secret, URL, token, or CRA/TRN', () => {
    const codes: string[] = [
      diagnoseReviewLinks(PAYLOAD, CONFIG),
      diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewSigningSecret: ''}),
      diagnoseReviewLinks(PAYLOAD, {...CONFIG, reviewBaseUrl: ''}),
    ];
    for (const c of codes) {
      expect(c).not.toContain('test-signing-secret');
      expect(c).not.toContain('shop.example.com');
      expect(c).not.toContain('123-456-789');
      expect(c).toMatch(/^[a-z_]+$/);
    }
  });
});

describe('processWholesaleSubmission — ordering guarantees', () => {
  it('successful save then email → ok + emailed', async () => {
    const sendNotification = vi.fn().mockResolvedValue({sent: true});
    const result = await processWholesaleSubmission({
      saveMetafields: async () => ({ok: true}),
      sendNotification,
      logError: vi.fn(),
    });
    expect(result).toEqual({ok: true, saved: true, emailed: true});
    expect(sendNotification).toHaveBeenCalledOnce();
  });

  it('save failure → NO email, ok:false', async () => {
    const sendNotification = vi.fn();
    const result = await processWholesaleSubmission({
      saveMetafields: async () => ({ok: false, error: 'metafield error'}),
      sendNotification,
      logError: vi.fn(),
    });
    expect(result).toMatchObject({ok: false, saved: false, emailed: false, error: 'metafield error'});
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('save throws → NO email, ok:false', async () => {
    const sendNotification = vi.fn();
    const result = await processWholesaleSubmission({
      saveMetafields: async () => {
        throw new Error('network');
      },
      sendNotification,
      logError: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('missing configuration → save succeeds, notification skipped safely, ok:true', async () => {
    const logError = vi.fn();
    const saveMetafields = vi.fn().mockResolvedValue({ok: true});
    // sendNotification reports a safe skip (no provider configured), never throws.
    const result = await processWholesaleSubmission({
      saveMetafields,
      sendNotification: async () => ({
        sent: false,
        skippedReason: 'not_configured',
      }),
      logError,
    });
    expect(result).toEqual({ok: true, saved: true, emailed: false});
    expect(saveMetafields).toHaveBeenCalledOnce();
    // logs ONLY the fixed message — never which var is missing, no PII/secret
    expect(logError).toHaveBeenCalledOnce();
    const logged = logError.mock.calls[0][0];
    expect(logged).toBe('wholesale notification not configured');
    expect(logged).not.toContain('re_');
    expect(logged).not.toContain('@');
  });

  it('email failure after a successful save → redacted log, still ok:true, no duplicate', async () => {
    const logError = vi.fn();
    const saveMetafields = vi.fn().mockResolvedValue({ok: true});
    const result = await processWholesaleSubmission({
      saveMetafields,
      sendNotification: async () => {
        throw new Error('Resend responded with status 500');
      },
      logError,
    });
    expect(result).toEqual({ok: true, saved: true, emailed: false});
    expect(saveMetafields).toHaveBeenCalledOnce(); // save not retried → no duplicate
    expect(logError).toHaveBeenCalledOnce();
    // the redacted log must not leak provider errors verbatim
    expect(logError.mock.calls[0][0]).not.toContain('500');
  });
});
