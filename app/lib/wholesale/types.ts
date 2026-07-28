/**
 * Wholesale verification — domain types (Sprint A1 foundation).
 *
 * Framework-agnostic: no Shopify, n8n, AI, TRN verification, React or Hydrogen
 * imports. This module is the system-of-record domain core and is written so it
 * can later be extracted to the separate backend service (docs/ai/13, docs/ai/14).
 *
 * Sprint A1 implements: the state machine, feature flags, typed errors, logging/
 * audit foundations, repository interfaces + in-memory sandbox implementations.
 * Verification runs, AI reports, risk scores, decisions, etc. are later sprints;
 * their logical schema is catalogued in ./sandbox/schema.ts.
 */

/** Application lifecycle states — docs/ai/14 Phase 2 state machine. */
export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING'
  | 'PROVIDER_UNAVAILABLE'
  | 'NEEDS_REVIEW'
  | 'MORE_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'EXPIRED';

/** Events that drive lifecycle transitions. */
export type ApplicationEvent =
  | 'SUBMIT'
  | 'BEGIN_CHECKS'
  | 'PROVIDER_TIMEOUT'
  | 'RETRY_CHECKS'
  | 'ESCALATE_UNAVAILABLE'
  | 'FLAG_FOR_REVIEW'
  | 'AUTO_APPROVE'
  | 'AUTO_REJECT'
  | 'REQUEST_INFO'
  | 'MANUAL_APPROVE'
  | 'MANUAL_REJECT'
  | 'RESUBMIT'
  | 'PROVISION'
  | 'ACTIVATE'
  | 'EXPIRE'
  | 'REVERIFY';

/** Who may fire a transition — audit + authorization foundation (docs/ai/14 P2). */
export type Actor =
  | 'APPLICANT'
  | 'SYSTEM'
  | 'RULES_ENGINE'
  | 'N8N'
  | 'HUMAN_REVIEWER';

/** Rules-engine outcomes — docs/ai/13 §5. The Rules Engine (a later sprint) is
 *  the ONLY decider; this enum is defined here so the state machine can map an
 *  outcome to an event without importing verification logic. */
export type DecisionOutcome =
  | 'APPROVED'
  | 'MANUAL_REVIEW'
  | 'REJECTED'
  | 'MORE_INFORMATION_REQUIRED'
  | 'PROVIDER_UNAVAILABLE';

export type VerificationProviderKind = 'TRN' | 'COJ' | 'TCC' | 'KYB';

export type BusinessType =
  | 'florist'
  | 'designer'
  | 'event'
  | 'hotel'
  | 'reseller'
  | 'other';

/* --------------------------------------------------------------------------
   Entities (logical schema — docs/ai/14 Phase 3). Sprint A1 implements the
   first tranche; sensitive fields are marked and must be encrypted at rest +
   never logged in a real implementation (see ./logging.ts redaction).
   -------------------------------------------------------------------------- */

export interface Applicant {
  id: string;
  /** Links to the Shopify customer once authenticated (Customer Account OAuth). */
  shopifyCustomerId?: string;
  contactName: string;
  /** SENSITIVE — redacted in logs. */
  email: string;
  /** SENSITIVE — redacted in logs. */
  phone?: string;
  createdAt: string;
}

export interface Business {
  id: string;
  tradingName: string;
  businessType: BusinessType;
  /** SENSITIVE — encrypted at rest in real impl; never logged. */
  trn?: string;
  /** SENSITIVE — encrypted at rest in real impl; never logged. */
  registrationNumber?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  applicantId: string;
  businessId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/** Append-only audit record — one per transition/action (docs/ai/14 P2/P3). */
export interface AuditEvent {
  id: string;
  applicationId: string;
  actor: Actor;
  action: string;
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
  reason?: string;
  at: string;
}

/**
 * An intended Shopify Admin write, RECORDED for human review instead of sent.
 * The core sandbox safety mechanism (docs/ai/15 §5). No real Shopify call in A1.
 */
export interface RecordedShopifyPayload {
  id: string;
  applicationId: string;
  /** e.g. 'create_company', 'attach_location_to_market_catalog' (docs/ai/13 §1a). */
  intent: string;
  payload: unknown;
  /** Dev/test target reference only — never a production store. */
  target: string;
  status: 'pending_review' | 'approved_for_send' | 'rejected';
  recordedAt: string;
}

/** Keys redacted by the logger anywhere they appear in a log context. */
export const SENSITIVE_FIELDS = [
  'trn',
  'registrationNumber',
  'email',
  'phone',
] as const;
