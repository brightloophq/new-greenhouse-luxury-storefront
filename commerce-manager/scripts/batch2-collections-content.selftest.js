// batch2-collections-content.selftest.js — OFFLINE self-test. No network, no Shopify, no writes.
// Exercises the pure logic against authoritative snapshot values + all required adversarial cases.
import assert from 'node:assert';
import {
  APPROVED, ALLOWLIST, assertAllowed, validateCopy, buildInput, assertInputScope,
  checkPrereqs, classifyCount, countTolerance, fingerprint, changedPaths,
  ALLOWED_CHANGE_PATHS, writeAuthorized, buildPlan,
} from './batch2-collections-content.js';

let pass = 0;
const ok = (name, fn) => {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
};

// Authoritative live fixtures (values from analysis.json @ a50c28e; ids are placeholders).
const mk = (h, count, extra = {}) => ({
  id: `gid://shopify/Collection/${h}`, handle: h, title: h, descriptionHtml: '', sortOrder: 'BEST_SELLING',
  templateSuffix: null, updatedAt: '2026-08-29T22:00:00Z', productsCount: {count}, seo: {title: null, description: null},
  image: null, ruleSet: null,
  resourcePublications: {nodes: [{isPublished: true, publication: {name: 'New Greenhouse Luxury Storefront'}}]},
  ...extra,
});
const LIVE = new Map([
  ['same-day-delivery', mk('same-day-delivery', 58)],
  ['plants', mk('plants', 3)],
  ['thank-you', mk('thank-you', 21)],
  ['luxury-bouquets', mk('luxury-bouquets', 4)],
]);

console.log('── Batch-2 self-test (offline) ──');

ok('allowlist is exactly the 4 handles', () =>
  assert.deepStrictEqual([...ALLOWLIST].sort(), ['luxury-bouquets', 'plants', 'same-day-delivery', 'thank-you']));

ok('[adversarial] unexpected handle rejected', () =>
  assert.throws(() => assertAllowed('all-flowers'), /not on the Batch-2 allowlist/));

ok('approved copy within limits + body present', () => {
  for (const a of APPROVED) assert.deepStrictEqual(validateCopy(a), [], a.handle);
});

ok('[adversarial] copy over title limit fails', () =>
  assert.ok(validateCopy({seoTitle: 'x'.repeat(61), seoDescription: 'd', descriptionHtml: '<p>b</p>'}).some((e) => /seo.title 61 > 60/.test(e))));
ok('[adversarial] copy over description limit fails', () =>
  assert.ok(validateCopy({seoTitle: 't', seoDescription: 'x'.repeat(161), descriptionHtml: '<p>b</p>'}).some((e) => /seo.description 161 > 160/.test(e))));

ok('buildInput yields EXACTLY {id, descriptionHtml, seo:{title,description}}', () => {
  const i = buildInput('gid://x', '<p>b</p>', 't', 'd');
  assert.deepStrictEqual(i, {id: 'gid://x', descriptionHtml: '<p>b</p>', seo: {title: 't', description: 'd'}});
  assertInputScope(i);
});
ok('[adversarial] extra top-level payload field rejected', () =>
  assert.throws(() => assertInputScope({id: 'x', descriptionHtml: 'b', seo: {title: 't', description: 'd'}, handle: 'HACK'}), /top keys must be/));
ok('[adversarial] extra seo field rejected', () =>
  assert.throws(() => assertInputScope({id: 'x', descriptionHtml: 'b', seo: {title: 't', description: 'd', keywords: 'HACK'}}), /seo keys must be/));

ok('prereqs PASS for all 4 authoritative fixtures', () => {
  for (const a of APPROVED) {
    const r = checkPrereqs(LIVE.get(a.handle), a);
    assert.deepStrictEqual(r.failures, [], `${a.handle}: ${r.failures}`);
    assert.strictEqual(r.countClass, 'PASS');
  }
});
ok('[adversarial] existing seo.title fails closed', () =>
  assert.ok(checkPrereqs(mk('thank-you', 21, {seo: {title: 'X', description: null}}), APPROVED[2]).failures.some((f) => /seo.title is NOT empty/.test(f))));
ok('[adversarial] existing seo.description fails closed', () =>
  assert.ok(checkPrereqs(mk('thank-you', 21, {seo: {title: null, description: 'X'}}), APPROVED[2]).failures.some((f) => /seo.description is NOT empty/.test(f))));
ok('[adversarial] existing body fails closed', () =>
  assert.ok(checkPrereqs(mk('thank-you', 21, {descriptionHtml: '<p>old</p>'}), APPROVED[2]).failures.some((f) => /descriptionHtml is NOT empty/.test(f))));
ok('[adversarial] wrong publication channel fails closed', () =>
  assert.ok(checkPrereqs(mk('plants', 3, {resourcePublications: {nodes: [{isPublished: true, publication: {name: 'Online Store'}}]}}), APPROVED[1]).failures.some((f) => /not published to/.test(f))));

