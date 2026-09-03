// phase1-close.js — ONE guarded, sequential orchestrator for the REMAINING Shopify-side
// Phase-1 catalogue closure: F2 (Tropical Flowers) → G (collection SEO/body) → H (final audit).
//
// Batches B, E and F1 are already complete and are NEVER re-run here. Batch C (redirects) is
// code-side and NOT part of this Shopify mutation bundle. This never merges or deploys.
//
// SAFETY MODEL — this is NOT a blind all-or-nothing bulk mutation. It is a sequential GUARDED
// closure that reuses the EXISTING, already-tested batch scripts as child processes (so their
// allowlists, preconditions, backups and verifiers are preserved verbatim — no reimplementation):
//
//   Stage 0  fresh live preflight + drift guard      (read-only; STOP before any mutation on drift)
//   Stage 1  F2 write   → batch-f-populate.js --target tropical-flowers
//   Stage 2  F2 verify   (the child's own bounded-convergence verifier)  → STOP-on-fail, skip G
//   Stage 3  G write+verify → batch-g-content.js       → STOP-on-fail, skip H-success
//   Stage 4  H read-only audit → batch-h-audit.js
//
// DEFAULT IS DRY-RUN. A live run requires ALL of:
//   TNG_PHASE1_CLOSE_AUTH="AUTHORIZE PHASE1 SHOPIFY CLOSURE"  --commit  --i-understand-this-writes-to-shopify
// When authorized, the orchestrator supplies each child's own auth phrase internally — no separate
// F2/G auth vars are required from the operator, but each child still enforces its own interlock.
//
// Usage:
//   node scripts/phase1-close.js                         # FULL DRY-RUN (0 mutations)
//   node scripts/phase1-close.js --live-preview          # dry-run + children's read-only live preview
//   TNG_PHASE1_CLOSE_AUTH="AUTHORIZE PHASE1 SHOPIFY CLOSURE" \
//     node scripts/phase1-close.js --commit --i-understand-this-writes-to-shopify
//
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {assertPhase1Preconditions, PHASE1_EXPECTED} from './sprint-lib.js';
import {loadState, parseInterlock, hr, bail} from './sprint-io.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV = 'TNG_PHASE1_CLOSE_AUTH';
const PHRASE = 'AUTHORIZE PHASE1 SHOPIFY CLOSURE';
// Child auth phrases (must match each batch's own interlock).
const CHILD_AUTH = {
  f2: {name: 'TNG_SPRINT_F_TROPICAL_AUTH', phrase: 'AUTHORIZE SPRINT F TROPICAL FLOWERS'},
  g: {name: 'TNG_SPRINT_G_AUTH', phrase: 'AUTHORIZE SPRINT G COLLECTION CONTENT'},
};
const WRITE_FLAGS = ['--commit', '--i-understand-this-writes-to-shopify'];

