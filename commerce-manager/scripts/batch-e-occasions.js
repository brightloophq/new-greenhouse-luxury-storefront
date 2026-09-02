// batch-e-occasions.js — Phase-1 Batch E: correct membership of the three SMART retail
// occasion collections (birthday, anniversary, love-and-romance). Dry-run by default.
//
// These are SMART collections, so membership is derived from a rule/tags — you cannot use
// collectionRemoveProducts. The script selects the SMALLEST SAFE mechanism from the LIVE
// ruleSet (chooseOccasionMechanism in sprint-lib):
//   • rule-tighten  — add one AND-clause `TAG = channel:retail` (0 product-tag changes) when
//                     every removal is excluded solely for not being retail; OR
//   • tag-correct   — remove ONLY the single matching occasion tag from each wrong product,
//                     preserving every unrelated tag (full arrays backed up).
// Never removes legitimate multi-occasion membership; never lets wholesale/wedding/add-ons
// into a public retail occasion collection; never adds add-ons automatically.
//
// Usage:
//   node scripts/batch-e-occasions.js                 # DRY-RUN (0 mutations)
//   node scripts/batch-e-occasions.js --live-preview  # DRY-RUN + read-only exact tags/IDs
//   TNG_SPRINT_E_AUTH="AUTHORIZE SPRINT E OCCASION MEMBERSHIP" \
//     node scripts/batch-e-occasions.js --commit --i-understand-this-writes-to-shopify
//
import {OCCASION_CANONICAL, chooseOccasionMechanism, minimalOccasionTagRemoval} from './sprint-lib.js';
import {loadState, assertFresh, parseInterlock, backupDir, writeBackup, assertReadOnly, hr, bail} from './sprint-io.js';

const ENV = 'TNG_SPRINT_E_AUTH';
const PHRASE = 'AUTHORIZE SPRINT E OCCASION MEMBERSHIP';

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
const COLL_UPDATE = `#graphql
  mutation E_CollUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) { collection { id handle ruleSet { appliedDisjunctively rules { column relation condition } } } userErrors { field message } }
  }
`;

