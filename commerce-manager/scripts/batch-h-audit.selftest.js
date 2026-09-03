// batch-h-audit.selftest.js — OFFLINE test of Batch H's three-category audit semantics.
//
// Runs the real batch-h-audit.js against a deterministic collection fixture (TNG_H_FIXTURE) — no
// network, no Shopify, 0 mutations. Proves: SEO companion truth table is applied correctly, the
// title-only canonical case is a reported FINDING (not a false "intact"), and the SHOPIFY CLOSURE
// verdict is driven only by category A (never by the redirect map or the canonical SEO findings).
//
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const H = join(HERE, 'batch-h-audit.js');
const dir = mkdtempSync(join(tmpdir(), 'batch-h-'));

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) { if (cond) passed++; else { failed++; fails.push(name); console.error(`  ✗ ${name}`); } }

const PUBLIC3 = ['Online Store', 'Point of Sale', 'New Greenhouse Luxury Storefront'];
const pub = (names) => ({nodes: names.map((n) => ({isPublished: true, publication: {name: n}}))});
const coll = (handle, {count = 0, seo = {title: null, description: null}, body = '', members = [], published = PUBLIC3} = {}) => ({
  id: `gid://shopify/Collection/${handle}`, handle, title: handle, descriptionHtml: body,
  productsCount: {count}, seo, resourcePublications: pub(published),
  products: {nodes: members},
});

// Confirmed post-write end state: retired unpublished; canonicals on Hydrogen but TITLE-ONLY seo;
// gift-baskets=1 & tropical-flowers=3 with BOTH seo fields + body; zero leakage.
function baseFixture() {
  const f = {};
  for (const h of ['birthday-flowers', 'anniversary-flowers', 'love-romance', 'corporate-gifts', 'corporate-flowers', 'sympathy']) {
    f[h] = coll(h, {count: 0, published: ['Point of Sale']}); // unpublished from public storefront
  }
  const titleOnly = (h) => ({title: `${h} | The New Greenhouse`, description: null});
  f['birthday'] = coll('birthday', {count: 16, seo: titleOnly('birthday')});
  f['anniversary'] = coll('anniversary', {count: 9, seo: titleOnly('anniversary')});
  f['love-and-romance'] = coll('love-and-romance', {count: 17, seo: titleOnly('love-and-romance')});
  f['corporate-gifting'] = coll('corporate-gifting', {count: 40, seo: titleOnly('corporate-gifting')});
  f['sympathy-and-funeral'] = coll('sympathy-and-funeral', {count: 33, seo: titleOnly('sympathy-and-funeral')});
  f['gift-baskets'] = coll('gift-baskets', {count: 1, seo: {title: 'Luxury Gift Baskets | The New Greenhouse', description: 'desc'}, body: '<p>body</p>'});
  f['tropical-flowers'] = coll('tropical-flowers', {count: 3, seo: {title: 'Tropical Flower Arrangements | The New Greenhouse', description: 'desc'}, body: '<p>body</p>'});
  return f;
}
function runH(fixture) {
  const p = join(dir, 'h.json'); writeFileSync(p, JSON.stringify(fixture));
  const env = {...process.env, TNG_H_FIXTURE: p};
  delete env.TNG_SPRINT_STATE_PATH; // use H's built-in expected defaults (16/9/17/1/3)
  try { return {out: execFileSync('node', [H], {env, encoding: 'utf8'}), code: 0}; }
  catch (e) { return {out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1}; }
}

/* ---- 1. confirmed post-write state: closure PASS despite title-only canonicals ---------- */
{
  const {out, code} = runH(baseFixture());
  ok('closure PASS on the confirmed post-write state', /SHOPIFY CLOSURE: PASS/.test(out));
  ok('exit 0 (C findings do not fail closure)', code === 0);
  ok('does NOT falsely claim canonical companion "intact"', !/companion intact/.test(out));
  ok('reports 5 canonical title-only SEO findings', /5 canonical collection\(s\) have seo\.title without seo\.description/.test(out));
  ok('names a specific title-only finding', /birthday: seo\.title present, seo\.description MISSING/.test(out));
  ok('states global SEO is NOT fully complete', /global SEO is NOT fully complete/.test(out));
  ok('redirect map reported as pending code release (6/6 present)', /6\/6 retired→canonical redirect mappings present/.test(out));
  ok('redirect release is not a closure failure', /still requires a deploy to activate/.test(out));
  ok('gift-baskets SEO companion both-present passes', /gift-baskets SEO companion \(both title\+description\).*both-present|✓ gift-baskets SEO companion/.test(out));
  ok('0 mutations', /MUTATIONS SENT: 0/.test(out));
}

/* ---- 2. a real closure blocker (tropical membership wrong) → FAIL + exit 1 ------------- */
{
  const f = baseFixture();
  f['tropical-flowers'] = coll('tropical-flowers', {count: 2, seo: {title: 'T', description: 'D'}, body: '<p>b</p>'});
  const {out, code} = runH(f);
  ok('closure FAIL when tropical-flowers membership != 3', /SHOPIFY CLOSURE: FAIL/.test(out));
  ok('exit 1 on a real closure blocker', code === 1);
  ok('membership mismatch shown', /tropical-flowers membership == 3 — live=2/.test(out));
}

/* ---- 3. gift-baskets title-only after G would be a closure FAIL (companion loss) ------- */
{
  const f = baseFixture();
  f['gift-baskets'] = coll('gift-baskets', {count: 1, seo: {title: 'Only title', description: null}, body: '<p>b</p>'});
  const {out, code} = runH(f);
  ok('closure FAIL when a Batch-G collection is title-only', /SHOPIFY CLOSURE: FAIL/.test(out));
  ok('gift-baskets companion status reported as title-only', /gift-baskets SEO companion .* status=title-only/.test(out));
  ok('exit 1', code === 1);
}

/* ---- 4. description-only canonical is also reported as NOT intact ---------------------- */
{
  const f = baseFixture();
  f['birthday'] = coll('birthday', {count: 16, seo: {title: null, description: 'desc only'}});
  const {out} = runH(f);
  ok('description-only canonical surfaced as a finding', /birthday: seo\.description present, seo\.title MISSING/.test(out));
}

console.log(`\nbatch-h-audit.selftest: ${passed} passed, ${failed} failed`);
if (failed) { console.error('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('✓ Batch H: companion truth table, closure verdict isolates redirects + canonical SEO findings (offline, 0 mutations)');
