// batch-b-retire.js — Phase-1 Batch B: retire the 6 duplicate collections by REVERSIBLE
// UNPUBLISH from the PUBLIC STOREFRONT publications that currently expose them (never delete).
// Dry-run by default; a live write needs the three-part interlock.
//
// PUBLIC storefront for this project is the Hydrogen channel "New Greenhouse Luxury Storefront".
// Retirement removes each duplicate from Hydrogen AND from Online Store where it is currently
// published, resolving publication IDs LIVE by name (never hardcoded). Point of Sale is left
// untouched — this retires obsolete public web handles, not in-store/POS catalogue behavior.
//
// Fail-closed if: the Hydrogen publication cannot be resolved; a target's live publication set
// differs from the evidence; a target is exposed on an unknown publication; a target is not on
// Hydrogen (an Online-Store-only action would not retire it); or a canonical is not live on
// Hydrogen. Mechanism: publishableUnpublish(id, [{publicationId} … only the removed channels]).
//
// Usage:
//   node scripts/batch-b-retire.js                 # DRY-RUN (default, 0 mutations)
//   node scripts/batch-b-retire.js --live-preview  # DRY-RUN + read-only live re-verify + IDs
//   TNG_SPRINT_B_AUTH="AUTHORIZE SPRINT B COLLECTION CONSOLIDATION" \
//     node scripts/batch-b-retire.js --commit --i-understand-this-writes-to-shopify
//
import {
  RETIRE_HANDLES,
  CONSOLIDATION,
  HYDROGEN_PUBLICATION,
  assertSafeToRetire,
  assertCanonicalSurvives,
  buildRetirementPublicationPlan,
  assertRetirementPlanSafe,
  assertCanonicalPublic,
} from './sprint-lib.js';
import {loadState, assertFresh, parseInterlock, backupDir, writeBackup, assertReadOnly, hr, bail} from './sprint-io.js';

const ENV = 'TNG_SPRINT_B_AUTH';
const PHRASE = 'AUTHORIZE SPRINT B COLLECTION CONSOLIDATION';

const PUBS_QUERY = `#graphql
  query B_Pubs { publications(first: 50) { nodes { id name } } }
`;
const COLL_QUERY = `#graphql
  query B_Coll($handle: String!) {
    collectionByHandle(handle: $handle) {
      id handle title
      productsCount { count }
      resourcePublications(first: 25) { nodes { isPublished publication { id name } } }
    }
  }
`;
const UNPUBLISH = `#graphql
  mutation B_Unpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      publishable { ... on Collection { id handle } }
      userErrors { field message }
    }
  }
`;

