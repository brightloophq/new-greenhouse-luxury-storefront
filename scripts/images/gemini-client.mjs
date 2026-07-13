// scripts/images/gemini-client.mjs — secure Gemini/Imagen image client.
//
// Safety:
//   • Dry-run is the DEFAULT (see env.mjs). Live requires IMAGE_GENERATION_DRY_RUN=false.
//   • The API key is read from env only, sent as a query param to Google, and
//     NEVER logged (all error text is passed through redact()).
//   • Bounded retries, 429/rate-limit backoff, and a per-request timeout.
//   • Returns generation metadata WITHOUT secrets.
//
// Uses Google's Imagen models via the Generative Language API `:predict`
// endpoint (configurable through GEMINI_IMAGE_MODEL).
import {loadImageEnv, redact} from './env.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt) => Math.min(16000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);

const ASPECT = {'4:5': '4:5', '16:9': '16:9', '1:1': '1:1', '3:4': '3:4'};

function endpoint(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
}

/**
 * Generate one image. In dry-run (default) returns a stub WITHOUT any network
 * call. Live returns {ok, bytesBase64, mimeType, meta}. Never throws the key.
 *
 * @returns {Promise<{dryRun:boolean, ok:boolean, bytesBase64?:string,
 *   mimeType?:string, meta:object, error?:string}>}
 */
export async function generateImage({prompt, negativePrompt, aspectRatio}) {
  const env = loadImageEnv();
  const meta = {
    model: env.model,
    aspectRatio,
    promptChars: (prompt || '').length,
    negativeChars: (negativePrompt || '').length,
    requestedAt: new Date().toISOString(),
  };

  if (env.dryRun) {
    return {dryRun: true, ok: true, meta: {...meta, mode: 'dry-run', note: 'no network call performed'}};
  }
  if (!env.hasKey) {
    return {dryRun: false, ok: false, meta, error: 'GEMINI_API_KEY missing (.env.images)'};
  }

  const body = {
    instances: [{prompt}],
    parameters: {
      sampleCount: 1,
      aspectRatio: ASPECT[aspectRatio] || '1:1',
      ...(negativePrompt ? {negativePrompt} : {}),
      personGeneration: 'dont_allow',
    },
  };

  for (let attempt = 0; ; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), env.timeoutMs);
    try {
      const res = await fetch(endpoint(env.model), {
        method: 'POST',
        // Key travels in the header, not the URL, so it can't land in logs/history.
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': env.apiKey},
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      clearTimeout(timer);

      if ((res.status === 429 || res.status >= 500) && attempt < env.maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }
      const text = await res.text();
      if (!res.ok) {
        return {dryRun: false, ok: false, meta: {...meta, status: res.status}, error: redact(`HTTP ${res.status}: ${text.slice(0, 200)}`)};
      }
      let json;
      try { json = JSON.parse(text); } catch { return {dryRun: false, ok: false, meta, error: 'non-JSON response'}; }
      const pred = json.predictions?.[0];
      const bytes = pred?.bytesBase64Encoded || pred?.image?.imageBytes;
      if (!bytes) {
        return {dryRun: false, ok: false, meta, error: redact('response contained no image bytes')};
      }
      return {dryRun: false, ok: true, bytesBase64: bytes, mimeType: pred?.mimeType || 'image/png', meta: {...meta, respondedAt: new Date().toISOString()}};
    } catch (e) {
      clearTimeout(timer);
      const aborted = e?.name === 'AbortError';
      if (attempt < env.maxRetries) { await sleep(backoff(attempt)); continue; }
      return {dryRun: false, ok: false, meta, error: redact(aborted ? `timeout after ${env.timeoutMs}ms` : e?.message || String(e))};
    }
  }
}
