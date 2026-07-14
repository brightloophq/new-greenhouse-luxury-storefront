// Loads and validates credentials from commerce-manager/.env (gitignored).
// The client secret is registered as sensitive and never returned to any logger.
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {registerSensitive} from './log.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, '..', '.env');

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

let cached = null;

export function loadEnv() {
  if (cached) return cached;
  if (!existsSync(ENV_PATH)) {
    throw new Error(
      `Missing credentials file. Create commerce-manager/.env from .env.example (path: ${ENV_PATH}).`,
    );
  }
  const parsed = parseEnv(readFileSync(ENV_PATH, 'utf8'));
  const domain = parsed.SHOPIFY_STORE_DOMAIN;
  const clientId = parsed.SHOPIFY_CLIENT_ID;
  const clientSecret = parsed.SHOPIFY_CLIENT_SECRET;
  const apiVersion = parsed.SHOPIFY_API_VERSION || '2025-01';

  const missing = [];
  if (!domain) missing.push('SHOPIFY_STORE_DOMAIN');
  if (!clientId) missing.push('SHOPIFY_CLIENT_ID');
  if (!clientSecret) missing.push('SHOPIFY_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required env var(s): ${missing.join(', ')} in commerce-manager/.env`);
  }
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain)) {
    throw new Error(`SHOPIFY_STORE_DOMAIN looks invalid: expected "<store>.myshopify.com".`);
  }

  // The secret must never surface in logs.
  registerSensitive(clientSecret);

  cached = {domain, clientId, clientSecret, apiVersion};
  return cached;
}

// Safe, secret-free descriptor for display.
export function envSummary() {
  const e = loadEnv();
  return {
    store: e.domain,
    clientId: `${e.clientId.slice(0, 6)}…${e.clientId.slice(-4)}`,
    clientSecret: 'set («redacted», never printed)',
    apiVersion: e.apiVersion,
  };
}
