import {describe, it, expect, vi} from 'vitest';
import {
  createAdminClient,
  readWholesaleReview,
  writeWholesaleDecision,
  type AdminClient,
} from './shopifyAdmin';

const okResponse = (json: unknown) =>
  ({ok: true, status: 200, json: async () => json}) as unknown as Response;

describe('createAdminClient', () => {
  it('is configured only with both token and domain', () => {
    expect(createAdminClient({}).configured).toBe(false);
    expect(createAdminClient({SHOPIFY_ADMIN_API_TOKEN: 'shpat_x'}).configured).toBe(false);
    expect(
      createAdminClient({
        SHOPIFY_ADMIN_API_TOKEN: 'shpat_x',
        PUBLIC_STORE_DOMAIN: 'd.myshopify.com',
      }).configured,
    ).toBe(true);
  });

  it('throws WITHOUT calling fetch when not configured', async () => {
    const fetchImpl = vi.fn();
    const client = createAdminClient({}, fetchImpl);
    await expect(client.graphql('query {}')).rejects.toThrow(/not configured/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs to the Admin GraphQL endpoint with the token header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({data: {ok: 1}}));
    const client = createAdminClient(
      {SHOPIFY_ADMIN_API_TOKEN: 'shpat_secret', PUBLIC_STORE_DOMAIN: 'd.myshopify.com'},
      fetchImpl,
    );
    const data = await client.graphql<{ok: number}>('query {}', {a: 1});
    expect(data).toEqual({ok: 1});
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://d.myshopify.com/admin/api/2025-01/graphql.json');
    expect((init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('shpat_secret');
    expect(init.method).toBe('POST');
  });

  it('redacts the token from HTTP errors and never echoes the response body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ok: false, status: 401, json: async () => ({})} as unknown as Response);
    const client = createAdminClient(
      {SHOPIFY_ADMIN_API_TOKEN: 'shpat_secret', PUBLIC_STORE_DOMAIN: 'd.myshopify.com'},
      fetchImpl,
    );
    await expect(client.graphql('q')).rejects.toThrow(/Admin API HTTP 401/);
    const err = await client.graphql('q').catch((e: unknown) => String(e));
    expect(err).not.toContain('shpat_secret');
  });

  it('throws on GraphQL errors without echoing the body (no CRA/TRN leak)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse({errors: [{message: 'contains 123-456-789'}]}));
    const client = createAdminClient(
      {SHOPIFY_ADMIN_API_TOKEN: 'shpat_secret', PUBLIC_STORE_DOMAIN: 'd.myshopify.com'},
      fetchImpl,
    );
    const err = await client.graphql('q').catch((e: unknown) => String(e));
    expect(err).toContain('Admin API returned errors');
    expect(err).not.toContain('123-456-789');
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

  it('throws when the customer is missing', async () => {
    const admin = fakeAdmin({customer: null});
    await expect(readWholesaleReview(admin, 'gid://shopify/Customer/1')).rejects.toThrow();
  });
});
