import {describe, it, expect, vi} from 'vitest';
import {
  createAdminClient,
  readWholesaleReview,
  writeWholesaleDecision,
  adminReadReason,
  AdminReadError,
  type AdminClient,
} from './shopifyAdmin';

const ADMIN = {
  SHOPIFY_ADMIN_API_TOKEN: 'shpat_secret',
  PUBLIC_STORE_DOMAIN: 'ax41k1-k5.myshopify.com',
};

const http = (status: number, json: unknown = {}) =>
  ({ok: status >= 200 && status < 300, status, json: async () => json}) as unknown as Response;

/** Return the AdminReadError reason (or a marker) for a rejected promise. */
async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'NO_THROW';
  } catch (e) {
    return e instanceof AdminReadError ? e.reason : `OTHER:${String(e)}`;
  }
}

describe('createAdminClient — configuration', () => {
  it('is configured only with both token and domain', () => {
    expect(createAdminClient({}).configured).toBe(false);
    expect(createAdminClient({SHOPIFY_ADMIN_API_TOKEN: 'shpat_x'}).configured).toBe(false);
    expect(createAdminClient(ADMIN).configured).toBe(true);
  });

  it('POSTs to the exact Admin endpoint with the token header only', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(200, {data: {ok: 1}}));
    const data = await createAdminClient(ADMIN, fetchImpl).graphql<{ok: number}>('q', {a: 1});
    expect(data).toEqual({ok: 1});
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://ax41k1-k5.myshopify.com/admin/api/2025-01/graphql.json');
    expect((init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_secret');
    expect(init.method).toBe('POST');
  });
});

describe('Admin read failure reason codes', () => {
  it('admin_config_missing — no token/domain, and fetch is never called', async () => {
    const fetchImpl = vi.fn();
    expect(await reasonOf(createAdminClient({}, fetchImpl).graphql('q'))).toBe(
      'admin_config_missing',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('admin_shop_domain_invalid — domain is not a hostname', async () => {
    const fetchImpl = vi.fn();
    const bad = {SHOPIFY_ADMIN_API_TOKEN: 'shpat_x', PUBLIC_STORE_DOMAIN: 'no-dot'};
    expect(await reasonOf(createAdminClient(bad, fetchImpl).graphql('q'))).toBe(
      'admin_shop_domain_invalid',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('admin_network_failed — fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_network_failed',
    );
  });

  it('admin_token_invalid — HTTP 401', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(401));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_token_invalid',
    );
  });

  it('admin_scope_denied — HTTP 403', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(403));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_scope_denied',
    );
  });

  it('admin_scope_denied — GraphQL ACCESS_DENIED at HTTP 200', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(http(200, {errors: [{extensions: {code: 'ACCESS_DENIED'}}]}));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_scope_denied',
    );
  });

  it('admin_http_not_found — HTTP 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(404));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_http_not_found',
    );
  });

  it('admin_http_error — other non-2xx (500)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(500));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'admin_http_error',
    );
  });

  it('admin_graphql_error — top-level errors without a known category', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(http(200, {errors: [{message: 'contains 123-456-789'}]}));
    const reason = await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'));
    expect(reason).toBe('admin_graphql_error');
  });

  it('customer_query_invalid — GraphQL validation error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(http(200, {errors: [{extensions: {code: 'GRAPHQL_VALIDATION_FAILED'}}]}));
    expect(await reasonOf(createAdminClient(ADMIN, fetchImpl).graphql('q'))).toBe(
      'customer_query_invalid',
    );
  });

  it('the thrown error carries ONLY the code — no token or CRA/TRN', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(http(200, {errors: [{message: 'leak 123-456-789'}]}));
    let caught: unknown;
    try {
      await createAdminClient(ADMIN, fetchImpl).graphql('q');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AdminReadError);
    expect(String(caught)).not.toContain('shpat_secret');
    expect(String(caught)).not.toContain('123-456-789');
  });
});

describe('adminReadReason', () => {
  it('returns the code for an AdminReadError and a fallback otherwise', () => {
    expect(adminReadReason(new AdminReadError('admin_scope_denied'))).toBe('admin_scope_denied');
    expect(adminReadReason(new Error('boom'))).toBe('admin_http_error');
    expect(adminReadReason('nope')).toBe('admin_http_error');
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
    const admin = fakeAdmin({
      metafieldsSet: {metafields: null, userErrors: [{message: 'denied'}]},
    });
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
