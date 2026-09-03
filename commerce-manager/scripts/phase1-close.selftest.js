// phase1-close.selftest.js — OFFLINE tests for the Phase-1 closure orchestrator.
//
// Two layers:
//   • OFFLINE DRY-RUN mode → runs the REAL batch children in plain dry-run against a fixture.
//   • LIVE modes (--live-preview / --commit) → the orchestrator MUST run a fresh preflight and
//     prove regeneration. Offline, we exercise that control flow with STUB child scripts (a
//     temp dir pointed at by TNG_PHASE1_SCRIPT_DIR): a stub preflight writes a fresh state file,
//     stub batches just echo. No network, no Shopify, no mutation.
//
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeClosedFixture} from './fixtures/sprint-state.fixture.js';
import {assertPhase1Preconditions} from './sprint-lib.js';
import {parseInterlock, assertFreshlyRegenerated} from './sprint-io.js';
import {resolvePhase1Mode} from './phase1-close.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORCH = join(HERE, 'phase1-close.js');
const dir = mkdtempSync(join(tmpdir(), 'phase1-close-'));

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) { if (cond) passed++; else { failed++; fails.push(name); console.error(`  ✗ ${name}`); } }
function writeState(name, obj) { const p = join(dir, name); writeFileSync(p, JSON.stringify(obj, null, 2)); return p; }
const idx = (s, t) => s.indexOf(t);

/* ---- build a temp STUB script dir for live-mode control-flow tests --------------------- */
const stubDir = mkdtempSync(join(tmpdir(), 'phase1-stubs-'));
// CommonJS stubs (temp dir has no package.json → default CJS), named exactly like the real scripts.
writeFileSync(join(stubDir, 'sprint-preflight.js'), `
const fs = require('fs');
if (process.env.TNG_STUB_PREFLIGHT_FAIL === '1') { console.error('STUB-PREFLIGHT-FAIL'); process.exit(1); }
const obj = JSON.parse(fs.readFileSync(process.env.TNG_STUB_PREFLIGHT_SRC, 'utf8'));
obj.generatedAt = process.env.TNG_STUB_PREFLIGHT_STALE === '1' ? '2020-01-01T00:00:00.000Z' : new Date().toISOString();
fs.writeFileSync(process.env.TNG_SPRINT_STATE_PATH, JSON.stringify(obj, null, 2));
console.log('STUB-PREFLIGHT-RAN');
`);
writeFileSync(join(stubDir, 'batch-f-populate.js'), `console.log('STUB-F2-RAN args=' + process.argv.slice(2).join(' '));`);
writeFileSync(join(stubDir, 'batch-g-content.js'), `console.log('STUB-G-RAN args=' + process.argv.slice(2).join(' '));`);
writeFileSync(join(stubDir, 'batch-h-audit.js'), `console.log('STUB-H-RAN');`);

function runOrch(statePath, argv = [], extraEnv = {}) {
  const env = {...process.env, TNG_SPRINT_STATE_PATH: statePath, ...extraEnv};
  delete env.TNG_PHASE1_CLOSE_AUTH;
  for (const k of Object.keys(env)) if (/^TNG_SPRINT_.*_AUTH$/.test(k)) delete env[k];
  if (extraEnv.TNG_PHASE1_CLOSE_AUTH) env.TNG_PHASE1_CLOSE_AUTH = extraEnv.TNG_PHASE1_CLOSE_AUTH;
  try { return {out: execFileSync('node', [ORCH, ...argv], {env, encoding: 'utf8'}), code: 0}; }
  catch (e) { return {out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1}; }
}
// helper: run a live-preview against a stub preflight that emits `srcState`
function runLivePreview(srcState, {stale = false, preState} = {}) {
  const src = writeState('stub-src.json', srcState);
  const statePath = writeState('live-state.json', preState || {generatedAt: '2020-01-01T00:00:00.000Z', junk: true});
  return runOrch(statePath, ['--live-preview'], {
    TNG_PHASE1_SCRIPT_DIR: stubDir,
    TNG_STUB_PREFLIGHT_SRC: src,
    ...(stale ? {TNG_STUB_PREFLIGHT_STALE: '1'} : {}),
  });
}

