import {describe, expect, it, vi} from 'vitest';
import type {Application} from '../types';
import {SENSITIVE_FIELDS} from '../types';
import {createInMemoryRepositories} from '../sandbox/inMemoryRepositories';
import {createDraftApplication} from '../stateMachine';
import {RepositoryError} from '../errors';
import type {Logger} from '../logging';
import {createOrchestrationService} from './orchestrationService';
import {createInMemoryIdempotencyRepository} from './idempotency';
import {WORKFLOW_VERSION, type WorkflowCommandEnvelope} from './contracts';

const AT = '2026-07-28T12:00:00.000Z';

function command(
  over: Partial<WorkflowCommandEnvelope> & Pick<WorkflowCommandEnvelope, 'type'>,
): WorkflowCommandEnvelope {
  return {
    applicationId: 'app-1',
    correlationId: 'corr-1',
    idempotencyKey: `key-${over.type}`,
    workflowVersion: WORKFLOW_VERSION,
    actor: 'SYSTEM',
    at: AT,
    ...over,
  };
}

function setup(status: Application['status'] = 'DRAFT') {
  const repositories = createInMemoryRepositories();
  const idempotency = createInMemoryIdempotencyRepository();
  const app: Application = {
    ...createDraftApplication({
      id: 'app-1',
      applicantId: 'applicant-1',
      businessId: 'business-1',
      at: '2026-07-28T09:00:00.000Z',
    }),
    status,
  };
  return {repositories, idempotency, app};
}

describe('orchestration — successful command handling', () => {
  it('submits a draft application and records the audit', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});

    const result = await svc.handle(
      command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'}),
    );

    expect(result.status).toBe('completed');
    expect(result.applicationStatus).toBe('SUBMITTED');
    expect(result.workflowVersion).toBe(WORKFLOW_VERSION);
    expect((await repositories.applications.get('app-1'))?.status).toBe(
      'SUBMITTED',
    );
    const audit = await repositories.audit.listByApplication('app-1');
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'SUBMIT',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      actor: 'APPLICANT',
    });
  });

  it('enacts a recorded verification outcome (APPROVED → APPROVED)', async () => {
    const {repositories, idempotency, app} = setup('PENDING');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});

    const result = await svc.handle(
      command({
        type: 'RECORD_VERIFICATION_RESULT',
        actor: 'RULES_ENGINE',
        outcome: 'APPROVED',
      }),
    );
    expect(result.status).toBe('completed');
    expect(result.applicationStatus).toBe('APPROVED');
  });

  it('returns manual_review_required when the outcome routes to review', async () => {
    const {repositories, idempotency, app} = setup('PENDING');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});

    const result = await svc.handle(
      command({
        type: 'RECORD_VERIFICATION_RESULT',
        actor: 'RULES_ENGINE',
        outcome: 'MANUAL_REVIEW',
      }),
    );
    expect(result.status).toBe('manual_review_required');
    expect(result.applicationStatus).toBe('NEEDS_REVIEW');
  });

  it('routes an explicit manual-review command', async () => {
    const {repositories, idempotency, app} = setup('PENDING');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'ROUTE_TO_MANUAL_REVIEW', actor: 'RULES_ENGINE'}),
    );
    expect(result.status).toBe('manual_review_required');
    expect(result.applicationStatus).toBe('NEEDS_REVIEW');
  });
});

describe('orchestration — invalid transitions', () => {
  it('classifies an illegal transition as a permanent failure', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'APPROVE', actor: 'RULES_ENGINE'}),
    );
    expect(result.status).toBe('permanent_failure');
    expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
    expect(result.error?.classification).toBe('non_retryable');
    // no transition, no audit
    expect((await repositories.applications.get('app-1'))?.status).toBe('DRAFT');
    expect(await repositories.audit.all()).toHaveLength(0);
  });

  it('classifies an unauthorized actor as a permanent failure', async () => {
    const {repositories, idempotency, app} = setup('NEEDS_REVIEW');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'APPROVE', actor: 'APPLICANT'}), // only HUMAN_REVIEWER may
    );
    expect(result.status).toBe('permanent_failure');
    expect(result.error?.code).toBe('UNAUTHORIZED_ACTOR');
  });

  it('classifies a missing application as a permanent failure', async () => {
    const {repositories, idempotency} = setup();
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'}),
    );
    expect(result.status).toBe('permanent_failure');
    expect(result.error?.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('classifies a malformed command (missing outcome) as permanent', async () => {
    const {repositories, idempotency, app} = setup('PENDING');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'RECORD_VERIFICATION_RESULT', actor: 'RULES_ENGINE'}),
    );
    expect(result.status).toBe('permanent_failure');
    expect(result.error?.code).toBe('VALIDATION');
  });
});

describe('orchestration — retryable failures', () => {
  it('classifies a transient repository error as retryable', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    // Force a transient failure on read.
    vi.spyOn(repositories.applications, 'get').mockRejectedValueOnce(
      new RepositoryError('storage unavailable'),
    );
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'}),
    );
    expect(result.status).toBe('retryable_failure');
    expect(result.error?.classification).toBe('retryable');
    // a retryable failure is NOT remembered → same key can be retried
    expect(await idempotency.has('key-SUBMIT_APPLICATION')).toBe(false);
  });
});

describe('orchestration — idempotency', () => {
  it('a duplicate command returns `duplicate` and does not repeat work', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const cmd = command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'});

    const first = await svc.handle(cmd);
    const second = await svc.handle(cmd);

    expect(first.status).toBe('completed');
    expect(second.status).toBe('duplicate');
    expect(second.applicationStatus).toBe('SUBMITTED');
    // exactly ONE audit event and the app transitioned only once
    expect(await repositories.audit.all()).toHaveLength(1);
    expect((await repositories.applications.get('app-1'))?.status).toBe(
      'SUBMITTED',
    );
  });
});

describe('orchestration — correlation, purity, logging', () => {
  it('propagates the correlation id onto the result', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const result = await svc.handle(
      command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT', correlationId: 'trace-xyz'}),
    );
    expect(result.correlationId).toBe('trace-xyz');
  });

  it('does not mutate the input command (frozen input is safe)', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const svc = createOrchestrationService({repositories, idempotency});
    const cmd = Object.freeze(
      command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'}),
    );
    const snapshot = {...cmd};
    await svc.handle(cmd);
    expect(cmd).toEqual(snapshot);
  });

  it('never logs sensitive fields and always carries the correlation id', async () => {
    const {repositories, idempotency, app} = setup('DRAFT');
    await repositories.applications.create(app);
    const entries: Array<Record<string, unknown>> = [];
    const capture: Logger = {
      log(entry) {
        if (entry.context) entries.push(entry.context);
      },
    };
    const svc = createOrchestrationService({
      repositories,
      idempotency,
      logger: capture,
    });
    await svc.handle(command({type: 'SUBMIT_APPLICATION', actor: 'APPLICANT'}));

    expect(entries.length).toBeGreaterThan(0);
    for (const ctx of entries) {
      expect(ctx.correlationId).toBe('corr-1');
      for (const sensitive of SENSITIVE_FIELDS) {
        expect(ctx).not.toHaveProperty(sensitive);
      }
    }
  });
});
