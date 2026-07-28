/**
 * Wholesale verification — command → state-machine event resolution (Sprint A2).
 *
 * Maps each orchestration command to the A1 state-machine event that enacts it,
 * given the application's current status. This is routing only — it invents no
 * decision logic (the Rules Engine is a later sprint); RECORD_VERIFICATION_RESULT
 * simply enacts the DecisionOutcome it is handed via A1's `eventForOutcome`.
 */
import type {ApplicationEvent, ApplicationStatus} from '../types';
import {eventForOutcome} from '../stateMachine';
import {ValidationError} from '../errors';
import type {WorkflowCommandEnvelope} from './contracts';

/**
 * Resolve the event for a command. Throws ValidationError for malformed
 * commands (e.g. a verification result with no outcome). Whether the resolved
 * event is legal from `status` is decided by the state machine when applied.
 */
export function resolveEvent(
  command: WorkflowCommandEnvelope,
  status: ApplicationStatus,
): ApplicationEvent {
  switch (command.type) {
    case 'SUBMIT_APPLICATION':
      return 'SUBMIT';
    case 'BEGIN_VERIFICATION':
      return 'BEGIN_CHECKS';
    case 'RECORD_VERIFICATION_RESULT':
      if (!command.outcome) {
        throw new ValidationError(
          'RECORD_VERIFICATION_RESULT requires an `outcome`.',
        );
      }
      return eventForOutcome(command.outcome);
    case 'ROUTE_TO_MANUAL_REVIEW':
      return status === 'PROVIDER_UNAVAILABLE'
        ? 'ESCALATE_UNAVAILABLE'
        : 'FLAG_FOR_REVIEW';
    case 'REQUEST_ADDITIONAL_INFORMATION':
      return 'REQUEST_INFO';
    case 'APPROVE':
      return status === 'NEEDS_REVIEW' ? 'MANUAL_APPROVE' : 'AUTO_APPROVE';
    case 'REJECT':
      return status === 'NEEDS_REVIEW' ? 'MANUAL_REJECT' : 'AUTO_REJECT';
    default: {
      // Exhaustiveness: a new CommandType must be handled above.
      const exhaustive: never = command.type;
      throw new ValidationError(`Unknown command type: ${String(exhaustive)}`);
    }
  }
}
