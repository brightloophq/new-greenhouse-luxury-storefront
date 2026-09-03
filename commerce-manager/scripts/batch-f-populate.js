// batch-f-populate.js — Phase-1 Batch F: populate a retail category collection with EXACTLY
// its evidence-derived candidates. Two independently-authorized targets:
//   F1  --target gift-baskets      (auth TNG_SPRINT_F_GIFT_AUTH)
//   F2  --target tropical-flowers  (auth TNG_SPRINT_F_TROPICAL_AUTH)
// Dry-run by default. Never pads the collection; never adds a wholesale/excluded product.
//
// Mechanism (from the live target ruleSet):
//   • manual collection → collectionAddProducts(id, [productIds])
//   • smart collection  → add ONLY the missing rule TAG(s) to each candidate (tagsAdd, minimal,
//                         full-array backup); a non-tag rule the candidate fails is a BLOCKER
//                         (manual decision — never auto-change productType/title).
//
// Usage:
//   node scripts/batch-f-populate.js --target gift-baskets                 # DRY-RUN
//   node scripts/batch-f-populate.js --target tropical-flowers --live-preview
//   TNG_SPRINT_F_GIFT_AUTH="AUTHORIZE SPRINT F GIFT BASKETS" \
//     node scripts/batch-f-populate.js --target gift-baskets --commit --i-understand-this-writes-to-shopify
//
import {isTrueGiftBasket, isRetailTropical} from './sprint-lib.js';
import {loadState, assertFresh, parseInterlock, backupDir, writeBackup, assertReadOnly, pollForConvergence, hr, bail} from './sprint-io.js';

const TARGETS = {
  'gift-baskets': {env: 'TNG_SPRINT_F_GIFT_AUTH', phrase: 'AUTHORIZE SPRINT F GIFT BASKETS', stateKey: 'giftBaskets', candKey: 'candidates', predicate: isTrueGiftBasket, label: 'F1 Gift Baskets'},
  'tropical-flowers': {env: 'TNG_SPRINT_F_TROPICAL_AUTH', phrase: 'AUTHORIZE SPRINT F TROPICAL FLOWERS', stateKey: 'tropical', candKey: 'retailCandidates', predicate: isRetailTropical, label: 'F2 Tropical Flowers'},
};

const PROD_QUERY = `#graphql
  query F_Prod($handle: String!) { productByHandle(handle: $handle) { id handle title tags productType } }
`;
const COLL_QUERY = `#graphql
  query F_Coll($handle: String!) {
    collectionByHandle(handle: $handle) { id handle productsCount { count } ruleSet { appliedDisjunctively rules { column relation condition } } }
  }
`;
const ADD_PRODUCTS = `#graphql
  mutation F_Add($id: ID!, $productIds: [ID!]!) { collectionAddProducts(id: $id, productIds: $productIds) { collection { id } userErrors { field message } } }
`;
const TAGS_ADD = `#graphql
  mutation F_TagsAdd($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { field message } } }
`;

const lc = (s) => String(s ?? '').toLowerCase();

/** Which tag-type rules a product currently fails (only these are safely fixable by tagsAdd). */
function missingTagRules(product, ruleSet) {
  const rules = ruleSet?.rules || [];
  const missing = [];
  const nonTagFails = [];
  const ptags = (product.tags || []).map(lc);
  for (const r of rules) {
    const col = lc(r.column);
    if (col === 'tag') {
      if (!ptags.includes(lc(r.condition))) missing.push(r.condition);
    } else if (col === 'type' || col === 'product_type') {
      if (lc(product.productType) !== lc(r.condition)) nonTagFails.push(`type != "${r.condition}"`);
    } else {
      nonTagFails.push(`${r.column} ${r.relation} "${r.condition}"`);
    }
  }
  return {missing, nonTagFails};
}

