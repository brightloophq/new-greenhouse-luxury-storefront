/**
 * Regression suite — INVALID transitions must fail loudly and typed.
 *
 * The state machine must reject every transition it does not explicitly allow,
 * throw the correct typed domain error (never a generic Error/TypeError), and
 * remain deterministic + side-effect free. Naming note: the architecture's
 * conceptual "Verifying" maps to `PENDING` and "Manual Review" to `NEEDS_REVIEW`
 * (docs/ai/14 Phase 2 state machine).
 */
import {describe, expect, it} from 'vitest';
import type {Application, ApplicationEvent, ApplicationStatus} from './types';
import {
  ALL_STATUSES,
  TRANSITIONS,
  applyEvent,
  canApply,
  allowedEvents,
  isTerminal,
  transitionApplication,
  createDraftApplication,
} from './stateMachine';
import {InvalidStateTransitionError, UnauthorizedActorError} from './errors';

const EVENTS = Object.keys(TRANSITIONS) as ApplicationEvent[];
const AT = '2026-07-28T12:00:00.000Z';

/** All (from → event) pairs the table explicitly allows. */
const ALLOWED = new Set<string>(
  EVENTS.flatMap((event) =>
    TRANSITIONS[event].from.map((from) => `${from}:${event}`),
  ),
);

describe('named invalid transitions (must fail)', () => {
  const cases: Array<[ApplicationStatus, ApplicationEvent, string]> = [
    ['APPROVED', 'SUBMIT', 'Approved → Submitted'],
    ['APPROVED', 'RETRY_CHECKS', 'Approved → Verifying (PENDING)'],
    ['REJECTED', 'MANUAL_APPROVE', 'Rejected → Approved'],
    ['REJECTED', 'RETRY_CHECKS', 'Rejected → Verifying (PENDING)'],
    ['REJECTED', 'AUTO_APPROVE', 'Rejected → Approved (auto)'],
    ['NEEDS_REVIEW', 'RESUBMIT', 'Manual Review → Draft/Pending path not allowed'],
    ['DRAFT', 'AUTO_APPROVE', 'Draft → Approved'],
    ['DRAFT', 'MANUAL_APPROVE', 'Draft → Approved (manual)'],
    ['PENDING', 'SUBMIT', 'Pending → Submitted'],
    ['ACTIVE', 'SUBMIT', 'Active → Submitted'],
  ];

  it.each(cases)('%s %s — %s throws InvalidStateTransitionError', (from, event) => {
    expect(canApply(from, event)).toBe(false);
    expect(() => applyEvent(from, event)).toThrow(InvalidStateTransitionError);
    try {
      applyEvent(from, event);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateTransitionError);
      expect((err as InvalidStateTransitionError).from).toBe(from);
      expect((err as InvalidStateTransitionError).event).toBe(event);
    }
  });
});

describe('exhaustive matrix — nothing outside the table is allowed', () => {
  it('every (state × event) not explicitly allowed throws InvalidStateTransitionError', () => {
    let checked = 0;
    for (const from of ALL_STATUSES) {
      for (const event of EVENTS) {
        if (ALLOWED.has(`${from}:${event}`)) continue;
        checked += 1;
        expect(canApply(from, event)).toBe(false);
        expect(() => applyEvent(from, event)).toThrow(InvalidStateTransitionError);
      }
    }
    // Sanity: the matrix actually exercised a large number of disallowed pairs.
    expect(checked).toBeGreaterThan(100);
  });
});

describe('terminal states cannot transition', () => {
  it('REJECTED has no allowed events and rejects all of them', () => {
    expect(isTerminal('REJECTED')).toBe(true);
    expect(allowedEvents('REJECTED')).toEqual([]);
    for (const event of EVENTS) {
      expect(() => applyEvent('REJECTED', event)).toThrow(
        InvalidStateTransitionError,
      );
    }
  });
});

describe('unknown / unsupported event', () => {
  it('throws a typed domain error, not a generic TypeError', () => {
    const bogus = 'NOT_A_REAL_EVENT' as unknown as ApplicationEvent;
    expect(canApply('PENDING', bogus)).toBe(false);
    expect(() => applyEvent('PENDING', bogus)).toThrow(InvalidStateTransitionError);
    // guard against regressing to a generic error
    let caught: unknown;
    try {
      applyEvent('DRAFT', bogus);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidStateTransitionError);
    expect((caught as Error).name).toBe('InvalidStateTransitionError');
  });
});

describe('invalid actor', () => {
  it('throws UnauthorizedActorError when enforcement is on', () => {
    const inReview: Application = {
      ...createDraftApplication({
        id: 'app-1',
        applicantId: 'a',
        businessId: 'b',
        at: AT,
      }),
      status: 'NEEDS_REVIEW',
    };
    expect(() =>
      transitionApplication(inReview, 'MANUAL_APPROVE', {
        actor: 'APPLICANT', // only HUMAN_REVIEWER may approve
        at: AT,
        auditId: 'x',
        enforceActor: true,
      }),
    ).toThrow(UnauthorizedActorError);
  });

  it('an invalid transition is rejected before actor checks', () => {
    const draft = createDraftApplication({
      id: 'app-2',
      applicantId: 'a',
      businessId: 'b',
      at: AT,
    });
    // AUTO_APPROVE is invalid from DRAFT regardless of actor → state error wins.
    expect(() =>
      transitionApplication(draft, 'AUTO_APPROVE', {
        actor: 'RULES_ENGINE',
        at: AT,
        auditId: 'x',
        enforceActor: true,
      }),
    ).toThrow(InvalidStateTransitionError);
  });
});

describe('determinism, purity, no mutation', () => {
  it('applyEvent is pure — same input yields same output, no implicit transition', () => {
    expect(applyEvent('DRAFT', 'SUBMIT')).toBe('SUBMITTED');
    expect(applyEvent('DRAFT', 'SUBMIT')).toBe('SUBMITTED');
  });

  it('a failed transition has no side effects on the source object', () => {
    const draft = createDraftApplication({
      id: 'app-3',
      applicantId: 'a',
      businessId: 'b',
      at: AT,
    });
    const snapshot = {...draft};
    expect(() =>
      transitionApplication(draft, 'AUTO_APPROVE', {
        actor: 'RULES_ENGINE',
        at: 'later',
        auditId: 'x',
      }),
    ).toThrow(InvalidStateTransitionError);
    expect(draft).toEqual(snapshot); // unchanged
  });

  it('a successful transition does not mutate a frozen input', () => {
    const draft = Object.freeze(
      createDraftApplication({
        id: 'app-4',
        applicantId: 'a',
        businessId: 'b',
        at: AT,
      }),
    );
    const {application} = transitionApplication(draft, 'SUBMIT', {
      actor: 'APPLICANT',
      at: 'later',
      auditId: 'audit-1',
    });
    expect(application).not.toBe(draft); // new object
    expect(application.status).toBe('SUBMITTED');
    expect(draft.status).toBe('DRAFT'); // original frozen + untouched
  });
});