// Count-drift policy — deterministic thresholds.
ok('count policy: tolerances are 9/3/4/3', () => {
  assert.strictEqual(countTolerance(58), 9);
  assert.strictEqual(countTolerance(3), 3);
  assert.strictEqual(countTolerance(21), 4);
  assert.strictEqual(countTolerance(4), 3);
});
ok('[adversarial] zero products → FAIL_ZERO', () => {
  assert.strictEqual(classifyCount(0, 58), 'FAIL_ZERO');
  assert.ok(checkPrereqs(mk('plants', 0), APPROVED[1]).failures.some((f) => /product count is 0/.test(f)));
});
ok('[adversarial] small drift → WARN (58→64, 21→24)', () => {
  assert.strictEqual(classifyCount(64, 58), 'WARN');
  assert.strictEqual(classifyCount(24, 21), 'WARN');
  const r = checkPrereqs(mk('same-day-delivery', 64), APPROVED[0]);
  assert.deepStrictEqual(r.failures, []);
  assert.strictEqual(r.countClass, 'WARN');
  assert.ok(r.warnings.length === 1);
});
ok('[adversarial] material drift → FAIL_MATERIAL (58→90, 21→40)', () => {
  assert.strictEqual(classifyCount(90, 58), 'FAIL_MATERIAL');
  assert.strictEqual(classifyCount(40, 21), 'FAIL_MATERIAL');
  assert.ok(checkPrereqs(mk('same-day-delivery', 90), APPROVED[0]).failures.some((f) => /material count drift/.test(f)));
});
ok('count policy boundaries: exact=PASS, ±tol=WARN, ±tol+1=FAIL', () => {
  assert.strictEqual(classifyCount(58, 58), 'PASS');
  assert.strictEqual(classifyCount(58 - 9, 58), 'WARN');
  assert.strictEqual(classifyCount(58 + 9, 58), 'WARN');
  assert.strictEqual(classifyCount(58 + 10, 58), 'FAIL_MATERIAL');
});

// Blast-radius diff logic.
ok('changedPaths after a seo+body update = only the 3 allowed paths', () => {
  const before = fingerprint(LIVE.get('plants'));
  const after = fingerprint({...LIVE.get('plants'), descriptionHtml: APPROVED[1].descriptionHtml, seo: {title: APPROVED[1].seoTitle, description: APPROVED[1].seoDescription}, updatedAt: 'LATER'});
  const changed = changedPaths(before, after).sort();
  assert.deepStrictEqual(changed, [...ALLOWED_CHANGE_PATHS].sort());
});
ok('[adversarial] blast-radius: unexpected field change detected (image)', () => {
  const before = fingerprint(LIVE.get('plants'));
  const after = fingerprint({...LIVE.get('plants'), image: {url: 'x', altText: null}});
  assert.ok(changedPaths(before, after).includes('imageUrl'));
});
ok('[adversarial] blast-radius: unexpected non-target collection change detected', () => {
  const before = fingerprint(mk('best-sellers', 30));
  const after = fingerprint(mk('best-sellers', 30, {seo: {title: 'sneaky', description: null}}));
  const changed = changedPaths(before, after);
  assert.ok(changed.includes('seoTitle') && !ALLOWLIST.has('best-sellers'));
});
ok('updatedAt alone is ignored by changedPaths', () => {
  const before = fingerprint(LIVE.get('plants'));
  const after = fingerprint({...LIVE.get('plants'), updatedAt: 'DIFFERENT'});
  assert.deepStrictEqual(changedPaths(before, after), []);
});

// Rollback payload scope.
ok('[adversarial] rollback payload with a forbidden field is rejected', () => {
  const rb = buildInput('gid://x', '', null, null); // restore-to-empty shape is legal…
  assertInputScope(rb);
  assert.throws(() => assertInputScope({...rb, status: 'ACTIVE'}), /top keys must be/); // …+forbidden field is not
});

// Interlock.
ok('write interlock OFF unless all three factors present', () => {
  assert.strictEqual(writeAuthorized([], {}), false);
  assert.strictEqual(writeAuthorized(['--commit'], {}), false);
  assert.strictEqual(writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {}), false);
  assert.strictEqual(writeAuthorized(['--commit'], {TNG_BATCH2_WRITE_AUTH: 'AUTHORIZE BATCH2 COLLECTION CONTENT WRITE'}), false);
  assert.strictEqual(
    writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {TNG_BATCH2_WRITE_AUTH: 'AUTHORIZE BATCH2 COLLECTION CONTENT WRITE'}),
    true,
  );
});

// Simulated dry-run render.
const {plans, allOk} = buildPlan(LIVE);
ok('buildPlan: all prerequisites pass; 4 payloads scoped', () => {
  assert.strictEqual(allOk, true);
  assert.strictEqual(plans.length, 4);
  for (const p of plans) assertInputScope(p.input);
});

console.log('\n── simulated DRY-RUN (fixture = authoritative snapshot) ──');
for (const p of plans) {
  console.log(`  • ${p.handle} (id ${p.id}) count ${p.currentCount}/${p.baseline} → ${p.countClass} · title ${p.after.seoTitle.length}/60 · desc ${p.after.seoDescription.length}/160 · body ${p.after.bodyChars} chars`);
  console.log(`    payload keys ${Object.keys(p.input).sort().join(',')} · seo keys ${Object.keys(p.input.seo).sort().join(',')}`);
}
console.log(`\n  allOk=${allOk} · MUTATIONS SENT: 0 (self-test performs no network I/O)`);
console.log(`\n${process.exitCode ? '✗ SELF-TEST FAILED' : `✓ SELF-TEST PASSED (${pass} checks)`} — no network, no Shopify, no writes.`);