const nameSet = (arr) => (arr || []).map((x) => String(x).toLowerCase()).sort().join('|');
const livePublished = (c) => (c?.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => ({id: n.publication?.id, name: n.publication?.name}));

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const {state, ageHours, fresh} = loadState();
  console.log(hr('BATCH B — collection retirement (reversible unpublish, Hydrogen-aware)'));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);
  console.log(`  public storefront publication: "${HYDROGEN_PUBLICATION}" · Point of Sale is PROTECTED (never touched)`);

  const scopes = state.scopes?.all || [];
  const canPublish = scopes.includes('write_publications');
  console.log(`  scope write_publications: ${canPublish ? 'GRANTED' : 'NOT granted → BLOCKER for --commit'}`);

  // Build the fail-closed plan from fresh evidence (publication NAMES from the preflight).
  const plan = [];
  for (const handle of RETIRE_HANDLES) {
    const entry = (state.consolidation || []).find((c) => c.retire === handle);
    if (!entry) bail(`no consolidation entry for ${handle} in sprint-state.json`);
    assertSafeToRetire(entry);
    const meta = state.collections?.[handle];
    const canon = state.collections?.[entry.canonical];
    if (!meta?.found) bail(`retire collection ${handle} not found in evidence`);
    if (!canon?.found) bail(`canonical ${entry.canonical} not found in evidence — refuse to orphan`);
    assertCanonicalSurvives(entry.canonical);
    // canonical must be live on the Hydrogen storefront (evidence names; re-verified at commit)
    assertCanonicalPublic(entry.canonical, canon.published);
    // publication plan from evidence names (ids resolved live)
    const pubPlan = buildRetirementPublicationPlan((meta.published || []).map((name) => ({id: '<resolved live>', name})));
    assertRetirementPlanSafe(handle, pubPlan);
    plan.push({handle, id: meta.id, canonical: entry.canonical, canonicalId: canon.id, canonicalCount: entry.canonicalCount, canonicalPublished: canon.published, currentPublished: meta.published, pubPlan, redirect: `/collections/${handle} → /collections/${CONSOLIDATION[handle]}`});
  }
  if (plan.length !== 6 || new Set(plan.map((p) => p.handle)).size !== 6) bail(`allowlist violation: expected exactly 6 targets, got ${plan.length}`);

  console.log('\n' + hr('CANONICAL SAFETY (must stay live on Hydrogen)'));
  for (const p of plan) {
    console.log(`  ${p.canonical}  id=${p.canonicalId} · count=${p.canonicalCount} · published=[${(p.canonicalPublished || []).join(', ')}] · Hydrogen=${(p.canonicalPublished || []).some((n) => n.toLowerCase() === HYDROGEN_PUBLICATION.toLowerCase()) ? '✓' : '✗'}`);
  }

  console.log('\n' + hr('RETIREMENT PLAN (exact per-channel actions)'));
  for (const p of plan) {
    console.log(`  • ${p.handle}  id=${p.id}`);
    console.log(`      currently published: [${(p.currentPublished || []).join(', ')}]`);
    console.log(`      UNPUBLISH from     : ${p.pubPlan.unpublishFrom.map((x) => `${x.name} (${x.kind})`).join(', ')}`);
    console.log(`      LEAVE untouched    : ${p.pubPlan.leaveUntouched.map((x) => x.name).join(', ') || '(none)'}`);
    console.log(`      redirect (Batch C) : ${p.redirect}`);
  }

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      const pubs = await adminGraphQL(assertReadOnly(PUBS_QUERY), {});
      const byName = new Map((pubs.publications?.nodes || []).map((n) => [n.name.toLowerCase(), n]));
      const hydro = byName.get(HYDROGEN_PUBLICATION.toLowerCase());
      console.log('\n' + hr('LIVE PREVIEW (read-only)'));
      console.log(`  resolved publications: ${[...byName.values()].map((n) => n.name).join(', ')}`);
      console.log(`  Hydrogen publication resolvable: ${hydro ? '✓ ' + hydro.id : '✗ MISSING → BLOCKER'}`);
      for (const p of plan) {
        const c = (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle})).collectionByHandle;
        const cur = livePublished(c);
        const drift = nameSet(cur.map((x) => x.name)) !== nameSet(p.currentPublished);
        const livePlan = buildRetirementPublicationPlan(cur);
        console.log(`  ${p.handle}: live id=${c?.id} matches=${c?.id === p.id} · published=[${cur.map((x) => x.name).join(', ')}]${drift ? ' ⚠ DRIFT vs evidence' : ''}`);
        console.log(`      → would unpublish (live ids): ${livePlan.unpublishFrom.map((x) => `${x.name}=${x.id}`).join(', ')} · leave: ${livePlan.leaveUntouched.map((x) => x.name).join(', ') || '(none)'} · unknown: ${livePlan.unknown.map((x) => x.name).join(', ') || '(none)'}`);
      }
    }
    console.log('\n' + hr('DRY-RUN COMPLETE'));
    console.log('  Shopify mutations sent: 0');
    console.log(`  To execute: set ${ENV} and pass --commit --i-understand-this-writes-to-shopify`);
    if (!canPublish) console.log('  BLOCKER: write_publications scope must be granted before --commit can unpublish.');
    return;
  }

  // ---- LIVE WRITE PATH ----
  assertFresh({fresh, ageHours});
  if (!canPublish) bail('write_publications scope not granted — cannot unpublish. Aborting before any write.');
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const pubs = await adminGraphQL(assertReadOnly(PUBS_QUERY), {});
  const byName = new Map((pubs.publications?.nodes || []).map((n) => [n.name.toLowerCase(), n]));
  if (!byName.get(HYDROGEN_PUBLICATION.toLowerCase())) bail(`Hydrogen publication "${HYDROGEN_PUBLICATION}" could not be resolved — abort`);

  const dir = backupDir('batch-b-retire');
  const backup = [];
  const live = [];
  // fresh re-verify + build live plan + backup BEFORE any write
  for (const p of plan) {
    const c = (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle})).collectionByHandle;
    if (!c) bail(`live re-read failed for ${p.handle}`);
    if (c.id !== p.id) bail(`live id drift for ${p.handle}: ${c.id} != ${p.id} — abort`);
    const cur = livePublished(c);
    if (nameSet(cur.map((x) => x.name)) !== nameSet(p.currentPublished)) bail(`${p.handle}: live publication state differs from evidence — re-run preflight; abort`);
    // canonical re-verify on Hydrogen
    const canon = (await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.canonical})).collectionByHandle;
    assertCanonicalPublic(p.canonical, livePublished(canon).map((x) => x.name));
    const livePlan = buildRetirementPublicationPlan(cur);
    assertRetirementPlanSafe(p.handle, livePlan);
    live.push({...p, livePlan, liveId: c.id});
    backup.push({handle: p.handle, id: c.id, removedPublications: livePlan.unpublishFrom.map((x) => ({id: x.id, name: x.name})), leftUntouched: livePlan.leaveUntouched.map((x) => ({id: x.id, name: x.name}))});
  }
  await writeBackup(dir, 'publication-state.before.json', backup);
  console.log(`\n  backup written: ${dir}/publication-state.before.json`);

  for (const p of live) {
    const input = p.livePlan.unpublishFrom.map((x) => ({publicationId: x.id}));
    const res = await adminGraphQL(UNPUBLISH, {id: p.liveId, input});
    const errs = res.publishableUnpublish?.userErrors || [];
    if (errs.length) bail(`${p.handle}: userErrors ${JSON.stringify(errs)} — STOP`);
    // verify: no longer published to any removed channel; protected channels still present
    const after = livePublished((await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle})).collectionByHandle);
    const afterNames = after.map((x) => x.name.toLowerCase());
    for (const removed of p.livePlan.unpublishFrom) if (afterNames.includes(removed.name.toLowerCase())) bail(`${p.handle}: still published to ${removed.name} after unpublish — STOP`);
    for (const kept of p.livePlan.leaveUntouched) if (!afterNames.includes(kept.name.toLowerCase())) bail(`${p.handle}: protected channel ${kept.name} was removed — STOP`);
    console.log(`  ✓ retired ${p.handle}: removed [${p.livePlan.unpublishFrom.map((x) => x.name).join(', ')}]; kept [${p.livePlan.leaveUntouched.map((x) => x.name).join(', ') || 'none'}]`);
  }
  console.log(`\n  ✓ Batch B complete. Rollback: publishablePublish each id to EXACTLY the ids in ${dir}/publication-state.before.json → removedPublications`);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
