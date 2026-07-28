/**
 * Wholesale verification — repository interfaces (ports) (Sprint A1).
 *
 * These are the boundaries between the domain and its storage. Sprint A1 ships
 * in-memory sandbox implementations (./sandbox/inMemoryRepositories.ts); a real
 * database adapter is a later sprint (docs/ai/14 Phase 3). Async signatures
 * mirror a real DB so swapping the adapter needs no domain changes.
 */
import type {Application, AuditEvent, RecordedShopifyPayload} from './types';

export interface ApplicationRepository {
  create(application: Application): Promise<Application>;
  get(id: string): Promise<Application | null>;
  /** Persist an updated application (must already exist). */
  save(application: Application): Promise<Application>;
  list(): Promise<Application[]>;
}

/** Append-only. No update or delete — the audit trail is immutable. */
export interface AuditEventRepository {
  append(event: AuditEvent): Promise<AuditEvent>;
  listByApplication(applicationId: string): Promise<AuditEvent[]>;
  all(): Promise<AuditEvent[]>;
}

/**
 * Records intended Shopify writes for human review instead of sending them —
 * the sandbox safety mechanism (docs/ai/15 §5).
 */
export interface PayloadRecorderRepository {
  record(payload: RecordedShopifyPayload): Promise<RecordedShopifyPayload>;
  listByApplication(applicationId: string): Promise<RecordedShopifyPayload[]>;
  all(): Promise<RecordedShopifyPayload[]>;
}

export interface Repositories {
  applications: ApplicationRepository;
  audit: AuditEventRepository;
  payloads: PayloadRecorderRepository;
}
