import {describe, expect, it} from 'vitest';
import {createInMemoryIdempotencyRepository} from './idempotency';
import {WORKFLOW_VERSION, type WorkflowResultEnvelope} from './contracts';

const result: WorkflowResultEnvelope = {
  type: 'SUBMIT_APPLICATION',
  applicationId: 'app-1',
  correlationId: 'corr-1',
  idempotencyKey: 'key-1',
  workflowVersion: WORKFLOW_VERSION,
  status: 'completed',
  applicationStatus: 'SUBMITTED',
  at: '2026-07-28T12:00:00.000Z',
};

describe('in-memory idempotency repository', () => {
  it('reports unknown keys as absent', async () => {
    const repo = createInMemoryIdempotencyRepository();
    expect(await repo.has('nope')).toBe(false);
    expect(await repo.get('nope')).toBeNull();
  });

  it('remembers and returns a stored result', async () => {
    const repo = createInMemoryIdempotencyRepository();
    await repo.remember('key-1', result);
    expect(await repo.has('key-1')).toBe(true);
    expect(await repo.get('key-1')).toEqual(result);
  });

  it('stores a copy — external mutation cannot corrupt the record', async () => {
    const repo = createInMemoryIdempotencyRepository();
    const input = {...result};
    await repo.remember('key-1', input);
    input.status = 'permanent_failure';
    expect((await repo.get('key-1'))?.status).toBe('completed');
  });
});
