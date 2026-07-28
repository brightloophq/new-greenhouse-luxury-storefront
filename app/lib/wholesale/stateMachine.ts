/**
 * Wholesale verification — the application state machine (Sprint A1).
 *
 * The single source of truth for lifecycle transitions (docs/ai/14 Phase 2):
 *
 *   DRAFT → SUBMITTED → PENDING → (checks) → NEEDS_REVIEW
 *        → APPROVED | REJECTED | MORE_INFO   (MORE_INFO → PENDING)
 *        → APPROVED → PROVISIONED → ACTIVE → (EXPIRED → PENDING)
 *   plus PROVIDER_UNAVAILABLE as a holding state (retry or escalate).
 *
 * Deterministic + pure: no clock, no randomness, no I/O. Timestamps and ids are
 * injected by the caller so every transition is reproducible and auditable.
 */
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  Actor,
  AuditEvent,
  DecisionOutcome,
} from './types';
import {InvalidStateTransitionError, UnauthorizedActorError} from './errors';

export const ALL_STATUSES: readonly ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'PENDING',
  'PROVIDER_UNAVAILABLE',
  'NEEDS_REVIEW',
  'MORE_INFO',
  'APPROVED',
  'REJECTED',
  'PROVISIONED',
  'ACTIVE',
  'EXPIRED',
] as const;

/** States with no outgoing transitions. */
export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ['REJECTED'] as const;

interface TransitionDef {
  /** States the event may be fired from. */
  from: readonly ApplicationStatus[];
  /** Resulting state. */
  to: ApplicationStatus;
  /** Actors permitted to fire the event (authorization foundation). */
  actors: readonly Actor[];
}

/** The complete transition table. */
export const TRANSITIONS: Record<ApplicationEvent, TransitionDef> = {
  SUBMIT: {from: ['DRAFT'], to: 'SUBMITTED', actors: ['APPLICANT']},
  BEGIN_CHECKS: {from: ['SUBMITTED'], to: 'PENDING', actors: ['SYSTEM', 'N8N']},
  PROVIDER_TIMEOUT: {
    from: ['PENDING'],
    to: 'PROVIDER_UNAVAILABLE',
    actors: ['SYSTEM', 'N8N'],
  },
  RETRY_CHECKS: {
    from: ['PROVIDER_UNAVAILABLE'],
    to: 'PENDING',
    actors: ['SYSTEM', 'N8N'],
  },
  ESCALATE_UNAVAILABLE: {
    from: ['PROVIDER_UNAVAILABLE'],
    to: 'NEEDS_REVIEW',
    actors: ['SYSTEM', 'N8N'],
  },
  FLAG_FOR_REVIEW: {from: ['PENDING'], to: 'NEEDS_REVIEW', actors: ['RULES_ENGINE']},
  AUTO_APPROVE: {from: ['PENDING'], to: 'APPROVED', actors: ['RULES_ENGINE']},
  AUTO_REJECT: {from: ['PENDING'], to: 'REJECTED', actors: ['RULES_ENGINE']},
  REQUEST_INFO: {
    from: ['PENDING', 'NEEDS_REVIEW'],
    to: 'MORE_INFO',
    actors: ['RULES_ENGINE', 'HUMAN_REVIEWER'],
  },
  MANUAL_APPROVE: {from: ['NEEDS_REVIEW'], to: 'APPROVED', actors: ['HUMAN_REVIEWER']},
  MANUAL_REJECT: {from: ['NEEDS_REVIEW'], to: 'REJECTED', actors: ['HUMAN_REVIEWER']},
  RESUBMIT: {from: ['MORE_INFO'], to: 'PENDING', actors: ['APPLICANT']},
  PROVISION: {from: ['APPROVED'], to: 'PROVISIONED', actors: ['SYSTEM', 'N8N']},
  ACTIVATE: {from: ['PROVISIONED'], to: 'ACTIVE', actors: ['SYSTEM']},
  EXPIRE: {from: ['ACTIVE'], to: 'EXPIRED', actors: ['SYSTEM']},
  REVERIFY: {from: ['EXPIRED'], to: 'PENDING', actors: ['SYSTEM', 'N8N']},
};

/** Maps a Rules-Engine outcome (docs/ai/13 §5) to the event that enacts it. */
export const EVENT_FOR_OUTCOME: Record<DecisionOutcome, ApplicationEvent> = {
  APPROVED: 'AUTO_APPROVE',
  REJECTED: 'AUTO_REJECT',
  MANUAL_REVIEW: 'FLAG_FOR_REVIEW',
  MORE_INFORMATION_REQUIRED: 'REQUEST_INFO',
  PROVIDER_UNAVAILABLE: 'PROVIDER_TIMEOUT',
};

export function canApply(from: ApplicationStatus, event: ApplicationEvent): boolean {
  // Guard unknown/unsupported events (defensive against untyped callers): an
  // unrecognised event is simply not allowed, so `applyEvent` throws the typed
  // InvalidStateTransitionError rather than a generic TypeError.
  const def = TRANSITIONS[event];
  if (!def) return false;
  return def.from.includes(from);
}

/** The pure transition: returns the next state or throws. */
export function applyEvent(
  from: ApplicationStatus,
  event: ApplicationEvent,
): ApplicationStatus {
  if (!canApply(from, event)) throw new InvalidStateTransitionError(from, event);
  return TRANSITIONS[event].to;
}

export function allowedEvents(from: ApplicationStatus): ApplicationEvent[] {
  return (Object.keys(TRANSITIONS) as ApplicationEvent[]).filter((event) =>
    canApply(from, event),
  );
}

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function actorCanFire(event: ApplicationEvent, actor: Actor): boolean {
  return TRANSITIONS[event].actors.includes(actor);
}

export function eventForOutcome(outcome: DecisionOutcome): ApplicationEvent {
  return EVENT_FOR_OUTCOME[outcome];
}

export interface TransitionContext {
  actor: Actor;
  /** ISO timestamp — injected for determinism. */
  at: string;
  /** Id for the audit event this transition emits. */
  auditId: string;
  reason?: string;
  /** When true, enforce that `actor` is permitted to fire the event. */
  enforceActor?: boolean;
}

/**
 * Transition an application and produce the matching append-only audit event.
 * Pure: returns a new Application (does not mutate the input) plus the audit
 * record; persistence is the caller's/repository's job.
 */
export function transitionApplication(
  app: Application,
  event: ApplicationEvent,
  ctx: TransitionContext,
): {application: Application; audit: AuditEvent} {
  const from = app.status;
  const to = applyEvent(from, event); // throws InvalidStateTransitionError
  if (ctx.enforceActor && !actorCanFire(event, ctx.actor)) {
    throw new UnauthorizedActorError(ctx.actor, event);
  }
  const application: Application = {...app, status: to, updatedAt: ctx.at};
  const audit: AuditEvent = {
    id: ctx.auditId,
    applicationId: app.id,
    actor: ctx.actor,
    action: event,
    fromStatus: from,
    toStatus: to,
    reason: ctx.reason,
    at: ctx.at,
  };
  return {application, audit};
}

/** Factory for a fresh DRAFT application (timestamps injected for determinism). */
export function createDraftApplication(input: {
  id: string;
  applicantId: string;
  businessId: string;
  at: string;
}): Application {
  return {
    id: input.id,
    applicantId: input.applicantId,
    businessId: input.businessId,
    status: 'DRAFT',
    createdAt: input.at,
    updatedAt: input.at,
  };
}
