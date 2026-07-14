// src/shopify-admin.js — Admin GraphQL client.
// Attaches the short-lived token via X-Shopify-Access-Token (never logged) and
// auto-refreshes once on a 401. All errors are redacted.
import {config, redact} from './config.js';
import {getAccessToken, invalidateToken} from './auth.js';

function endpoint() {
  return `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`;
}

async function post(token, query, variables) {
  return fetch(endpoint(), {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt) => Math.min(8000, 800 * 2 ** attempt) + Math.floor(Math.random() * 250);

/** Run an Admin GraphQL operation. Returns `data`; throws redacted errors.
 * Auto-refreshes on 401 and backs off/retries on 429 or THROTTLED. */
export async function adminGraphQL(query, variables = {}, {retries = 4} = {}) {
  for (let attempt = 0; ; attempt++) {
    let {token} = await getAccessToken();
    let res = await post(token, query, variables);

    if (res.status === 401) {
      invalidateToken();
      ({token} = await getAccessToken({force: true}));
      res = await post(token, query, variables);
    }
    if (res.status === 429 && attempt < retries) {
      await sleep(backoff(attempt));
      continue;
    }

    const text = await res.text();
    if (!res.ok) throw new Error(redact(`Admin API HTTP ${res.status}: ${text.slice(0, 300)}`));

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Admin API returned a non-JSON response.');
    }
    if (json.errors) {
      const throttled = /throttl/i.test(JSON.stringify(json.errors));
      if (throttled && attempt < retries) {
        await sleep(backoff(attempt));
        continue;
      }
      const msg = Array.isArray(json.errors)
        ? json.errors.map((e) => e.message).join('; ')
        : JSON.stringify(json.errors);
      throw new Error(redact(`GraphQL error: ${msg}`));
    }
    return json.data;
  }
}