async function main() {
  const argv = process.argv;
  const ti = argv.indexOf('--target');
  const targetHandle = ti >= 0 ? argv[ti + 1] : null;
  const cfg = TARGETS[targetHandle];
  if (!cfg) bail(`--target must be one of: ${Object.keys(TARGETS).join(', ')}`);

  const gate = parseInterlock(argv, cfg.env, cfg.phrase);
  const {state, ageHours, fresh} = loadState();
  console.log(hr(`BATCH ${cfg.label} — populate ${targetHandle}`));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);

  const block = state[cfg.stateKey];
  const coll = state.collections?.[targetHandle];
  if (!coll?.found) bail(`${targetHandle} not found in evidence`);
  const candidates = (block?.[cfg.candKey] || []).filter((c) => !c.alreadyMember);
  const excluded = targetHandle === 'tropical-flowers' ? (block.wholesaleStemsExcluded || []).map((x) => x.handle) : [];

  // safety: no candidate may be an excluded wholesale product
  for (const c of candidates) if (excluded.includes(c.handle)) bail(`SAFETY: candidate ${c.handle} is on the wholesale-excluded list — refuse`);

  const isSmart = coll.isSmart;
  console.log('\n' + hr('PLAN'));
  console.log(`  target: ${targetHandle} id=${coll.id} [${isSmart ? 'SMART' : 'manual'}] rule: ${coll.rule}`);
  console.log(`  live count: ${coll.productsCount} → intended members: ${(block?.[cfg.candKey] || []).length}`);
  console.log(`  candidates to ADD (not already members): ${candidates.length}`);
  for (const c of candidates) console.log(`    + ${c.handle}  (${c.productType})`);
  if (excluded.length) console.log(`  wholesale stems that MUST stay excluded (${excluded.length}): ${excluded.join(', ')}`);
  if (candidates.length === 0) { console.log('\n  nothing to add — already correct.'); return; }

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      console.log('\n' + hr('LIVE PREVIEW (read-only)'));
      const cv = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: targetHandle});
      const rs = cv.collectionByHandle?.ruleSet;
      for (const c of candidates) {
        const d = await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: c.handle});
        const prod = d.productByHandle;
        if (!prod) { console.log(`    ${c.handle}: NOT FOUND live`); continue; }
        if (!cfg.predicate(prod)) bail(`${c.handle}: no longer classifies as a ${targetHandle} member on fresh data — refuse`);
        if (isSmart) {
          const {missing, nonTagFails} = missingTagRules(prod, rs);
          console.log(`    ${c.handle} id=${prod.id}: add tags ${JSON.stringify(missing)}${nonTagFails.length ? ` · BLOCKER non-tag fails: ${nonTagFails.join('; ')}` : ''}`);
        } else {
          console.log(`    ${c.handle} id=${prod.id}: collectionAddProducts`);
        }
      }
    }
    console.log('\n' + hr('DRY-RUN COMPLETE'));
    console.log('  Shopify mutations sent: 0');
    console.log(`  To execute: set ${cfg.env} and pass --commit --i-understand-this-writes-to-shopify`);
    return;
  }

  // ---- LIVE WRITE PATH ----
  assertFresh({fresh, ageHours});
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const cv = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: targetHandle});
  if (cv.collectionByHandle?.id !== coll.id) bail('collection id drift — abort');
  const rs = cv.collectionByHandle.ruleSet;
  const dir = backupDir(`batch-f-${targetHandle}`);

  // resolve + re-classify + backup
  const resolved = [];
  for (const c of candidates) {
    const d = await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: c.handle});
    const prod = d.productByHandle;
    if (!prod) bail(`${c.handle}: not found live — abort`);
    if (!cfg.predicate(prod)) bail(`${c.handle}: fails classification on fresh data — abort`);
    resolved.push(prod);
  }
  await writeBackup(dir, 'candidates.before.json', resolved.map((p) => ({handle: p.handle, id: p.id, tags: p.tags, productType: p.productType})));

  if (isSmart) {
    for (const prod of resolved) {
      const {missing, nonTagFails} = missingTagRules(prod, rs);
      if (nonTagFails.length) bail(`${prod.handle}: smart rule needs non-tag change (${nonTagFails.join('; ')}) — manual decision, refuse to auto-change productType/title`);
      if (!missing.length) { console.log(`  · ${prod.handle}: already matches rule — will appear without change`); continue; }
      const res = await adminGraphQL(TAGS_ADD, {id: prod.id, tags: missing});
      const errs = res.tagsAdd?.userErrors || [];
      if (errs.length) bail(`${prod.handle}: tagsAdd errors ${JSON.stringify(errs)} — STOP`);
      console.log(`  ✓ ${prod.handle}: added tags ${JSON.stringify(missing)}`);
    }
  } else {
    const res = await adminGraphQL(ADD_PRODUCTS, {id: coll.id, productIds: resolved.map((p) => p.id)});
    const errs = res.collectionAddProducts?.userErrors || [];
    if (errs.length) bail(`collectionAddProducts errors ${JSON.stringify(errs)} — STOP`);
    console.log(`  ✓ added ${resolved.length} product(s) to ${targetHandle}`);
  }

  // verify final count == intended (SMART membership may lag → bounded convergence poll)
  const intended = (block?.[cfg.candKey] || []).length;
  const readCount = async () => (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: targetHandle})).collectionByHandle?.productsCount?.count;
  const {converged, attempts, lastValue, history} = await pollForConvergence(readCount, intended, {attempts: 8, baseDelayMs: 1000, maxDelayMs: 8000});
  if (!converged) bail(`${targetHandle}: MEMBERSHIP PROPAGATION TIMEOUT — additions SUCCEEDED, but the collection reports ${lastValue} (want ${intended}) after ${attempts} polls [${history.join(' → ')}]. NOT a mutation failure; re-run the read-only preflight to confirm before any action.`);
  console.log(`  final count: ${lastValue} (intended ${intended}, converged after ${attempts} poll(s))`);
  console.log(`\n  ✓ Batch ${cfg.label} complete. Rollback: remove added tags / collectionRemoveProducts from ${dir}`);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
