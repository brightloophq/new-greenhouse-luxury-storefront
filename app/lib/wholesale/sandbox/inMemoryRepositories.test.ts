import {describe, expect, it} from 'vitest';
import type {
  Application,
  AuditEvent,
  RecordedShopifyPayload,
} from '../types';
import {createInMemoryRepositories} from './inMemoryRepositories';
import {ApplicationNotFoundError, RepositoryError} from '../errors';
import {SANDBOX_SCHEMA_VERSION, LOGICAL_SCHEMA, MIGRATIONS} from './schema';

const app: Application = {
  id: 'app-1',
  applicantId: 'applicant-1',
  businessId: 'business-1',
  status: 'DRAFT',
  createdAt: '2026-07-28T09:00:00.000Z',
  updatedAt: '2026-07-28T09:00:00.000Z',
};

describe('in-memory application repository', () => {
  it('creates, gets, saves and lists', async () => {
    const {applications} = createInMemoryRepositories();
    await applications.create(app);
    expect(await applications.get('app-1')).toEqual(app);
    expect(await applications.get('missing')).toBeNull();

    const updated = {...app, status: 'SUBMITTED' as const, updatedAt: 'later'};
    await applications.save(updated);
    expect((await applications.get('app-1'))?.status).toBe('SUBMITTED');
    expect(await applications.list()).toHaveLength(1);
  });

  it('rejects duplicate create and save of a missing record', async () => {
    const {applications} = createInMemoryRepositories();
    await applications.create(app);
    await expect(applications.create(app)).rejects.toThrow(RepositoryError);
    await expect(
      applications.save({...app, id: 'ghost'}),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('stores copies — external mutation cannot corrupt the store', async () => {
    const {applications} = createInMemoryRepositories();
    const input = {...app};
    await applications.create(input);
    input.status = 'ACTIVE'; // mutate the caller's copy
    expect((await applications.get('app-1'))?.status).toBe('DRAFT');
  });
});

describe('in-memory audit repository (append-only)', () => {
  it('appends and lists by application, and exposes no update/delete', async () => {
    const {audit} = createInMemoryRepositories();
    const e1: AuditEvent = {
      id: 'a1',
      applicationId: 'app-1',
      actor: 'APPLICANT',
      action: 'SUBMIT',
      at: 't1',
    };
    const e2: AuditEvent = {...e1, id: 'a2', applicationId: 'app-2'};
    await audit.append(e1);
    await audit.append(e2);
    expect(await audit.listByApplication('app-1')).toEqual([e1]);
    expect(await audit.all()).toHaveLength(2);
    // append-only: the interface has no mutation methods
    expect('update' in audit).toBe(false);
    expect('delete' in audit).toBe(false);
  });
});

describe('in-memory payload recorder', () => {
  it('records intended Shopify payloads without sending them', async () => {
    const {payloads} = createInMemoryRepositories();
    const payload: RecordedShopifyPayload = {
      id: 'p1',
      applicationId: 'app-1',
      intent: 'create_company',
      payload: {name: 'The New Greenhouse'},
      target: 'dev-store',
      status: 'pending_review',
      recordedAt: 't1',
    };
    await payloads.record(payload);
    expect(await payloads.listByApplication('app-1')).toEqual([payload]);
    expect(await payloads.all()).toHaveLength(1);
  });
});

describe('sandbox schema', () => {
  it('exposes a versioned logical schema + migrations', () => {
    expect(SANDBOX_SCHEMA_VERSION).toBe(1);
    expect(MIGRATIONS[0].version).toBe(1);
    expect(LOGICAL_SCHEMA.appendOnly).toContain('audit_event');
    expect(LOGICAL_SCHEMA.entities).toContain('application');
    expect(LOGICAL_SCHEMA.sensitiveFields).toContain('business.trn');
  });
});
