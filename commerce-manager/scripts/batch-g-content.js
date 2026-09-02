// batch-g-content.js — Phase-1 Batch G: SEO title + meta description + collection body for the
// TWO collections with fresh gaps ONLY: gift-baskets, tropical-flowers. Dry-run by default.
//
// The five canonical collections already have acceptable SEO/body and are HARD-EXCLUDED here.
// Every SEO write sends BOTH companion fields (assertSeoInputComplete) — the Gate-1 regression
// guard; a title-only / description-only / null-companion payload is rejected before any write.
//
// Usage:
//   node scripts/batch-g-content.js                 # DRY-RUN (0 mutations), prints exact payloads
//   node scripts/batch-g-content.js --live-preview  # DRY-RUN + read-only current-state diff
//   TNG_SPRINT_G_AUTH="AUTHORIZE SPRINT G COLLECTION CONTENT" \
//     node scripts/batch-g-content.js --commit --i-understand-this-writes-to-shopify
//
import {assertSeoInputComplete} from './sprint-lib.js';
import {loadState, assertFresh, parseInterlock, backupDir, writeBackup, assertReadOnly, hr, bail} from './sprint-io.js';

const ENV = 'TNG_SPRINT_G_AUTH';
const PHRASE = 'AUTHORIZE SPRINT G COLLECTION CONTENT';
const ALLOWED = ['gift-baskets', 'tropical-flowers']; // hard allowlist — never the 5 canonicals

// Copy aligned to the ACTUAL resulting membership (Batch F: 1 gift basket, 3 tropical arrangements).
// Kingston/Jamaica context is natural, not stuffed. No delivery guarantees, no opening hours,
// no wedding positioning, no wholesale-stem language on the public Tropical collection.
const CONTENT = {
  'gift-baskets': {
    seo: {
      title: 'Luxury Gift Baskets | The New Greenhouse',
      description:
        'Hand-arranged fruit-and-flower gift baskets from The New Greenhouse, Kingston. A considered, elegant way to send warmth — thoughtfully composed and finished by hand.',
    },
    descriptionHtml:
      '<p>Our gift baskets pair fresh seasonal blooms with carefully chosen fruit, composed by hand at The New Greenhouse in Kingston. Each is arranged to feel generous and refined — a quiet gesture of care for the people who matter.</p>',
  },
  'tropical-flowers': {
    seo: {
      title: 'Tropical Flower Arrangements | The New Greenhouse',
      description:
        'Sculptural tropical arrangements — anthurium, heliconia and bird-of-paradise — designed with an island-modern sensibility by The New Greenhouse in Kingston, Jamaica.',
    },
    descriptionHtml:
      '<p>Bold, architectural and unmistakably island-modern, our tropical arrangements bring together anthurium, heliconia and bird-of-paradise into striking, long-lasting compositions. Designed and finished by hand at The New Greenhouse in Kingston.</p>',
  },
};

const COLL_QUERY = `#graphql
  query G_Coll($handle: String!) {
    collectionByHandle(handle: $handle) { id handle title descriptionHtml seo { title description } }
  }
`;
const COLL_UPDATE = `#graphql
  mutation G_Update($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id handle seo { title description } descriptionHtml }
      userErrors { field message }
    }
  }
`;

/** Build a strictly-scoped collectionUpdate input; assert exact key set. */
function buildInput(id, content) {
  assertSeoInputComplete(content.seo); // exactly {title, description}, both non-null
  const input = {id, seo: {title: content.seo.title, description: content.seo.description}, descriptionHtml: content.descriptionHtml};
  const keys = Object.keys(input).sort().join(',');
  if (keys !== 'descriptionHtml,id,seo') throw new Error(`CollectionInput must be exactly {id, seo, descriptionHtml} — got ${keys}`);
  return input;
}

