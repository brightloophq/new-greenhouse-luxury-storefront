// Gated Shopify writes — Group B (complete 9 flower products) + Group D (retire
// 7 high-confidence duplicates). DRY-RUN by default; --commit executes live.
// Never edits price/description/handle/tags/metafields. Writes a full rollback
// manifest to commerce-manager/rollback/ before any live change.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(CM);
const COMMIT = process.argv.includes('--commit');
const out = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG = (p) => join(REPO, 'public', 'images', 'flowers', p);

// Group B: handle -> approved local flower-library image (best family/colour match).
const GROUP_B = {
  'long-stem-ivory-roses': 'roses-in-stock/white-800.webp',
  'ivory-garden-roses': 'roses-in-stock/white-800.webp',
  'dendrobium-orchid-stems': 'orchids/all-800.webp',
  'cymbidium-orchid-stems': 'orchids/all-800.webp',
  'phalaenopsis-orchid-stems': 'orchids/white-800.webp',
  'asiatic-lilies-mixed': 'lilies/all-800.webp',
  'calla-lilies-ivory': 'calla-lilies/white-800.webp',
  'standard-carnations-assorted': 'carnations/all-800.webp',
  'babys-breath-gypsophila': 'babys-breath/white-800.webp',
};
// Group D: legacy handle -> canonical replacement handle.
const GROUP_D = {
  'long-stem-red-roses': 'roses-in-stock-red',
  'long-stem-pink-roses': 'roses-in-stock-pink',
  'long-stem-yellow-roses': 'roses-in-stock-yellow',
  'oriental-lilies-white': 'lilies-white',
  'white-hydrangeas': 'hydrangea-white',
  'antique-blue-hydrangeas': 'hydrangea-blue',
  'pink-hydrangeas': 'hydrangea-pink',
};
const PUBLISH_CHANNELS = ['Online Store', 'New Greenhouse Luxury Storefront'];

const ue = (o) => (o?.userErrors || o?.mediaUserErrors || []).map((e) => e.message).join('; ');
const gid = (id) => id.split('/').pop();

