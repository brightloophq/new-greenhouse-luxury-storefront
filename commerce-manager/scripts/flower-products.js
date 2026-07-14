// scripts/flower-products.js — make the flower library buyable in Shopify.
//
// Creates one REAL, buyable product per flower variant (ACTIVE, published), each
// with its approved image — generalising scripts/alstroemeria-products.js to the
// whole library (app/data/flowers.ts).
//
// SAFETY:
//   • DRY-RUN by default. Live requires --commit AND the typed phrase "CREATE".
//   • A product is created ONLY when config/flower-product-prices.csv marks it
//     approved=true AND gives a numeric price > 0. No price → skipped. This is
//     the guard against shipping placeholder/fake prices.
//   • Idempotent: an existing handle is skipped (never duplicated) — so the 7
//     Alstroemeria products already live are left untouched.
//   • Inventory untracked (always available); store currency USD.
//   • Writes a rollback manifest (productDelete each id to undo).
//   • Never edits/deletes existing products; never changes prices of live ones.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM = join(HERE, '..');
const REPO = join(CM, '..');
const PRICES_CSV = join(CM, 'config', 'flower-product-prices.csv');
const OUT_DIR = join(CM, 'reports', 'private');
const VENDOR = 'The New Greenhouse';
const CHANNELS = ['Online Store', 'New Greenhouse Luxury Storefront'];

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const out = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (q) => {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
};

