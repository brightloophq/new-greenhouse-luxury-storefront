// phase1-close.selftest.js — OFFLINE tests for the Phase-1 closure orchestrator.
//
// Runs the real orchestrator (which spawns the real batch children) in DRY-RUN against synthetic
// closed-state fixtures. No network, no Shopify, no mutation. Also unit-tests the interlock and
// the Stage-0 precondition guard.
//
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeClosedFixture} from './fixtures/sprint-state.fixture.js';
import {assertPhase1Preconditions} from './sprint-lib.js';
import {parseInterlock} from './sprint-io.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORCH = join(HERE, 'phase1-close.js');
const dir = mkdtempSync(join(tmpdir(), 'phase1-close-'));

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) { if (cond) passed++; else { failed++; fails.push(name); console.error(`  ✗ ${name}`); } }

function writeState(name, obj) { const p = join(dir, name); writeFileSync(p, JSON.stringify(obj, null, 2)); return p; }
function runOrch(statePath, argv = []) {
  const env = {...process.env, TNG_SPRINT_STATE_PATH: statePath};
  // never provide a full authorization in tests — offline children cannot reach Shopify
  delete env.TNG_PHASE1_CLOSE_AUTH;
  for (const k of Object.keys(env)) if (/^TNG_SPRINT_.*_AUTH$/.test(k)) delete env[k];
  try { return {out: execFileSync('node', [ORCH, ...argv], {env, encoding: 'utf8'}), code: 0}; }
  catch (e) { return {out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1}; }
}
const idx = (s, t) => s.indexOf(t);

/* ---- 1. interlock: partial authorization is refused (stays dry-run) ------------------- */
{
  const p = (argv, env) => parseInterlock(argv, 'TNG_PHASE1_CLOSE_AUTH', 'AUTHORIZE PHASE1 SHOPIFY CLOSURE', env);
  // parseInterlock reads process.env; emulate by temporarily setting/reading. Test the flag logic:
  const save = process.env.TNG_PHASE1_CLOSE_AUTH;
  delete process.env.TNG_PHASE1_CLOSE_AUTH;
  ok('no flags, no env → dry-run', p(['node', 'x']).dryRun === true);
  ok('--commit only → dry-run (missing understand + env)', p(['node', 'x', '--commit']).dryRun === true);
  ok('both flags but no env → dry-run', p(['node', 'x', '--commit', '--i-understand-this-writes-to-shopify']).dryRun === true);
  process.env.TNG_PHASE1_CLOSE_AUTH = 'AUTHORIZE PHASE1 SHOPIFY CLOSURE';
  ok('env + --commit but no understand flag → dry-run', p(['node', 'x', '--commit']).dryRun === true);
  ok('env + both flags → WRITE (all three present)', p(['node', 'x', '--commit', '--i-understand-this-writes-to-shopify']).write === true);
  if (save === undefined) delete process.env.TNG_PHASE1_CLOSE_AUTH; else process.env.TNG_PHASE1_CLOSE_AUTH = save;
}

/* ---- 2. Stage-0 precondition guard (pure) --------------------------------------------- */
{
  const good = makeClosedFixture();
  let threw = false; try { assertPhase1Preconditions(good); } catch { threw = true; }
  ok('preconditions pass for the confirmed closed state', threw === false);
  const drift = (mut) => { const s = makeClosedFixture(); mut(s); let t = false; try { assertPhase1Preconditions(s); } catch { t = true; } return t; };
  ok('drift: birthday != 16 → throws', drift((s) => { s.occasion.birthday.liveMemberCount = 15; }));
  ok('drift: residual E removal → throws', drift((s) => { s.occasion.anniversary.toRemove = ['x']; }));
  ok('drift: gift-baskets != 1 → throws', drift((s) => { s.collections['gift-baskets'].productsCount = 2; }));
  ok('drift: gift-baskets wrong member → throws', drift((s) => { s.collections['gift-baskets'].liveMembers = ['something-else']; }));
  ok('drift: products != 274 → throws', drift((s) => { s.counts.products = 270; }));
  ok('drift: collections != 52 → throws', drift((s) => { s.counts.collections = 51; }));
  ok('drift: missing write_products scope → throws', drift((s) => { s.scopes.all = ['read_products']; }));
}

