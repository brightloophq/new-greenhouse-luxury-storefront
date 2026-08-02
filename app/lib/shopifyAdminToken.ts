/**
 * Server-only Shopify Admin API token provider.
 *
 * The TNG Commerce Manager app uses Shopify's client-credentials grant, whose
 * access tokens expire (~24h). This module exchanges SHOPIFY_API_KEY +
 * SHOPIFY_API_SECRET for a short-lived Admin token automatically and caches it
 * in memory per Oxygen isolate — no manual token, no daily replacement, no DB.
 *
 * A static SHOPIFY_ADMIN_API_TOKEN is honoured ONLY as a temporary fallback when
 * the client credentials are absent. Nothing here reaches the browser: the
 * key/secret/token live in server env, and failures surface as an AdminReadError
 * carrying ONLY a fixed reason code — never a credential, token, or response body.
 */

/** Fixed diagnostic codes for an Admin read / token failure — never a value. */
export type AdminReadReason =
  | 'admin_config_missing'
  | 'admin_shop_domain_invalid'
  | 'admin_network_failed'
  | 'admin_scope_denied'
  | 'admin_http_not_found'
  | 'admin_http_error'
  | 'admin_graphql_error'
  | 'customer_query_invalid'
  | 'customer_not_found'
  // Token-provider codes:
  | 'admin_client_credentials_missing'
  | 'admin_token_exchange_rejected'
  | 'admin_token_response_invalid'
  | 'admin_token_exchange_network_failed'
  | 'admin_retry_failed';

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

export interface AdminEnv {
  SHOPIFY_API_KEY?: string;
  SHOPIFY_API_SECRET?: string;
  /** Temporary fallback only — preferred path is client-credentials exchange. */
  SHOPIFY_ADMIN_API_TOKEN?: string;
  SHOPIFY_ADMIN_STORE_HANDLE?: string;
  PUBLIC_STORE_DOMAIN?: string;
}

/** A bare hostname (no scheme/space/path) with a dot — e.g. ax41k1-k5.myshopify.com. */
export function isValidShopDomain(domain: string): boolean {
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain);
}

/**
 * The Admin API host. Prefer the store handle (→ <handle>.myshopify.com), which
 * is the ONLY host that serves the Admin API + token endpoint; fall back to
 * PUBLIC_STORE_DOMAIN if the handle is not set.
 */
export function resolveAdminDomain(env: AdminEnv): string {
  const handle = (env.SHOPIFY_ADMIN_STORE_HANDLE ?? '')
    .trim()
    .replace(/\.myshopify\.com$/i, '');
  if (handle) return `${handle}.myshopify.com`;
  return (env.PUBLIC_STORE_DOMAIN ?? '').trim();
}

const REFRESH_SKEW_MS = 5 * 60 * 1000; // reuse while >5 min remains

interface CachedToken {
  token: string;
  expiresAt: number; // unix ms
}

// Module-level, per-isolate. Multiple isolates each keep their own cache.
let cache: CachedToken | null = null;

/** Test-only: clear the per-isolate token cache. */
export function __resetAdminTokenCache(): void {
  cache = null;
}

export interface GetTokenOptions {
  fetchImpl?: typeof fetch;
  now?: number;
  /** Force a fresh exchange (bypass + invalidate cache) — used on a 401. */
  force?: boolean;
}

/**
 * Obtain a usable Admin API access token. Prefers client-credentials (cached);
 * falls back to a static token only when credentials are absent.
 */
export async function getAdminToken(
  env: AdminEnv,
  opts: GetTokenOptions = {},
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now();

  const clientId = (env.SHOPIFY_API_KEY ?? '').trim();
  const clientSecret = (env.SHOPIFY_API_SECRET ?? '').trim();
  const hasCreds = Boolean(clientId && clientSecret);

  if (!hasCreds) {
    const staticToken = (env.SHOPIFY_ADMIN_API_TOKEN ?? '').trim();
    if (staticToken) {
      console.warn('[wholesale] static Admin token fallback active');
      return staticToken;
    }
    throw new AdminReadError('admin_client_credentials_missing');
  }

  if (opts.force) cache = null;
  if (cache && cache.expiresAt - now > REFRESH_SKEW_MS) {
    return cache.token;
  }

  const fresh = await exchangeClientCredentials(env, clientId, clientSecret, fetchImpl, now);
  cache = fresh;
  return fresh.token;
}

async function exchangeClientCredentials(
  env: AdminEnv,
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof fetch,
  now: number,
): Promise<CachedToken> {
  const domain = resolveAdminDomain(env);
  if (!isValidShopDomain(domain)) {
    throw new AdminReadError('admin_shop_domain_invalid');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  let res: Response;
  try {
    res = await fetchImpl(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch {
    throw new AdminReadError('admin_token_exchange_network_failed');
  }

  if (!res.ok) {
    // 400/401/etc. from the token endpoint — never echo the body.
    throw new AdminReadError('admin_token_exchange_rejected');
  }

  let data: {access_token?: unknown; expires_in?: unknown};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new AdminReadError('admin_token_response_invalid');
  }

  const token = typeof data.access_token === 'string' ? data.access_token : '';
  if (!token) throw new AdminReadError('admin_token_response_invalid');

  // Scope enforcement is delegated to Shopify. The client-credentials response's
  // `scope` field is unreliable (frequently empty), so a required-scope pre-check
  // here produced false failures even when the app grants the scopes. A genuinely
  // missing scope surfaces at the Admin GraphQL call as 403 / ACCESS_DENIED →
  // admin_scope_denied (see shopifyAdmin.ts) — the authoritative enforcement point.

  const expiresInSec =
    typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 0;
  return {token, expiresAt: now + expiresInSec * 1000};
}
