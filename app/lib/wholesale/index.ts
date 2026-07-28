/**
 * Wholesale verification domain — public API (Sprint A1 foundation).
 *
 * Scope (docs/ai/14 Sprint A1): domain types, state machine, feature flags,
 * typed errors, logging/audit foundations, repository interfaces + in-memory
 * sandbox implementations. NOT in scope yet: Shopify integration, n8n workflows,
 * AI Officer, TRN verification, UI. Nothing here performs a production write.
 */
export * from './types';
export * from './errors';
export * from './stateMachine';
export * from './featureFlags';
export * from './logging';
export * from './repositories';
export {
  SANDBOX_SCHEMA_VERSION,
  MIGRATIONS,
  LOGICAL_SCHEMA,
  type Migration,
} from './sandbox/schema';
export {createInMemoryRepositories} from './sandbox/inMemoryRepositories';
