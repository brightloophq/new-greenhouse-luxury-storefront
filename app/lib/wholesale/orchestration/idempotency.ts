/**
 * Wholesale verification — idempotency (Sprint A2).
 *
 * Records the result of a completed command keyed by its idempotency key so a
 * replayed command returns the prior result WITHOUT repeating the state
 * transition or emitting a second audit event. Sandbox implementation is
 * in-memory; a real store is a later sprint.
 */
import type {WorkflowResultEnvelope} from './contracts';

export interface IdempotencyRepository {
  has(key: string): Promise<boolean>;
  get(key: string): Promise<WorkflowResultEnvelope | null>;
  remember(key: string, result: WorkflowResultEnvelope): Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createInMemoryIdempotencyRepository(): IdempotencyRepository {
  const store = new Map<string, WorkflowResultEnvelope>();
  return {
    async has(key) {
      return store.has(key);
    },
    async get(key) {
      const found = store.get(key);
      return found ? clone(found) : null;
    },
    async remember(key, result) {
      store.set(key, clone(result));
    },
  };
}