/* ---- 1. mode resolution + interlock (partial auth refused) ---------------------------- */
{
  ok('resolveMode: no flags → offline-dry-run', resolvePhase1Mode({write: false}, false) === 'offline-dry-run');
  ok('resolveMode: --live-preview → live-preview', resolvePhase1Mode({write: false}, true) === 'live-preview');
  ok('resolveMode: authorized write → live-write', resolvePhase1Mode({write: true}, false) === 'live-write');
  ok('resolveMode: write wins over live-preview', resolvePhase1Mode({write: true}, true) === 'live-write');
  const save = process.env.TNG_PHASE1_CLOSE_AUTH; delete process.env.TNG_PHASE1_CLOSE_AUTH;
  const p = (argv) => parseInterlock(argv, 'TNG_PHASE1_CLOSE_AUTH', 'AUTHORIZE PHASE1 SHOPIFY CLOSURE');
  ok('interlock: --commit only → dry-run', p(['n', 'x', '--commit']).dryRun === true);
  ok('interlock: both flags, no env → dry-run', p(['n', 'x', '--commit', '--i-understand-this-writes-to-shopify']).dryRun === true);
  process.env.TNG_PHASE1_CLOSE_AUTH = 'AUTHORIZE PHASE1 SHOPIFY CLOSURE';
  ok('interlock: env + both flags → write', p(['n', 'x', '--commit', '--i-understand-this-writes-to-shopify']).write === true);
  if (save === undefined) delete process.env.TNG_PHASE1_CLOSE_AUTH; else process.env.TNG_PHASE1_CLOSE_AUTH = save;
}

/* ---- 2. freshness guard (pure) -------------------------------------------------------- */
{
  const now = Date.now();
  let t = false; try { assertFreshlyRegenerated(new Date(now).toISOString(), now); } catch { t = true; }
  ok('freshness: a just-now timestamp passes', t === false);
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  ok('freshness: an old timestamp is rejected', throws(() => assertFreshlyRegenerated('2020-01-01T00:00:00.000Z', now)));
  ok('freshness: a missing timestamp is rejected', throws(() => assertFreshlyRegenerated(undefined, now)));
}

/* ---- 3. Stage-0 precondition guard (pure) --------------------------------------------- */
{
  const good = makeClosedFixture();
  ok('preconditions pass for confirmed closed state', (() => { try { assertPhase1Preconditions(good); return true; } catch { return false; } })());
  const drift = (mut) => { const s = makeClosedFixture(); mut(s); try { assertPhase1Preconditions(s); return false; } catch { return true; } };
  ok('drift: birthday!=16 throws', drift((s) => { s.occasion.birthday.liveMemberCount = 15; }));
  ok('drift: gift-baskets!=1 throws', drift((s) => { s.collections['gift-baskets'].productsCount = 2; }));
  ok('drift: gift-baskets wrong member throws', drift((s) => { s.collections['gift-baskets'].liveMembers = ['x']; }));
  ok('drift: products!=274 throws', drift((s) => { s.counts.products = 270; }));
}

/* ---- 4. OFFLINE DRY-RUN mode: real children, fixture, 0 mutations, order --------------- */
{
  const {out, code} = runOrch(writeState('closed.json', makeClosedFixture()));
  ok('offline: exit 0', code === 0);
  ok('offline: MODE dry-run (offline)', /MODE: DRY-RUN \(offline\)/.test(out));
  ok('offline: NO live refresh line', !/refreshing live Shopify state/.test(out));
  ok('offline: uses fixture (Stage 0 preconditions hold)', /preconditions hold: E=16\/9\/17/.test(out));
  ok('offline: F2 exact 3 candidates', /luxury-tropical-arrangement/.test(out) && /island-modern-tropical-vase/.test(out) && /paradise-tropical-bouquet/.test(out));
  ok('offline: G both SEO companion fields', (out.match(/seo carries BOTH companion fields/g) || []).length === 2);
  ok('offline: Shopify mutations sent = 0', /Shopify mutations sent = 0/.test(out));
  ok('offline order: Stage 0 → F2 → G → H', idx(out, 'STAGE 0') < idx(out, 'STAGE 1 — F2') && idx(out, 'STAGE 1 — F2') < idx(out, 'STAGE 2 — G') && idx(out, 'STAGE 2 — G') < idx(out, 'STAGE 3 — H'));
}

