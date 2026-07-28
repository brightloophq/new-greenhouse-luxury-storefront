import {describe, expect, it} from 'vitest';
import type {Application, ApplicationEvent, ApplicationStatus} from './types';
import {
  ALL_STATUSES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  EVENT_FOR_OUTCOME,
  canApply,
  applyEvent,
  allowedEvents,
  isTerminal,
  actorCanFire,
  eventForOutcome,
  transitionApplication,
  createDraftApplication,
} from './stateMachine';
import {InvalidStateTransitionError, UnauthorizedActorError} from './errors';

const AT = '2026-07-28T10:00:00.000Z';

describe('wholesale state machine — transition table', () => {
  it('every event resolves to a valid, known status', () => {
    for (const def of Object.values(TRANSITIONS)) {
      expect(ALL_STATUSES).toContain(def.to);
      for (const from of def.from) expect(ALL_STATUSES).toContain(from);
      expect(def.actors.length).toBeGreaterThan(0);
    }
  });

  it('applyEvent returns the mapped target state', () => {
    expect(applyEvent('DRAFT', 'SUBMIT')).toBe('SUBMITTED');
    expect(applyEvent('SUBMITTED', 'BEGIN_CHECKS')).toBe('PENDING');
    expect(applyEvent('PENDING', 'AUTO_APPROVE')).toBe('APPROVED');
    expect(applyEvent('APPROVED', 'PROVISION')).toBe('PROVISIONED');
    expect(applyEvent('PROVISIONED', 'ACTIVATE')).toBe('ACTIVE');
  });

  it('rejects transitions that are not defined', () => {
    expect(() => applyEvent('DRAFT', 'AUTO_APPROVE')).toThrow(
      InvalidStateTransitionError,
    );
    expect(() => applyEvent('ACTIVE', 'SUBMIT')).toThrow(InvalidStateTransitionError);
    expect(canApply('DRAFT', 'AUTO_APPROVE')).toBe(false);
    expect(canApply('DRAFT', 'SUBMIT')).toBe(true);
  });

  it('walks the full happy path DRAFT → ACTIVE', () => {
    const path: ApplicationEvent[] = [
      'SUBMIT',
      'BEGIN_CHECKS',
      'AUTO_APPROVE',
      'PROVISION',
      'ACTIVATE',
    ];
    let status: ApplicationStatus = 'DRAFT';
    for (const event of path) status = applyEvent(status, event);
    expect(status).toBe('ACTIVE');
  });

  it('supports the provider-unavailable retry loop and escalation', () => {
    expect(applyEvent('PENDING', 'PROVIDER_TIMEOUT')).toBe('PROVIDER_UNAVAILABLE');
    expect(applyEvent('PROVIDER_UNAVAILABLE', 'RETRY_CHECKS')).toBe('PENDING');
    expect(applyEvent('PROVIDER_UNAVAILABLE', 'ESCALATE_UNAVAILABLE')).toBe(
      'NEEDS_REVIEW',
    );
  });

  it('supports the more-info resubmit loop', () => {
    expect(applyEvent('PENDING', 'REQUEST_INFO')).toBe('MORE_INFO');
    expect(applyEvent('NEEDS_REVIEW', 'REQUEST_INFO')).toBe('MORE_INFO');
    expect(applyEvent('MORE_INFO', 'RESUBMIT')).toBe('PENDING');
  });

  it('supports manual review decisions and re-verification', () => {
    expect(applyEvent('NEEDS_REVIEW', 'MANUAL_APPROVE')).toBe('APPROVED');
    expect(applyEvent('NEEDS_REVIEW', 'MANUAL_REJECT')).toBe('REJECTED');
    expect(applyEvent('ACTIVE', 'EXPIRE')).toBe('EXPIRED');
    expect(applyEvent('EXPIRED', 'REVERIFY')).toBe('PENDING');
  });

  it('REJECTED is terminal — no outgoing events', () => {
    expect(TERMINAL_STATUSES).toContain('REJECTED');
    expect(isTerminal('REJECTED')).toBe(true);
    expect(isTerminal('ACTIVE')).toBe(false);
    expect(allowedEvents('REJECTED')).toEqual([]);
  });

  it('allowedEvents lists exactly the fireable events for a state', () => {
    expect(allowedEvents('DRAFT')).toEqual(['SUBMIT']);
    expect(allowedEvents('PENDING').sort()).toEqual(
      ['AUTO_APPROVE', 'AUTO_REJECT', 'FLAG_FOR_REVIEW', 'PROVIDER_TIMEOUT', 'REQUEST_INFO'].sort(),
    );
  });
});