/** The occasion tag the rule keys on (single tag-equals rule). */
function occasionTagOf(ruleSet) {
  const r = (ruleSet?.rules || []).find((x) => String(x.column).toLowerCase() === 'tag' && /^occasion:/i.test(x.condition));
  return r ? r.condition : null;
}

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const {state, ageHours, fresh} = loadState();
  console.log(hr('BATCH E — retail occasion membership correction (smart collections)'));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);

  const plans = [];
  for (const h of OCCASION_CANONICAL) {
    const occ = state.occasion?.[h];
    const coll = state.collections?.[h];
    if (!occ || !coll?.found) bail(`missing evidence for occasion ${h}`);
    if (occ.toAdd?.length) bail(`Batch E does not auto-add (occasion ${h} toAdd=${occ.toAdd.length}); investigate before proceeding`);
    const ruleSet = coll.ruleSet;
    const mech = chooseOccasionMechanism(ruleSet, occ.toRemoveReasons || occ.toRemove?.map((x) => ({handle: x})) || []);
    const occTag = occasionTagOf(ruleSet);
    plans.push({
      handle: h,
      id: coll.id,
      isSmart: coll.isSmart,
      rule: coll.rule,
      ruleSet,
      liveCount: occ.liveMemberCount,
      intended: occ.intendedMemberCount,
      toRemove: occ.toRemove || [],
      reasons: occ.toRemoveReasons || [],
      mechanism: mech,
      occasionTag: occTag,
    });
  }

  console.log('\n' + hr('PLAN (per collection)'));
  for (const p of plans) {
    console.log(`\n  ▸ ${p.handle}  id=${p.id}  [${p.isSmart ? 'SMART' : 'manual'}]`);
    console.log(`      rule: ${p.rule}`);
    console.log(`      membership: live=${p.liveCount} → intended=${p.intended}  (remove ${p.toRemove.length}, add 0)`);
    console.log(`      mechanism: ${p.mechanism.mechanism} — ${p.mechanism.reason}`);
    console.log(`      blast radius: ${JSON.stringify(p.mechanism.blastRadius || {})}`);
    if (p.mechanism.mechanism === 'rule-tighten') {
      console.log(`      proposed rule change: ADD AND-clause ${JSON.stringify(p.mechanism.addRule)} (touches 0 product tags)`);
    } else if (p.mechanism.mechanism === 'tag-correct') {
      console.log(`      occasion tag to remove per product: ${p.occasionTag || '(UNKNOWN — rule not single occasion tag; BLOCKER)'}`);
    }
    console.log(`      affected products (remove) — ${p.toRemove.length}:`);
    for (const r of p.reasons) {
      const why = [r.wedding && 'wedding', r.addOn && 'add-on', r.notRetailMember && 'not-retail-member'].filter(Boolean).join(', ') || 'not a retail occasion member';
      const change = p.mechanism.mechanism === 'rule-tighten' ? 'excluded by tightened rule (tag unchanged)' : `remove tag "${p.occasionTag}" (preserve all others)`;
      console.log(`        - ${r.handle}: reason=${why} → ${change}`);
    }
  }

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      console.log('\n' + hr('LIVE PREVIEW (read-only exact tags)'));
      for (const p of plans) {
        for (const r of p.reasons) {
          const d = await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: r.handle});
          const prod = d.productByHandle;
          if (!prod) { console.log(`        ${r.handle}: NOT FOUND live`); continue; }
          if (p.mechanism.mechanism === 'tag-correct' && p.occasionTag) {
            const {before, after, removed, unrelatedPreserved} = minimalOccasionTagRemoval(prod.tags, p.occasionTag);
            console.log(`        ${r.handle} id=${prod.id}\n            before: [${before.join(', ')}]\n            after : [${after.join(', ')}]  (removed ${JSON.stringify(removed)}, unrelatedPreserved=${unrelatedPreserved})`);
          } else {
            console.log(`        ${r.handle} id=${prod.id} tags=[${prod.tags.join(', ')}] (rule-tighten: no tag change)`);
          }
        }
      }
    }
    console.log('\n' + hr('DRY-RUN COMPLETE'));
    console.log('  Shopify mutations sent: 0');
    const anyUnknown = plans.some((p) => p.mechanism.mechanism === 'tag-correct' && !p.occasionTag);
    if (anyUnknown) console.log('  BLOCKER: a tag-correct collection has no single occasion-tag rule — resolve mechanism before --commit.');
    console.log(`  To execute: set ${ENV} and pass --commit --i-understand-this-writes-to-shopify`);
    return;
  }

  // ---- LIVE WRITE PATH ----
  assertFresh({fresh, ageHours});
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const dir = backupDir('batch-e-occasions');

  for (const p of plans) {
    // re-verify collection id + rule live
    const cv = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
    if (cv.collectionByHandle?.id !== p.id) bail(`${p.handle}: live id drift — abort`);

    if (p.mechanism.mechanism === 'rule-tighten') {
      const original = cv.collectionByHandle.ruleSet;
      await writeBackup(dir, `ruleset.${p.handle}.before.json`, {handle: p.handle, id: p.id, ruleSet: original});
      const newRules = [...original.rules.map((r) => ({column: r.column, relation: r.relation, condition: r.condition})), {column: 'TAG', relation: 'EQUALS', condition: 'channel:retail'}];
      const res = await adminGraphQL(COLL_UPDATE, {input: {id: p.id, ruleSet: {appliedDisjunctively: original.appliedDisjunctively, rules: newRules}}});
      const errs = res.collectionUpdate?.userErrors || [];
      if (errs.length) bail(`${p.handle}: collectionUpdate errors ${JSON.stringify(errs)} — STOP`);
      // verify member count == intended
      const after = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
      const cnt = after.collectionByHandle?.productsCount?.count;
      if (cnt !== p.intended) bail(`${p.handle}: after rule-tighten count=${cnt} != intended ${p.intended} — STOP (rollback ruleset from backup)`);
      console.log(`  ✓ ${p.handle}: rule tightened, membership ${p.liveCount} → ${cnt}`);
    } else if (p.mechanism.mechanism === 'tag-correct') {
      if (!p.occasionTag) bail(`${p.handle}: no occasion tag resolved — abort`);
      const before = [];
      // backup full tag arrays first
      for (const r of p.reasons) {
        const d = await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: r.handle});
        if (!d.productByHandle) bail(`${r.handle}: not found live — abort`);
        before.push({handle: r.handle, id: d.productByHandle.id, tags: d.productByHandle.tags});
      }
      await writeBackup(dir, `tags.${p.handle}.before.json`, before);
      for (const b of before) {
        const {removed, after: expectedAfter, unrelatedPreserved} = minimalOccasionTagRemoval(b.tags, p.occasionTag);
        if (!removed.length) { console.log(`  · ${b.handle}: tag ${p.occasionTag} already absent — skip`); continue; }
        if (!unrelatedPreserved) bail(`${b.handle}: refusing — computed change would touch unrelated tags`);
        const res = await adminGraphQL(TAGS_REMOVE, {id: b.id, tags: removed});
        const errs = res.tagsRemove?.userErrors || [];
        if (errs.length) bail(`${b.handle}: tagsRemove errors ${JSON.stringify(errs)} — STOP`);
        // verify exact resulting tags
        const v = await adminGraphQL(assertReadOnly(PROD_QUERY), {handle: b.handle});
        const now = v.productByHandle.tags;
        if (now.map((t) => t.toLowerCase()).includes(p.occasionTag.toLowerCase())) bail(`${b.handle}: tag still present after removal — STOP`);
        if (now.slice().sort().join('|') !== expectedAfter.slice().sort().join('|')) bail(`${b.handle}: resulting tags != expected (unrelated tag changed) — STOP`);
        console.log(`  ✓ ${b.handle}: removed ${JSON.stringify(removed)}, ${now.length} tags preserved`);
      }
    } else {
      bail(`${p.handle}: unsupported mechanism ${p.mechanism.mechanism} — resolve manually`);
    }
  }
  console.log(`\n  ✓ Batch E complete. Rollback: restore ruleset/tags from ${dir}`);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
