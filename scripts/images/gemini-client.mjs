// scripts/images/gemini-client.mjs — secure Gemini/Imagen image client.
//
// Safety:
//   • Dry-run is the DEFAULT (see env.mjs). Live requires IMAGE_GENERATION_DRY_RUN=false.
//   • The API key is read from env only, sent via the x-goog-api-key HEADER
//     (never the URL), and NEVER logged (errors pass through redact()).
//   • Bounded retries, 429/5xx backoff, and a per-request timeout.
//   • Returns generation metadata WITHOUT secrets.
//
// Supports two model families (auto-detected by name):
//   • imagen-*  → `:predict`         (Imagen; paid plans only on the free API)
//   • gemini-*-image → `:generateContent` (Gemini image, e.g. gemini-2.5-flash-image)
// Model is configurable via GEMINI_IMAGE_MODEL.
import {loadImageEnv, redact} from './env.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt) => Math.min(16000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);

// Imagen supports 1:1, 3:4, 4:3, 9:16, 16:9 only. Gemini image models support
// 4:5 and 16:9 natively, so those pass through unchanged.
const IMAGEN_ASPECT = {'4:5': '3:4', '16:9': '16:9', '1:1': '1:1', '3:4': '3:4', '4:3': '4:3', '9:16': '9:16'};

const base = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Generate one image. Dry-run (default) returns a stub with no network call.
 * Live returns {ok, bytesBase64, mimeType, meta}. Never throws/logs the key.
 */
export async function generateImage({prompt, negativePrompt, aspectRatio}) {
  const env = loadImageEnv();
  const isImagen = /^imagen/i.test(env.model);
  const sentAspect = isImagen ? IMAGEN_ASPECT[aspectRatio] || '1:1' : aspectRatio;
  const meta = {
    model: env.model,
    api: isImagen ? 'predict' : 'generateContent',
    aspectRatio,
    sentAspectRatio: sentAspect,
    promptChars: (prompt || '').length,
    negativeChars: (negativePrompt || '').length,
    requestedAt: new Date().toISOString(),
  };

  if (env.dryRun) return {dryRun: true, ok: true, meta: {...meta, mode: 'dry-run', note: 'no network call'}};
  if (!env.hasKey) return {dryRun: false, ok: false, meta, error: 'GEMINI_API_KEY missing (.env.images)'};

  // Both APIs lack a negativePrompt param on the current models, so fold the
  // negatives into the prompt text as an explicit "Avoid:" clause.
  const effectivePrompt = negativePrompt ? `${prompt} Avoid: ${negativePrompt}.` : prompt;

  const url = isImagen ? `${base}/models/${env.model}:predict` : `${base}/models/${env.model}:generateContent`;
  const body = isImagen
    ? {instances: [{prompt: effectivePrompt}], parameters: {sampleCount: 1, aspectRatio: sentAspect, personGeneration: 'dont_allow'}}
    : {contents: [{role: 'user', parts: [{text: effectivePrompt}]}], generationConfig: {responseModalities: ['IMAGE'], imageConfig: {aspectRatio: sentAspect}}};

  for (let attempt = 0; ; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), env.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
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
      if (!res.ok) return {dryRun: false, ok: false, meta: {...meta, status: res.status}, error: redact(`HTTP ${res.status}: ${text.slice(0, 220)}`)};

      let json;
      try { json = JSON.parse(text); } catch { return {dryRun: false, ok: false, meta, error: 'non-JSON response'}; }

      let bytes, mime;
      if (isImagen) {
        const p = json.predictions?.[0];
        bytes = p?.bytesBase64Encoded || p?.image?.imageBytes;
        mime = p?.mimeType || 'image/png';
      } else {
        const parts = json.candidates?.[0]?.content?.parts || [];
        const img = parts.find((p) => p.inlineData?.data);
        bytes = img?.inlineData?.data;
        mime = img?.inlineData?.mimeType || 'image/png';
      }
      if (!bytes) return {dryRun: false, ok: false, meta, error: redact('response contained no image bytes')};
      return {dryRun: false, ok: true, bytesBase64: bytes, mimeType: mime, meta: {...meta, respondedAt: new Date().toISOString()}};
    } catch (e) {
      clearTimeout(timer);
      const aborted = e?.name === 'AbortError';
      if (attempt < env.maxRetries) { await sleep(backoff(attempt)); continue; }
      return {dryRun: false, ok: false, meta, error: redact(aborted ? `timeout after ${env.timeoutMs}ms` : e?.message || String(e))};
    }
  }
}