function runChild(label, file, args, {write, childAuth, extraArgs = []} = {}) {
  const env = {...process.env};
  const argv = [join(HERE, file), ...args, ...extraArgs];
  if (write && childAuth) {
    env[childAuth.name] = childAuth.phrase;
    argv.push(...WRITE_FLAGS);
  }
  console.log(`\n${'═'.repeat(64)}\n▶ ${label}\n${'═'.repeat(64)}`);
  const r = spawnSync('node', argv, {env, stdio: 'inherit', encoding: 'utf8'});
  return r.status ?? 1;
}

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const write = gate.write;
  const livePreview = process.argv.includes('--live-preview');
  const usingFixture = !!process.env.TNG_SPRINT_STATE_PATH;
  const childPreviewArgs = !write && livePreview ? ['--live-preview'] : [];

  console.log(hr('PHASE-1 SHOPIFY CLOSURE ORCHESTRATOR'));
  console.log(gate.report());
  console.log('  bundle: F2 Tropical Flowers → G collection content → H final audit (read-only)');
  console.log('  excluded: Batch C redirects (code-side) · no merge · no deploy · no production change');

  /* ---------- STAGE 0 — fresh live preflight + drift guard (read-only) ---------- */
  console.log('\n' + hr('STAGE 0 — fresh live preflight + drift guard'));
  if (write && !usingFixture) {
    // refresh sprint-state.json from LIVE Shopify (read-only, secret-scanned by the preflight)
    const pf = runChild('preflight (read-only refresh)', 'sprint-preflight.js', [], {});
    if (pf !== 0) bail('Stage 0: live preflight refresh failed — STOP before any mutation.');
  } else {
    console.log('  (dry-run/fixture: validating existing sprint-state.json without a live refresh)');
  }
  let state;
  try {
    ({state} = loadState());
  } catch (e) {
    bail('Stage 0: ' + (e?.message || e));
  }
  console.log(`  store: ${state.store} · api: ${state.apiVersion} · products: ${state.counts?.products} · collections: ${state.counts?.collections}`);
  console.log(`  scopes: ${(state.scopes?.all || []).join(', ') || '(none)'}`);
  try {
    assertPhase1Preconditions(state);
  } catch (e) {
    bail('Stage 0: ' + (e?.message || e));
  }
  console.log('  ✓ preconditions hold: E=16/9/17 (no residual removals) · gift-baskets=1 (fruit-flower-gift-basket) · 274/52 · write_products granted');

  // dry-run planning summary
  const trop = state.collections?.['tropical-flowers'];
  const tropCands = (state.tropical?.retailCandidates || []).filter((c) => !c.alreadyMember);
  const tropExcluded = (state.tropical?.wholesaleStemsExcluded || []).length;
  const f2Mech = trop?.isSmart ? 'SMART (minimal tagsAdd only if a TAG rule; non-tag rule → FAIL CLOSED)' : 'MANUAL (collectionAddProducts)';
  const f2Calls = trop?.isSmart ? `≤ ${tropCands.length} (one tagsAdd per missing rule tag)` : '1 (collectionAddProducts)';
  const gCalls = 2; // two collectionUpdate (gift-baskets, tropical-flowers)

  console.log('\n' + hr('PLANNED WORK (dry-run summary)'));
  console.log(`  F2 target: tropical-flowers [${trop?.isSmart ? 'SMART' : 'MANUAL'}] · mechanism: ${f2Mech}`);
  console.log(`     candidates (${tropCands.length}): ${tropCands.map((c) => c.handle).join(', ')}`);
  console.log(`     wholesale stems excluded: ${tropExcluded} · allowlist = exactly the ${PHASE1_EXPECTED.tropical.intended} approved retail handles`);
  console.log(`     F2 planned mutation calls: ${f2Calls}`);
  console.log(`  G targets: gift-baskets, tropical-flowers (SEO + body); both SEO companion fields always sent`);
  console.log(`     G planned mutation calls: ${gCalls} (collectionUpdate ×2)`);
  console.log(`  H: read-only audit (0 mutations)`);
  console.log(`  TOTAL planned Shopify mutation calls: F2 ${f2Calls} + G ${gCalls} + H 0`);
  console.log('  backup paths that WOULD be created:');
  console.log('     catalog/live-audit/backups/batch-f-tropical-flowers-<ts>/candidates.before.json');
  console.log('     catalog/live-audit/backups/batch-g-content-<ts>/content.before.json');

  /* ---------- STAGE 1+2 — F2 Tropical Flowers (write + own verifier) ---------- */
  const f2 = runChild('STAGE 1 — F2 Tropical Flowers', 'batch-f-populate.js', ['--target', 'tropical-flowers'], {write, childAuth: CHILD_AUTH.f2, extraArgs: childPreviewArgs});
  if (f2 !== 0) bail(`F2 ${write ? 'write/verify' : 'dry-run'} failed (exit ${f2}) — STOP. Not proceeding to G.`);

  /* ---------- STAGE 3 — G collection content (write + own verifier) ---------- */
  const g = runChild('STAGE 2 — G collection SEO/body', 'batch-g-content.js', [], {write, childAuth: CHILD_AUTH.g, extraArgs: childPreviewArgs});
  if (g !== 0) bail(`G ${write ? 'write/verify' : 'dry-run'} failed (exit ${g}) — STOP. Not continuing to final success state.`);

  /* ---------- STAGE 4 — H final read-only audit ---------- */
  console.log('\n' + hr('STAGE 3 — H final audit (read-only)'));
  if (write) {
    const h = runChild('STAGE 3 — H final audit', 'batch-h-audit.js', [], {});
    if (h !== 0) bail(`H final audit reported FAIL (exit ${h}) — investigate. No rollback triggered by the audit alone.`);
  } else {
    console.log('  (dry-run) H will assert, read-only, after the writes:');
    console.log('     • 274 products / 52 collections · secret scan clean');
    console.log('     • birthday=16 · anniversary=9 · love-and-romance=17');
    console.log('     • gift-baskets=1 (fruit-flower-gift-basket)');
    console.log(`     • tropical-flowers=${PHASE1_EXPECTED.tropical.intended} (exact approved retail members; ${tropExcluded} wholesale stems excluded)`);
    console.log('     • gift-baskets & tropical-flowers SEO + body gaps cleared (both companion fields present)');
    console.log('     • retired handles still unpublished (no republish) · no product tag/type drift');
  }

  console.log('\n' + hr(write ? 'CLOSURE COMPLETE' : 'DRY-RUN COMPLETE'));
  if (!write) {
    console.log('  Shopify mutations sent = 0');
    console.log(`  To execute: ${ENV}="${PHRASE}" node scripts/phase1-close.js --commit --i-understand-this-writes-to-shopify`);
  } else {
    console.log('  ✓ F2 + G written and verified; H audit passed. No merge, no deploy.');
  }
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
