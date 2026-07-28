/**
 * Wholesale verification — typed error classes (Sprint A1).
 * All domain errors extend WholesaleError so callers can branch on `code`.
 */
import type {ApplicationEvent, ApplicationStatus, Actor} from './types';

export class WholesaleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'WholesaleError';
    this.code = code;
  }
}

/** An event was fired from a state that does not allow it. */
export class InvalidStateTransitionError extends WholesaleError {
  constructor(
    readonly from: ApplicationStatus,
    readonly event: ApplicationEvent,
  ) {
    super(
      'INVALID_STATE_TRANSITION',
      `Cannot apply event "${event}" from state "${from}".`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/** An actor attempted a transition they are not permitted to fire. */
export class UnauthorizedActorError extends WholesaleError {
  constructor(
    readonly actor: Actor,
    readonly event: ApplicationEvent,
  ) {
    super(
      'UNAUTHORIZED_ACTOR',
      `Actor "${actor}" may not fire event "${event}".`,
    );
    this.name = 'UnauthorizedActorError';
  }
}

export class ApplicationNotFoundError extends WholesaleError {
  constructor(readonly id: string) {
    super('APPLICATION_NOT_FOUND', `Application "${id}" not found.`);
    this.name = 'ApplicationNotFoundError';
  }
}

export class ValidationError extends WholesaleError {
  constructor(message: string) {
    super('VALIDATION', message);
    this.name = 'ValidationError';
  }
}

export class FeatureDisabledError extends WholesaleError {
  constructor(readonly flag: string) {
    super('FEATURE_DISABLED', `Feature "${flag}" is disabled.`);
    this.name = 'FeatureDisabledError';
  }
}

/**
 * A Shopify write was attempted while SHOPIFY_WRITE_ENABLED is false. The
 * sandbox records payloads for review and must never write to Shopify — this is
 * the hard guard behind that guarantee (docs/ai/15).
 */
export class ProductionWriteBlockedError extends WholesaleError {
  constructor() {
    super(
      'PRODUCTION_WRITE_BLOCKED',
      'Shopify write attempted while SHOPIFY_WRITE_ENABLED=false. The sandbox records payloads only.',
    );
    this.name = 'ProductionWriteBlockedError';
  }
}

export class RepositoryError extends WholesaleError {
  constructor(message: string) {
    super('REPOSITORY', message);
    this.name = 'RepositoryError';
  }
}
