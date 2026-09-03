// batch-e-occasions.js — Phase-1 Batch E: correct membership of the three SMART retail occasion
// collections (birthday, anniversary, love-and-romance). Dry-run by default.
//
// Approved mechanism (from the live preview): TAG-CORRECT. Keep the SMART rules unchanged and
// remove ONLY the relevant occasion classification tag, preserving every unrelated tag.
//
// CROSS-COLLECTION OVERLAP SAFETY (the hazard the live preview exposed): a product targeted by
// more than one collection must receive ONE cumulative product update computed from ONE fresh
// read — never independent stale before/after writes per collection. This script builds a single
// cumulative plan PER UNIQUE PRODUCT (union of approved occasion tags to remove) and sends at
// most one mutation per product.
//
// ALLOWLIST — the only removable tags are occasion:birthday / occasion:anniversary /
// occasion:romance, and only for a product/tag pair present in the fresh validated plan.
// No other tag is ever added, removed, renamed, reordered, or normalized.
//
// Usage:
//   node scripts/batch-e-occasions.js                 # DRY-RUN (0 mutations)
//   node scripts/batch-e-occasions.js --live-preview  # DRY-RUN + read-only exact fresh tags
//   TNG_SPRINT_E_AUTH="AUTHORIZE SPRINT E OCCASION MEMBERSHIP" \
//     node scripts/batch-e-occasions.js --commit --i-understand-this-writes-to-shopify
//
import {
  OCCASION_CANONICAL,
  chooseOccasionMechanism,
  buildCumulativeOccasionRemovalPlan,
  overlapProducts,
  applyCumulativeRemoval,
  REMOVABLE_OCCASION_TAGS,
} from './sprint-lib.js';
import {loadState, assertFresh, parseInterlock, backupDir, writeBackup, assertReadOnly, pollForConvergence, hr, bail} from './sprint-io.js';

const ENV = 'TNG_SPRINT_E_AUTH';
const PHRASE = 'AUTHORIZE SPRINT E OCCASION MEMBERSHIP';
const EXPECTED_INTENDED = {birthday: 16, anniversary: 9, 'love-and-romance': 17};
const EXPECTED_LIVE = {birthday: 27, anniversary: 19, 'love-and-romance': 21};

const PROD_QUERY = `#graphql
  query E_Prod($handle: String!) { productByHandle(handle: $handle) { id handle title tags productType } }
`;
const COLL_QUERY = `#graphql
  query E_Coll($handle: String!) {
    collectionByHandle(handle: $handle) { id handle productsCount { count } ruleSet { appliedDisjunctively rules { column relation condition } } }
  }
`;
const TAGS_REMOVE = `#graphql
  mutation E_TagsRemove($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { field message } } }
`;

