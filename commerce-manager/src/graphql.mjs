// Admin GraphQL client. Attaches the short-lived token via X-Shopify-Access-Token.
// The token header is never logged.
import {loadEnv} from './env.mjs';
import {getAccessToken} from './auth.mjs';

export async function adminGraphql(query, variables = {}) {
  const {domain, apiVersion} = loadEnv();
  const {token} = await getAccessToken();
  const url = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Admin API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Admin API returned a non-JSON response.');
  }
  if (json.errors) {
    const msg = Array.isArray(json.errors)
      ? json.errors.map((e) => e.message).join('; ')
      : JSON.stringify(json.errors);
    throw new Error(`GraphQL error: ${msg}`);
  }
  return json.data;
}

/** Collect userErrors from a mutation payload into a flat array of messages. */
export function userErrorMessages(payloadObj) {
  const errs =
    payloadObj?.userErrors || payloadObj?.mediaUserErrors || payloadObj?.metafieldDefinitionErrors || [];
  return errs.map((e) => `${(e.field || []).join('.')}: ${e.message}`.replace(/^: /, ''));
}
