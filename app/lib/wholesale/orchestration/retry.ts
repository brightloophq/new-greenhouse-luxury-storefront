/**
 * Wholesale verification — retry classification (Sprint A2).
 *
 * Deterministic descriptors only. No timers, queues, cron or actual retries —
 * this classifies a failure so a future orchestrator (n8n) can decide what to
 * do. Domain errors that cannot succeed on replay are non-retryable; transient
 * infrastructure faults are retryable.
 */
import {WholesaleError} from '../errors';
import type {RetryClassification, RetryPolicy} from './contracts';

/** Error `code`s (from WholesaleError) treated as transient/retryable. */
export const RETRYABLE_ERROR_CODES: readonly string[] = ['REPOSITORY'];

export const NON_RETRYABLE_POLICY: RetryPolicy = {
  classification: 'non_retryable',
  maxAttempts: 1,
  backoff: 'none',
};

export const RETRYABLE_POLICY: RetryPolicy = {
  classification: 'retryable',
  maxAttempts: 5,
  backoff: 'exponential',
};

/**
 * Classify a failure. Typed domain errors are non-retryable (an invalid
 * transition, unauthorized actor, validation error or missing application will
 * fail identically on replay) EXCEPT those flagged transient (REPOSITORY).
 * Unexpected non-domain errors are treated as transient infrastructure faults.
 */
export function classifyError(error: unknown): RetryClassification {
  if (error instanceof WholesaleError) {
    return RETRYABLE_ERROR_CODES.includes(error.code)
      ? 'retryable'
      : 'non_retryable';
  }
  return 'retryable';
}

export function policyFor(error: unknown): RetryPolicy {
  return classifyError(error) === 'retryable'
    ? RETRYABLE_POLICY
    : NON_RETRYABLE_POLICY;
}
