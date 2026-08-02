import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createAdminClient,
  readWholesaleReview,
  writeWholesaleDecision,
  adminReadReason,
  AdminReadError,
  type AdminClient,
} from './shopifyAdmin';
import {__resetAdminTokenCache} from './shopifyAdminToken';

const ENV = {
  SHOPIFY_API_KEY: 'client_id_pub',
  SHOPIFY_API_SECRET: 'shpss_supersecretvalue',
  SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5',
};

const GQL_URL = 'https://ax41k1-k5.myshopify.com/admin/api/2025-01/graphql.json';

const http = (status: number, json: unknown = {}) =>
  ({ok: status >= 200 && status < 300, status, json: async () => json}) as unknown as Response;

const tokenOk = () =>
  http(200, {access_token: 'shpat_auto', scope: 'read_customers,write_customers', expires_in: 86399});

/** fetch mock: token endpoint → auto token; graphql endpoint → queued responses. */
function routed(graphql: Response | Response[]) {
  const queue = Array.isArray(graphql) ? [...graphql] : [graphql];
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    if (String(input).includes('/admin/oauth/access_token')) return tokenOk();
    return queue.length > 1 ? (queue.shift() as Response) : queue[0];
  });
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'NO_THROW';
  } catch (e) {
    return e instanceof AdminReadError ? e.reason : `OTHER:${String(e)}`;
  }
}

beforeEach(() => __resetAdminTokenCache());

