/**
 * Signed, expiring review tokens for the email-based wholesale decision flow.
 *
 * A token is a capability, NOT a secret store: it authorises ONE action
 * (approve|reject) for ONE customer, until it expires. It is HMAC-SHA256 signed
 * with WHOLESALE_REVIEW_SIGNING_SECRET using the Web Crypto API (crypto.subtle),
 * which runs on Shopify Oxygen / Cloudflare Workers — no node:crypto.
 *
 * The payload carries ONLY: customer GID, action, expiry, nonce, and an optional
 * submission timestamp. It NEVER contains the CRA/TRN, email, business data, or
 * any Shopify/Resend secret. The token is signed but not encrypted, so nothing
 * sensitive may go inside it.
 */

export type ReviewAction = 'approved' | 'rejected';

export interface ReviewTokenPayload {
  /** Shopify customer GID: gid://shopify/Customer/<digits>. */
  cid: string;
  /** Intended decision. */
  act: ReviewAction;
  /** Expiry, unix seconds. */
  exp: number;
  /** Anti-replay random value. */
  nonce: string;
  /** Optional submission timestamp/version (ISO), for stale-link detection. */
  ver?: string;
}

export type VerifyFailure =
  | 'secret_missing'
  | 'payload_invalid'
  | 'decode_failed'
  | 'json_invalid'
  | 'missing_fields'
  | 'signature_invalid'
  | 'expired'
  | 'action_invalid'
  | 'gid_invalid';

export interface VerifyResult {
  valid: boolean;
  reason?: VerifyFailure;
  payload?: ReviewTokenPayload;
}

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** Random anti-replay nonce (Web Crypto; Workers-compatible). */
export function reviewNonce(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isCustomerGid(value: string): boolean {
  return /^gid:\/\/shopify\/Customer\/\d+$/.test((value ?? '').trim());
}

// ── base64url (binary-safe, no padding) ──────────────────────────────────────
function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const binary = atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

/** Constant-time string comparison (avoids signature timing leaks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sign a payload → `${base64url(json)}.${base64url(hmac)}`. */
export async function signReviewToken(
  payload: ReviewTokenPayload,
  secret: string,
): Promise<string> {
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = bytesToB64url(await hmac(secret, body));
  return `${body}.${sig}`;
}

/**
 * Verify signature → expiry → action → customer GID. Returns a typed failure
 * reason (never throws on bad input), so callers render a generic invalid page.
 */
export async function verifyReviewToken(
  token: string,
  secret: string,
  now: number = nowSeconds(),
): Promise<VerifyResult> {
  if (!secret) return {valid: false, reason: 'secret_missing'};

  const parts = (token ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {valid: false, reason: 'payload_invalid'};
  }
  const [body, sig] = parts;

  let expectedSig: string;
  try {
    expectedSig = bytesToB64url(await hmac(secret, body));
  } catch {
    return {valid: false, reason: 'decode_failed'};
  }
  if (!timingSafeEqual(sig, expectedSig)) {
    return {valid: false, reason: 'signature_invalid'};
  }

  // Signature is valid → the body is exactly what we signed. Decode then parse,
  // reporting each failure mode distinctly for diagnostics.
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(b64urlToBytes(body));
  } catch {
    return {valid: false, reason: 'decode_failed'};
  }

  let payload: ReviewTokenPayload;
  try {
    payload = JSON.parse(decoded) as ReviewTokenPayload;
  } catch {
    return {valid: false, reason: 'json_invalid'};
  }

  if (
    typeof payload.exp !== 'number' ||
    typeof payload.cid !== 'string' ||
    typeof payload.act !== 'string'
  ) {
    return {valid: false, reason: 'missing_fields'};
  }
  if (payload.act !== 'approved' && payload.act !== 'rejected') {
    return {valid: false, reason: 'action_invalid'};
  }
  if (!isCustomerGid(payload.cid)) {
    return {valid: false, reason: 'gid_invalid'};
  }
  if (now >= payload.exp) {
    return {valid: false, reason: 'expired'};
  }
  return {valid: true, payload};
}
