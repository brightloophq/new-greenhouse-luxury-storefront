/**
 * Wholesale verification — orchestration service (Sprint A2).
 *
 * The application-layer entry point an orchestrator (n8n, later) calls: it takes
 * one typed command, applies it through the A1 state machine, persists the
 * application + an append-only audit event, and returns a typed result. Pure
 * routing + persistence — NO n8n, Shopify, TRN, AI, provider or UI code.
 *
 * Deterministic: timestamps + ids come from the command; the audit id is derived
 * from the idempotency key. Idempotent: a replayed command returns the prior
 * result as `duplicate` and repeats no transition or audit event.
 *
 * Logging carries the correlation id and NEVER sensitive fields — the injected
 * logger redacts, and the service only ever logs ids/type/status.
 */
import type {Repositories} from '../repositories';
import {ApplicationNotFoundError, WholesaleError} from '../errors';
import {transitionApplication} from '../stateMachine';
import {createNoopLogger, type Logger} from '../logging';
import type {
  OrchestrationResultStatus,
  WorkflowCommandEnvelope,
  WorkflowResultEnvelope,
} from './contracts';
import type {IdempotencyRepository} from './idempotency';
import {classifyError} from './retry';
import {resolveEvent} from './commands';

export interface OrchestrationDeps {
  repositories: Pick<Repositories, 'applications' | 'audit'>;
  idempotency: IdempotencyRepository;
  logger?: Logger;
}

export interface OrchestrationService {
  handle(command: WorkflowCommandEnvelope): Promise<WorkflowResultEnvelope>;
}

export function createOrchestrationService(
  deps: OrchestrationDeps,
): OrchestrationService {
  const logger = deps.logger ?? createNoopLogger();

  function base(command: WorkflowCommandEnvelope) {
    return {
      type: command.type,
      applicationId: command.applicationId,
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey,
      workflowVersion: command.workflowVersion,
      at: command.at,
    };
  }

  async function handle(
    command: WorkflowCommandEnvelope,
  ): Promise<WorkflowResultEnvelope> {
    logger.log({
      level: 'info',
      message: 'orchestration.command.received',
      at: command.at,
      context: {
        correlationId: command.correlationId,
        applicationId: command.applicationId,
        type: command.type,
        idempotencyKey: command.idempotencyKey,
      },
    });

    // Idempotency: a replay returns the prior result and does NOT re-transition.
    const prior = await deps.idempotency.get(command.idempotencyKey);
    if (prior) {
      logger.log({
        level: 'info',
        message: 'orchestration.command.duplicate',
        at: command.at,
        context: {
          correlationId: command.correlationId,
          idempotencyKey: command.idempotencyKey,
        },
      });
      return {
        ...prior,
        correlationId: command.correlationId,
        status: 'duplicate',
        at: command.at,
      };
    }

    try {
      const app = await deps.repositories.applications.get(command.applicationId);
      if (!app) throw new ApplicationNotFoundError(command.applicationId);

      const event = resolveEvent(command, app.status);
      const {application, audit} = transitionApplication(app, event, {
        actor: command.actor,
        at: command.at,
        auditId: `audit:${command.idempotencyKey}`,
        reason: command.reason,
        enforceActor: true,
      });

      await deps.repositories.applications.save(application);
      await deps.repositories.audit.append(audit);

      const status: OrchestrationResultStatus =
        application.status === 'NEEDS_REVIEW'
          ? 'manual_review_required'
          : 'completed';
      const result: WorkflowResultEnvelope = {
        ...base(command),
        status,
        applicationStatus: application.status,
      };
      // Only successful results are remembered — a retryable failure must stay
      // retryable under the same key.
      await deps.idempotency.remember(command.idempotencyKey, result);

      logger.log({
        level: 'info',
        message: 'orchestration.command.completed',
        at: command.at,
        context: {
          correlationId: command.correlationId,
          applicationId: command.applicationId,
          status,
          applicationStatus: application.status,
        },
      });
      return result;
    } catch (error) {
      const classification = classifyError(error);
      const code = error instanceof WholesaleError ? error.code : 'UNKNOWN';
      const message = error instanceof Error ? error.message : String(error);
      logger.log({
        level: 'warn',
        message: 'orchestration.command.failed',
        at: command.at,
        context: {
          correlationId: command.correlationId,
          applicationId: command.applicationId,
          code,
          classification,
        },
      });
      return {
        ...base(command),
        status:
          classification === 'retryable'
            ? 'retryable_failure'
            : 'permanent_failure',
        error: {code, message, classification},
      };
    }
  }

  return {handle};
}
