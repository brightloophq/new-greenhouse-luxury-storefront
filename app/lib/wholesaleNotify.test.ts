import {describe, expect, it, vi} from 'vitest';
import {
  readNotifyConfig,
  isNotifyConfigured,
  maskCraNumber,
  buildWholesaleNotificationEmail,
  sendWholesaleNotificationEmail,
  resolveWholesaleStatus,
  wholesaleStatusMetafield,
  processWholesaleSubmission,
  type WholesaleNotificationPayload,
  type WholesaleNotifyConfig,
} from './wholesaleNotify';

const CONFIG: WholesaleNotifyConfig = {
  resendApiKey: 're_test_key',
  from: 'The New Greenhouse <notifications@notifications.thenewgreenhouseja.com>',
  replyTo: 'wholesale@thenewgreenhouseja.com',
  recipient: 'wholesale@thenewgreenhouseja.com',
};

const PAYLOAD: WholesaleNotificationPayload = {
  businessName: 'Petal & Vine',
  businessType: 'Florist',
  businessPhone: '(876) 555-0100',
  contactEmail: 'owner@petalvine.com',
  craNumber: '123-456-789',
  customerId: 'gid://shopify/Customer/42',
  submittedAt: '2026-07-28T12:00:00.000Z',
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

  it('includes every required field, masks the TRN and marks pending', () => {
    expect(email.text).toContain('Business Name: Petal & Vine');
    expect(email.text).toContain('Business Type: Florist');
    expect(email.text).toContain('Business Phone: (876) 555-0100');
    expect(email.text).toContain('Contact Email: owner@petalvine.com');
    expect(email.text).toContain('CRA/TRN (masked): *****6789');
    expect(email.text).toContain('Shopify Customer ID: gid://shopify/Customer/42');
    expect(email.text).toContain('Submission Date: 2026-07-28T12:00:00.000Z');
    expect(email.text).toContain('Status: Pending Manual Review');
    // the full TRN must never appear
    expect(email.text).not.toContain('123456789');
    expect(email.text).not.toContain('123-456-789');
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
    });
  });

  it('never invents a default — a fully empty env yields blank config', () => {
    const cfg = readNotifyConfig({});
    expect(cfg).toEqual({resendApiKey: '', from: '', replyTo: '', recipient: ''});
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

  it('builds the metafield with the resolved status', () => {
    expect(
      wholesaleStatusMetafield('gid://shopify/Customer/42', 'approved'),
    ).toEqual({
      ownerId: 'gid://shopify/Customer/42',
      namespace: 'custom',
      key: 'wholesale_status',
      type: 'single_line_text_field',
      value: 'approved',
    });
    // first submission → pending
    expect(
      wholesaleStatusMetafield(
        'gid://shopify/Customer/42',
        resolveWholesaleStatus(''),
      ).value,
    ).toBe('pending');
  });
});

describe('sendWholesaleNotificationEmail', () => {
  it('POSTs to Resend with the bearer key when configured', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ok: true, status: 200} as Response);
    const result = await sendWholesaleNotificationEmail(PAYLOAD, CONFIG, fetchImpl);
    expect(result.sent).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    expect(init.body).toContain('*****6789');
    expect(init.body).not.toContain('123456789');
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
