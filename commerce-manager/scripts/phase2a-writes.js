// Phase 2A gated writes — retire 7 duplicates + complete the ready completions.
// DRY-RUN by default; --commit executes. Completions are driven by
// GROUP_B_IMAGES (only products with an ACCURATE local image are completed here;
// the rest await Gemini generation and are listed as pending). Rollback manifest
// captures ALL 14. Never edits price/description/handle/tags/collections/metafields.
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

// retire: legacy -> canonical (verified ACTIVE+imaged+buyable in investigation)
const GROUP_D = {
  heliconia: 'tropicals-heliconia',
  'bird-of-paradise': 'tropicals-bird-of-paradise',
  'seeded-eucalyptus': 'eucalyptus-seeded',
  'silver-dollar-eucalyptus': 'eucalyptus-silver-dollar',
  'wax-flower': 'fillers-wax-flower-pink',
  statice: 'fillers-statice-purple',
  solidago: 'fillers-solidago',
};
// all 7 completion handles (for rollback + pending list)
const COMPLETIONS = ['football-disbud-chrysanthemums','spider-chrysanthemums','button-pompon-chrysanthemums','palm-leather-leaf','israeli-ruscus','anthurium-stems','torch-ginger'];
// completions with an ACCURATE local image ready now:
const GROUP_B_IMAGES = {
  'palm-leather-leaf': 'greenery/leatherleaf-fern-800.webp',
  // generated images added after Gemini step:
  'football-disbud-chrysanthemums': 'chrysanthemums/football-disbud-800.webp',
  'spider-chrysanthemums': 'chrysanthemums/spider-800.webp',
  'button-pompon-chrysanthemums': 'chrysanthemums/button-pompon-800.webp',
  'israeli-ruscus': 'greenery/israeli-ruscus-800.webp',
  'anthurium-stems': 'tropicals/anthurium-assorted-800.webp',
  'torch-ginger': 'tropicals/torch-ginger-800.webp',
};
const PUBLISH_CHANNELS = ['Online Store', 'New Greenhouse Luxury Storefront'];
const ue = (o) => (o?.userErrors || o?.mediaUserErrors || []).map((e) => e.message).join('; ');

