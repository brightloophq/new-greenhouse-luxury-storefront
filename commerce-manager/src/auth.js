// src/auth.js — client-credentials grant → temporary Admin API access token.
// The token is held in memory only, registered as sensitive, auto-refreshed when
// expired, and never printed, committed, or written to disk.
import {config, registerSensitive, redact} from './config.js';

let cache = null; // { token, scope, obtainedAt, expiresIn }
const SAFETY_SECONDS = 30;

/**
 * Return a valid access token, refreshing automatically when missing/expired.
 * Never logs the token.
 */
export async function getAccessToken({force = false} = {}) {
  if (!force && cache && !isExpired(cache)) {
    return {token: cache.token, scope: cache.scope, expiresIn: remaining(cache)};
  }

  const url = `https://${config.storeDomain}/admin/oauth/access_token`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
  } catch (e) {
    throw new Error(redact(`Network error contacting token endpoint: ${e.message}`));
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(redact(`Token exchange failed (HTTP ${res.status}). ${briefError(text)}`));
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Token endpoint returned a non-JSON response.');
  }
  if (!data.access_token) throw new Error('Token endpoint response contained no access_token.');

  registerSensitive(data.access_token);
  cache = {
    token: data.access_token,
    scope: data.scope || '',
    obtainedAt: Date.now(),
    expiresIn: Number(data.expires_in) || 0,
  };
  return {token: cache.token, scope: cache.scope, expiresIn: remaining(cache)};
}

/** Drop the in-memory token (e.g., on 401). */
export function invalidateToken() {
  cache = null;
}

function isExpired(c) {
  if (!c.expiresIn) return true;
  return Date.now() - c.obtainedAt >= (c.expiresIn - SAFETY_SECONDS) * 1000;
}
function remaining(c) {
  if (!c.expiresIn) return 0;
  return Math.max(0, Math.round(c.expiresIn - (Date.now() - c.obtainedAt) / 1000));
}
function briefError(text) {
  try {
    const j = JSON.parse(text);
    return redact(j.error_description || j.error || JSON.stringify(j.errors || j) || '');
  } catch {
    return 'Verify the app is installed on this shop and permits the client-credentials grant.';
  }
}