// Placeholder per-category wholesale-bunch prices (USD) for the starter sheet.
// These are NOT applied unless the owner keeps them AND sets approved=true.
const DEFAULT_PRICE = {
  alstroemeria: 28, asters: 10, 'babys-breath': 8, 'calla-lilies': 20, carnations: 10,
  chrysanthemums: 10, delphinium: 14, eucalyptus: 10, fillers: 8, 'gerbera-daisies': 12,
  'gift-bouquets': 45, greenery: 8, hydrangea: 22, hypericum: 10, lilies: 18,
  lisianthus: 16, novelties: 14, orchids: 25, ranunculus: 16, 'roses-in-stock': 18,
  snapdragon: 12, 'spray-roses': 15, stock: 12, tropicals: 30, tulips: 12,
};
const COLOR_TAG = {
  White: 'white-ivory', Ivory: 'white-ivory', Pink: 'pink', Red: 'red',
  Yellow: 'yellow-orange', Orange: 'yellow-orange', Purple: 'purple',
  Lavender: 'purple', Blue: 'blue', Green: 'green', Burgundy: 'red',
  Peach: 'pink', Bronze: 'yellow-orange',
};
const MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'};

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function parseCsv(text) {
  const rows = []; let f = '', rec = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { rec.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; rec.push(f); f = ''; if (rec.length > 1 || rec[0] !== '') rows.push(rec); rec = []; }
    else f += c;
  }
  if (f !== '' || rec.length) { rec.push(f); rows.push(rec); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** Load the flower catalogue from the storefront data (single source of truth). */
async function loadVariants() {
  const mod = await import(pathToFileURL(join(REPO, 'app', 'data', 'flowers.ts')).href);
  const variants = [];
  for (const fl of mod.FLOWERS) {
    // image base = /images/flowers/<catHandle>/<file>
    const m = fl.image.match(/^\/images\/flowers\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const [, catHandle, file] = m;
    // find the source original (png/jpg/jpeg/webp)
    let src = null, mime = null;
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
      const p = join(REPO, 'source-images', 'flowers', catHandle, `${file}${ext}`);
      if (existsSync(p)) { src = p; mime = MIME[ext]; break; }
    }
    variants.push({
      handle: `${catHandle}-${file}`,
      categoryHandle: catHandle,
      family: fl.family,
      color: fl.color,
      colorTag: COLOR_TAG[fl.color] || 'mixed',
      title: fl.name,
      desc: fl.description || `${fl.name} — fresh-cut ${fl.family} by the wholesale bunch, hand-prepared in Kingston, Jamaica.`,
      src, mime,
      knownPrice: fl.price != null ? String(fl.price.toFixed ? fl.price.toFixed(2) : fl.price) : '',
    });
  }
  return variants;
}

function writeStarterSheet(variants) {
  const header = ['handle', 'category', 'color', 'title', 'price', 'approved', 'image_found', 'notes'];
  const lines = [header.join(',')];
  for (const v of variants) {
    const price = v.knownPrice || (DEFAULT_PRICE[v.categoryHandle] ?? '');
    const isKnown = Boolean(v.knownPrice);
    lines.push([
      v.handle, v.categoryHandle, v.color, v.title,
      price, isKnown ? 'true' : 'false', v.src ? 'yes' : 'MISSING',
      isKnown ? 'live-price (alstroemeria)' : 'PLACEHOLDER price — review before approving',
    ].map(csvEscape).join(','));
  }
  mkdirSync(dirname(PRICES_CSV), {recursive: true});
  writeFileSync(PRICES_CSV, lines.join('\n') + '\n', 'utf8');
}

// --- GraphQL (reused from alstroemeria-products.js) -------------------------
const PUBS = `#graphql
  query { publications(first: 50) { nodes { id name } } }`;
const BY_HANDLE = `#graphql
  query ByHandle($q: String!) { products(first: 1, query: $q) { nodes { id handle } } }`;
const STAGED = `#graphql
  mutation Staged($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`;
const PRODUCT_SET = `#graphql
  mutation Set($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle title status }
      userErrors { field message }
    }
  }`;
const PUBLISH = `#graphql
  mutation Pub($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }`;

function buildInput(v, price, resourceUrl) {
  const input = {
    handle: v.handle,
    title: v.title,
    descriptionHtml: `<p>${v.desc}</p><p>Fresh-cut ${v.family} by the wholesale bunch. Long vase life; colours may vary slightly by season. Hand-prepared in Kingston, Jamaica.</p>`,
    vendor: VENDOR,
    productType: 'Fresh Flowers',
    status: 'ACTIVE',
    tags: [`flower:${v.categoryHandle}`, 'channel:wholesale', `color:${v.colorTag}`, 'occasion:everyday'],
    seo: {title: `${v.title} | The New Greenhouse`, description: v.desc.slice(0, 300)},
    productOptions: [{name: 'Title', values: [{name: 'Default Title'}]}],
    variants: [{
      price: Number(price).toFixed(2),
      sku: `${v.categoryHandle.slice(0, 3).toUpperCase()}-${v.color.slice(0, 3).toUpperCase()}`,
      taxable: true,
      inventoryPolicy: 'CONTINUE',
      inventoryItem: {tracked: false, requiresShipping: true, measurement: {weight: {unit: 'GRAMS', value: 500}}},
      optionValues: [{optionName: 'Title', name: 'Default Title'}],
    }],
  };
  if (resourceUrl) input.files = [{originalSource: resourceUrl, contentType: 'IMAGE', alt: `${v.title} — The New Greenhouse`}];
  return input;
}

async function stageImage(v) {
  const filename = v.src.split(/[\\/]/).pop();
  const st = await adminGraphQL(STAGED, {input: [{filename, mimeType: v.mime, resource: 'IMAGE', httpMethod: 'POST'}]});
  if (st.stagedUploadsCreate.userErrors.length) throw new Error(st.stagedUploadsCreate.userErrors.map((e) => e.message).join('; '));
  const target = st.stagedUploadsCreate.stagedTargets[0];
  const buf = readFileSync(v.src);
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([buf], {type: v.mime}), filename);
  const res = await fetch(target.url, {method: 'POST', body: form});
  if (res.status < 200 || res.status >= 300) throw new Error(`staged upload HTTP ${res.status}`);
  return target.resourceUrl;
}

