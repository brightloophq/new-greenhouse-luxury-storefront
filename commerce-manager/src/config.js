// src/config.js — loads & validates credentials, and provides secret redaction.
// Secrets are read from the gitignored .env (falling back to .env.example) and are
// NEVER logged, committed, or persisted anywhere else.
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..'); // commerce-manager/
const ENV_FILE = join(ROOT, '.env');
const ENV_EXAMPLE = join(ROOT, '.env.example');

// ---- secret redaction ----
const _sensitive = new Set();
export function registerSensitive(value) {
  if (value && typeof value === 'string' && value.length >= 6) _sensitive.add(value);
}
const TOKEN_PATTERNS = [
  /shpss_[A-Za-z0-9]+/g, // client secret
  /shpat_[A-Za-z0-9]+/g, // admin access token
  /shpca_[A-Za-z0-9]+/g, // customer account token
  /atkn_[A-Za-z0-9._-]+/g, // client-credentials access tokens
];
export function redact(input) {
  let text = typeof input === 'string' ? input : safeStringify(input);
  for (const s of _sensitive) if (s) text = text.split(s).join('«redacted»');
  for (const re of TOKEN_PATTERNS) text = text.replace(re, '«redacted»');
  return text;
}
function safeStringify(o) {
  try {
    return typeof o === 'object' ? JSON.stringify(o) : String(o);
  } catch {
    return String(o);
  }
}

// ---- env parsing ----
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

function load() {
  const path = existsSync(ENV_FILE) ? ENV_FILE : existsSync(ENV_EXAMPLE) ? ENV_EXAMPLE : null;
  if (!path) {
    throw new Error('No credentials file. Create commerce-manager/.env (see .env.example).');
  }
  const env = parseEnv(readFileSync(path, 'utf8'));

  const storeDomain = env.SHOPIFY_STORE_DOMAIN;
  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';

  const missing = [];
  if (!storeDomain) missing.push('SHOPIFY_STORE_DOMAIN');
  if (!clientId) missing.push('SHOPIFY_CLIENT_ID');
  if (!clientSecret) missing.push('SHOPIFY_CLIENT_SECRET');
  if (missing.length) throw new Error(`Missing required env var(s): ${missing.join(', ')}`);
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(storeDomain)) {
    throw new Error('SHOPIFY_STORE_DOMAIN must look like "<store>.myshopify.com".');
  }

  registerSensitive(clientSecret); // guarantee it can never leak through the logger
  return {storeDomain, clientId, clientSecret, apiVersion, source: path};
}

export const config = load();

/** Secret-free summary for display. */
export function safeSummary() {
  return {
    store: config.storeDomain,
    clientId: `${config.clientId.slice(0, 6)}…${config.clientId.slice(-4)}`,
    clientSecret: 'set («redacted», never printed)',
    apiVersion: config.apiVersion,
  };
}