describe('createAdminClient — configuration', () => {
  it('is configured with a resolvable domain + credentials (client or static)', () => {
    expect(createAdminClient(ENV).configured).toBe(true);
    expect(
      createAdminClient({
        SHOPIFY_ADMIN_API_TOKEN: 'shpat_static',
        SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5',
      }).configured,
    ).toBe(true);
    // No credentials at all → not configured.
    expect(createAdminClient({SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5'}).configured).toBe(false);
  });

  it('sends the auto-obtained token as X-Shopify-Access-Token to the exact endpoint', async () => {
    const fetchImpl = routed(http(200, {data: {ok: 1}}));
    const data = await createAdminClient(ENV, fetchImpl).graphql<{ok: number}>('q');
    expect(data).toEqual({ok: 1});
    const gql = fetchImpl.mock.calls.find(([u]) => String(u) === GQL_URL);
    expect(gql).toBeDefined();
    const init = gql![1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_auto');
    expect(init.method).toBe('POST');
  });
});

describe('401 refresh-and-retry (exactly once)', () => {
  it('a 401 refreshes the token once and retries once, then succeeds', async () => {
    const fetchImpl = routed([http(401), http(200, {data: {ok: 2}})]);
    const data = await createAdminClient(ENV, fetchImpl).graphql<{ok: number}>('q');
    expect(data).toEqual({ok: 2});
    const oauth = fetchImpl.mock.calls.filter(([u]) => String(u).includes('/oauth/'));
    const gql = fetchImpl.mock.calls.filter(([u]) => String(u) === GQL_URL);
    expect(oauth.length).toBe(2); // initial + forced refresh
    expect(gql.length).toBe(2); // initial + one retry
  });

  it('a second 401 fails with admin_retry_failed — no third attempt', async () => {
    const fetchImpl = routed([http(401), http(401)]);
    expect(await reasonOf(createAdminClient(ENV, fetchImpl).graphql('q'))).toBe('admin_retry_failed');
    const gql = fetchImpl.mock.calls.filter(([u]) => String(u) === GQL_URL);
    expect(gql.length).toBe(2); // never a third GraphQL attempt
  });
});

describe('Admin read failure reason codes (after a valid token)', () => {
  it('admin_scope_denied — HTTP 403', async () => {
    expect(await reasonOf(createAdminClient(ENV, routed(http(403))).graphql('q'))).toBe(
      'admin_scope_denied',
    );
  });
  it('admin_scope_denied — GraphQL ACCESS_DENIED', async () => {
    const r = routed(http(200, {errors: [{extensions: {code: 'ACCESS_DENIED'}}]}));
    expect(await reasonOf(createAdminClient(ENV, r).graphql('q'))).toBe('admin_scope_denied');
  });
  it('admin_http_not_found — HTTP 404', async () => {
    expect(await reasonOf(createAdminClient(ENV, routed(http(404))).graphql('q'))).toBe(
      'admin_http_not_found',
    );
  });
  it('admin_http_error — other non-2xx', async () => {
    expect(await reasonOf(createAdminClient(ENV, routed(http(500))).graphql('q'))).toBe(
      'admin_http_error',
    );
  });
  it('admin_graphql_error — top-level errors without a known category', async () => {
    const r = routed(http(200, {errors: [{message: 'contains 123-456-789'}]}));
    expect(await reasonOf(createAdminClient(ENV, r).graphql('q'))).toBe('admin_graphql_error');
  });
  it('customer_query_invalid — GraphQL validation error', async () => {
    const r = routed(http(200, {errors: [{extensions: {code: 'GRAPHQL_VALIDATION_FAILED'}}]}));
    expect(await reasonOf(createAdminClient(ENV, r).graphql('q'))).toBe('customer_query_invalid');
  });
  it('admin_network_failed — the GraphQL fetch throws', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/oauth/')) return tokenOk();
      throw new Error('ECONNREFUSED');
    });
    expect(await reasonOf(createAdminClient(ENV, fetchImpl).graphql('q'))).toBe('admin_network_failed');
  });
  it('admin_shop_domain_invalid — unresolved / bad domain (no fetch)', async () => {
    const fetchImpl = vi.fn();
    const bad = {...ENV, SHOPIFY_ADMIN_STORE_HANDLE: '', PUBLIC_STORE_DOMAIN: 'no-dot'};
    expect(await reasonOf(createAdminClient(bad, fetchImpl).graphql('q'))).toBe(
      'admin_shop_domain_invalid',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('propagates admin_client_credentials_missing from the token provider', async () => {
    const fetchImpl = vi.fn();
    const noCreds = {SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5'};
    expect(await reasonOf(createAdminClient(noCreds, fetchImpl).graphql('q'))).toBe(
      'admin_client_credentials_missing',
    );
  });
  it('the thrown error carries ONLY the code — no secret or CRA/TRN', async () => {
    const r = routed(http(200, {errors: [{message: 'leak 123-456-789'}]}));
    const err = await createAdminClient(ENV, r).graphql('q').catch((e: unknown) => String(e));
    expect(err).not.toContain('shpss_supersecretvalue');
    expect(err).not.toContain('123-456-789');
    expect(err).not.toContain('shpat_auto');
  });
});

describe('adminReadReason', () => {
  it('returns the code for an AdminReadError and a fallback otherwise', () => {
    expect(adminReadReason(new AdminReadError('admin_scope_denied'))).toBe('admin_scope_denied');
    expect(adminReadReason(new Error('boom'))).toBe('admin_http_error');
  });
});

function fakeAdmin(response: unknown): AdminClient {
  return {configured: true, graphql: vi.fn().mockResolvedValue(response)};
}

describe('writeWholesaleDecision', () => {
  it('ok when metafieldsSet returns no userErrors', async () => {
    const admin = fakeAdmin({metafieldsSet: {metafields: [], userErrors: []}});
    expect(
      await writeWholesaleDecision(admin, 'gid://shopify/Customer/1', 'approved', ''),
    ).toEqual({ok: true});
  });
  it('NOT ok when metafieldsSet returns userErrors', async () => {
    const admin = fakeAdmin({metafieldsSet: {metafields: null, userErrors: [{message: 'denied'}]}});
    expect(
      await writeWholesaleDecision(admin, 'gid://shopify/Customer/1', 'rejected', 'no'),
    ).toEqual({ok: false});
  });
});

describe('readWholesaleReview', () => {
  it('maps the customer metafields to review details', async () => {
    const admin = fakeAdmin({
      customer: {
        id: 'gid://shopify/Customer/1',
        email: 'a@b.com',
        businessName: {value: 'Biz'},
        businessType: {value: 'Florist'},
        craTrn: {value: '123-456-789'},
        businessPhone: {value: '876-555'},
        wholesaleStatus: {value: 'pending'},
      },
    });
    expect(await readWholesaleReview(admin, 'gid://shopify/Customer/1')).toEqual({
      customerId: 'gid://shopify/Customer/1',
      contactEmail: 'a@b.com',
      businessName: 'Biz',
      businessType: 'Florist',
      businessPhone: '876-555',
      craTrn: '123-456-789',
      wholesaleStatus: 'pending',
    });
  });
  it('customer_not_found when the customer is null', async () => {
    const admin = fakeAdmin({customer: null});
    expect(await reasonOf(readWholesaleReview(admin, 'gid://shopify/Customer/1'))).toBe(
      'customer_not_found',
    );
  });
});