/* ---- 3. orchestrator dry-run: full happy path, 0 mutations, sequential order ----------- */
{
  const sp = writeState('closed.json', makeClosedFixture());
  const {out, code} = runOrch(sp);
  ok('dry-run: exit 0', code === 0);
  ok('dry-run: MODE dry-run', /MODE: DRY-RUN/.test(out) && !/MODE: LIVE WRITE/.test(out));
  ok('dry-run: Stage 0 preconditions hold', /preconditions hold: E=16\/9\/17/.test(out));
  ok('dry-run: F2 exact 3 candidates', /luxury-tropical-arrangement/.test(out) && /island-modern-tropical-vase/.test(out) && /paradise-tropical-bouquet/.test(out));
  ok('dry-run: F2 exclusions shown (11 stems)', /wholesale stems that MUST stay excluded \(11\)/.test(out));
  ok('dry-run: G both SEO companion fields', (out.match(/seo carries BOTH companion fields/g) || []).length === 2);
  ok('dry-run: G targets only gift-baskets + tropical-flowers', /collection SEO \+ body \(gift-baskets, tropical-flowers only\)/.test(out));
  ok('dry-run: H expected assertions printed', /tropical-flowers=3 \(exact approved retail members/.test(out));
  ok('dry-run: total planned mutation calls reported', /TOTAL planned Shopify mutation calls/.test(out));
  ok('dry-run: backup paths reported', /batch-f-tropical-flowers-<ts>\/candidates\.before\.json/.test(out) && /batch-g-content-<ts>\/content\.before\.json/.test(out));
  ok('dry-run: Shopify mutations sent = 0', /Shopify mutations sent = 0/.test(out));
  // sequential order: Stage 0 → F2 → G → H
  ok('order: Stage 0 before F2', idx(out, 'STAGE 0') < idx(out, 'STAGE 1 — F2'));
  ok('order: F2 before G', idx(out, 'STAGE 1 — F2') < idx(out, 'STAGE 2 — G'));
  ok('order: G before H', idx(out, 'STAGE 2 — G') < idx(out, 'STAGE 3 — H'));
}

/* ---- 4. preflight drift STOPS before any mutation stage ------------------------------- */
{
  const s = makeClosedFixture();
  s.occasion.birthday.liveMemberCount = 15; // E drift
  const {out, code} = runOrch(writeState('drift.json', s));
  ok('drift: orchestrator exits non-zero', code !== 0);
  ok('drift: reports precondition drift', /PHASE-1 PRECONDITION DRIFT/.test(out));
  ok('drift: STOPS before F2 (no F2 stage banner)', !/▶ STAGE 1 — F2 Tropical Flowers/.test(out));
}

/* ---- 5. F2 failure prevents G (stop-on-first-failure gating) --------------------------- */
{
  const s = makeClosedFixture();
  // make a retail tropical candidate collide with the wholesale-excluded list → F2 fails closed
  s.tropical.wholesaleStemsExcluded.push({handle: 'luxury-tropical-arrangement', title: 'x', productType: 'Fresh Cut Flowers'});
  const {out, code} = runOrch(writeState('f2fail.json', s));
  ok('F2 fail: orchestrator exits non-zero', code !== 0);
  ok('F2 fail: F2 stage ran', /▶ STAGE 1 — F2 Tropical Flowers/.test(out));
  ok('F2 fail: reports STOP, not proceeding to G', /Not proceeding to G/.test(out));
  ok('F2 fail: G stage did NOT run', !/▶ STAGE 2 — G collection SEO\/body/.test(out));
  ok('F2 fail: still 0 mutations', !/MODE: LIVE WRITE/.test(out));
}

console.log(`\nphase1-close.selftest: ${passed} passed, ${failed} failed`);
if (failed) { console.error('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('✓ orchestrator: interlock, Stage-0 guard, sequential order, drift-stop, F2→G gating (offline, 0 mutations)');
