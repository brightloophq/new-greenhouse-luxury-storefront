/**
 * Server-only Shopify Admin GraphQL client for the internal wholesale review
 * route. The access token is obtained automatically from the token provider
 * (client-credentials, cached — see shopifyAdminToken.ts) and sent only in the
 * `X-Shopify-Access-Token` header. On a 401 the token is refreshed once and the
 * request retried exactly once. Failures surface as an AdminReadError carrying
 * ONLY a fixed reason code; the token/credentials never reach the browser.
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
import {
  AdminReadError,
  adminReadReason,
  getAdminToken,
  isValidShopDomain,
  resolveAdminDomain,
  type AdminEnv,
  type AdminReadReason,
} from '~/lib/shopifyAdminToken';

// Re-export so existing importers (route, tests) keep importing from shopifyAdmin.
export {AdminReadError, adminReadReason};
export type {AdminEnv, AdminReadReason};

const ADMIN_API_VERSION = '2025-01';

export interface AdminClient {
  configured: boolean;
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
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

/** Usable when a domain resolves AND some credential (client creds or static) exists. */
function hasCredentials(env: AdminEnv): boolean {
  return Boolean(
    ((env.SHOPIFY_API_KEY ?? '').trim() && (env.SHOPIFY_API_SECRET ?? '').trim()) ||
      (env.SHOPIFY_ADMIN_API_TOKEN ?? '').trim(),
  );
}

export function createAdminClient(
  env: AdminEnv,
  fetchImpl: typeof fetch = fetch,
): AdminClient {
  const domain = resolveAdminDomain(env);
  const configured = Boolean(domain && hasCredentials(env));

  async function send(
    token: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<Response> {
    try {
      return await fetchImpl(
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
  }

  async function graphql<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    if (!isValidShopDomain(domain)) {
      throw new AdminReadError('admin_shop_domain_invalid');
    }

    // Obtain a token (client-credentials, cached) and send. On 401, refresh the
    // token once and retry EXACTLY once — never an unbounded loop.
    let token = await getAdminToken(env, {fetchImpl});
    let res = await send(token, query, variables);
    if (res.status === 401) {
      token = await getAdminToken(env, {fetchImpl, force: true});
      res = await send(token, query, variables);
      if (res.status === 401) throw new AdminReadError('admin_retry_failed');
    }

    // Map remaining HTTP status to a fixed code. Never echo the response body.
    if (!res.ok) {
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
    // Contact email is a Level-2 protected customer-data field; it is NOT read
    // here (avoids a PCD-gated field). The internal email already carries it.
    contactEmail: '',
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
