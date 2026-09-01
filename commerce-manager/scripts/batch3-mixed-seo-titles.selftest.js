// batch3-mixed-seo-titles.selftest.js — OFFLINE self-test. No network, no Shopify, no writes.
import assert from 'node:assert';
import {
  APPROVED, ALLOWLIST, EXPECTED_CURRENT_SEO_TITLE, assertAllowed, validateNewTitle,
  buildInput, assertInputScope, checkPrereqs, fingerprint, changedPaths, writeAuthorized, buildPlan,
  repairAuthorized, structuralBackupOk, checkRepairPrereqs, buildRepairPlan,
  hasRepairFlag, assertNormalRoutingAllowed,
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

/* ---------------------------- incident regression tests (REPAIR mode) ---------------------- */
// Damaged live state: approved unique title present, seo.description NULLED.
const damaged = (handle) => mk(handle, {
  seo: {title: APPROVED.find((a) => a.handle === handle).newSeoTitle, description: null},
});
const DAMAGED = new Map(APPROVED.map((a) => [a.handle, damaged(a.handle)]));
// A structurally valid backup: original duplicate title + non-null description.
const BACKUP = new Map(APPROVED.map((a) => [a.handle, {
  handle: a.handle, id: `gid://shopify/Product/${a.handle}`,
  seo: {title: 'Mixed | The New Greenhouse', description: `Original ${a.handle} description.`},
}]));
const backupArr = [...BACKUP.values()];

ok('[incident 1] title-only SEOInput is rejected by the writer', () =>
  assert.throws(() => assertInputScope({id: 'x', seo: {title: 't'}}), /seo keys must be exactly description,title/));
ok('[incident 2] repair payload cannot omit description', () => {
  const {plans: rp} = buildRepairPlan(DAMAGED, BACKUP);
  for (const p of rp) assert.ok('description' in p.input.seo);
});
ok('[incident 3] repair payload cannot use null description', () =>
  assert.throws(() => assertInputScope(buildInput('gid://x', 'T', null)), /description,title|must be re-supplied/));
ok('[incident 4] repair refuses wrong current title', () => {
  const live = new Map([['tropicals-mixed', mk('tropicals-mixed', {seo: {title: 'Wrong Title', description: null}})]]);
  const fails = checkRepairPrereqs(live.get('tropicals-mixed'), BACKUP.get('tropicals-mixed'), APPROVED[3]);
  assert.ok(fails.some((f) => /current seo.title .* != approved unique/.test(f)));
});
ok('[incident 5] repair refuses non-null current description', () => {
  const live = mk('tropicals-mixed', {seo: {title: APPROVED[3].newSeoTitle, description: 'still here'}});
  assert.ok(checkRepairPrereqs(live, BACKUP.get('tropicals-mixed'), APPROVED[3]).some((f) => /current seo.description is NOT null/.test(f)));
});
ok('[incident 6] repair refuses live/backup ID mismatch', () => {
  const live = mk('tropicals-mixed', {id: 'gid://shopify/Product/DIFFERENT', seo: {title: APPROVED[3].newSeoTitle, description: null}});
  assert.ok(checkRepairPrereqs(live, BACKUP.get('tropicals-mixed'), APPROVED[3]).some((f) => /live id .* != backup id/.test(f)));
});
ok('[incident 7] repair refuses incomplete/invalid backup', () => {
  assert.strictEqual(structuralBackupOk(backupArr), true);
  assert.strictEqual(structuralBackupOk(backupArr.slice(0, 3)), false); // only 3 entries
  assert.strictEqual(structuralBackupOk([...backupArr.slice(0, 3), {handle: 'tropicals-mixed', id: 'x', seo: {title: 'Mixed | The New Greenhouse'}}]), false); // missing description
});
ok('[incident 8] repair dry-run plan is valid and sends nothing (pure)', () => {
  const {plans: rp, allOk: rok} = buildRepairPlan(DAMAGED, BACKUP);
  assert.strictEqual(rok, true);
  assert.strictEqual(rp.length, 4);
  for (const p of rp) {
    assertInputScope(p.input);
    assert.strictEqual(p.input.seo.title, APPROVED.find((a) => a.handle === p.handle).newSeoTitle);
    assert.strictEqual(p.input.seo.description, BACKUP.get(p.handle).seo.description);
  }
});
ok('[incident 9] normal-write and repair auth vars are independent', () => {
  const argv = ['--commit', '--i-understand-this-writes-to-shopify'];
  // write auth alone does NOT authorize repair
  assert.strictEqual(repairAuthorized(argv, {TNG_BATCH3_WRITE_AUTH: 'AUTHORIZE BATCH3 MIXED SEO TITLE WRITE'}), false);
  // repair auth alone does NOT authorize normal write
  assert.strictEqual(writeAuthorized(argv, {TNG_BATCH3_REPAIR_AUTH: 'AUTHORIZE BATCH3 SEO DESCRIPTION REPAIR'}), false);
  // each only fires with its own phrase
  assert.strictEqual(repairAuthorized(argv, {TNG_BATCH3_REPAIR_AUTH: 'AUTHORIZE BATCH3 SEO DESCRIPTION REPAIR'}), true);
  assert.strictEqual(writeAuthorized(argv, {TNG_BATCH3_WRITE_AUTH: 'AUTHORIZE BATCH3 MIXED SEO TITLE WRITE'}), true);
});
ok('[routing] normal path is blocked when --repair is present', () => {
  assert.strictEqual(hasRepairFlag(['--repair', 'dir']), true);
  assert.strictEqual(hasRepairFlag(['--commit']), false);
  assert.throws(() => assertNormalRoutingAllowed(['--repair', 'dir', '--commit']), /ROUTING BUG/);
  assert.doesNotThrow(() => assertNormalRoutingAllowed(['--commit', '--i-understand-this-writes-to-shopify']));
});
ok('[routing] repair with live seo.description=null sources description from BACKUP, not live', () => {
  const {plans: rp, allOk: rok} = buildRepairPlan(DAMAGED, BACKUP); // DAMAGED has live description null
  assert.strictEqual(rok, true);
  for (const p of rp) {
    assert.strictEqual(p.before.seoDescription, null); // live is null (damaged)
    assert.strictEqual(p.input.seo.description, BACKUP.get(p.handle).seo.description); // payload uses backup
    assert.notStrictEqual(p.input.seo.description, null);
  }
});
ok('[incident 10] rollback input restores BOTH original seo.title and description', () => {
  const b = BACKUP.get('greenery-mixed');
  const input = buildInput(b.id, b.seo.title, b.seo.description); // mirrors rollback()
  assertInputScope(input);
  assert.deepStrictEqual(input, {id: b.id, seo: {title: 'Mixed | The New Greenhouse', description: 'Original greenery-mixed description.'}});
});

console.log('\n── simulated DRY-RUN (fixture) ──');
for (const p of plans) console.log(`  • ${p.handle} (id ${p.id}) "${p.before.seoTitle}" → "${p.after.seoTitle}" (${p.after.seoTitle.length}/60) payload=${JSON.stringify(p.input)}`);
console.log(`\n  allOk=${allOk} · MUTATIONS SENT: 0 (self-test performs no network I/O)`);
console.log(`\n${process.exitCode ? '✗ SELF-TEST FAILED' : `✓ SELF-TEST PASSED (${pass} checks)`} — no network, no Shopify, no writes.`);
