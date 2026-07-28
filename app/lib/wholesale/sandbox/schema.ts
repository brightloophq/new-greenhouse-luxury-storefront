/**
 * Wholesale verification — sandbox logical schema + migrations (Sprint A1).
 *
 * The sandbox store is in-memory (no real database yet), so "migrations" here
 * are the versioned logical schema, not SQL. The full entity set is defined in
 * docs/ai/14 Phase 3; Sprint A1 materialises the first tranche and catalogues
 * the rest as `plannedEntities` so later sprints extend rather than reinvent.
 */

export const SANDBOX_SCHEMA_VERSION = 1;

export interface Migration {
  version: number;
  description: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description:
      'A1 foundation: applicant, business, application, audit_event, recorded_shopify_payload',
  },
] as const;

export const LOGICAL_SCHEMA = {
  version: SANDBOX_SCHEMA_VERSION,
  /** Entities the Sprint A1 sandbox actually stores. */
  entities: [
    'applicant',
    'business',
    'application',
    'audit_event',
    'recorded_shopify_payload',
  ],
  /** Entities defined in docs/ai/14 Phase 3, added in later sprints. */
  plannedEntities: [
    'document',
    'verification_provider',
    'verification_run',
    'ai_report',
    'risk_score',
    'decision',
    'manual_review',
    'notification',
    'shopify_link',
  ],
  /** Field paths that are sensitive — encrypted at rest + redacted in logs. */
  sensitiveFields: [
    'business.trn',
    'business.registrationNumber',
    'applicant.email',
    'applicant.phone',
  ],
  /** Append-only entities (no update/delete). */
  appendOnly: ['audit_event'],
} as const;
