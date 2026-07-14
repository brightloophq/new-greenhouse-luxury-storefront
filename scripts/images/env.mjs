// scripts/images/env.mjs — load image-pipeline config from the gitignored
// .env.images (falling back to process.env). The API key is registered as
// sensitive and never returned to any logger.
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib.mjs';

const ENV_PATH = join(ROOT, '.env.images');

const _sensitive = new Set();
export function registerSensitive(v) {
  if (v && typeof v === 'string' && v.length >= 6) _sensitive.add(v);
}
export function redact(input) {
  let s = typeof input === 'string' ? input : safe(input);
  for (const v of _sensitive) if (v) s = s.split(v).join('«redacted»');
  // Generic key shapes (Google API keys, "AQ."-prefixed tokens).
  s = s.replace(/AIza[0-9A-Za-z_\-]{10,}/g, '«redacted»').replace(/AQ\.[0-9A-Za-z_\-.]{10,}/g, '«redacted»');
  return s;
}
function safe(o) { try { return typeof o === 'object' ? JSON.stringify(o) : String(o); } catch { return String(o); } }

function parse(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

let cached = null;
export function loadImageEnv() {
  if (cached) return cached;
  const fromFile = existsSync(ENV_PATH) ? parse(readFileSync(ENV_PATH, 'utf8')) : {};
  const get = (k, d) => process.env[k] ?? fromFile[k] ?? d;

  const apiKey = get('GEMINI_API_KEY', '');
  const model = get('GEMINI_IMAGE_MODEL', 'imagen-3.0-generate-002');
  // Dry-run is the DEFAULT. Only an explicit "false" turns it off.
  const dryRunEnv = String(get('IMAGE_GENERATION_DRY_RUN', 'true')).toLowerCase();
  const dryRun = dryRunEnv !== 'false';

  if (apiKey) registerSensitive(apiKey);

  cached = {
    apiKey,
    model,
    dryRun,
    hasKey: Boolean(apiKey),
    // Bounded resilience knobs (safe defaults; overridable via env).
    maxRetries: Number(get('IMAGE_MAX_RETRIES', '3')),
    timeoutMs: Number(get('IMAGE_TIMEOUT_MS', '60000')),
    errorThreshold: Number(get('IMAGE_ERROR_THRESHOLD', '3')),
    rateLimitMs: Number(get('IMAGE_RATE_LIMIT_MS', '1500')),
    envFilePresent: existsSync(ENV_PATH),
  };
  return cached;
}

/** Secret-free summary for display/metadata. */
export function envSummary() {
  const e = loadImageEnv();
  return {
    model: e.model,
    dryRun: e.dryRun,
    hasKey: e.hasKey,
    keyPreview: e.hasKey ? 'set («redacted», never printed)' : 'MISSING',
    maxRetries: e.maxRetries,
    timeoutMs: e.timeoutMs,
    errorThreshold: e.errorThreshold,
    rateLimitMs: e.rateLimitMs,
  };
}
