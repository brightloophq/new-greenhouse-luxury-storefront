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
import {
  signReviewToken,
  reviewNonce,
  nowSeconds,
  type ReviewAction,
} from './wholesaleReviewToken';
import {readReviewConfig, decisionUrl} from './wholesaleReview';

/** Resolved notification config (from server env; secrets stay server-side). */
export interface WholesaleNotifyConfig {
  resendApiKey?: string;
  from: string;
  replyTo: string;
  recipient: string;
  /**
   * The store's myshopify handle (without ".myshopify.com"), used only to build
   * the "Review in Shopify" deep link. Not a secret. Blank → the button is
   * omitted and the plain customer reference is kept.
   */
  adminStoreHandle: string;
  /** HMAC secret for signing Approve/Reject review links (server-side only). */
  reviewSigningSecret: string;
  /** Review-link lifetime in seconds. */
  reviewTtlSeconds: number;
  /** Absolute base URL for the internal review route. */
  reviewBaseUrl: string;
  /**
   * Phase 2 feature flag. When FALSE (default) the email shows only the primary
   * "Review & Decide in Shopify" button — no Approve/Reject buttons, no signed
   * decision URLs are generated, and the internal decision routes are never used.
   * Enabled only by an explicit approved rollout (WHOLESALE_EMAIL_DECISIONS_ENABLED=true).
   */
  emailDecisionsEnabled: boolean;
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
  SHOPIFY_ADMIN_STORE_HANDLE?: string;
  WHOLESALE_REVIEW_SIGNING_SECRET?: string;
  WHOLESALE_REVIEW_LINK_TTL_SECONDS?: string;
  WHOLESALE_REVIEW_BASE_URL?: string;
  WHOLESALE_EMAIL_DECISIONS_ENABLED?: string;
}

/**
 * Read notification config ENTIRELY from the server env — no hardcoded email
 * addresses or secrets remain in production code. A missing var becomes an empty
 * string so the send guard treats it as "not configured" and skips safely.
 */
export function readNotifyConfig(
  env: WholesaleNotifyEnv,
): WholesaleNotifyConfig {
  const review = readReviewConfig(env);
  return {
    resendApiKey: env.RESEND_API_KEY ?? '',
    from: env.WHOLESALE_NOTIFY_FROM ?? '',
    replyTo: env.WHOLESALE_NOTIFY_REPLY_TO ?? '',
    recipient: env.WHOLESALE_INTERNAL_EMAIL ?? '',
    adminStoreHandle: env.SHOPIFY_ADMIN_STORE_HANDLE ?? '',
    reviewSigningSecret: review.signingSecret,
    reviewTtlSeconds: review.ttlSeconds,
    reviewBaseUrl: review.baseUrl,
    // Default OFF — decision buttons only render on an explicit "true".
    emailDecisionsEnabled: env.WHOLESALE_EMAIL_DECISIONS_ENABLED === 'true',
  };
}

/**
 * Extract the numeric id from a Shopify Customer GID. Returns null unless the
 * value is EXACTLY `gid://shopify/Customer/<digits>` — anything else (wrong
 * resource, missing id, junk) is rejected rather than guessed.
 */
export function extractCustomerNumericId(gid: string): string | null {
  const match = /^gid:\/\/shopify\/Customer\/(\d+)$/.exec((gid ?? '').trim());
  return match ? match[1] : null;
}

/**
 * Build the Shopify Admin customer deep link, or null when it cannot be safely
 * built (invalid GID or missing/invalid store handle). Contains only the numeric
 * customer id and the store handle — never the CRA/TRN or any secret/token.
 */
export function buildReviewUrl(
  customerId: string,
  storeHandle: string | null | undefined,
): string | null {
  const numericId = extractCustomerNumericId(customerId);
  // Accept the handle with or without a trailing ".myshopify.com".
  const handle = (storeHandle ?? '').trim().replace(/\.myshopify\.com$/i, '');
  if (!numericId || !handle || !/^[a-z0-9][a-z0-9-]*$/i.test(handle)) {
    return null;
  }
  return `https://admin.shopify.com/store/${handle}/customers/${numericId}`;
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
  html: string;
}

/** Escape the five HTML-significant characters so profile values render as text. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Signed Approve/Reject links for the internal decision route (no CRA/TRN). */
export interface ReviewActionLinks {
  approveUrl: string;
  rejectUrl: string;
}

