/**
 * Wholesale verification — in-memory sandbox repositories (Sprint A1).
 *
 * The sandbox storage adapter: no real database, no external I/O, no Shopify.
 * Returns copies so callers cannot mutate stored records by reference, and the
 * audit repository is strictly append-only (immutable trail).
 */
import type {
  Application,
  AuditEvent,
  RecordedShopifyPayload,
} from '../types';
import {
  ApplicationNotFoundError,
  RepositoryError,
} from '../errors';
import type {
  ApplicationRepository,
  AuditEventRepository,
  PayloadRecorderRepository,
  Repositories,
} from '../repositories';

function clone<T>(value: T): T {
  return structuredClone(value);
}

class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly store = new Map<string, Application>();

  async create(application: Application): Promise<Application> {
    if (this.store.has(application.id)) {
      throw new RepositoryError(`Application "${application.id}" already exists.`);
    }
    this.store.set(application.id, clone(application));
    return clone(application);
  }

  async get(id: string): Promise<Application | null> {
    const found = this.store.get(id);
    return found ? clone(found) : null;
  }

  async save(application: Application): Promise<Application> {
    if (!this.store.has(application.id)) {
      throw new ApplicationNotFoundError(application.id);
    }
    this.store.set(application.id, clone(application));
    return clone(application);
  }

  async list(): Promise<Application[]> {
    return [...this.store.values()].map(clone);
  }
}

class InMemoryAuditEventRepository implements AuditEventRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<AuditEvent> {
    this.events.push(clone(event));
    return clone(event);
  }

  async listByApplication(applicationId: string): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.applicationId === applicationId)
      .map(clone);
  }

  async all(): Promise<AuditEvent[]> {
    return this.events.map(clone);
  }
}

class InMemoryPayloadRecorderRepository implements PayloadRecorderRepository {
  private readonly payloads: RecordedShopifyPayload[] = [];

  async record(payload: RecordedShopifyPayload): Promise<RecordedShopifyPayload> {
    this.payloads.push(clone(payload));
    return clone(payload);
  }

  async listByApplication(
    applicationId: string,
  ): Promise<RecordedShopifyPayload[]> {
    return this.payloads
      .filter((payload) => payload.applicationId === applicationId)
      .map(clone);
  }

  async all(): Promise<RecordedShopifyPayload[]> {
    return this.payloads.map(clone);
  }
}

/** Build a fresh, isolated set of in-memory sandbox repositories. */
export function createInMemoryRepositories(): Repositories {
  return {
    applications: new InMemoryApplicationRepository(),
    audit: new InMemoryAuditEventRepository(),
    payloads: new InMemoryPayloadRecorderRepository(),
  };
}
