import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  getAdminToken,
  resolveAdminDomain,
  AdminReadError,
  __resetAdminTokenCache,
} from './shopifyAdminToken';

const CREDS = {
  SHOPIFY_API_KEY: 'client_id_pub',
  SHOPIFY_API_SECRET: 'shpss_supersecretvalue',
  SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5',
};

const http = (status: number, json: unknown = {}) =>
  ({ok: status >= 200 && status < 300, status, json: async () => json}) as unknown as Response;

const tokenOk = (over: Record<string, unknown> = {}) =>
  http(200, {
    access_token: 'shpat_auto_token',
    scope: 'read_customers,write_customers',
    expires_in: 86399,
    ...over,
  });

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'NO_THROW';
  } catch (e) {
    return e instanceof AdminReadError ? e.reason : `OTHER:${String(e)}`;
  }
}

beforeEach(() => __resetAdminTokenCache());

describe('resolveAdminDomain', () => {
  it('derives <handle>.myshopify.com from the store handle', () => {
    expect(resolveAdminDomain(CREDS)).toBe('ax41k1-k5.myshopify.com');
    expect(resolveAdminDomain({SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5.myshopify.com'})).toBe(
      'ax41k1-k5.myshopify.com',
    );
  });
  it('falls back to PUBLIC_STORE_DOMAIN when no handle', () => {
    expect(resolveAdminDomain({PUBLIC_STORE_DOMAIN: 'd.myshopify.com'})).toBe('d.myshopify.com');
  });
});

describe('getAdminToken — client-credentials exchange', () => {
  it('exchanges credentials at the token endpoint and returns the access token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenOk());
    const token = await getAdminToken(CREDS, {fetchImpl, now: 1000});
    expect(token).toBe('shpat_auto_token');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://ax41k1-k5.myshopify.com/admin/oauth/access_token');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(init.body).toContain('grant_type=client_credentials');
    expect(init.body).toContain('client_id=client_id_pub');
    expect(init.body).toContain('client_secret=shpss_supersecretvalue');
  });

  it('caches and reuses the token while >5 min remains', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenOk());
    await getAdminToken(CREDS, {fetchImpl, now: 1000});
    await getAdminToken(CREDS, {fetchImpl, now: 2000});
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('refreshes when the cached token is near expiry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenOk({expires_in: 60})); // <5 min
    await getAdminToken(CREDS, {fetchImpl, now: 0});
    await getAdminToken(CREDS, {fetchImpl, now: 0});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('force bypasses the cache (used on a 401)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenOk());
    await getAdminToken(CREDS, {fetchImpl, now: 1000});
    await getAdminToken(CREDS, {fetchImpl, now: 1000, force: true});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('admin_client_credentials_missing when key/secret and static token are absent', async () => {
    const fetchImpl = vi.fn();
    expect(await reasonOf(getAdminToken({SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5'}, {fetchImpl}))).toBe(
      'admin_client_credentials_missing',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('admin_token_exchange_rejected on a non-2xx token response (400/401)', async () => {
    expect(await reasonOf(getAdminToken(CREDS, {fetchImpl: vi.fn().mockResolvedValue(http(400))}))).toBe(
      'admin_token_exchange_rejected',
    );
    __resetAdminTokenCache();
    expect(await reasonOf(getAdminToken(CREDS, {fetchImpl: vi.fn().mockResolvedValue(http(401))}))).toBe(
      'admin_token_exchange_rejected',
    );
  });

  it('admin_token_response_invalid on malformed body or missing access_token', async () => {
    const badJson = {ok: true, status: 200, json: async () => {
      throw new Error('not json');
    }} as unknown as Response;
    expect(await reasonOf(getAdminToken(CREDS, {fetchImpl: vi.fn().mockResolvedValue(badJson)}))).toBe(
      'admin_token_response_invalid',
    );
    __resetAdminTokenCache();
    const noToken = http(200, {scope: 'read_customers,write_customers', expires_in: 10});
    expect(await reasonOf(getAdminToken(CREDS, {fetchImpl: vi.fn().mockResolvedValue(noToken)}))).toBe(
      'admin_token_response_invalid',
    );
  });

  it('does NOT pre-check the scope field — enforcement is delegated to Shopify', async () => {
    // The client-credentials `scope` field is unreliable (often empty); a valid
    // token must still be issued. A genuinely missing scope surfaces later as
    // admin_scope_denied at the Admin GraphQL call (see shopifyAdmin.test.ts).
    const noScope = vi.fn().mockResolvedValue(tokenOk({scope: ''}));
    expect(await getAdminToken(CREDS, {fetchImpl: noScope, now: 1000})).toBe('shpat_auto_token');
    __resetAdminTokenCache();
    const missingScopeField = vi.fn().mockResolvedValue(
      http(200, {access_token: 'shpat_auto_token', expires_in: 86399}),
    );
    expect(await getAdminToken(CREDS, {fetchImpl: missingScopeField, now: 1000})).toBe(
      'shpat_auto_token',
    );
  });

  it('admin_token_exchange_network_failed when the token fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    expect(await reasonOf(getAdminToken(CREDS, {fetchImpl}))).toBe(
      'admin_token_exchange_network_failed',
    );
  });

  it('never leaks the client secret in a thrown error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(http(401));
    const err = await getAdminToken(CREDS, {fetchImpl}).catch((e: unknown) => String(e));
    expect(err).not.toContain('shpss_supersecretvalue');
    expect(err).not.toContain('client_id_pub');
  });
});

describe('static token fallback', () => {
  it('uses SHOPIFY_ADMIN_API_TOKEN when credentials are absent, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi.fn();
    const token = await getAdminToken(
      {SHOPIFY_ADMIN_API_TOKEN: 'shpat_static', SHOPIFY_ADMIN_STORE_HANDLE: 'ax41k1-k5'},
      {fetchImpl},
    );
    expect(token).toBe('shpat_static');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[wholesale] static Admin token fallback active');
    warn.mockRestore();
  });

  it('prefers client-credentials over a static token when both exist', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenOk());
    const token = await getAdminToken(
      {...CREDS, SHOPIFY_ADMIN_API_TOKEN: 'shpat_static'},
      {fetchImpl, now: 1000},
    );
    expect(token).toBe('shpat_auto_token');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
