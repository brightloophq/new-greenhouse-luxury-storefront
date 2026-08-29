// batch1-collection-seo.selftest.js — OFFLINE self-test. No network, no Shopify, no writes.
// Exercises the pure logic of batch1-collection-seo.js against the authoritative snapshot
// values (from catalog/live-audit/analysis.json → phase1Extension) and adversarial cases,
// and renders a SIMULATED dry-run to prove output shape + zero mutations.
import assert from 'node:assert';
import {
  APPROVED, ALLOWLIST, assertAllowed, validateCopy, buildInput, assertInputScope,
  checkPrereqs, fingerprint, changedPaths, writeAuthorized, buildPlan,
} from './batch1-collection-seo.js';

let pass = 0;
const ok = (name, fn) => {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
};

// Authoritative live fixture (values verified from analysis.json @ a50c28e).
const LIVE = new Map([
  ['premium-handcrafted', {id: 'gid://shopify/Collection/1', handle: 'premium-handcrafted', title: 'Premium Handcrafted',
    descriptionHtml: '<p>' + 'x'.repeat(78) + '</p>', sortOrder: 'BEST_SELLING', templateSuffix: null,
    productsCount: {count: 3}, seo: {title: null, description: null}, image: null,
    ruleSet: null, resourcePublications: {nodes: [{isPublished: true, publication: {name: 'New Greenhouse Luxury Storefront'}}]}}],
  ['premium-vase', {id: 'gid://shopify/Collection/2', handle: 'premium-vase', title: 'Premium Vase',
    descriptionHtml: '<p>' + 'x'.repeat(66) + '</p>', sortOrder: 'BEST_SELLING', templateSuffix: null,
    productsCount: {count: 7}, seo: {title: null, description: null}, image: null,
    ruleSet: null, resourcePublications: {nodes: [{isPublished: true, publication: {name: 'New Greenhouse Luxury Storefront'}}]}}],
  ['premium-heart-box', {id: 'gid://shopify/Collection/3', handle: 'premium-heart-box', title: 'Premium Heart Box',
    descriptionHtml: '<p>' + 'x'.repeat(72) + '</p>', sortOrder: 'BEST_SELLING', templateSuffix: null,
    productsCount: {count: 1}, seo: {title: null, description: null}, image: null,
    ruleSet: null, resourcePublications: {nodes: [{isPublished: true, publication: {name: 'New Greenhouse Luxury Storefront'}}]}}],
]);

console.log('── Batch-1 self-test (offline) ──');

ok('allowlist has exactly the 3 handles', () => {
  assert.deepStrictEqual([...ALLOWLIST].sort(), ['premium-handcrafted', 'premium-heart-box', 'premium-vase']);
});
ok('assertAllowed rejects an unknown handle', () => {
  assert.throws(() => assertAllowed('all-flowers'), /not on the Batch-1 allowlist/);
});
ok('approved copy is within length limits', () => {
  for (const a of APPROVED) assert.deepStrictEqual(validateCopy(a), [], a.handle);
});
ok('buildInput yields EXACTLY {id, seo:{title,description}}', () => {
  const i = buildInput('gid://x', 't', 'd');
  assert.deepStrictEqual(i, {id: 'gid://x', seo: {title: 't', description: 'd'}});
  assertInputScope(i);
});
ok('assertInputScope rejects an extra writable field', () => {
  const bad = {id: 'x', seo: {title: 't', description: 'd'}, descriptionHtml: 'HACK'};
  assert.throws(() => assertInputScope(bad), /top-level keys must be id,seo/);
});
ok('assertInputScope rejects an extra seo field', () => {
  const bad = {id: 'x', seo: {title: 't', description: 'd', handle: 'HACK'}};
  assert.throws(() => assertInputScope(bad), /seo keys must be description,title/);
});
ok('prereqs PASS for all 3 authoritative fixtures', () => {
  for (const a of APPROVED) assert.deepStrictEqual(checkPrereqs(LIVE.get(a.handle), a), [], a.handle);
});
ok('prereqs FAIL closed when seo.title already set', () => {
  const live = {...LIVE.get('premium-vase'), seo: {title: 'existing', description: null}};
  assert.ok(checkPrereqs(live, APPROVED[1]).some((f) => /seo.title is NOT empty/.test(f)));
});
ok('prereqs FAIL closed when product count drifts', () => {
  const live = {...LIVE.get('premium-vase'), productsCount: {count: 8}};
  assert.ok(checkPrereqs(live, APPROVED[1]).some((f) => /product count 8 != expected 7/.test(f)));
});
ok('prereqs FAIL closed when not on storefront channel', () => {
  const live = {...LIVE.get('premium-vase'), resourcePublications: {nodes: [{isPublished: true, publication: {name: 'Online Store'}}]}};
  assert.ok(checkPrereqs(live, APPROVED[1]).some((f) => /not published to/.test(f)));
});
ok('changedPaths detects ONLY seo fields after a simulated seo-only update', () => {
  const before = fingerprint(LIVE.get('premium-vase'));
  const after = fingerprint({...LIVE.get('premium-vase'), seo: {title: APPROVED[1].seoTitle, description: APPROVED[1].seoDescription}});
  assert.deepStrictEqual(changedPaths(before, after).sort(), ['seoDescription', 'seoTitle']);
});
ok('changedPaths flags an illegal body change', () => {
  const before = fingerprint(LIVE.get('premium-vase'));
  const after = fingerprint({...LIVE.get('premium-vase'), descriptionHtml: '<p>changed</p>'});
  assert.ok(changedPaths(before, after).includes('descriptionHtmlSha256'));
});
ok('write interlock is OFF without all three factors', () => {
  assert.strictEqual(writeAuthorized([], {}), false);
  assert.strictEqual(writeAuthorized(['--commit'], {}), false);
  assert.strictEqual(writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {}), false);
  assert.strictEqual(
    writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {TNG_BATCH1_WRITE_AUTH: 'AUTHORIZE BATCH1 COLLECTION SEO WRITE'}),
    true,
  );
});

// Simulated dry-run render (proves plan shape; sends nothing).
const {plans, allOk} = buildPlan(LIVE);
ok('buildPlan: all prerequisites pass and 3 payloads are scoped', () => {
  assert.strictEqual(allOk, true);
  assert.strictEqual(plans.length, 3);
  for (const p of plans) assertInputScope(p.input);
});

console.log('\n── simulated DRY-RUN (fixture = authoritative snapshot) ──');
for (const p of plans) {
  console.log(`  • ${p.handle} (id ${p.id}) prereqs=${p.prereqFailures.length ? 'FAIL' : 'OK'} title=${p.after.seoTitle.length}/60 desc=${p.after.seoDescription.length}/160`);
  console.log(`    payload ${JSON.stringify(p.input)}`);
}
console.log(`\n  allOk=${allOk} · MUTATIONS SENT: 0 (self-test performs no network I/O)`);
console.log(`\n${process.exitCode ? '✗ SELF-TEST FAILED' : `✓ SELF-TEST PASSED (${pass} checks)`} — no network, no Shopify, no writes.`);
