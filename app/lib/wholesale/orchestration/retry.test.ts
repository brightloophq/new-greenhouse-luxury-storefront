import {describe, expect, it} from 'vitest';
import {
  InvalidStateTransitionError,
  UnauthorizedActorError,
  ValidationError,
  ApplicationNotFoundError,
  RepositoryError,
  ProductionWriteBlockedError,
} from '../errors';
import {
  classifyError,
  policyFor,
  NON_RETRYABLE_POLICY,
  RETRYABLE_POLICY,
  RETRYABLE_ERROR_CODES,
} from './retry';

describe('retry classification', () => {
  it('domain errors that cannot succeed on replay are non-retryable', () => {
    expect(classifyError(new InvalidStateTransitionError('DRAFT', 'AUTO_APPROVE'))).toBe(
      'non_retryable',
    );
    expect(classifyError(new UnauthorizedActorError('APPLICANT', 'MANUAL_APPROVE'))).toBe(
      'non_retryable',
    );
    expect(classifyError(new ValidationError('bad'))).toBe('non_retryable');
    expect(classifyError(new ApplicationNotFoundError('x'))).toBe('non_retryable');
    expect(classifyError(new ProductionWriteBlockedError())).toBe('non_retryable');
  });

  it('transient infrastructure faults are retryable', () => {
    expect(classifyError(new RepositoryError('down'))).toBe('retryable');
    expect(RETRYABLE_ERROR_CODES).toContain('REPOSITORY');
  });

  it('unexpected non-domain errors default to retryable (transient)', () => {
    expect(classifyError(new Error('boom'))).toBe('retryable');
    expect(classifyError('weird')).toBe('retryable');
  });
});

describe('retry policy descriptors (no timers/queues)', () => {
  it('returns the matching deterministic descriptor', () => {
    expect(policyFor(new ValidationError('x'))).toEqual(NON_RETRYABLE_POLICY);
    expect(policyFor(new RepositoryError('x'))).toEqual(RETRYABLE_POLICY);
  });

  it('descriptors are well-formed', () => {
    expect(NON_RETRYABLE_POLICY).toEqual({
      classification: 'non_retryable',
      maxAttempts: 1,
      backoff: 'none',
    });
    expect(RETRYABLE_POLICY.classification).toBe('retryable');
    expect(RETRYABLE_POLICY.maxAttempts).toBeGreaterThan(1);
    expect(['none', 'fixed', 'exponential']).toContain(RETRYABLE_POLICY.backoff);
  });
});
