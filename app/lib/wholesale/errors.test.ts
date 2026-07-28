import {describe, expect, it} from 'vitest';
import {
  WholesaleError,
  InvalidStateTransitionError,
  UnauthorizedActorError,
  ApplicationNotFoundError,
  ValidationError,
  FeatureDisabledError,
  ProductionWriteBlockedError,
  RepositoryError,
} from './errors';

describe('typed errors', () => {
  it('all extend WholesaleError and carry a stable code', () => {
    const cases: Array<[WholesaleError, string]> = [
      [new InvalidStateTransitionError('DRAFT', 'AUTO_APPROVE'), 'INVALID_STATE_TRANSITION'],
      [new UnauthorizedActorError('APPLICANT', 'MANUAL_APPROVE'), 'UNAUTHORIZED_ACTOR'],
      [new ApplicationNotFoundError('app-1'), 'APPLICATION_NOT_FOUND'],
      [new ValidationError('bad'), 'VALIDATION'],
      [new FeatureDisabledError('WHOLESALE_SANDBOX_ENABLED'), 'FEATURE_DISABLED'],
      [new ProductionWriteBlockedError(), 'PRODUCTION_WRITE_BLOCKED'],
      [new RepositoryError('nope'), 'REPOSITORY'],
    ];
    for (const [err, code] of cases) {
      expect(err).toBeInstanceOf(WholesaleError);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe(code);
      expect(err.message).toBeTruthy();
      expect(err.name).not.toBe('Error');
    }
  });

  it('exposes structured fields for branching', () => {
    const e = new InvalidStateTransitionError('ACTIVE', 'SUBMIT');
    expect(e.from).toBe('ACTIVE');
    expect(e.event).toBe('SUBMIT');
    const u = new UnauthorizedActorError('APPLICANT', 'MANUAL_APPROVE');
    expect(u.actor).toBe('APPLICANT');
    expect(u.event).toBe('MANUAL_APPROVE');
    expect(new ApplicationNotFoundError('x').id).toBe('x');
  });
});
