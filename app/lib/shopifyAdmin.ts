/**
 * Minimal server-only Shopify Admin GraphQL client for the internal wholesale
 * review route. The Admin token is read from server env, sent only in the
 * `X-Shopify-Access-Token` header, and redacted from any thrown error. It never
 * reaches the browser. Modeled on scripts/shopify/admin.mjs.
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

/** Redact the Admin token (and any shpat_ literal) from a message. */
function redactAdmin(message: string, token: string): string {
  let out = message;
  if (token) out = out.split(token).join('«redacted»');
  return out.replace(/shpat_[0-9A-Za-z]+/g, '«redacted»');
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
    if (!configured) throw new Error('Admin API is not configured');
    const res = await fetchImpl(
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
    // Never echo the response body (it may contain applicant data / CRA/TRN).
    if (!res.ok) {
      throw new Error(redactAdmin(`Admin API HTTP ${res.status}`, token));
    }
    const body = (await res.json()) as {data?: T; errors?: unknown};
    if (Array.isArray((body as {errors?: unknown[]}).errors)) {
      throw new Error(redactAdmin('Admin API returned errors', token));
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
  if (!c) throw new Error('Customer not found');
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
