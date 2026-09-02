// sprint-batches.dryrun.selftest.js — OFFLINE dry-run harness for all Phase-1 write batches.
//
// Writes the SYNTHETIC fixture to a temp file, points the batches at it via
// TNG_SPRINT_STATE_PATH, and runs each batch with NO authorization env and NO --commit.
// Asserts every batch: exits 0, reports "Shopify mutations sent: 0", runs in DRY-RUN mode,
// never in LIVE WRITE mode, and prints the expected plan. No Shopify, no network, no mutation.
//
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeFixture} from './fixtures/sprint-state.fixture.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'sprint-dryrun-'));
const statePath = join(dir, 'sprint-state.json');
writeFileSync(statePath, JSON.stringify(makeFixture(), null, 2));

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) {
  if (cond) passed++; else { failed++; fails.push(name); console.error(`  ✗ ${name}`); }
}

function runBatch(name, args) {
  const env = {...process.env, TNG_SPRINT_STATE_PATH: statePath};
  // strip any real auth phrases so the harness can never accidentally authorize a write
  for (const k of Object.keys(env)) if (/^TNG_SPRINT_.*_AUTH$/.test(k)) delete env[k];
  try {
    return {out: execFileSync('node', [join(HERE, name), ...args], {env, encoding: 'utf8'}), code: 0};
  } catch (e) {
    return {out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1};
  }
}

const cases = [
  {name: 'Batch B (retire)', file: 'batch-b-retire.js', args: [], expect: ['DRY-RUN', 'Shopify mutations sent: 0', 'birthday-flowers', 'corporate-gifts', 'New Greenhouse Luxury Storefront', 'LEAVE untouched']},
  {name: 'Batch E (occasions)', file: 'batch-e-occasions.js', args: [], expect: ['DRY-RUN', 'Shopify mutations sent: 0', 'UNIQUE products actually mutated', 'OVERLAP TABLE', 'long-stem-pink-roses']},
  {name: 'Batch F1 (gift baskets)', file: 'batch-f-populate.js', args: ['--target', 'gift-baskets'], expect: ['DRY-RUN', 'Shopify mutations sent: 0', 'fruit-flower-gift-basket']},
  {name: 'Batch F2 (tropical)', file: 'batch-f-populate.js', args: ['--target', 'tropical-flowers'], expect: ['DRY-RUN', 'Shopify mutations sent: 0', 'luxury-tropical-arrangement', 'stay excluded']},
  {name: 'Batch G (content)', file: 'batch-g-content.js', args: [], expect: ['DRY-RUN', 'Shopify mutations sent: 0', 'gift-baskets', 'tropical-flowers', 'BOTH companion fields']},
];

for (const c of cases) {
  const {out, code} = runBatch(c.file, c.args);
  ok(`${c.name}: exit 0`, code === 0);
  ok(`${c.name}: never LIVE WRITE`, !/MODE: LIVE WRITE/.test(out));
  for (const token of c.expect) ok(`${c.name}: output contains "${token}"`, out.includes(token));
}

// Batch B publication-targeting regressions (the bug the live preview caught).
{
  const {out} = runBatch('batch-b-retire.js', []);
  // Parse the per-target "UNPUBLISH from ..." lines against their preceding handle line.
  const lines = out.split('\n');
  const planFor = {};
  let cur = null;
  for (const ln of lines) {
    const m = ln.match(/^\s*•\s+(\S+)\s+id=/);
    if (m) { cur = m[1]; planFor[cur] = {unpublish: '', leave: ''}; continue; }
    if (cur && /UNPUBLISH from\s*:/.test(ln)) planFor[cur].unpublish = ln;
    if (cur && /LEAVE untouched\s*:/.test(ln)) planFor[cur].leave = ln;
  }
  ok('Batch B: Hydrogen publication included in retirement (birthday-flowers)', /New Greenhouse Luxury Storefront/.test(planFor['birthday-flowers']?.unpublish || ''));
  ok('Batch B: corporate-gifts unpublishes from Hydrogen (NOT Online-Store-only)', /New Greenhouse Luxury Storefront/.test(planFor['corporate-gifts']?.unpublish || ''));
  ok('Batch B: corporate-gifts does NOT attempt Online Store (not published there)', !/Online Store/.test(planFor['corporate-gifts']?.unpublish || ''));
  ok('Batch B: Point of Sale is left untouched (birthday-flowers)', /Point of Sale/.test(planFor['birthday-flowers']?.leave || ''));
  ok('Batch B: Point of Sale never appears in an unpublish list', Object.values(planFor).every((p) => !/Point of Sale/.test(p.unpublish)));
  ok('Batch B: multi-channel target unpublishes from both Online Store and Hydrogen', /Online Store/.test(planFor['birthday-flowers']?.unpublish || '') && /New Greenhouse Luxury Storefront/.test(planFor['birthday-flowers']?.unpublish || ''));
}

// Batch E cross-collection overlap regressions (the hazard the live preview exposed).
{
  const {out} = runBatch('batch-e-occasions.js', []);
  const uniq = (out.match(/UNIQUE products actually mutated\s*:\s*(\d+)/) || [])[1];
  const planned = (out.match(/planned collection-membership removals:\s*(\d+)/) || [])[1];
  const overlaps = (out.match(/overlap products \(>1 collection\)\s*:\s*(\d+)/) || [])[1];
  ok('Batch E: planned removals = 25', planned === '25');
  ok('Batch E: unique products != 25 (overlaps collapsed)', uniq === '20');
  ok('Batch E: 5 overlap products detected', overlaps === '5');
  // a two-collection product gets ONE cumulative line with BOTH occasion tags
  ok('Batch E: long-stem-pink-roses cumulative removes birthday + romance', /long-stem-pink-roses: remove \[occasion:birthday, occasion:romance\]/.test(out));
  ok('Batch E: pink-hydrangeas cumulative removes birthday + anniversary', /pink-hydrangeas: remove \[occasion:anniversary, occasion:birthday\]/.test(out));
  ok('Batch E: long-stem-red-roses cumulative removes anniversary + romance', /long-stem-red-roses: remove \[occasion:anniversary, occasion:romance\]/.test(out));
  // each overlap product appears exactly once in the per-product section (one update, not two)
  const perProduct = out.slice(out.indexOf('PER-PRODUCT CUMULATIVE REMOVALS'));
  ok('Batch E: overlap product listed exactly once (single update)', (perProduct.match(/long-stem-pink-roses: remove/g) || []).length === 1);
}

// Batch H is read-only by construction — verify it declares itself so and needs no auth.
// (It queries live, so we do not execute it offline; we assert its source contract instead.)
import {readFileSync} from 'node:fs';
const hSrc = readFileSync(join(HERE, 'batch-h-audit.js'), 'utf8');
ok('Batch H: declares READ-ONLY', /READ-ONLY/.test(hSrc) && /MUTATIONS SENT: 0/.test(hSrc));
ok('Batch H: sends no mutation document', !/\bmutation\b/i.test(hSrc.replace(/refuses to send a mutation|no mutation|not a mutation/gi, '')));

console.log(`\nsprint-batches.dryrun.selftest: ${passed} passed, ${failed} failed`);
if (failed) { console.error('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('✓ all batch dry-runs report 0 mutations and correct plans (offline, no Shopify)');
