// Client-credentials grant → temporary Admin API access token.
// Uses Shopify's official token endpoint. The token is held in memory only,
// registered as sensitive, and never written to disk or logs.
import {loadEnv} from './env.mjs';
import {registerSensitive} from './log.mjs';

let tokenCache = null; // { token, scope, obtainedAt, expiresIn }

/**
 * Exchange client_id + client_secret for a short-lived Admin API access token via
 * the client-credentials grant. Returns { token, scope, expiresIn }.
 * The raw token is NEVER logged.
 */
export async function getAccessToken({force = false} = {}) {
  const {domain, clientId, clientSecret} = loadEnv();

  if (!force && tokenCache && !isExpired(tokenCache)) {
    return {token: tokenCache.token, scope: tokenCache.scope, expiresIn: remaining(tokenCache)};
  }

  const url = `https://${domain}/admin/oauth/access_token`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
  } catch (e) {
    throw new Error(`Network error contacting Shopify token endpoint: ${e.message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    // Body may echo request params — scrubbing in the logger guards the secret,
    // but we also avoid surfacing it here.
    throw new Error(`Token exchange failed (HTTP ${res.status}). ${briefError(text)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Token endpoint returned a non-JSON response.');
  }
  if (!data.access_token) {
    throw new Error('Token endpoint response did not include an access_token.');
  }

  registerSensitive(data.access_token);
  tokenCache = {
    token: data.access_token,
    scope: data.scope || '',
    obtainedAt: Date.now(),
    expiresIn: Number(data.expires_in) || 0,
  };
  return {token: tokenCache.token, scope: tokenCache.scope, expiresIn: remaining(tokenCache)};
}

function isExpired(c) {
  if (!c.expiresIn) return true; // unknown expiry → always refresh
  return Date.now() - c.obtainedAt >= (c.expiresIn - 30) * 1000; // 30s safety margin
}
function remaining(c) {
  if (!c.expiresIn) return 0;
  return Math.max(0, Math.round(c.expiresIn - (Date.now() - c.obtainedAt) / 1000));
}
function briefError(text) {
  try {
    const j = JSON.parse(text);
    return j.error_description || j.error || j.errors || 'See Shopify app configuration.';
  } catch {
    return 'Ensure the custom app allows the client-credentials grant and the credentials are correct.';
  }
}