/** The single occasion tag a collection's SMART rule keys on. */
function occasionTagOf(ruleSet) {
  const r = (ruleSet?.rules || []).find((x) => String(x.column).toLowerCase() === 'tag' && /^occasion:/i.test(x.condition));
  return r ? r.condition : null;
}
/** A collection's rule must be exactly one TAG = occasion:* rule (what tag-correct assumes). */
function isSingleOccasionTagRule(ruleSet) {
  return !!(ruleSet && ruleSet.appliedDisjunctively !== true && Array.isArray(ruleSet.rules) && ruleSet.rules.length === 1 &&
    String(ruleSet.rules[0].column).toLowerCase() === 'tag' && /^occasion:/i.test(ruleSet.rules[0].condition));
}

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const {state, ageHours, fresh} = loadState();
  console.log(hr('BATCH E — occasion membership correction (tag-correct, overlap-safe)'));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);

  // Assemble per-collection removal sets + confirm mechanism is tag-correct and the rule shape.
  const perCollection = [];
  for (const h of OCCASION_CANONICAL) {
    const occ = state.occasion?.[h];
    const coll = state.collections?.[h];
    if (!occ || !coll?.found) bail(`missing evidence for occasion ${h}`);
    if (occ.toAdd?.length) bail(`Batch E does not auto-add (occasion ${h} toAdd=${occ.toAdd.length}); investigate`);
    const mech = chooseOccasionMechanism(coll.ruleSet, occ.toRemoveReasons || occ.toRemove?.map((x) => ({handle: x})) || []);
    if (mech.mechanism !== 'tag-correct') bail(`Batch E authorized as tag-correct, but ${h} resolves to "${mech.mechanism}" — re-confirm mechanism before proceeding`);
    if (!isSingleOccasionTagRule(coll.ruleSet)) bail(`${h}: rule is not a single occasion TAG rule — tag-correct is unsafe; STOP`);
    if (occ.intendedMemberCount !== EXPECTED_INTENDED[h]) bail(`${h}: intended ${occ.intendedMemberCount} != expected ${EXPECTED_INTENDED[h]} — evidence drift; STOP`);
    perCollection.push({handle: h, occasionTag: occasionTagOf(coll.ruleSet), toRemove: occ.toRemove || [], id: coll.id, ruleSet: coll.ruleSet, liveCount: occ.liveMemberCount});
  }

  // ONE cumulative plan per unique product.
  const cumulative = buildCumulativeOccasionRemovalPlan(perCollection);
  const overlaps = overlapProducts(cumulative);
  const plannedRemovals = perCollection.reduce((n, c) => n + c.toRemove.length, 0);

  console.log('\n' + hr('CUMULATIVE PLAN'));
  console.log(`  planned collection-membership removals: ${plannedRemovals}`);
  console.log(`  UNIQUE products actually mutated       : ${cumulative.length}`);
  console.log(`  overlap products (>1 collection)       : ${overlaps.length}`);
  for (const c of perCollection) console.log(`    ${c.handle}: rule TAG="${c.occasionTag}" · live=${c.liveCount} → intended=${EXPECTED_INTENDED[c.handle]} · remove ${c.toRemove.length}`);

  console.log('\n' + hr('OVERLAP TABLE'));
  if (!overlaps.length) console.log('  (none in evidence)');
  for (const o of overlaps) console.log(`  ${o.handle}  ← ${o.fromCollections.join(' + ')}  ⇒ remove [${o.removeTags.join(', ')}]  (ONE cumulative update)`);

  console.log('\n' + hr('PER-PRODUCT CUMULATIVE REMOVALS'));
  for (const p of cumulative) console.log(`  ${p.handle}: remove [${p.removeTags.join(', ')}]  (from ${p.fromCollections.join(', ')})`);

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      console.log('\n' + hr('LIVE PREVIEW (read-only exact fresh tags)'));
      for (const p of cumulative) {
        const prod = (await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: p.handle})).productByHandle;
        if (!prod) { console.log(`  ${p.handle}: NOT FOUND live`); continue; }
        const {before, after, removed, missing, unrelatedPreserved} = applyCumulativeRemoval(prod.tags, p.removeTags);
        console.log(`  ${p.handle} id=${prod.id}`);
        console.log(`      before: [${before.join(', ')}]`);
        console.log(`      after : [${after.join(', ')}]`);
        console.log(`      remove ${JSON.stringify(removed)}${missing.length ? ` · ⚠ MISSING (drift): ${JSON.stringify(missing)}` : ''} · unrelatedPreserved=${unrelatedPreserved}`);
      }
    }
    console.log('\n' + hr('DRY-RUN COMPLETE'));
    console.log('  Shopify mutations sent: 0');
    console.log(`  To execute: set ${ENV} and pass --commit --i-understand-this-writes-to-shopify`);
    return;
  }

  // ---- LIVE WRITE PATH (cumulative, one mutation per unique product) ----
  assertFresh({fresh, ageHours});
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const dir = backupDir('batch-e-occasions');

  // 1) refresh collections: verify ids, rule shape unchanged, live counts as expected
  for (const c of perCollection) {
    const cv = (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: c.handle})).collectionByHandle;
    if (cv?.id !== c.id) bail(`${c.handle}: live id drift — abort`);
    if (!isSingleOccasionTagRule(cv.ruleSet) || occasionTagOf(cv.ruleSet).toLowerCase() !== c.occasionTag.toLowerCase()) bail(`${c.handle}: SMART rule changed — abort`);
    if (cv.productsCount?.count !== EXPECTED_LIVE[c.handle]) bail(`${c.handle}: live count ${cv.productsCount?.count} != expected ${EXPECTED_LIVE[c.handle]} — drift; STOP before first mutation`);
  }

  // 2) fresh-read every unique product ONCE; verify ids + approved tags present; backup FULL arrays
  const resolved = [];
  for (const p of cumulative) {
    const prod = (await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: p.handle})).productByHandle;
    if (!prod) bail(`${p.handle}: not found live — STOP`);
    const {removed, missing, unrelatedPreserved} = applyCumulativeRemoval(prod.tags, p.removeTags);
    if (missing.length) bail(`${p.handle}: approved removal tag(s) ${JSON.stringify(missing)} not present live — precondition drift; STOP before first mutation`);
    if (!unrelatedPreserved) bail(`${p.handle}: computed change would alter an unrelated tag — STOP`);
    resolved.push({handle: p.handle, id: prod.id, originalTags: prod.tags, removeTags: removed, fromCollections: p.fromCollections});
  }
  await writeBackup(dir, 'tags.before.json', resolved.map((r) => ({handle: r.handle, id: r.id, tags: r.originalTags})));
  console.log(`\n  backup written: ${dir}/tags.before.json (${resolved.length} unique products)`);

  // 3) at most ONE mutation per unique product
  for (const r of resolved) {
    const res = await adminGraphQL(TAGS_REMOVE, {id: r.id, tags: r.removeTags});
    const errs = res.tagsRemove?.userErrors || [];
    if (errs.length) bail(`${r.handle}: tagsRemove errors ${JSON.stringify(errs)} — STOP`);
    // verify this product immediately
    const now = (await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: r.handle})).productByHandle.tags;
    const nowLc = new Set(now.map((t) => t.toLowerCase()));
    for (const t of r.removeTags) if (nowLc.has(t.toLowerCase())) bail(`${r.handle}: ${t} still present after removal — STOP`);
    const expectedAfter = r.originalTags.filter((t) => !r.removeTags.map((x) => x.toLowerCase()).includes(t.toLowerCase()));
    if (now.slice().sort().join('|') !== expectedAfter.slice().sort().join('|')) bail(`${r.handle}: resulting tags != expected (unrelated tag changed) — STOP`);
    console.log(`  ✓ ${r.handle}: removed ${JSON.stringify(r.removeTags)} · ${now.length} tags preserved`);
  }

  // 4) post-write: prove collection counts. SMART membership re-evaluates asynchronously after
  //    a tag mutation, so poll with bounded exponential backoff. A tag mutation that SUCCEEDED
  //    but whose membership has not converged in the window is a PROPAGATION TIMEOUT — reported
  //    distinctly from a mutation failure, and NOT a trigger for rollback on its own.
  console.log('\n' + hr('POST-WRITE VERIFICATION (bounded convergence poll)'));
  const readCount = (h) => async () => (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: h})).collectionByHandle?.productsCount?.count;
  for (const c of perCollection) {
    const target = EXPECTED_INTENDED[c.handle];
    const {converged, attempts, lastValue, history} = await pollForConvergence(readCount(c.handle), target, {attempts: 8, baseDelayMs: 1000, maxDelayMs: 8000});
    if (!converged) {
      bail(`${c.handle}: MEMBERSHIP PROPAGATION TIMEOUT — the tag mutations SUCCEEDED, but the smart collection still reports ${lastValue} (want ${target}) after ${attempts} polls [${history.join(' → ')}]. This is NOT a mutation failure and NOT a rollback trigger. Re-run the read-only preflight to confirm convergence before any further action.`);
    }
    console.log(`  ✓ ${c.handle} = ${lastValue} (converged after ${attempts} poll(s))`);
  }
  console.log(`\n  ✓ Batch E complete. Rollback: for each product in ${dir}/tags.before.json, tagsAdd the removed occasion tags (restores the exact original set).`);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
