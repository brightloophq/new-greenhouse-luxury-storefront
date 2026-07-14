// scripts/luxury-products.js — create the Deluxe luxury-arrangement products +
// the missing Deluxe collections, so the luxury gifting experience is buyable.
//
// Reads ../config/luxury-arrangements.json (shared with the image generator).
// Each product: ACTIVE, published, type "Floral Arrangement", channel:retail,
// with its luxury image (source-images/luxury/<handle>.png) and a real price.
// Products are tagged so the existing smart collections auto-populate; the
// missing Deluxe collections are created as smart collections by tag.
//
// SAFETY: DRY-RUN by default. Live requires --commit AND typed "CREATE".
// Idempotent (existing handles skipped). Never edits existing products/prices.
// Rollback manifest written (productDelete + collectionDelete to undo).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM = join(HERE, '..');
const REPO = join(CM, '..');
const CATALOG = join(REPO, 'config', 'luxury-arrangements.json');
const IMG_DIR = join(REPO, 'source-images', 'luxury');
const OUT_DIR = join(CM, 'reports', 'private');
const VENDOR = 'The New Greenhouse';
const CHANNELS = ['Online Store', 'New Greenhouse Luxury Storefront'];

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const out = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (q) => { const rl = readline.createInterface({input: process.stdin, output: process.stdout}); return new Promise((r) => rl.question(q, (a) => (rl.close(), r(a)))); };

// collection handle → the tag that lands a product in it (existing smart rules
// from src/collections.js, plus new collection: / delivery: tags we introduce).
const COLLECTION_TAG = {
  roses: 'flower:rose', orchids: 'flower:orchid',
  'love-and-romance': 'occasion:romance', anniversary: 'occasion:anniversary',
  birthday: 'occasion:birthday', congratulations: 'occasion:congratulations',
  'sympathy-and-funeral': 'occasion:sympathy', 'get-well': 'occasion:get-well',
  'new-baby': 'occasion:new-baby', 'corporate-gifting': 'occasion:corporate',
  'bridal-bouquets': 'format:bouquet', 'wedding-flowers': 'format:bouquet',
  'best-sellers': 'collection:best-seller', 'signature-collection': 'collection:signature',
  'luxury-bouquets': 'collection:luxury-bouquet', 'seasonal-deluxe': 'collection:seasonal',
  'thank-you': 'occasion:thank-you',
};
// Collections to ensure exist (smart, by tag). Existing occasion/flower ones
// already have rules; these are the Deluxe-only ones that need creating/ensuring.
const ENSURE_COLLECTIONS = [
  {handle: 'best-sellers', title: 'Best Sellers', tag: 'collection:best-seller'},
  {handle: 'signature-collection', title: 'Signature Collection', tag: 'collection:signature'},
  {handle: 'luxury-bouquets', title: 'Luxury Bouquets', tag: 'collection:luxury-bouquet'},
  {handle: 'seasonal-deluxe', title: 'Seasonal Collection', tag: 'collection:seasonal'},
  {handle: 'thank-you', title: 'Thank You', tag: 'occasion:thank-you'},
  {handle: 'same-day-delivery', title: 'Same Day Delivery', tag: 'delivery:same-day'},
];