const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{
    id handle title status featuredImage{ url } mediaCount{ count }
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

const byHandle = async (h) => (await adminGraphQL(BY_HANDLE, {q: `handle:${h}`})).products.nodes[0] || null;
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
  out(`  PHASE 2A WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  out('════════════════════════════════════════════════════════════');
  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const channelIds = PUBLISH_CHANNELS.map((n) => pubs.find((p) => p.name === n)).filter(Boolean);

  const dProds = {}; const canon = {}; const cProds = {};
  for (const h of Object.keys(GROUP_D)) { dProds[h] = await byHandle(h); await sleep(60); }
  for (const c of new Set(Object.values(GROUP_D))) { canon[c] = await byHandle(c); await sleep(60); }
  for (const h of COMPLETIONS) { cProds[h] = await byHandle(h); await sleep(60); }

  // validation
  const warnings = [];
  for (const [h, c] of Object.entries(GROUP_D)) {
    if (!dProds[h]) warnings.push(`retire ${h}: not found`);
    const cp = canon[c];
    if (!cp) warnings.push(`retire ${h}: canonical ${c} missing`);
    else {
      if (cp.status !== 'ACTIVE') warnings.push(`retire ${h}: canonical ${c} not ACTIVE`);
      if (!(cp.featuredImage?.url || cp.mediaCount?.count > 0)) warnings.push(`retire ${h}: canonical ${c} imageless`);
      if (!cp.variants.nodes.some((v) => v.availableForSale)) warnings.push(`retire ${h}: canonical ${c} not buyable`);
    }
  }
  const readyCompletions = COMPLETIONS.filter((h) => GROUP_B_IMAGES[h] && existsSync(IMG(GROUP_B_IMAGES[h])));
  const pendingCompletions = COMPLETIONS.filter((h) => !readyCompletions.includes(h));

  // rollback manifest (all 14)
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const snap = (p) => p && ({id: p.id, handle: p.handle, title: p.title, status: p.status,
    publications: p.resourcePublications.nodes.map((n) => ({name: n.publication?.name, id: n.publication?.id, isPublished: n.isPublished})),
    mediaCount: p.mediaCount?.count ?? 0, featuredImage: p.featuredImage?.url ?? null,
    collections: p.collections.nodes.map((c) => ({id: c.id, handle: c.handle})),
    variants: p.variants.nodes.map((v) => ({id: v.id, sku: v.sku, price: v.price, compareAtPrice: v.compareAtPrice, inventoryPolicy: v.inventoryPolicy, inventoryQuantity: v.inventoryQuantity, tracked: v.inventoryItem?.tracked, inventoryItemId: v.inventoryItem?.id}))});
  const manifest = {generatedAt: ts, phase: '2A',
    retire: Object.fromEntries(Object.entries(dProds).map(([h, p]) => [h, {canonical: GROUP_D[h], before: snap(p)}])),
    complete: Object.fromEntries(Object.entries(cProds).map(([h, p]) => [h, {image: GROUP_B_IMAGES[h] || null, ready: readyCompletions.includes(h), before: snap(p)}]))};
  mkdirSync(join(CM, 'rollback'), {recursive: true});
  const manPath = join(CM, 'rollback', `phase2a-${ts}.json`);
  writeFileSync(manPath, JSON.stringify(manifest, null, 2), 'utf8');
  out(`\nRollback manifest: rollback/${manPath.split(/[\\/]/).pop()}`);

  out(`\n── RETIRE 7 (→ DRAFT + unpublish + redirect) ──`);
  for (const [h, c] of Object.entries(GROUP_D)) {
    const p = dProds[h];
    const active = (p?.resourcePublications.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name);
    out(`  → ${h.padEnd(26)} DRAFT · unpublish:[${active.join(',')}] · redirect→/products/${c}`);
  }
  out(`\n── COMPLETE — ready now (accurate local image) ──`);
  for (const h of readyCompletions) out(`  ＋ ${h.padEnd(30)} img:${GROUP_B_IMAGES[h]}`);
  out(`\n── COMPLETE — pending Gemini generation (no accurate local image) ──`);
  for (const h of pendingCompletions) out(`  … ${h}`);

  if (warnings.length) { out(`\n⚠ WARNINGS:`); warnings.forEach((w) => out('   - ' + w)); }
  else out('\n✓ validations passed.');

  if (!COMMIT) { out('\nDRY-RUN only. No writes.'); return; }
  if (warnings.some((w) => /not found|missing|not ACTIVE|imageless|not buyable/.test(w))) { out('\n✗ blocking warnings — abort.'); process.exitCode = 1; return; }

  const results = {retired: [], completed: [], pending: pendingCompletions, redirects: []};
  const completionsOnly = process.argv.includes('--completions-only');
  if (completionsOnly) out('\n── RETIRE skipped (--completions-only; already executed in batch 1) ──');
  else { out('\n── executing RETIRE ──');
  for (const [h, c] of Object.entries(GROUP_D)) {
    const p = dProds[h];
    try {
      const u = await adminGraphQL(PRODUCT_UPDATE, {input: {id: p.id, status: 'DRAFT'}}); if (ue(u.productUpdate)) throw new Error(ue(u.productUpdate));
      const act = p.resourcePublications.nodes.filter((n) => n.isPublished).map((n) => ({publicationId: n.publication.id}));
      if (act.length) { const un = await adminGraphQL(UNPUBLISH, {id: p.id, input: act}); if (ue(un.publishableUnpublish)) throw new Error(ue(un.publishableUnpublish)); }
      const rd = await adminGraphQL(REDIRECT_CREATE, {redirect: {path: `/products/${h}`, target: `/products/${c}`}}); if (ue(rd.urlRedirectCreate)) throw new Error(ue(rd.urlRedirectCreate));
      results.retired.push(h); results.redirects.push(`/products/${h} → /products/${c}`); out(`   ✓ ${h} → DRAFT+unpublished+redirect`);
    } catch (e) { out(`   ✗ ${h}: ${redact(e.message)}`); }
    await sleep(250);
  } }
  out('\n── executing COMPLETE (ready) ──');
  for (const h of readyCompletions) {
    const p = cProds[h];
    try {
      if ((p.mediaCount?.count ?? 0) === 0) {
        const rurl = await stageImage(IMG(GROUP_B_IMAGES[h]), `${h}.webp`);
        const m = await adminGraphQL(CREATE_MEDIA, {productId: p.id, media: [{originalSource: rurl, mediaContentType: 'IMAGE', alt: `${p.title} — The New Greenhouse`}]});
        if (ue(m.productCreateMedia)) throw new Error('media: ' + ue(m.productCreateMedia));
      }
      const vs = p.variants.nodes.map((v) => ({id: v.id, inventoryPolicy: 'CONTINUE', inventoryItem: {tracked: false}}));
      const vu = await adminGraphQL(VARIANTS_UPDATE, {productId: p.id, variants: vs}); if (ue(vu.productVariantsBulkUpdate)) throw new Error('variants: ' + ue(vu.productVariantsBulkUpdate));
      const missing = channelIds.filter((c) => !p.resourcePublications.nodes.some((n) => n.isPublished && n.publication?.id === c.id));
      if (missing.length) { const pub = await adminGraphQL(PUBLISH, {id: p.id, input: missing.map((c) => ({publicationId: c.id}))}); if (ue(pub.publishablePublish)) throw new Error('publish: ' + ue(pub.publishablePublish)); }
      results.completed.push(h); out(`   ✓ ${h}`);
    } catch (e) { out(`   ✗ ${h}: ${redact(e.message)}`); }
    await sleep(250);
  }
  writeFileSync(join(CM, 'rollback', `phase2a-${ts}-results.json`), JSON.stringify(results, null, 2), 'utf8');
  out(`\n✓ done. retired=${results.retired.length} completed=${results.completed.length} pending=${results.pending.length}`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