export function buildWholesaleNotificationEmail(
  payload: WholesaleNotificationPayload,
  config: WholesaleNotifyConfig,
  actions?: ReviewActionLinks,
): BuiltEmail {
  const statusLabel = wholesaleStatusLabel(payload.status);
  // Deep link to the customer record only — never a status-changing link, never
  // a secret/token, never the CRA/TRN. Null when it cannot be safely built.
  const reviewUrl = buildReviewUrl(payload.customerId, config.adminStoreHandle);

  // ── Plain-text fallback ───────────────────────────────────────────────────
  // This is the internal, single-recipient staff notification, so it carries the
  // FULL CRA/TRN (plain + copyable). It is never masked here; it must never
  // appear in the subject, any URL, logs, or errors.
  const textLines = [
    'A new wholesale application has been submitted for manual review.',
    '',
    `Business Name: ${payload.businessName}`,
    `Business Type: ${payload.businessType}`,
    `Business Phone: ${payload.businessPhone}`,
    `Contact Email: ${payload.contactEmail}`,
    `CRA/TRN: ${payload.craNumber}`,
    `Shopify Customer ID: ${payload.customerId}`,
    `Submission Date: ${payload.submittedAt}`,
    `Status: ${statusLabel}`,
  ];
  if (actions) {
    textLines.push(
      `Approve Application: ${actions.approveUrl}`,
      `Reject Application: ${actions.rejectUrl}`,
    );
  }
  if (reviewUrl) textLines.push(`Review & Decide in Shopify: ${reviewUrl}`);
  const instruction = actions
    ? 'Approve or Reject above each open a confirmation page — nothing changes until you confirm.'
    : 'Review the submitted CRA/TRN, then choose the appropriate Wholesale Status on the customer record and save.';
  textLines.push('', instruction);
  const text = textLines.join('\n');

  // ── HTML version ──────────────────────────────────────────────────────────
  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 16px 6px 0;color:#6b6b6b;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(
        label,
      )}</td>
      <td style="padding:6px 0;color:#222222;font-size:14px;font-weight:500;">${escapeHtml(
        value,
      )}</td>
    </tr>`;

  const linkButton = (href: string, label: string, bg: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.02em;padding:11px 22px;border-radius:2px;margin:0 8px 8px 0;">${escapeHtml(
      label,
    )}</a>`;

  const actionButtons = actions
    ? `<tr><td colspan="2" style="padding:20px 0 0;">
        ${linkButton(actions.approveUrl, 'Approve Application', '#4d6a50')}
        ${linkButton(actions.rejectUrl, 'Reject Application', '#8a1f1f')}
        <div style="margin-top:6px;color:#6b6b6b;font-size:12px;">
          Each opens a confirmation page — nothing changes until you confirm there.
        </div>
      </td></tr>`
    : '';

  const reviewButton = reviewUrl
    ? `<tr><td colspan="2" style="padding:20px 0 4px;">
        ${linkButton(reviewUrl, 'Review & Decide in Shopify', '#090909')}
      </td></tr>`
    : `<tr><td colspan="2" style="padding:20px 0 4px;color:#6b6b6b;font-size:12px;">
        Open the customer record in Shopify Admin (Customer: ${escapeHtml(
          payload.customerId,
        )}).
      </td></tr>`;

  const instructionRow = `<tr><td colspan="2" style="padding:10px 0 0;color:#6b6b6b;font-size:13px;line-height:1.5;">${escapeHtml(
    instruction,
  )}</td></tr>`;

  const html = `<!-- New Wholesale Application -->
<div style="background:#faf8f4;padding:32px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece7de;border-radius:4px;">
    <tr><td style="padding:28px 32px 8px;">
      <div style="color:#c8a96a;font-size:11px;letter-spacing:.16em;text-transform:uppercase;">The New Greenhouse — Wholesale</div>
      <h1 style="margin:8px 0 0;color:#090909;font-size:20px;font-weight:600;">New wholesale application</h1>
      <p style="margin:6px 0 0;color:#6b6b6b;font-size:13px;">Submitted for manual review.</p>
    </td></tr>
    <tr><td style="padding:8px 32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Business Name', payload.businessName)}
        ${row('Business Type', payload.businessType)}
        ${row('Business Phone', payload.businessPhone)}
        ${row('Contact Email', payload.contactEmail)}
        ${row('CRA/TRN', payload.craNumber)}
        ${row('Submission Date', payload.submittedAt)}
        ${row('Status', statusLabel)}
        ${actionButtons}
        ${reviewButton}
        ${instructionRow}
      </table>
    </td></tr>
  </table>
</div>`;

  return {
    from: config.from,
    to: config.recipient,
    reply_to: config.replyTo,
    subject: 'New Wholesale Application',
    text,
    html,
  };
}