async function main() {
  const gate = parseInterlock(process.argv, ENV, PHRASE);
  const {state, ageHours, fresh} = loadState();
  console.log(hr('BATCH G — collection SEO + body (gift-baskets, tropical-flowers only)'));
  console.log(gate.report());
  console.log(`  evidence: sprint-state.json (${ageHours.toFixed(1)}h old, fresh=${fresh})`);

  const gaps = new Map((state.seoTargets || []).map((t) => [t.handle, t]));
  const plan = [];
  for (const handle of ALLOWED) {
    const coll = state.collections?.[handle];
    if (!coll?.found) bail(`${handle} not found in evidence`);
    const gap = gaps.get(handle);
    const input = buildInput(coll.id, CONTENT[handle]);
    plan.push({handle, id: coll.id, input, needsSeo: gap?.needsSeo, needsBody: gap?.needsBody});
  }
  // guard: never touch the canonicals
  for (const p of plan) if (!ALLOWED.includes(p.handle)) bail(`allowlist violation: ${p.handle}`);

  console.log('\n' + hr('PLAN (exact payloads)'));
  for (const p of plan) {
    console.log(`\n  ▸ ${p.handle} id=${p.id}  (needsSeo=${p.needsSeo}, needsBody=${p.needsBody})`);
    console.log(`      seo.title       : ${JSON.stringify(p.input.seo.title)}`);
    console.log(`      seo.description : ${JSON.stringify(p.input.seo.description)}`);
    console.log(`      descriptionHtml : ${JSON.stringify(p.input.descriptionHtml)}`);
    console.log(`      input keys      : ${Object.keys(p.input).sort().join(', ')}  (seo carries BOTH companion fields ✓)`);
  }

  if (gate.dryRun) {
    if (gate.livePreview) {
      const {adminGraphQL} = await import('../src/shopify-admin.js');
      console.log('\n' + hr('LIVE PREVIEW (read-only current state)'));
      for (const p of plan) {
        const d = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
        const c = d.collectionByHandle;
        console.log(`    ${p.handle}: current seo.title=${JSON.stringify(c?.seo?.title)} seo.description=${JSON.stringify(c?.seo?.description)} bodyLen=${String(c?.descriptionHtml || '').length}`);
      }
    }
    console.log('\n' + hr('DRY-RUN COMPLETE'));
    console.log('  Shopify mutations sent: 0');
    console.log(`  To execute: set ${ENV} and pass --commit --i-understand-this-writes-to-shopify`);
    return;
  }

  // ---- LIVE WRITE PATH ----
  assertFresh({fresh, ageHours});
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const dir = backupDir('batch-g-content');
  // backup current SEO+body BEFORE any write
  const before = [];
  for (const p of plan) {
    const d = await adminGraphQL(assertReadOnly(COLL_QUERY), {handle: p.handle});
    const c = d.collectionByHandle;
    if (!c) bail(`${p.handle}: not found live — abort`);
    if (c.id !== p.id) bail(`${p.handle}: id drift — abort`);
    before.push({handle: p.handle, id: c.id, seo: c.seo, descriptionHtml: c.descriptionHtml});
  }
  await writeBackup(dir, 'content.before.json', before);

  for (const p of plan) {
    assertSeoInputComplete(p.input.seo); // re-assert immediately before send
    const res = await adminGraphQL(COLL_UPDATE, {input: p.input});
    const errs = res.collectionUpdate?.userErrors || [];
    if (errs.length) bail(`${p.handle}: collectionUpdate errors ${JSON.stringify(errs)} — STOP`);
    const c = res.collectionUpdate?.collection;
    if (c?.seo?.title !== p.input.seo.title || c?.seo?.description !== p.input.seo.description) bail(`${p.handle}: post-write SEO mismatch — STOP`);
    console.log(`  ✓ ${p.handle}: SEO + body written (both companion fields present)`);
  }
  console.log(`\n  ✓ Batch G complete. Rollback: restore seo+descriptionHtml from ${dir}/content.before.json`);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  bail(msg);
});