/* ---- 5. LIVE PREVIEW: fresh preflight, fresh state used, correct order, 0 mutations ---- */
{
  const {out, code} = runLivePreview(makeClosedFixture());
  ok('live-preview: exit 0', code === 0);
  ok('live-preview: banner LIVE PREVIEW, ZERO MUTATIONS', /MODE: LIVE PREVIEW — LIVE QUERIES, ZERO MUTATIONS/.test(out));
  ok('live-preview: prints "refreshing live Shopify state"', /Stage 0: refreshing live Shopify state/.test(out));
  ok('live-preview: actually runs the preflight (stub marker)', /STUB-PREFLIGHT-RAN/.test(out));
  ok('live-preview: confirms freshly-refreshed state', /live state refreshed \(generatedAt/.test(out));
  ok('live-preview: F2/G/H children run', /STUB-F2-RAN/.test(out) && /STUB-G-RAN/.test(out) && /STUB-H-RAN/.test(out));
  ok('live-preview: F2 gets --live-preview arg', /STUB-F2-RAN args=.*--live-preview/.test(out));
  ok('live-preview: 0 mutations (live queries only)', /Shopify mutations sent = 0 \(live queries only\)/.test(out) && !/MODE: LIVE WRITE/.test(out));
  // ordering: preflight → Stage-0 confirm → F2 → G → H
  ok('live-preview order: preflight → F2 → G → H',
    idx(out, 'STUB-PREFLIGHT-RAN') < idx(out, 'STUB-F2-RAN') &&
    idx(out, 'STUB-F2-RAN') < idx(out, 'STUB-G-RAN') &&
    idx(out, 'STUB-G-RAN') < idx(out, 'STUB-H-RAN'));
  ok('live-preview: Stage-0 confirm precedes F2', idx(out, 'live state refreshed') < idx(out, 'STUB-F2-RAN'));
}

/* ---- 6. LIVE PREVIEW must NOT use stale fixture: stale gb=0 present, fresh says 1 ------ */
{
  const stale = makeClosedFixture();
  stale.collections['gift-baskets'].productsCount = 0;
  stale.collections['gift-baskets'].liveMembers = [];
  stale.generatedAt = '2020-01-01T00:00:00.000Z';
  const {out, code} = runLivePreview(makeClosedFixture(), {preState: stale}); // pre-existing stale file; fresh says 1
  ok('stale-not-used: exit 0 (fresh gb=1 wins)', code === 0);
  ok('stale-not-used: no precondition drift', !/PRECONDITION DRIFT/.test(out));
  ok('stale-not-used: F2 proceeds', /STUB-F2-RAN/.test(out));
}

/* ---- 7. LIVE PREVIEW blocks when the FRESH live state genuinely fails ------------------ */
{
  const freshBad = makeClosedFixture();
  freshBad.collections['gift-baskets'].productsCount = 0;
  freshBad.collections['gift-baskets'].liveMembers = [];
  const {out, code} = runLivePreview(freshBad);
  ok('fresh-bad: exits non-zero', code !== 0);
  ok('fresh-bad: reports precondition drift', /PRECONDITION DRIFT/.test(out));
  ok('fresh-bad: STOPS before F2', !/STUB-F2-RAN/.test(out));
}

/* ---- 8. LIVE PREVIEW rejects a state file NOT freshly regenerated --------------------- */
{
  const {out, code} = runLivePreview(makeClosedFixture(), {stale: true}); // stub writes an old generatedAt
  ok('stale-regen: exits non-zero', code !== 0);
  ok('stale-regen: reports STALE evidence', /STALE evidence/.test(out));
  ok('stale-regen: STOPS before F2', !/STUB-F2-RAN/.test(out));
}

/* ---- 9. LIVE WRITE (commit) also refreshes Stage 0 FIRST (stubbed, 0 real mutations) --- */
{
  const src = writeState('commit-src.json', makeClosedFixture());
  const statePath = writeState('commit-state.json', {generatedAt: '2020-01-01T00:00:00.000Z', junk: true});
  const {out, code} = runOrch(statePath, ['--commit', '--i-understand-this-writes-to-shopify'], {
    TNG_PHASE1_CLOSE_AUTH: 'AUTHORIZE PHASE1 SHOPIFY CLOSURE',
    TNG_PHASE1_SCRIPT_DIR: stubDir,
    TNG_STUB_PREFLIGHT_SRC: src,
  });
  ok('commit: exit 0 (stubbed)', code === 0);
  ok('commit: MODE LIVE WRITE', /MODE: LIVE WRITE/.test(out));
  ok('commit: refreshes live state FIRST', /Stage 0: refreshing live Shopify state/.test(out) && idx(out, 'STUB-PREFLIGHT-RAN') < idx(out, 'STUB-F2-RAN'));
  ok('commit: order preflight → F2 → G → H', idx(out, 'STUB-PREFLIGHT-RAN') < idx(out, 'STUB-F2-RAN') && idx(out, 'STUB-F2-RAN') < idx(out, 'STUB-G-RAN') && idx(out, 'STUB-G-RAN') < idx(out, 'STUB-H-RAN'));
  ok('commit: F2 gets write flags (not --live-preview)', /STUB-F2-RAN args=.*--commit/.test(out) && !/STUB-F2-RAN args=.*--live-preview/.test(out));
}

/* ---- 10. F2 failure prevents G (stop-on-first-failure), offline dry-run --------------- */
{
  const s = makeClosedFixture();
  s.tropical.wholesaleStemsExcluded.push({handle: 'luxury-tropical-arrangement', title: 'x', productType: 'Fresh Cut Flowers'});
  const {out, code} = runOrch(writeState('f2fail.json', s));
  ok('F2 fail: non-zero exit', code !== 0);
  ok('F2 fail: reports not proceeding to G', /Not proceeding to G/.test(out));
  ok('F2 fail: G did NOT run', !/▶ STAGE 2 — G collection SEO\/body/.test(out));
}

console.log(`\nphase1-close.selftest: ${passed} passed, ${failed} failed`);
if (failed) { console.error('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('✓ orchestrator: 3 modes, live-refresh + freshness guard, stale-state rejection, ordering, gating (offline, 0 mutations)');