const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{ id handle } } }`;
const COLL_BY_HANDLE = `#graphql
  query($h:String!){ collectionByHandle(handle:$h){ id handle } }`;
const COLL_CREATE = `#graphql
  mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ field message } } }`;
const PUBS = `#graphql
  query{ publications(first:50){ nodes{ id name } } }`;
const STAGED = `#graphql
  mutation Staged($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`;
const PRODUCT_SET = `#graphql
  mutation Set($input:ProductSetInput!){ productSet(input:$input, synchronous:true){ product{ id handle status } userErrors{ field message } } }`;
const PUBLISH = `#graphql
  mutation Pub($id:ID!, $input:[PublicationInput!]!){ publishablePublish(id:$id, input:$input){ userErrors{ field message } } }`;
const ue = (p) => (p?.userErrors || []).map((e) => e.message).join('; ');

function tagsFor(a) {
  const tags = new Set(['channel:retail', 'experience:deluxe', 'delivery:same-day', 'type:luxury-arrangement']);
  for (const h of a.collections) if (COLLECTION_TAG[h]) tags.add(COLLECTION_TAG[h]);
  return [...tags];
}
function buildInput(a, resourceUrl) {
  const input = {
    handle: a.handle, title: a.title,
    descriptionHtml: `<p>${a.title} — a hand-composed luxury arrangement, gift-ready with premium wrapping and a personal message option. Hand-delivered across Kingston &amp; St. Andrew.</p>`,
    vendor: VENDOR, productType: 'Floral Arrangement', status: 'ACTIVE',
    tags: tagsFor(a),
    seo: {title: `${a.title} | The New Greenhouse`, description: `${a.title} — luxury floral gifting from The New Greenhouse, Kingston.`},
    productOptions: [{name: 'Title', values: [{name: 'Default Title'}]}],
    variants: [{price: Number(a.price).toFixed(2), sku: `LUX-${a.handle.slice(0, 10).toUpperCase()}`, taxable: true, inventoryPolicy: 'CONTINUE', inventoryItem: {tracked: false, requiresShipping: true}, optionValues: [{optionName: 'Title', name: 'Default Title'}]}],
  };
  if (resourceUrl) input.files = [{originalSource: resourceUrl, contentType: 'IMAGE', alt: `${a.title} — The New Greenhouse`}];
  return input;
}
async function stageImage(handle) {
  const file = `${handle}.png`; const path = join(IMG_DIR, file);
  const st = await adminGraphQL(STAGED, {input: [{filename: file, mimeType: 'image/png', resource: 'IMAGE', httpMethod: 'POST'}]});
  if (ue(st.stagedUploadsCreate)) throw new Error(ue(st.stagedUploadsCreate));
  const t = st.stagedUploadsCreate.stagedTargets[0]; const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([readFileSync(path)], {type: 'image/png'}), file);
  const res = await fetch(t.url, {method: 'POST', body: form});
  if (res.status < 200 || res.status >= 300) throw new Error(`staged HTTP ${res.status}`);
  return t.resourceUrl;
}

async function main() {
  const arrangements = JSON.parse(readFileSync(CATALOG, 'utf8')).arrangements;
  out('════════════════════════════════════════════════════════════');
  out(`  LUXURY PRODUCTS + COLLECTIONS — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  out(`  ${arrangements.length} arrangements · ${ENSURE_COLLECTIONS.length} Deluxe collections to ensure`);
  out('════════════════════════════════════════════════════════════');

  // image presence
  const missingImg = arrangements.filter((a) => !existsSync(join(IMG_DIR, `${a.handle}.png`))).map((a) => a.handle);
  if (missingImg.length) out(`  ⚠ missing images: ${missingImg.join(', ')}`);

  // existing products
  const plan = [];
  for (const a of arrangements) {
    const f = await adminGraphQL(BY_HANDLE, {q: `handle:${a.handle}`});
    plan.push({a, exists: f.products.nodes[0]?.id ?? null});
    await sleep(60);
  }
  const toCreate = plan.filter((p) => !p.exists && existsSync(join(IMG_DIR, `${p.a.handle}.png`)));

  // which collections need creating
  const collPlan = [];
  for (const c of ENSURE_COLLECTIONS) {
    const f = await adminGraphQL(COLL_BY_HANDLE, {h: c.handle});
    collPlan.push({c, exists: Boolean(f.collectionByHandle)});
    await sleep(60);
  }
  const collToCreate = collPlan.filter((p) => !p.exists);

  out(`\n▸ Collections: ${collToCreate.length} to create · ${collPlan.length - collToCreate.length} exist`);
  collPlan.forEach((p) => out(`     ${p.exists ? '↺ exists' : '＋ create'}  ${p.c.handle.padEnd(20)} (smart: ${p.c.tag})`));
  out(`\n▸ Products: ${toCreate.length} to create · ${plan.length - toCreate.length} skip (exist/no-image)`);
  toCreate.slice(0, 20).forEach((p) => out(`     ＋ ${p.a.handle.padEnd(34)} $${Number(p.a.price).toFixed(2)}  → [${p.a.collections.join(', ')}]`));

  if (!COMMIT) { out('\nDRY-RUN only. Nothing written. Run: npm run luxury:create'); return; }
  if (!YES) { const ans = await ask(`\nType "CREATE" to create ${collToCreate.length} collections + ${toCreate.length} products: `); if (ans.trim() !== 'CREATE') return out('Cancelled.'); }

  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const targets = CHANNELS.map((n) => pubs.find((p) => p.name === n)).filter(Boolean);
  const pubInput = targets.map((p) => ({publicationId: p.id}));

  // 1) collections
  const createdColls = [];
  for (const {c} of collToCreate) {
    try {
      const d = await adminGraphQL(COLL_CREATE, {input: {handle: c.handle, title: c.title, ruleSet: {appliedDisjunctively: false, rules: [{column: 'TAG', relation: 'EQUALS', condition: c.tag}]}}});
      if (ue(d.collectionCreate)) { out(`   ✗ collection ${c.handle}: ${ue(d.collectionCreate)}`); continue; }
      const id = d.collectionCreate.collection.id; createdColls.push({handle: c.handle, id});
      if (pubInput.length) await adminGraphQL(PUBLISH, {id, input: pubInput});
      out(`   ✓ collection ${c.handle} created + published`);
    } catch (e) { out(`   ✗ collection ${c.handle}: ${redact(e.message)}`); }
    await sleep(200);
  }

  // 2) products
  const createdProds = [];
  for (const {a} of toCreate) {
    try {
      out(`\n▸ ${a.handle}  $${Number(a.price).toFixed(2)}`);
      const resourceUrl = await stageImage(a.handle); out('   ✓ image staged');
      const r = await adminGraphQL(PRODUCT_SET, {input: buildInput(a, resourceUrl)});
      if (ue(r.productSet)) { out(`   ✗ ${ue(r.productSet)}`); continue; }
      const p = r.productSet.product; out(`   ✓ created ${p.id} (${p.status})`);
      if (pubInput.length) { await adminGraphQL(PUBLISH, {id: p.id, input: pubInput}); out(`   ✓ published to ${targets.length} channel(s)`); }
      createdProds.push({handle: a.handle, id: p.id, title: a.title, price: Number(a.price).toFixed(2)});
    } catch (e) { out(`   ✗ ${redact(e.message)}`); }
    await sleep(300);
  }

  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const man = join(OUT_DIR, `luxury-products-manifest-${ts}.json`);
  writeFileSync(man, JSON.stringify({generatedAt: ts, note: 'Roll back: productDelete + collectionDelete each id.', collections: createdColls, products: createdProds}, null, 2), 'utf8');
  out(`\n════════════════════════════════════════════════════════════`);
  out(`  DONE — ${createdColls.length} collections + ${createdProds.length} products created + published`);
  out(`  Rollback: reports/private/${man.split(/[\\/]/).pop()}`);
  out('════════════════════════════════════════════════════════════');
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
