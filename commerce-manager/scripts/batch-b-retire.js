// batch-b-retire.js — Phase-1 Batch B: retire the 6 duplicate collections by REVERSIBLE
// UNPUBLISH (never delete). Dry-run by default; a live write needs the three-part interlock.
//
// Mechanism: publishableUnpublish(collectionId, [{publicationId: <Online Store>}]) removes the
// duplicate from the storefront while keeping the collection (fully reversible via
// publishablePublish). Products are untouched; canonicals are untouched.
//
// Data-driven: reads catalog/live-audit/sprint-state.json (fresh preflight) for exact live IDs
// and safeToRetire/onlyInRetire; the --commit path additionally re-reads each target live.
//
// Usage:
//   node scripts/batch-b-retire.js                 # DRY-RUN (default, 0 mutations)
//   node scripts/batch-b-retire.js --live-preview  # DRY-RUN + read-only live re-verify
//   TNG_SPRINT_B_AUTH="AUTHORIZE SPRINT B COLLECTION CONSOLIDATION" \
//     node scripts/batch-b-retire.js --commit --i-understand-this-writes-to-shopify
//
import {RETIRE_HANDLES, CONSOLIDATION, assertSafeToRetire, assertCanonicalSurvives} from './sprint-lib.js';
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

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const {state, ageHours, fresh} = loadState();
  console.log(hr('BATCH B — collection retirement (reversible unpublish)'));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);

  // scope precondition — unpublishing needs write_publications
  const scopes = state.scopes?.all || [];
  const canPublish = scopes.includes('write_publications');
  console.log(`  scope write_publications: ${canPublish ? 'GRANTED' : 'NOT granted → BLOCKER for --commit'}`);

  // build fail-closed plan from fresh evidence
  const plan = [];
  for (const handle of RETIRE_HANDLES) {
    const entry = (state.consolidation || []).find((c) => c.retire === handle);
    if (!entry) bail(`no consolidation entry for ${handle} in sprint-state.json`);
    assertSafeToRetire(entry); // throws unless provably safe & reversible
    const meta = state.collections?.[handle];
    const canon = state.collections?.[entry.canonical];
    if (!meta?.found) bail(`retire collection ${handle} not found in evidence`);
    if (!canon?.found) bail(`canonical ${entry.canonical} not found in evidence — refuse to orphan`);
    assertCanonicalSurvives(entry.canonical);
    plan.push({
      handle,
      id: meta.id,
      canonical: entry.canonical,
      canonicalId: canon.id,
      retireCount: entry.retireCount,
      canonicalCount: entry.canonicalCount,
      onlyInRetire: entry.productsOnlyInRetire.length,
      published: meta.published,
      redirect: `/collections/${handle} → /collections/${CONSOLIDATION[handle]}`,
    });
  }
  // hard allowlist: exactly the 6, no more, no fewer
  if (plan.length !== 6 || new Set(plan.map((p) => p.handle)).size !== 6) bail(`allowlist violation: expected exactly 6 targets, got ${plan.length}`);

  console.log('\n' + hr('PLAN (exact targets)'));
  for (const p of plan) {
    console.log(`  • ${p.handle}  id=${p.id}`);
    console.log(`      retire count=${p.retireCount} · canonical ${p.canonical}(${p.canonicalCount}) id=${p.canonicalId} · onlyInRetire=${p.onlyInRetire}`);
    console.log(`      currently published to: ${(p.published || []).join(', ') || '(none)'}`);
    console.log(`      redirect (Batch C): ${p.redirect}`);
    console.log(`      action: publishableUnpublish(id, [{publicationId: <Online Store>}])  [reversible]`);
  }

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      console.log('\n' + hr('LIVE RE-VERIFY (read-only)'));
      for (const p of plan) {
        const d = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
        const c = d.collectionByHandle;
        const pub = (c?.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name);
        console.log(`  ${p.handle}: live id=${c?.id} matches=${c?.id === p.id} · published=${pub.join(', ') || '(none)'} · count=${c?.productsCount?.count}`);
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
  const online = (pubs.publications?.nodes || []).find((n) => /online store/i.test(n.name));
  if (!online) bail('Online Store publication not found — aborting.');

  const dir = backupDir('batch-b-retire');
  const backup = [];
  // fresh re-verify + backup BEFORE any write
  for (const p of plan) {
    const d = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
    const c = d.collectionByHandle;
    if (!c) bail(`live re-read failed for ${p.handle}`);
    if (c.id !== p.id) bail(`live id drift for ${p.handle}: ${c.id} != ${p.id} — abort`);
    const pubNames = (c.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => ({id: n.publication?.id, name: n.publication?.name}));
    backup.push({handle: p.handle, id: c.id, publications: pubNames});
  }
  await writeBackup(dir, 'publication-state.before.json', backup);
  console.log(`\n  backup written: ${dir}/publication-state.before.json`);

  // sequential, fail-closed unpublish
  for (const p of plan) {
    const res = await adminGraphQL(UNPUBLISH, {id: p.id, input: [{publicationId: online.id}]});
    const errs = res.publishableUnpublish?.userErrors || [];
    if (errs.length) bail(`${p.handle}: userErrors ${JSON.stringify(errs)} — STOP`);
    // verify no longer published to online store
    const v = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
    const stillOnline = (v.collectionByHandle?.resourcePublications?.nodes || []).some((n) => n.isPublished && /online store/i.test(n.publication?.name || ''));
    if (stillOnline) bail(`${p.handle}: still published to Online Store after unpublish — STOP`);
    console.log(`  ✓ retired ${p.handle} (unpublished from Online Store)`);
  }
  console.log('\n  ✓ Batch B complete. Rollback: publishablePublish each id to the channels in publication-state.before.json');
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