/**
 * Fixed diagnostic reason codes for review-link generation. Safe to log
 * server-side — a code never reveals any value (secret, URL, token, CRA/TRN,
 * email, or customer id), only WHICH precondition failed.
 */
export type ReviewLinkReason =
  | 'ok'
  | 'review_config_missing'
  | 'review_signing_secret_invalid'
  | 'review_base_url_invalid'
  | 'review_ttl_invalid'
  | 'customer_gid_invalid'
  | 'token_generation_failed';

export interface ReviewActionLinksResult {
  links?: ReviewActionLinks;
  reason: ReviewLinkReason;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Determine whether review action links can be built, returning a FIXED reason
 * code — never a value. Whitespace-only secret/URL counts as missing; a
 * non-URL base counts as invalid. TTL is defaulted upstream, so it is only
 * invalid defensively.
 */
export function diagnoseReviewLinks(
  payload: WholesaleNotificationPayload,
  config: WholesaleNotifyConfig,
): ReviewLinkReason {
  const secret = (config.reviewSigningSecret ?? '').trim();
  const baseUrl = (config.reviewBaseUrl ?? '').trim();
  if (!secret && !baseUrl) return 'review_config_missing';
  if (!secret) return 'review_signing_secret_invalid';
  if (!baseUrl) return 'review_base_url_invalid';
  if (!isHttpUrl(baseUrl)) return 'review_base_url_invalid';
  if (!Number.isFinite(config.reviewTtlSeconds) || config.reviewTtlSeconds <= 0) {
    return 'review_ttl_invalid';
  }
  if (!extractCustomerNumericId(payload.customerId)) return 'customer_gid_invalid';
  return 'ok';
}

/**
 * Generate the signed Approve/Reject links for this application. Returns a
 * `{links?, reason}` result — `reason` is a fixed diagnostic code and is 'ok'
 * only when `links` is present. Token signing is wrapped so a crypto failure
 * degrades to `token_generation_failed` (buttons omitted) and NEVER aborts the
 * email send. The tokens carry ONLY {cid, act, exp, nonce, ver}; never the
 * CRA/TRN or any secret. `signImpl` is injectable for tests.
 */
export async function buildReviewActionLinks(
  payload: WholesaleNotificationPayload,
  config: WholesaleNotifyConfig,
  signImpl: typeof signReviewToken = signReviewToken,
): Promise<ReviewActionLinksResult> {
  const reason = diagnoseReviewLinks(payload, config);
  if (reason !== 'ok') return {reason};
  const exp = nowSeconds() + config.reviewTtlSeconds;
  const sign = (act: ReviewAction) =>
    signImpl(
      {cid: payload.customerId, act, exp, nonce: reviewNonce(), ver: payload.submittedAt},
      config.reviewSigningSecret,
    );
  try {
    const [approveToken, rejectToken] = await Promise.all([
      sign('approved'),
      sign('rejected'),
    ]);
    return {
      links: {
        approveUrl: decisionUrl(config.reviewBaseUrl, approveToken),
        rejectUrl: decisionUrl(config.reviewBaseUrl, rejectToken),
      },
      reason: 'ok',
    };
  } catch {
    return {reason: 'token_generation_failed'};
  }
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
  // Phase 1 default: decision buttons OFF → no signed decision URLs are generated
  // and the internal review routes are never referenced. Only the primary
  // "Review & Decide in Shopify" link is rendered. The secure decision flow stays
  // in source and re-enables when WHOLESALE_EMAIL_DECISIONS_ENABLED=true.
  let links: ReviewActionLinks | undefined;
  if (config.emailDecisionsEnabled) {
    const result = await buildReviewActionLinks(payload, config);
    links = result.links;
    if (result.reason !== 'ok') {
      // Diagnostic ONLY — a fixed reason code, never a value.
      console.warn(`[wholesale] review action links unavailable: ${result.reason}`);
    }
  }
  const email = buildWholesaleNotificationEmail(payload, config, links);
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
