/**
 * Pure decision logic for the internal wholesale review flow — no Shopify calls,
 * no crypto, no Hydrogen context, so it is fully unit-testable. The route wires
 * these to the Admin API client (see shopifyAdmin.ts).
 */
import type {ReviewAction} from './wholesaleReviewToken';

/** Config for building/validating review links, read from server env. */
export interface ReviewConfig {
  signingSecret: string;
  ttlSeconds: number;
  baseUrl: string;
}

export interface ReviewConfigEnv {
  WHOLESALE_REVIEW_SIGNING_SECRET?: string;
  WHOLESALE_REVIEW_LINK_TTL_SECONDS?: string;
  WHOLESALE_REVIEW_BASE_URL?: string;
}

const DEFAULT_TTL_SECONDS = 172800; // 48h

export function readReviewConfig(env: ReviewConfigEnv): ReviewConfig {
  const ttl = Number.parseInt(env.WHOLESALE_REVIEW_LINK_TTL_SECONDS ?? '', 10);
  return {
    signingSecret: env.WHOLESALE_REVIEW_SIGNING_SECRET ?? '',
    ttlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS,
    baseUrl: (env.WHOLESALE_REVIEW_BASE_URL ?? '').replace(/\/+$/, ''),
  };
}

/** True only when both the signing secret and a base URL are present. */
export function isReviewConfigured(config: ReviewConfig): boolean {
  return Boolean(config.signingSecret && config.baseUrl);
}

/** The internal review URL. Carries only the signed token — no CRA/TRN, no secret. */
export function decisionUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/internal/wholesale/review?token=${encodeURIComponent(token)}`;
}

export function normalizeReviewStatus(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

/** Only a missing or pending application may be decided. */
export function isDecidable(rawStatus: string | null | undefined): boolean {
  const s = normalizeReviewStatus(rawStatus);
  return s === '' || s === 'pending';
}

/** The Admin metafieldsSet payload for a decision. Reject also writes the note. */
export interface DecisionMetafieldInput {
  ownerId: string;
  namespace: 'custom';
  key: 'wholesale_status' | 'wholesale_review_note';
  type: 'single_line_text_field' | 'multi_line_text_field';
  value: string;
}

export function buildDecisionMetafields(
  customerId: string,
  action: ReviewAction,
  reason: string,
): DecisionMetafieldInput[] {
  const status: DecisionMetafieldInput = {
    ownerId: customerId,
    namespace: 'custom',
    key: 'wholesale_status',
    type: 'single_line_text_field',
    value: action, // 'approved' | 'rejected'
  };
  if (action === 'rejected') {
    return [
      status,
      {
        ownerId: customerId,
        namespace: 'custom',
        key: 'wholesale_review_note',
        type: 'multi_line_text_field',
        value: reason,
      },
    ];
  }
  return [status];
}

export type ReviewView =
  | 'confirm'
  | 'success'
  | 'decided'
  | 'error'
  | 'reason_required'
  | 'invalid';

export interface CommitDeps {
  action: ReviewAction;
  /** Trimmed rejection reason (empty string if none). */
  reason: string;
  /** Read the customer's current raw wholesale_status. */
  readStatus: () => Promise<string>;
  /** Perform the Admin write. Returns ok=false on userErrors/failure. */
  writeDecision: (action: ReviewAction, reason: string) => Promise<{ok: boolean}>;
}

export interface CommitResult {
  view: ReviewView;
  status?: string;
}

/**
 * Commit a decision with the required guarantees:
 *  - reject with no reason → reason_required (NO write).
 *  - already decided (status not missing/pending) → decided (NO write).
 *  - read or write failure → error (never "success").
 *  - otherwise write; success only after the write confirms.
 * Idempotent: replaying a decided application never re-writes.
 */
export async function commitReviewDecision(
  deps: CommitDeps,
): Promise<CommitResult> {
  if (deps.action === 'rejected' && !deps.reason) {
    return {view: 'reason_required'};
  }

  let current: string;
  try {
    current = await deps.readStatus();
  } catch {
    return {view: 'error'};
  }

  if (!isDecidable(current)) {
    return {view: 'decided', status: normalizeReviewStatus(current) || 'pending'};
  }

  try {
    const res = await deps.writeDecision(deps.action, deps.reason);
    if (!res.ok) return {view: 'error'};
  } catch {
    return {view: 'error'};
  }
  return {view: 'success'};
}
