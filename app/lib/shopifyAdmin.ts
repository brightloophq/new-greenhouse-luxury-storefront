/**
 * Minimal server-only Shopify Admin GraphQL client for the internal wholesale
 * review route. The Admin token is read from server env and sent only in the
 * `X-Shopify-Access-Token` header — never in the URL, body, a thrown value, or
 * the client bundle. Failures surface as an `AdminReadError` carrying ONLY a
 * fixed reason code (no token, response body, customer id, CRA/TRN, or email),
 * so the route can log the exact cause safely. Modeled on scripts/shopify/admin.mjs.
 */
import {
  REVIEW_CUSTOMER_QUERY,
  REVIEW_DECISION_MUTATION,
} from '~/graphql/admin/WholesaleReview';
import {
  buildDecisionMetafields,
  type DecisionMetafieldInput,
} from '~/lib/wholesaleReview';
import type {ReviewAction} from '~/lib/wholesaleReviewToken';

const ADMIN_API_VERSION = '2025-01';

export interface AdminEnv {
  SHOPIFY_ADMIN_API_TOKEN?: string;
  PUBLIC_STORE_DOMAIN?: string;
}

export interface AdminClient {
  configured: boolean;
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
}

/** Fixed diagnostic codes for an Admin read failure — never a value. */
export type AdminReadReason =
  | 'admin_config_missing'
  | 'admin_shop_domain_invalid'
  | 'admin_network_failed'
  | 'admin_token_invalid'
  | 'admin_scope_denied'
  | 'admin_http_not_found'
  | 'admin_http_error'
  | 'admin_graphql_error'
  | 'customer_query_invalid'
  | 'customer_not_found';

/** Carries only a fixed reason code — its message IS the code (no PII/secret). */
export class AdminReadError extends Error {
  reason: AdminReadReason;
  constructor(reason: AdminReadReason) {
    super(reason);
    this.name = 'AdminReadError';
    this.reason = reason;
  }
}

/** Map any thrown value to a fixed code (unexpected throws → admin_http_error). */
export function adminReadReason(error: unknown): AdminReadReason {
  return error instanceof AdminReadError ? error.reason : 'admin_http_error';
}

/** A bare hostname (no scheme/space/path) with a dot — e.g. ax41k1-k5.myshopify.com. */
function isValidShopDomain(domain: string): boolean {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain);
}

/** Classify top-level GraphQL errors by their category code ONLY (never the message). */
function classifyGraphqlErrors(errors: unknown[]): AdminReadReason {
  for (const e of errors) {
    const code = (e as {extensions?: {code?: string}} | null)?.extensions?.code;
    if (code === 'ACCESS_DENIED') return 'admin_scope_denied';
    if (
      code === 'GRAPHQL_VALIDATION_FAILED' ||
      code === 'GRAPHQL_PARSE_FAILED' ||
      code === 'undefinedField' ||
      code === 'argumentLiteralsIncompatible'
    ) {
      return 'customer_query_invalid';
    }
  }
  return 'admin_graphql_error';
}

export function createAdminClient(
  env: AdminEnv,
  fetchImpl: typeof fetch = fetch,
): AdminClient {
  const token = env.SHOPIFY_ADMIN_API_TOKEN ?? '';
  const domain = env.PUBLIC_STORE_DOMAIN ?? '';
  const configured = Boolean(token && domain);

  async function graphql<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    if (!configured) throw new AdminReadError('admin_config_missing');
    if (!isValidShopDomain(domain)) {
      throw new AdminReadError('admin_shop_domain_invalid');
    }

    let res: Response;
    try {
      res = await fetchImpl(
        `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({query, variables}),
        },
      );
    } catch {
      throw new AdminReadError('admin_network_failed');
    }

    // Map HTTP status to a fixed code. Never echo the response body.
    if (!res.ok) {
      if (res.status === 401) throw new AdminReadError('admin_token_invalid');
      if (res.status === 403) throw new AdminReadError('admin_scope_denied');
      if (res.status === 404) throw new AdminReadError('admin_http_not_found');
      throw new AdminReadError('admin_http_error');
    }

    let body: {data?: T; errors?: unknown};
    try {
      body = (await res.json()) as {data?: T; errors?: unknown};
    } catch {
      throw new AdminReadError('admin_graphql_error');
    }
    const errs = (body as {errors?: unknown}).errors;
    if (Array.isArray(errs) && errs.length) {
      // Only the error CATEGORY code is read — never the message/body/data.
      throw new AdminReadError(classifyGraphqlErrors(errs));
    }
    return body.data as T;
  }

  return {configured, graphql};
}

export interface WholesaleReviewDetails {
  customerId: string;
  contactEmail: string;
  businessName: string;
  businessType: string;
  businessPhone: string;
  craTrn: string;
  wholesaleStatus: string;
}

type ReviewCustomerResponse = {
  customer: {
    id: string;
    email: string | null;
    businessName: {value: string | null} | null;
    businessType: {value: string | null} | null;
    craTrn: {value: string | null} | null;
    businessPhone: {value: string | null} | null;
    wholesaleStatus: {value: string | null} | null;
  } | null;
};

/** Read the applicant details for the confirmation page (read-only). */
export async function readWholesaleReview(
  admin: AdminClient,
  customerId: string,
): Promise<WholesaleReviewDetails> {
  const data = await admin.graphql<ReviewCustomerResponse>(
    REVIEW_CUSTOMER_QUERY,
    {id: customerId},
  );
  const c = data?.customer;
  if (!c) throw new AdminReadError('customer_not_found');
  return {
    customerId: c.id,
    contactEmail: c.email ?? '',
    businessName: c.businessName?.value ?? '',
    businessType: c.businessType?.value ?? '',
    businessPhone: c.businessPhone?.value ?? '',
    craTrn: c.craTrn?.value ?? '',
    wholesaleStatus: c.wholesaleStatus?.value ?? '',
  };
}

type DecisionResponse = {
  metafieldsSet: {
    metafields: Array<{key: string; namespace: string}> | null;
    userErrors: Array<{field?: string[] | null; message: string; code?: string}>;
  };
};

/** Read only the current wholesale_status (guard re-check before writing). */
export async function readWholesaleStatus(
  admin: AdminClient,
  customerId: string,
): Promise<string> {
  const details = await readWholesaleReview(admin, customerId);
  return details.wholesaleStatus;
}

/** Write the decision via metafieldsSet. ok=false on any userError. */
export async function writeWholesaleDecision(
  admin: AdminClient,
  customerId: string,
  action: ReviewAction,
  reason: string,
): Promise<{ok: boolean}> {
  const metafields: DecisionMetafieldInput[] = buildDecisionMetafields(
    customerId,
    action,
    reason,
  );
  const data = await admin.graphql<DecisionResponse>(REVIEW_DECISION_MUTATION, {
    metafields,
  });
  const userErrors = data?.metafieldsSet?.userErrors ?? [];
  return {ok: userErrors.length === 0};
}
