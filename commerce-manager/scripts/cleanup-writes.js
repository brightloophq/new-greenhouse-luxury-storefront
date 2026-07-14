// Gated cleanup writes (DRY-RUN default; --commit to write). Rollback manifest.
//  A) Retire 5 wedding products  -> status DRAFT + unpublish (no wedding service)
//  B) De-leak 10 supplies        -> strip color:* tags (leave channel:wholesale)
//  C) Unpublish wedding-events CMS page
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const COMMIT = process.argv.includes('--commit');
const ts = process.env.NOW_TS || 'manual';
const ue = (o) => (o?.userErrors || []).map((e) => e.message).join('; ');

const WEDDING = ['bridesmaid-bouquet','bridal-bouquet-cascading-blush','bridal-bouquet-ivory-garden','elevated-reception-centerpiece','low-reception-centerpiece'];
const SUPPLIES = ['wet-floral-foam-bricks','glass-cylinder-vase','bud-vase-set','satin-ribbon','organza-ribbon','kraft-cellophane-wrap','woven-arrangement-basket','floral-stem-tape','florist-shears-snips','bouquet-presentation-boxes'];
const WEDDING_PAGE_ID = 'gid://shopify/Page/122876133555';

const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{ id handle status tags
    resourcePublications(first:20){ nodes{ isPublished publication{ id name } } } } } }`;
const PRODUCT_UPDATE = `#graphql
  mutation($input:ProductInput!){ productUpdate(input:$input){ product{ id } userErrors{ field message } } }`;
const UNPUBLISH = `#graphql
  mutation($id:ID!, $input:[PublicationInput!]!){ publishableUnpublish(id:$id, input:$input){ userErrors{ field message } } }`;
const PAGE = `#graphql
  query($id:ID!){ page(id:$id){ id handle title isPublished } }`;
const PAGE_UPDATE = `#graphql
  mutation($id:ID!, $page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ page{ id isPublished } userErrors{ field message } } }`;

const byHandle = async (h) => (await adminGraphQL(BY_HANDLE, {q: `handle:${h}`})).products.nodes[0] || null;

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  CLEANUP WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  console.log('════════════════════════════════════════════════════════════');
  const rollback = {wedding: {}, supplies: {}, page: {}};

  // Gather state
  const wedding = [];
  for (const h of WEDDING) {
    const p = await byHandle(h); if (!p) { console.log(`  ! wedding ${h} NOT FOUND`); continue; }
    const pubs = p.resourcePublications.nodes.filter((n) => n.isPublished).map((n) => n.publication);
    rollback.wedding[h] = {id: p.id, status: p.status, publications: pubs.map((x) => x.name)};
    wedding.push({h, id: p.id, status: p.status, pubIds: pubs.map((x) => x.id)});
  }
  const supplies = [];
  for (const h of SUPPLIES) {
    const p = await byHandle(h); if (!p) { console.log(`  ! supply ${h} NOT FOUND`); continue; }
    const colorTags = p.tags.filter((t) => /^color:/i.test(t));
    rollback.supplies[h] = {id: p.id, tags: p.tags};
    if (colorTags.length) supplies.push({h, id: p.id, newTags: p.tags.filter((t) => !/^color:/i.test(t)), removed: colorTags});
  }
  const pg = (await adminGraphQL(PAGE, {id: WEDDING_PAGE_ID})).page;
  rollback.page = {id: pg?.id, isPublished: pg?.isPublished};

  console.log(`\n  A) retire wedding products: ${wedding.map((w) => `${w.h}[${w.status}→DRAFT, ${w.pubIds.length} chan]`).join(', ')}`);
  console.log(`  B) de-leak supplies: ${supplies.map((s) => `${s.h}(-${s.removed.join(',')})`).join('; ') || 'none'}`);
  console.log(`  C) unpublish page: ${pg?.handle} published:${pg?.isPublished}`);

  mkdirSync(join(CM, 'rollback'), {recursive: true});
  const rbPath = join(CM, 'rollback', `cleanup-${ts}.json`);
  writeFileSync(rbPath, JSON.stringify(rollback, null, 2));
  console.log(`\n  rollback → ${rbPath}`);

  if (!COMMIT) { console.log('\n  DRY-RUN — no writes. Re-run with --commit.'); return; }

  console.log('\n── A) retiring wedding products ──');
  for (const w of wedding) {
    try {
      if (w.pubIds.length) { const u = await adminGraphQL(UNPUBLISH, {id: w.id, input: w.pubIds.map((id) => ({publicationId: id}))}); if (ue(u.publishableUnpublish)) throw new Error(ue(u.publishableUnpublish)); }
      const r = await adminGraphQL(PRODUCT_UPDATE, {input: {id: w.id, status: 'DRAFT'}}); if (ue(r.productUpdate)) throw new Error(ue(r.productUpdate));
      console.log(`   ✓ ${w.h} → DRAFT + unpublished`);
    } catch (e) { console.error(`   ✗ ${w.h}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n── B) de-leaking supplies (strip color:*) ──');
  for (const s of supplies) {
    try {
      const r = await adminGraphQL(PRODUCT_UPDATE, {input: {id: s.id, tags: s.newTags}}); if (ue(r.productUpdate)) throw new Error(ue(r.productUpdate));
      console.log(`   ✓ ${s.h} (removed ${s.removed.join(', ')})`);
    } catch (e) { console.error(`   ✗ ${s.h}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n── C) unpublishing wedding CMS page ──');
  try {
    const r = await adminGraphQL(PAGE_UPDATE, {id: WEDDING_PAGE_ID, page: {isPublished: false}});
    if (ue(r.pageUpdate)) throw new Error(ue(r.pageUpdate));
    console.log(`   ✓ wedding-events page → unpublished`);
  } catch (e) { console.error(`   ✗ page: ${e.message} (flag for manual removal)`); }

  console.log('\n  DONE.');
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
