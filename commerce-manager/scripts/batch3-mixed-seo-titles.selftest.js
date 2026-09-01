// batch3-mixed-seo-titles.selftest.js — OFFLINE self-test. No network, no Shopify, no writes.
import assert from 'node:assert';
import {
  APPROVED, ALLOWLIST, EXPECTED_CURRENT_SEO_TITLE, assertAllowed, validateNewTitle,
  buildInput, assertInputScope, checkPrereqs, fingerprint, changedPaths, writeAuthorized, buildPlan,
} from './batch3-mixed-seo-titles.js';

let pass = 0;
const ok = (name, fn) => {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
};

// A live product fixture in the real Admin connection shape.
const mk = (handle, over = {}) => ({
  id: `gid://shopify/Product/${handle}`, handle, title: 'Mixed', status: 'ACTIVE', productType: 'Fresh Flowers',
  descriptionHtml: '<p>Mixed stems.</p>', seo: {title: 'Mixed | The New Greenhouse', description: 'A mixed selection.'},
  tags: ['color:mixed', 'flower:tropicals'], variants: {nodes: [{id: 'v1'}]}, images: {nodes: [{id: 'i1'}]},
  metafields: {nodes: []}, resourcePublications: {nodes: [{isPublished: true, publication: {name: 'New Greenhouse Luxury Storefront'}}]},
  ...over,
});
const LIVE = new Map(APPROVED.map((a) => [a.handle, mk(a.handle)]));

console.log('── Batch-3 self-test (offline) ──');

ok('allowlist is exactly the 4 handles', () =>
  assert.deepStrictEqual([...ALLOWLIST].sort(), ['gift-bouquets-mixed', 'greenery-mixed', 'novelties-mixed', 'tropicals-mixed']));

ok('[gate] unexpected handle refused', () => assert.throws(() => assertAllowed('all-flowers'), /not on the Batch-3 allowlist/));

ok('approved titles are unique, <=60, and not the duplicate', () => {
  const seen = new Set();
  for (const a of APPROVED) {
    assert.deepStrictEqual(validateNewTitle(a.newSeoTitle), [], a.handle);
    assert.ok(a.newSeoTitle.length <= 60);
    seen.add(a.newSeoTitle.toLowerCase());
  }
  assert.strictEqual(seen.size, 4);
});
ok('[gate] a still-duplicate new title is rejected', () =>
  assert.ok(validateNewTitle(EXPECTED_CURRENT_SEO_TITLE).some((e) => /still the duplicate/.test(e))));
ok('[gate] an over-60 new title is rejected', () =>
  assert.ok(validateNewTitle('X'.repeat(61)).some((e) => /> 60/.test(e))));

ok('buildInput yields EXACTLY { id, seo:{ title, description } } (description re-supplied)', () => {
  const i = buildInput('gid://x', 'New Title', 'Existing description');
  assert.deepStrictEqual(i, {id: 'gid://x', seo: {title: 'New Title', description: 'Existing description'}});
  assertInputScope(i);
});
ok('[gate] omitting seo.description is REJECTED (the incident cause)', () =>
  assert.throws(() => assertInputScope({id: 'x', seo: {title: 't'}}), /seo keys must be exactly description,title/));
ok('[gate] null seo.description is REJECTED (would null it live)', () =>
  assert.throws(() => assertInputScope({id: 'x', seo: {title: 't', description: null}}), /seo keys must be exactly description,title|must be re-supplied/));
ok('[gate] extra top-level payload field rejected', () =>
  assert.throws(() => assertInputScope({id: 'x', seo: {title: 't', description: 'd'}, tags: ['HACK']}), /top-level keys must be id,seo/));
ok('[gate] extra seo field rejected (keywords)', () =>
  assert.throws(() => assertInputScope({id: 'x', seo: {title: 't', description: 'd', keywords: 'HACK'}}), /seo keys must be exactly description,title/));

