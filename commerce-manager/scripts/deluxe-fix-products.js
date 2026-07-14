// scripts/deluxe-fix-products.js — production-prep for the 18 Deluxe demo
// products that shipped imageless + sold-out. For each (by handle):
//   1. attach its generated luxury photo (source-images/deluxe-demo/<handle>.png)
//   2. make it buyable for the demo storefront (inventory untracked → always
//      available; inventory policy CONTINUE as a belt-and-suspenders).
//
// SAFETY: DRY-RUN by default. Live requires --commit AND typed "FIX". Only
// touches the 18 handles in config/deluxe-demo-products.json (all channel:retail
// / occasion-tagged Deluxe demo items). NEVER touches wholesale. Skips a product
// that already has an image AND is available (idempotent). Rollback manifest saved.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM = join(HERE, '..');
const REPO = join(CM, '..');
const CATALOG = join(REPO, 'config', 'deluxe-demo-products.json');
const IMG_DIR = join(REPO, 'source-images', 'deluxe-demo');
const OUT_DIR = join(CM, 'reports', 'private');

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const out = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (q) => { const rl = readline.createInterface({input: process.stdin, output: process.stdout}); return new Promise((r) => rl.question(q, (a) => (rl.close(), r(a)))); };

const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{
    id handle title status
    tags
    featuredImage{ url }
    variants(first:1){ nodes{ id inventoryPolicy inventoryItem{ id tracked } price } }
  } } }`;
const STAGED = `#graphql
  mutation Staged($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`;
const CREATE_MEDIA = `#graphql
  mutation Media($productId:ID!, $media:[CreateMediaInput!]!){ productCreateMedia(productId:$productId, media:$media){ media{ ... on MediaImage { id } } mediaUserErrors{ field message } } }`;
const INV_ITEM = `#graphql
  mutation Inv($id:ID!, $input:InventoryItemInput!){ inventoryItemUpdate(id:$id, input:$input){ inventoryItem{ id tracked } userErrors{ field message } } }`;
const VARIANTS_UPDATE = `#graphql
  mutation V($productId:ID!, $variants:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$productId, variants:$variants){ productVariants{ id inventoryPolicy } userErrors{ field message } } }`;
const ue = (p) => (p?.userErrors || p?.mediaUserErrors || []).map((e) => e.message).join('; ');

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
  const products = JSON.parse(readFileSync(CATALOG, 'utf8')).products;
  out('════════════════════════════════════════════════════════════');
  out(`  DELUXE DEMO FIX — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}  ·  ${products.length} products`);
  out('════════════════════════════════════════════════════════════');

  const plan = [];
  for (const p of products) {
    const hasImg = existsSync(join(IMG_DIR, `${p.handle}.png`));
    const f = await adminGraphQL(BY_HANDLE, {q: `handle:${p.handle}`});
    const node = f.products.nodes[0];
    if (!node) { out(`   ✗ NOT FOUND ${p.handle}`); continue; }
    if (node.tags.includes('channel:wholesale')) { out(`   ⚠ SKIP wholesale-tagged ${p.handle}`); continue; }
    const v = node.variants.nodes[0];
    plan.push({p, node, v, hasImgFile: hasImg, needsImg: !node.featuredImage?.url, needsAvail: v?.inventoryItem?.tracked !== false});
    await sleep(80);
  }

  out('\n  handle                                  attach-image  make-available  price');
  for (const it of plan) {
    out(`   ${it.node.handle.padEnd(38)} ${(it.needsImg ? (it.hasImgFile ? 'yes' : 'NO-FILE') : 'has').padEnd(12)} ${(it.needsAvail ? 'yes' : 'ok').padEnd(14)} $${it.v?.price ?? '?'}`);
  }

  if (!COMMIT) { out('\nDRY-RUN only. Nothing written. Run: npm run deluxe:fix:commit'); return; }
  if (!YES) { const ans = await ask(`\nType "FIX" to attach images + make ${plan.length} products available: `); if (ans.trim() !== 'FIX') return out('Cancelled.'); }

  const done = [];
  for (const it of plan) {
    const {node, v} = it;
    try {
      out(`\n▸ ${node.handle}`);
      if (it.needsImg && it.hasImgFile) {
        const resourceUrl = await stageImage(node.handle);
        const m = await adminGraphQL(CREATE_MEDIA, {productId: node.id, media: [{originalSource: resourceUrl, mediaContentType: 'IMAGE', alt: `${node.title} — The New Greenhouse`}]});
        if (ue(m.productCreateMedia)) { out(`   ✗ media: ${ue(m.productCreateMedia)}`); } else out('   ✓ image attached');
      } else out('   • image already present / no file');
      if (v?.inventoryItem?.id) {
        const inv = await adminGraphQL(INV_ITEM, {id: v.inventoryItem.id, input: {tracked: false}});
        if (ue(inv.inventoryItemUpdate)) out(`   ✗ untrack: ${ue(inv.inventoryItemUpdate)}`); else out('   ✓ inventory untracked (available)');
      }
      if (v?.id) {
        const vu = await adminGraphQL(VARIANTS_UPDATE, {productId: node.id, variants: [{id: v.id, inventoryPolicy: 'CONTINUE'}]});
        if (ue(vu.productVariantsBulkUpdate)) out(`   ✗ policy: ${ue(vu.productVariantsBulkUpdate)}`); else out('   ✓ inventory policy CONTINUE');
      }
      done.push({handle: node.handle, id: node.id, variantId: v?.id, inventoryItemId: v?.inventoryItem?.id});
    } catch (e) { out(`   ✗ ${redact(e.message)}`); }
    await sleep(300);
  }

  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const man = join(OUT_DIR, `deluxe-demo-fix-${ts}.json`);
  writeFileSync(man, JSON.stringify({generatedAt: ts, note: 'Rollback: productDeleteMedia for added images; inventoryItemUpdate tracked:true to re-track.', fixed: done}, null, 2), 'utf8');
  out(`\n════════════════════════════════════════════════════════════`);
  out(`  DONE — ${done.length} products fixed (image + available)`);
  out(`  Rollback: reports/private/${man.split(/[\\/]/).pop()}`);
  out('════════════════════════════════════════════════════════════');
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