describe('actor authorization', () => {
  it('knows which actors may fire an event', () => {
    expect(actorCanFire('MANUAL_APPROVE', 'HUMAN_REVIEWER')).toBe(true);
    expect(actorCanFire('MANUAL_APPROVE', 'APPLICANT')).toBe(false);
    expect(actorCanFire('SUBMIT', 'APPLICANT')).toBe(true);
    expect(actorCanFire('AUTO_APPROVE', 'RULES_ENGINE')).toBe(true);
    expect(actorCanFire('AUTO_APPROVE', 'HUMAN_REVIEWER')).toBe(false);
  });
});

describe('decision outcome → event mapping (docs/ai/13 §5)', () => {
  it('maps every outcome to a valid event', () => {
    expect(eventForOutcome('APPROVED')).toBe('AUTO_APPROVE');
    expect(eventForOutcome('REJECTED')).toBe('AUTO_REJECT');
    expect(eventForOutcome('MANUAL_REVIEW')).toBe('FLAG_FOR_REVIEW');
    expect(eventForOutcome('MORE_INFORMATION_REQUIRED')).toBe('REQUEST_INFO');
    expect(eventForOutcome('PROVIDER_UNAVAILABLE')).toBe('PROVIDER_TIMEOUT');
    for (const event of Object.values(EVENT_FOR_OUTCOME)) {
      expect(TRANSITIONS[event]).toBeDefined();
    }
  });
});

describe('transitionApplication', () => {
  const base: Application = createDraftApplication({
    id: 'app-1',
    applicantId: 'applicant-1',
    businessId: 'business-1',
    at: '2026-07-28T09:00:00.000Z',
  });

  it('creates a DRAFT application via the factory', () => {
    expect(base.status).toBe('DRAFT');
    expect(base.createdAt).toBe(base.updatedAt);
  });

  it('returns a new application + matching audit event without mutating input', () => {
    const {application, audit} = transitionApplication(base, 'SUBMIT', {
      actor: 'APPLICANT',
      at: AT,
      auditId: 'audit-1',
    });
    expect(application.status).toBe('SUBMITTED');
    expect(application.updatedAt).toBe(AT);
    expect(base.status).toBe('DRAFT'); // input untouched
    expect(audit).toMatchObject({
      id: 'audit-1',
      applicationId: 'app-1',
      actor: 'APPLICANT',
      action: 'SUBMIT',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      at: AT,
    });
  });

  it('throws on an invalid transition', () => {
    expect(() =>
      transitionApplication(base, 'AUTO_APPROVE', {
        actor: 'RULES_ENGINE',
        at: AT,
        auditId: 'audit-x',
      }),
    ).toThrow(InvalidStateTransitionError);
  });

  it('enforces actor authorization only when asked', () => {
    const submitted: Application = {...base, status: 'NEEDS_REVIEW'};
    // Without enforcement: allowed to construct the transition.
    expect(
      transitionApplication(submitted, 'MANUAL_APPROVE', {
        actor: 'APPLICANT',
        at: AT,
        auditId: 'a',
      }).application.status,
    ).toBe('APPROVED');
    // With enforcement: wrong actor is rejected.
    expect(() =>
      transitionApplication(submitted, 'MANUAL_APPROVE', {
        actor: 'APPLICANT',
        at: AT,
        auditId: 'a',
        enforceActor: true,
      }),
    ).toThrow(UnauthorizedActorError);
  });
});