ok('prereqs PASS for all 4 authoritative fixtures', () => {
  for (const a of APPROVED) assert.deepStrictEqual(checkPrereqs(LIVE.get(a.handle), a), [], a.handle);
});
ok('[gate] prereq fails closed if current seo.title is NOT the duplicate', () => {
  const live = mk('tropicals-mixed', {seo: {title: 'Already Unique', description: 'x'}});
  assert.ok(checkPrereqs(live, APPROVED[3]).some((f) => /current seo.title .* != expected duplicate/.test(f)));
});
ok('[gate] prereq fails closed if seo.description is null', () => {
  const live = mk('tropicals-mixed', {seo: {title: 'Mixed | The New Greenhouse', description: null}});
  assert.ok(checkPrereqs(live, APPROVED[3]).some((f) => /seo.description is null/.test(f)));
});
ok('[gate] prereq fails closed if product not found', () =>
  assert.ok(checkPrereqs(null, APPROVED[0]).some((f) => /not found/.test(f))));
ok('current duplicate title match is case-insensitive', () => {
  const live = mk('greenery-mixed', {seo: {title: 'mixed | the new greenhouse', description: 'x'}});
  assert.deepStrictEqual(checkPrereqs(live, APPROVED[1]), []);
});

ok('[verify] a seo.title-only change leaves the fingerprint identical (0 changed paths)', () => {
  const before = fingerprint(LIVE.get('tropicals-mixed'));
  const after = fingerprint(mk('tropicals-mixed', {seo: {title: 'Mixed Tropical Flowers | The New Greenhouse', description: 'A mixed selection.'}}));
  assert.deepStrictEqual(changedPaths(before, after), []); // seo.title is deliberately not in the fingerprint
});
ok('[verify] an illegal collateral change (seo.description) is caught', () => {
  const before = fingerprint(LIVE.get('tropicals-mixed'));
  const after = fingerprint(mk('tropicals-mixed', {seo: {title: 'Mixed | The New Greenhouse', description: 'CHANGED'}}));
  assert.ok(changedPaths(before, after).includes('seoDescriptionSha256'));
});
ok('[verify] an illegal collateral change (tags) is caught', () => {
  const before = fingerprint(LIVE.get('tropicals-mixed'));
  const after = fingerprint(mk('tropicals-mixed', {tags: ['color:mixed', 'flower:tropicals', 'SNEAKY']}));
  assert.ok(changedPaths(before, after).includes('tags'));
});

ok('[interlock] write OFF unless all three factors present', () => {
  assert.strictEqual(writeAuthorized([], {}), false);
  assert.strictEqual(writeAuthorized(['--commit'], {}), false);
  assert.strictEqual(writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {}), false);
  assert.strictEqual(writeAuthorized(['--commit'], {TNG_BATCH3_WRITE_AUTH: 'AUTHORIZE BATCH3 MIXED SEO TITLE WRITE'}), false);
  assert.strictEqual(
    writeAuthorized(['--commit', '--i-understand-this-writes-to-shopify'], {TNG_BATCH3_WRITE_AUTH: 'AUTHORIZE BATCH3 MIXED SEO TITLE WRITE'}),
    true,
  );
});

const {plans, allOk} = buildPlan(LIVE);
ok('buildPlan: all prereqs pass; 4 payloads scoped to id+seo.title', () => {
  assert.strictEqual(allOk, true);
  assert.strictEqual(plans.length, 4);
  for (const p of plans) assertInputScope(p.input);
});

console.log('\n── simulated DRY-RUN (fixture) ──');
for (const p of plans) console.log(`  • ${p.handle} (id ${p.id}) "${p.before.seoTitle}" → "${p.after.seoTitle}" (${p.after.seoTitle.length}/60) payload=${JSON.stringify(p.input)}`);
console.log(`\n  allOk=${allOk} · MUTATIONS SENT: 0 (self-test performs no network I/O)`);
console.log(`\n${process.exitCode ? '✗ SELF-TEST FAILED' : `✓ SELF-TEST PASSED (${pass} checks)`} — no network, no Shopify, no writes.`);
