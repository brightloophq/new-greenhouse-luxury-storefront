// sprint-io.js — shared harness for the Phase-1 closure sprint write batches.
//
// Pure-ish utilities: loading/validating the fresh preflight evidence, the three-part
// dry-run interlock, timestamped gitignored backups, and a secret guard. No batch logic
// lives here (that is sprint-lib.js); no network call is made here. Batches import both.
//
// DRY-RUN IS THE DEFAULT. A live write requires ALL THREE of:
//   --commit  +  --i-understand-this-writes-to-shopify  +  the batch's unique env phrase.
// Missing any one → dryRun=true and zero mutations.
//
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, isAbsolute} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
export const STATE_PATH = join(ROOT, 'catalog', 'live-audit', 'sprint-state.json');
export const BACKUP_ROOT = join(ROOT, 'catalog', 'live-audit', 'backups');

/* ---- fresh evidence: load + validate + freshness -------------------------------------- */
const REQUIRED_KEYS = ['generatedAt', 'scopes', 'collections', 'consolidation', 'occasion', 'giftBaskets', 'tropical', 'seoTargets', 'redirectMatrix'];
export function loadState(path = process.env.TNG_SPRINT_STATE_PATH || STATE_PATH, {maxAgeHours = 24} = {}) {
  const p = isAbsolute(path) ? path : join(ROOT, path);
  if (!existsSync(p)) {
    throw new Error(`Fresh evidence not found: ${p}\n    Run \`node scripts/sprint-preflight.js\` first (READ-ONLY). Batches never fabricate live state.`);
  }
  const state = JSON.parse(readFileSync(p, 'utf8'));
  for (const k of REQUIRED_KEYS) if (!(k in state)) throw new Error(`sprint-state.json malformed: missing "${k}"`);
  const ts = Date.parse(state.generatedAt);
  if (!Number.isFinite(ts)) throw new Error('sprint-state.json malformed: bad generatedAt timestamp');
  const ageHours = (Date.now() - ts) / 3.6e6;
  const fresh = ageHours <= maxAgeHours;
  return {state, path: p, ageHours, fresh};
}
/** Freshness assertion for the --commit path (dry-run only warns). */
export function assertFresh(meta, maxAgeHours = 24) {
  if (!meta.fresh) throw new Error(`sprint-state.json is ${meta.ageHours.toFixed(1)}h old (> ${maxAgeHours}h). Re-run the preflight before writing.`);
  return true;
}

/* ---- three-part dry-run interlock ----------------------------------------------------- */
/**
 * @param argv       process.argv
 * @param envName    unique env var name for this batch (e.g. TNG_SPRINT_B_AUTH)
 * @param envPhrase  the exact required phrase value
 */
export function parseInterlock(argv, envName, envPhrase) {
  const has = (f) => argv.includes(f);
  const commit = has('--commit');
  const understands = has('--i-understand-this-writes-to-shopify');
  const authorized = process.env[envName] === envPhrase;
  const livePreview = has('--live-preview'); // read-only enrichment of the dry-run
  const write = commit && understands && authorized;
  return {
    dryRun: !write,
    write,
    livePreview,
    detail: {commit, understands, authorized, envName},
    // human-readable gate report
    report() {
      return [
        `  --commit                              : ${commit ? '✓' : '✗'}`,
        `  --i-understand-this-writes-to-shopify : ${understands ? '✓' : '✗'}`,
        `  ${envName}                            : ${authorized ? '✓ (phrase matches)' : '✗ (unset / wrong)'}`,
        `  → MODE: ${write ? 'LIVE WRITE' : 'DRY-RUN (no mutation will be sent)'}`,
      ].join('\n');
    },
  };
}

/* ---- backups (gitignored) ------------------------------------------------------------- */
export function backupDir(batch) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(BACKUP_ROOT, `${batch}-${stamp}`);
  mkdirSync(dir, {recursive: true});
  return dir;
}
export function writeBackup(dir, name, obj) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  assertNoSecrets(name, body);
  writeFileSync(join(dir, name), body);
  return join(dir, name);
}

/* ---- secret guard --------------------------------------------------------------------- */
const TOKEN_SCAN = [/shpss_[A-Za-z0-9]+/, /shpat_[A-Za-z0-9]+/, /shpca_[A-Za-z0-9]+/, /atkn_[A-Za-z0-9._-]+/];
export async function assertNoSecrets(label, serialized) {
  try {
    const {redact} = await import('../src/config.js');
    if (redact(serialized) !== serialized) throw new Error(`SECRET GUARD: redactable content in ${label}`);
  } catch (e) {
    if (String(e?.message || '').startsWith('SECRET GUARD')) throw e;
    // config not importable in a pure offline context — fall through to token scan
  }
  for (const re of TOKEN_SCAN) if (re.test(serialized)) throw new Error(`SECRET GUARD: token-shaped string in ${label}`);
  return true;
}

/* ---- read-only guard for any GraphQL a batch sends in --commit ------------------------ */
export function assertReadOnly(op) {
  if (/\bmutation\b/i.test(op)) throw new Error('READ-ONLY VIOLATION: this document must be a query');
  return op;
}

/* ---- pretty helpers ------------------------------------------------------------------- */
export const hr = (s = '') => `──────── ${s} ────────`;
export function bail(msg) {
  console.error('  ✗ ' + msg);
  process.exit(1);
}
