/**
 * Wholesale verification — orchestration workflow contracts (Sprint A2).
 *
 * Transport-agnostic typed envelopes that an external orchestrator (n8n, later)
 * will send/receive. NO n8n, webhook, provider, Shopify, TRN, AI or UI code
 * here — only the shapes and the application-layer command surface. Reuses the
 * A1 domain (../types, ../stateMachine). Deterministic: every envelope carries
 * its own timestamp and ids; nothing here reads a clock or randomness.
 */
import type {Actor, ApplicationStatus, DecisionOutcome} from '../types';

/** Bumped when the contract shape changes; carried on every envelope. */
export const WORKFLOW_VERSION = 'v1';

/** The application-layer commands an orchestrator may invoke. */
export type CommandType =
  | 'SUBMIT_APPLICATION'
  | 'BEGIN_VERIFICATION'
  | 'RECORD_VERIFICATION_RESULT'
  | 'ROUTE_TO_MANUAL_REVIEW'
  | 'REQUEST_ADDITIONAL_INFORMATION'
  | 'APPROVE'
  | 'REJECT';

/** Inbound command envelope (transport-agnostic). */
export interface WorkflowCommandEnvelope {
  type: CommandType;
  applicationId: string;
  correlationId: string;
  /** Uniquely identifies this command attempt; replays share the key. */
  idempotencyKey: string;
  workflowVersion: string;
  actor: Actor;
  /** ISO timestamp — injected by the caller (determinism). */
  at: string;
  /** Required for RECORD_VERIFICATION_RESULT; the Rules-Engine outcome to enact. */
  outcome?: DecisionOutcome;
  reason?: string;
}

/** How a failure should be treated by a (future) retry mechanism. */
export type RetryClassification = 'retryable' | 'non_retryable';

/** A deterministic retry policy descriptor — NOT an implementation (no timers). */
export interface RetryPolicy {
  classification: RetryClassification;
  maxAttempts: number;
  backoff: 'none' | 'fixed' | 'exponential';
}

/** Terminal orchestration outcome for a single command. */
export type OrchestrationResultStatus =
  | 'completed'
  | 'duplicate'
  | 'retryable_failure'
  | 'permanent_failure'
  | 'manual_review_required';

export interface WorkflowError {
  code: string;
  message: string;
  classification: RetryClassification;
}

/** Outbound result envelope (transport-agnostic). */
export interface WorkflowResultEnvelope {
  type: CommandType;
  applicationId: string;
  correlationId: string;
  idempotencyKey: string;
  workflowVersion: string;
  status: OrchestrationResultStatus;
  /** Present on completed / manual_review_required. */
  applicationStatus?: ApplicationStatus;
  /** Present on retryable_failure / permanent_failure. */
  error?: WorkflowError;
  at: string;
}
