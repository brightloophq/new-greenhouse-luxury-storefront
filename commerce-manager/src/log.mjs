// Redacting logger. Any registered secret (client secret, access token) or
// token-shaped string is scrubbed from ALL output before it is printed.
const sensitive = new Set();

// Prefixes of Shopify secret/token types — scrubbed defensively even if not registered.
const TOKEN_PATTERNS = [
  /shpss_[A-Za-z0-9]+/g, // app client secret
  /shpat_[A-Za-z0-9]+/g, // admin API access token
  /shpca_[A-Za-z0-9]+/g, // customer account token
  /shppa_[A-Za-z0-9]+/g, // legacy private app token
  /atkn_[A-Za-z0-9._-]+/g, // client-credentials access tokens
];

export function registerSensitive(value) {
  if (value && typeof value === 'string' && value.length >= 6) sensitive.add(value);
}

export function scrub(input) {
  let text = typeof input === 'string' ? input : safeStringify(input);
  for (const s of sensitive) {
    if (s) text = text.split(s).join('«redacted»');
  }
  for (const re of TOKEN_PATTERNS) text = text.replace(re, '«redacted»');
  return text;
}

function safeStringify(obj) {
  try {
    return typeof obj === 'object' ? JSON.stringify(obj) : String(obj);
  } catch {
    return String(obj);
  }
}

const stamp = () => '';
export const log = (...a) => console.log(a.map(scrub).join(' '));
export const info = (...a) => console.log('  ' + a.map(scrub).join(' '));
export const step = (...a) => console.log('\n▸ ' + a.map(scrub).join(' '));
export const ok = (...a) => console.log('  ✓ ' + a.map(scrub).join(' '));
export const skip = (...a) => console.log('  • ' + a.map(scrub).join(' '));
export const warn = (...a) => console.warn('  ⚠ ' + a.map(scrub).join(' '));
export const err = (...a) => console.error('  ✗ ' + a.map(scrub).join(' '));
export const plain = (...a) => console.log(a.map(scrub).join(' '));
