/**
 * Wholesale application — internal team notification (manual workflow).
 *
 * Server-side only. After the customer's wholesale profile metafields save to
 * Shopify, an internal email is sent via Resend so the team can manually review
 * the CRA/TRN and set custom.wholesale_status in Shopify admin. The customer
 * mutation NEVER writes wholesale_status — it is a staff-controlled field with
 * no Customer Account API write access. No AI, no automated verification, no
 * CRA/TRN API, no automatic approval. ALL notification config is read
 * from server env — no email address or secret is hardcoded — and never reaches
 * the client. Every piece here is pure/injectable so the flow is unit-testable.
 */

/** Resolved notification config (from server env; secrets stay server-side). */
export interface WholesaleNotifyConfig {
  resendApiKey?: string;
  from: string;
  replyTo: string;
  recipient: string;
}

/**
 * The subset of the server env this module reads. `Env` (see env.d.ts) is
 * assignable to this, so callers pass `context.env` directly — no cast.
 */
export interface WholesaleNotifyEnv {
  RESEND_API_KEY?: string;
  WHOLESALE_NOTIFY_FROM?: string;
  WHOLESALE_NOTIFY_REPLY_TO?: string;
  WHOLESALE_INTERNAL_EMAIL?: string;
}

/**
 * Read notification config ENTIRELY from the server env — no hardcoded email
 * addresses or secrets remain in production code. A missing var becomes an empty
 * string so the send guard treats it as "not configured" and skips safely.
 */
export function readNotifyConfig(
  env: WholesaleNotifyEnv,
): WholesaleNotifyConfig {
  return {
    resendApiKey: env.RESEND_API_KEY ?? '',
    from: env.WHOLESALE_NOTIFY_FROM ?? '',
    replyTo: env.WHOLESALE_NOTIFY_REPLY_TO ?? '',
    recipient: env.WHOLESALE_INTERNAL_EMAIL ?? '',
  };
}

/** True only when every required notification variable is present and non-blank. */
export function isNotifyConfigured(config: WholesaleNotifyConfig): boolean {
  return Boolean(
    config.resendApiKey &&
      config.from.trim() &&
      config.replyTo.trim() &&
      config.recipient.trim(),
  );
}

/** Mask a CRA/TRN to its last four digits — the full number is never emailed or logged. */
export function maskCraNumber(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `*****${digits.slice(-4)}` : '*****';
}

export interface WholesaleNotificationPayload {
  businessName: string;
  businessType: string;
  businessPhone: string;
  contactEmail: string;
  /** Raw CRA/TRN — masked before it enters the email body. */
  craNumber: string;
  customerId: string;
  /** ISO submission timestamp. */
  submittedAt: string;
  /**
   * Resolved review status for display only (see resolveWholesaleStatus). This
   * is NEVER written back to Shopify by the customer mutation — a first/unknown
   * submission resolves to "pending" so the email reads "Pending Manual Review".
   */
  status: WholesaleStatus;
}

export interface BuiltEmail {
  from: string;
  to: string;
  reply_to: string;
  subject: string;
  text: string;
}

export function buildWholesaleNotificationEmail(
  payload: WholesaleNotificationPayload,
  config: WholesaleNotifyConfig,
): BuiltEmail {
  const text = [
    'A new wholesale application has been submitted for manual review.',
    '',
    `Business Name: ${payload.businessName}`,
    `Business Type: ${payload.businessType}`,
    `Business Phone: ${payload.businessPhone}`,
    `Contact Email: ${payload.contactEmail}`,
    `CRA/TRN (masked): ${maskCraNumber(payload.craNumber)}`,
    `Shopify Customer ID: ${payload.customerId}`,
    `Submission Date: ${payload.submittedAt}`,
    `Status: ${wholesaleStatusLabel(payload.status)}`,
    '',
    'Review the CRA/TRN manually and set custom.wholesale_status in Shopify admin.',
  ].join('\n');
  return {
    from: config.from,
    to: config.recipient,
    reply_to: config.replyTo,
    subject: 'New Wholesale Application',
    text,
  };
}

export interface SendResult {
  sent: boolean;
  skippedReason?: string;
}

/**
 * Send the notification via the Resend HTTP API. Throws on a non-OK response so
 * the caller can treat delivery failure as non-fatal (submission still succeeds).
 * When no API key is configured it records a skip rather than pretending to send.
 */