async function main() {
  out('════════════════════════════════════════════════════════════');
  out(`  FLOWER PRODUCTS — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN (read-only)'}`);
  out('  Buyable products · ACTIVE · USD · untracked inventory · idempotent');
  out('════════════════════════════════════════════════════════════');

  const variants = await loadVariants();
  out(`  catalogue: ${variants.length} flower variants (from app/data/flowers.ts)`);

  if (!existsSync(PRICES_CSV)) {
    writeStarterSheet(variants);
    out(`\n  ✎ No price sheet found — wrote a starter to:`);
    out(`     commerce-manager/config/flower-product-prices.csv`);
    out(`  It lists every variant with a PLACEHOLDER price and approved=false`);
    out(`  (the 7 Alstroemeria rows carry their real live prices).`);
    out(`\n  → Set real prices and approved=true on the rows you want live, then re-run.`);
    return;
  }

  const rows = parseCsv(readFileSync(PRICES_CSV, 'utf8'));
  const priceByHandle = new Map(rows.map((r) => [r.handle, r]));
  const missingImg = variants.filter((v) => !v.src).map((v) => v.handle);

  // Approved + priced + image present
  const eligible = [];
  for (const v of variants) {
    const row = priceByHandle.get(v.handle);
    const approved = row && String(row.approved).trim().toLowerCase() === 'true';
    const price = row ? Number(row.price) : NaN;
    if (approved && price > 0 && v.src) eligible.push({v, price});
  }

  // Which already exist in Shopify (skip)?
  const plan = [];
  for (const e of eligible) {
    const found = await adminGraphQL(BY_HANDLE, {q: `handle:${e.v.handle}`});
    plan.push({...e, exists: found.products.nodes[0]?.id ?? null});
    await sleep(60);
  }
  const toCreate = plan.filter((p) => !p.exists);

  const approvedCount = rows.filter((r) => String(r.approved).trim().toLowerCase() === 'true').length;
  out(`\n▸ Price sheet: ${rows.length} rows · approved: ${approvedCount}`);
  out(`  eligible (approved + price>0 + image): ${eligible.length}`);
  out(`  already in Shopify (skip): ${plan.length - toCreate.length}`);
  out(`  → to create + publish: ${toCreate.length}`);
  if (missingImg.length) out(`  ⚠ variants with no source image: ${missingImg.length} (${missingImg.slice(0, 5).join(', ')}…)`);
  out('\n  sample of what would be created:');
  toCreate.slice(0, 8).forEach((p) => out(`     ＋ ${p.v.handle.padEnd(28)} "${p.v.title}"  $${Number(p.price).toFixed(2)}  [flower:${p.v.categoryHandle}]`));

  if (!COMMIT) {
    out('\nDRY-RUN only. Nothing written. After approving prices, run: npm run flowers:products:create');
    return;
  }
  if (toCreate.length === 0) { out('\nNothing eligible to create. Approve rows + set prices in the CSV first.'); return; }

  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const targets = CHANNELS.map((n) => pubs.find((p) => p.name === n)).filter(Boolean);
  const pubInput = targets.map((p) => ({publicationId: p.id}));

  if (!YES) {
    const a = await ask(`\nType "CREATE" to create + publish ${toCreate.length} products: `);
    if (a.trim() !== 'CREATE') return out('Cancelled — nothing written.');
  }

  const created = [];
  for (const {v, price} of toCreate) {
    try {
      out(`\n▸ ${v.handle}  $${Number(price).toFixed(2)}`);
      const resourceUrl = v.src ? await stageImage(v) : null;
      if (resourceUrl) out('   ✓ image staged');
      const r = await adminGraphQL(PRODUCT_SET, {input: buildInput(v, price, resourceUrl)});
      if (r.productSet.userErrors.length) { out(`   ✗ ${r.productSet.userErrors.map((e) => e.message).join('; ')}`); continue; }
      const product = r.productSet.product;
      out(`   ✓ created ${product.id} (${product.status})`);
      if (pubInput.length) {
        const pub = await adminGraphQL(PUBLISH, {id: product.id, input: pubInput});
        out(pub.publishablePublish.userErrors.length ? `   ⚠ publish: ${pub.publishablePublish.userErrors.map((e) => e.message).join('; ')}` : `   ✓ published to ${targets.length} channel(s)`);
      }
      created.push({handle: v.handle, id: product.id, title: v.title, price: Number(price).toFixed(2)});
    } catch (e) { out(`   ✗ ${redact(e.message)}`); }
    await sleep(300);
  }

  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const manifest = join(OUT_DIR, `flower-products-manifest-${ts}.json`);
  writeFileSync(manifest, JSON.stringify({generatedAt: ts, note: 'Roll back: productDelete each id.', products: created}, null, 2), 'utf8');
  out(`\n════════════════════════════════════════════════════════════`);
  out(`  DONE — created + published ${created.length} / ${toCreate.length}`);
  out(`  Rollback manifest: reports/private/${manifest.split(/[\\/]/).pop()}`);
  out('════════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