const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{
    id handle title status
    featuredImage{ url }
    mediaCount{ count }
    resourcePublications(first:10){ nodes{ isPublished publication{ id name } } }
    collections(first:20){ nodes{ id handle } }
    variants(first:20){ nodes{ id sku price compareAtPrice inventoryPolicy inventoryQuantity availableForSale inventoryItem{ id tracked } } }
  } } }`;
const PUBS = `#graphql
  query{ publications(first:50){ nodes{ id name } } }`;
const STAGED = `#graphql
  mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`;
const CREATE_MEDIA = `#graphql
  mutation($productId:ID!, $media:[CreateMediaInput!]!){ productCreateMedia(productId:$productId, media:$media){ media{ ...on MediaImage{ id } status } mediaUserErrors{ field message } } }`;
const VARIANTS_UPDATE = `#graphql
  mutation($productId:ID!, $variants:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$productId, variants:$variants){ productVariants{ id } userErrors{ field message } } }`;
const PUBLISH = `#graphql
  mutation($id:ID!, $input:[PublicationInput!]!){ publishablePublish(id:$id, input:$input){ userErrors{ field message } } }`;
const UNPUBLISH = `#graphql
  mutation($id:ID!, $input:[PublicationInput!]!){ publishableUnpublish(id:$id, input:$input){ userErrors{ field message } } }`;
const PRODUCT_UPDATE = `#graphql
  mutation($input:ProductInput!){ productUpdate(input:$input){ product{ id status } userErrors{ field message } } }`;
const REDIRECT_CREATE = `#graphql
  mutation($redirect:UrlRedirectInput!){ urlRedirectCreate(urlRedirect:$redirect){ urlRedirect{ id path target } userErrors{ field message } } }`;

async function byHandle(handle) {
  const d = await adminGraphQL(BY_HANDLE, {q: `handle:${handle}`});
  return d.products.nodes[0] || null;
}
async function stageImage(absPath, filename) {
  const st = await adminGraphQL(STAGED, {input: [{filename, mimeType: 'image/webp', resource: 'IMAGE', httpMethod: 'POST'}]});
  if (ue(st.stagedUploadsCreate)) throw new Error(ue(st.stagedUploadsCreate));
  const t = st.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([readFileSync(absPath)], {type: 'image/webp'}), filename);
  const res = await fetch(t.url, {method: 'POST', body: form});
  if (res.status < 200 || res.status >= 300) throw new Error(`staged HTTP ${res.status}`);
  return t.resourceUrl;
}

async function main() {
  out('════════════════════════════════════════════════════════════');
  out(`  WHOLESALE CLEANUP WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  out('════════════════════════════════════════════════════════════');

  // ---- fetch everything (read-only) ----
  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const channelIds = PUBLISH_CHANNELS.map((n) => pubs.find((p) => p.name === n)).filter(Boolean);
  out(`\nChannels: ${channelIds.map((c) => c.name).join(', ')}`);

  const bProds = {};
  for (const h of Object.keys(GROUP_B)) { bProds[h] = await byHandle(h); await sleep(60); }
  const dProds = {};
  const canon = {};
  for (const h of Object.keys(GROUP_D)) { dProds[h] = await byHandle(h); await sleep(60); }
  for (const c of new Set(Object.values(GROUP_D))) { canon[c] = await byHandle(c); await sleep(60); }

  // ---- validation ----
  const warnings = [];
  for (const [h, img] of Object.entries(GROUP_B)) {
    if (!bProds[h]) warnings.push(`B ${h}: product not found`);
    if (!existsSync(IMG(img))) warnings.push(`B ${h}: image missing ${img}`);
    if (bProds[h]?.mediaCount?.count > 0) warnings.push(`B ${h}: already has media (${bProds[h].mediaCount.count}) — skip media to avoid duplicate`);
  }
  for (const [h, c] of Object.entries(GROUP_D)) {
    if (!dProds[h]) warnings.push(`D ${h}: product not found`);
    const cp = canon[c];
    if (!cp) warnings.push(`D ${h}: canonical ${c} not found`);
    else {
      if (cp.status !== 'ACTIVE') warnings.push(`D ${h}: canonical ${c} not ACTIVE (${cp.status})`);
      if (!(cp.featuredImage?.url || cp.mediaCount?.count > 0)) warnings.push(`D ${h}: canonical ${c} has no image`);
      if (!cp.variants.nodes.some((v) => v.availableForSale)) warnings.push(`D ${h}: canonical ${c} not buyable`);
    }
  }

  // ---- rollback manifest ----
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshot = (p) => p && ({
    id: p.id, handle: p.handle, title: p.title, status: p.status,
    publications: p.resourcePublications.nodes.map((n) => ({name: n.publication?.name, id: n.publication?.id, isPublished: n.isPublished})),
    mediaCount: p.mediaCount?.count ?? 0, featuredImage: p.featuredImage?.url ?? null,
    collections: p.collections.nodes.map((c) => ({id: c.id, handle: c.handle})),
    variants: p.variants.nodes.map((v) => ({id: v.id, sku: v.sku, price: v.price, compareAtPrice: v.compareAtPrice, inventoryPolicy: v.inventoryPolicy, inventoryQuantity: v.inventoryQuantity, tracked: v.inventoryItem?.tracked, inventoryItemId: v.inventoryItem?.id})),
  });
  const manifest = {
    generatedAt: ts, note: 'Rollback: Group B — remove added media + restore variant inventoryPolicy/tracked + revert publications. Group D — restore status + re-publish + delete created redirect.',
    groupB: Object.fromEntries(Object.entries(bProds).map(([h, p]) => [h, {image: GROUP_B[h], before: snapshot(p)}])),
    groupD: Object.fromEntries(Object.entries(dProds).map(([h, p]) => [h, {canonical: GROUP_D[h], before: snapshot(p)}])),
  };
  mkdirSync(join(CM, 'rollback'), {recursive: true});
  const manPath = join(CM, 'rollback', `wholesale-cleanup-${ts}.json`);
  writeFileSync(manPath, JSON.stringify(manifest, null, 2), 'utf8');
  out(`\nRollback manifest: rollback/${manPath.split(/[\\/]/).pop()}`);

  // ---- dry-run plan ----
  out(`\n── GROUP B — complete 9 (add media + untrack inventory + publish) ──`);
  for (const [h, img] of Object.entries(GROUP_B)) {
    const p = bProds[h];
    const pol = [...new Set((p?.variants.nodes || []).map((v) => v.inventoryPolicy))].join('/');
    const missingPubs = channelIds.filter((c) => !p?.resourcePublications.nodes.some((n) => n.isPublished && n.publication?.id === c.id));
    out(`  ＋ ${h.padEnd(30)} img:${img.padEnd(26)} inv:${pol}/tracked→ CONTINUE/untracked  publish+:[${missingPubs.map((c)=>c.name).join(',') || 'none'}]`);
  }
  out(`\n── GROUP D — retire 7 (→ DRAFT + unpublish + redirect) ──`);
  for (const [h, c] of Object.entries(GROUP_D)) {
    const p = dProds[h];
    const activePubs = (p?.resourcePublications.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name);
    out(`  → ${h.padEnd(26)} DRAFT · unpublish:[${activePubs.join(',') || 'none'}] · redirect /products/${h} → /products/${c}`);
  }

  if (warnings.length) { out(`\n⚠ WARNINGS (${warnings.length}):`); warnings.forEach((w) => out('   - ' + w)); }
  else out('\n✓ validations passed: images exist, products found, canonicals ACTIVE+imaged+buyable.');

  if (!COMMIT) { out('\nDRY-RUN only. No writes. Re-run with --commit to execute.'); return; }
  if (warnings.some((w) => /not found|image missing|canonical .* not/.test(w))) {
    out('\n✗ Blocking warnings present — aborting live writes.'); process.exitCode = 1; return;
  }

  // ================= LIVE WRITES =================
  const results = {groupB: {}, groupD: {}, redirects: []};

  out('\n── executing GROUP B ──');
  for (const [h, img] of Object.entries(GROUP_B)) {
    const p = bProds[h];
    try {
      // 1) media (skip if already has media)
      if ((p.mediaCount?.count ?? 0) === 0) {
        const resourceUrl = await stageImage(IMG(img), `${h}.webp`);
        const m = await adminGraphQL(CREATE_MEDIA, {productId: p.id, media: [{originalSource: resourceUrl, mediaContentType: 'IMAGE', alt: `${p.title} — The New Greenhouse`}]});
        if (ue(m.productCreateMedia)) throw new Error('media: ' + ue(m.productCreateMedia));
      }
      // 2) inventory: untrack + CONTINUE (no invented stock)
      const variants = p.variants.nodes.map((v) => ({id: v.id, inventoryPolicy: 'CONTINUE', inventoryItem: {tracked: false}}));
      const vu = await adminGraphQL(VARIANTS_UPDATE, {productId: p.id, variants});
      if (ue(vu.productVariantsBulkUpdate)) throw new Error('variants: ' + ue(vu.productVariantsBulkUpdate));
      // 3) publish to missing channels
      const missingPubs = channelIds.filter((c) => !p.resourcePublications.nodes.some((n) => n.isPublished && n.publication?.id === c.id));
      if (missingPubs.length) {
        const pub = await adminGraphQL(PUBLISH, {id: p.id, input: missingPubs.map((c) => ({publicationId: c.id}))});
        if (ue(pub.publishablePublish)) throw new Error('publish: ' + ue(pub.publishablePublish));
      }
      results.groupB[h] = 'ok';
      out(`   ✓ ${h}`);
    } catch (e) { results.groupB[h] = 'ERROR: ' + e.message; out(`   ✗ ${h}: ${redact(e.message)}`); }
    await sleep(250);
  }

  out('\n── executing GROUP D ──');
  for (const [h, c] of Object.entries(GROUP_D)) {
    const p = dProds[h];
    try {
      // 1) status -> DRAFT
      const upd = await adminGraphQL(PRODUCT_UPDATE, {input: {id: p.id, status: 'DRAFT'}});
      if (ue(upd.productUpdate)) throw new Error('status: ' + ue(upd.productUpdate));
      // 2) unpublish from all active channels
      const active = p.resourcePublications.nodes.filter((n) => n.isPublished).map((n) => ({publicationId: n.publication.id}));
      if (active.length) {
        const un = await adminGraphQL(UNPUBLISH, {id: p.id, input: active});
        if (ue(un.publishableUnpublish)) throw new Error('unpublish: ' + ue(un.publishableUnpublish));
      }
      // 3) redirect old -> canonical
      const rd = await adminGraphQL(REDIRECT_CREATE, {redirect: {path: `/products/${h}`, target: `/products/${c}`}});
      if (ue(rd.urlRedirectCreate)) throw new Error('redirect: ' + ue(rd.urlRedirectCreate));
      results.groupD[h] = 'ok';
      results.redirects.push(`/products/${h} → /products/${c}`);
      out(`   ✓ ${h} → DRAFT, unpublished, redirect→${c}`);
    } catch (e) { results.groupD[h] = 'ERROR: ' + e.message; out(`   ✗ ${h}: ${redact(e.message)}`); }
    await sleep(250);
  }

  writeFileSync(join(CM, 'rollback', `wholesale-cleanup-${ts}-results.json`), JSON.stringify(results, null, 2), 'utf8');
  out('\n✓ live writes complete. Results saved next to the rollback manifest.');
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