export async function sendWholesaleNotificationEmail(
  payload: WholesaleNotificationPayload,
  config: WholesaleNotifyConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  // Any missing/blank required config → skip safely. The profile is already
  // saved; we never call Resend or claim we sent. The reason is deliberately
  // generic — it never reveals which variable is absent.
  if (!isNotifyConfigured(config)) {
    return {sent: false, skippedReason: 'not_configured'};
  }
  const email = buildWholesaleNotificationEmail(payload, config);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
  });
  if (!res.ok) {
    throw new Error(`Resend responded with status ${res.status}`);
  }
  return {sent: true};
}

/**
 * The staff-controlled review states. Approval is NEVER changed automatically by
 * a customer editing their profile — the only transition this app makes is
 * initialising an unset/empty/unknown status to "pending". Staff move it to
 * "approved" / "rejected" / "more_information_required" manually in Shopify.
 */
export const WHOLESALE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'more_information_required',
] as const;

export type WholesaleStatus = (typeof WHOLESALE_STATUSES)[number];

/**
 * Decide the status to write. A recognised existing status is preserved as-is;
 * anything missing, empty or unrecognised initialises to "pending". Customers
 * can never downgrade or lose their approval by re-saving their profile.
 */
export function resolveWholesaleStatus(
  current: string | null | undefined,
): WholesaleStatus {
  const normalized = (current ?? '').trim().toLowerCase();
  return (WHOLESALE_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as WholesaleStatus)
    : 'pending';
}

/** Human-readable status for the internal email. A first submission → pending. */
export function wholesaleStatusLabel(status: WholesaleStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved (existing wholesale account)';
    case 'rejected':
      return 'Rejected (existing decision)';
    case 'more_information_required':
      return 'More Information Required (existing)';
    case 'pending':
    default:
      return 'Pending Manual Review';
  }
}

/**
 * A Shopify metafieldsSet userError, as returned by the mutation. `field` is the
 * GraphQL path, e.g. ["metafields", "2", "key"] — index 2 pinpoints the entry.
 */
export interface MetafieldUserError {
  field?: (string | number | null)[] | null;
  message: string;
}

/**
 * Format metafieldsSet userErrors for SERVER-SIDE logs in dev/tests: surface the
 * failing array index / field path so a rejected metafield is identifiable. Uses
 * only the path + Shopify's own message — never a submitted value (no `value` is
 * read here), so a CRA/TRN can never leak. NOT shown to customers.
 */
export function describeMetafieldUserErrors(
  userErrors: MetafieldUserError[],
): string {
  if (!userErrors.length) return 'no userErrors';
  return userErrors
    .map((e) => {
      const path = Array.isArray(e.field) ? e.field.join('.') : '(no path)';
      return `${path}: ${e.message}`;
    })
    .join(' | ');
}

export interface SubmissionDeps {
  /** Save the customer-writable profile metafields (never wholesale_status). */
  saveMetafields: () => Promise<{ok: boolean; error?: string}>;
  /** Send the internal notification (after a successful save). */
  sendNotification: () => Promise<SendResult>;
  /** Redacted error log (never receives PII). */
  logError: (message: string) => void;
}

export interface SubmissionResult {
  ok: boolean;
  saved: boolean;
  emailed: boolean;
  error?: string;
}

/**
 * Orchestrates the manual workflow with the required guarantees:
 *  - save fails  → NO email, ok:false.
 *  - save ok     → send email; email failure logs redacted + still ok:true.
 * Idempotent by the customer's metafields (no duplicate application created).
 */
export async function processWholesaleSubmission(
  deps: SubmissionDeps,
): Promise<SubmissionResult> {
  let save: {ok: boolean; error?: string};
  try {
    save = await deps.saveMetafields();
  } catch {
    return {ok: false, saved: false, emailed: false, error: 'save_failed'};
  }
  if (!save.ok) {
    return {ok: false, saved: false, emailed: false, error: save.error};
  }

  let emailed = false;
  try {
    const result = await deps.sendNotification();
    emailed = result.sent;
    if (!result.sent) {
      // Config missing/blank — safe skip, no email claimed. The message is a
      // fixed string that reveals neither which variable is absent nor any PII.
      deps.logError('wholesale notification not configured');
    }
  } catch {
    deps.logError(
      'Wholesale notification email failed after a successful save (details redacted).',
    );
    emailed = false;
  }
  return {ok: true, saved: true, emailed};
}
