// scripts/shopify/admin.mjs — minimal Shopify Admin GraphQL client.
//
// Reads SHOPIFY_ADMIN_API_TOKEN from the gitignored .env (or process.env). The
// token is registered as sensitive and is never printed, including inside error
// messages. Every write command in this folder is DRY-RUN by default and
// requires an explicit --apply flag to touch the live store.
import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_PATH = join(ROOT, '.env');
const API_VERSION = '2025-01';

const sensitive = new Set();
export function redact(input) {
  let s = typeof input === 'string' ? input : safeStringify(input);
  for (const v of sensitive) if (v) s = s.split(v).join('«redacted»');
  return s.replace(/shpat_[0-9a-fA-F]{10,}/g, '«redacted»');
}
function safeStringify(o) {
  try {
    return typeof o === 'object' ? JSON.stringify(o) : String(o);
  } catch {
    return String(o);
  }
}

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = v;
  }
  return out;
}

let cached = null;
export function loadAdminEnv() {
  if (cached) return cached;
  const file = existsSync(ENV_PATH) ? parseEnv(readFileSync(ENV_PATH, 'utf8')) : {};
  const get = (k, d = '') => process.env[k] ?? file[k] ?? d;

  const token = get('SHOPIFY_ADMIN_API_TOKEN');
  const domain = get('PUBLIC_STORE_DOMAIN');
  if (token) sensitive.add(token);

  cached = {token, domain, hasToken: Boolean(token)};
  return cached;
}

/** Fail early, with instructions rather than a stack trace. */
export function requireToken() {
  const env = loadAdminEnv();
  if (!env.hasToken) {
    console.error(
      [
        '',
        'Missing SHOPIFY_ADMIN_API_TOKEN.',
        '',
        'Create it once in Shopify admin:',
        '  Settings → Apps and sales channels → Develop apps → Create an app',
        '  Configure Admin API scopes:',
        '    read_products,  write_products      (collections + product tags)',
        '    read_customers, write_customers     (customer metafield definitions)',
        '  Install the app, reveal the Admin API access token,',
        '  then add this line to .env (gitignored):',
        '',
        '    SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxx',
        '',
        'Nothing is written to Shopify until you re-run with --apply.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
  return env;
}

/** POST a GraphQL operation to the Admin API, surfacing userErrors clearly. */
export async function adminQuery(query, variables = {}) {
  const {token, domain} = requireToken();
  const response = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );

  if (!response.ok) {
    throw new Error(
      redact(`Admin API ${response.status}: ${await response.text()}`),
    );
  }
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(redact(`Admin API errors: ${JSON.stringify(body.errors)}`));
  }
  return body.data;
}

/** Collect the first userErrors array found anywhere in a mutation payload. */
export function userErrorsOf(payload) {
  for (const value of Object.values(payload ?? {})) {
    if (value && Array.isArray(value.userErrors) && value.userErrors.length) {
      return value.userErrors;
    }
  }
  return [];
}

export const isApply = process.argv.includes('--apply');

export function banner(title) {
  console.log(`\n${title}`);
  console.log(
    isApply
      ? '  MODE: APPLY — writing to the live store.\n'
      : '  MODE: dry run — nothing will be written. Re-run with --apply to commit.\n',
  );
}
