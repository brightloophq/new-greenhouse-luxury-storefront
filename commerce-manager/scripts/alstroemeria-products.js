// scripts/alstroemeria-products.js — create the 7 Alstroemeria "bunch" products
// as REAL, buyable Shopify products (ACTIVE, published), each with its colour
// image. DRY-RUN by default; --commit to write; --yes to skip the prompt.
//
// Safe + idempotent: a product whose handle already exists is skipped (never
// duplicated). Inventory is untracked (always available). Writes a rollback
// manifest so every created product can be removed. Store currency is USD.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT_DIR = join(HERE, '..', 'reports', 'private');
const IMG_DIR = join(REPO, 'source-images', 'flowers', 'alstroemeria');
const VENDOR = 'The New Greenhouse';
const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');

const ARRANGEMENTS = [
  {handle: 'alstroemeria-purple', title: 'Amethyst Alstroemeria Bunch', color: 'Purple', colorTag: 'purple', price: '28.00', file: 'purple.png', mime: 'image/png', desc: 'Deep amethyst blooms with long, elegant vase life.'},
  {handle: 'alstroemeria-lavender', title: 'Lavender Mist Alstroemeria Bunch', color: 'Lavender', colorTag: 'purple', price: '28.00', file: 'lavender.png', mime: 'image/png', desc: 'Soft lavender petals for romantic, airy arrangements.'},
  {handle: 'alstroemeria-orange', title: 'Sunset Alstroemeria Bunch', color: 'Orange', colorTag: 'yellow-orange', price: '27.00', file: 'orange.png', mime: 'image/png', desc: 'Warm sunset orange — vivid, cheerful, long-lasting.'},
  {handle: 'alstroemeria-pink', title: 'Blush Alstroemeria Bunch', color: 'Pink', colorTag: 'pink', price: '28.00', file: 'pink.png', mime: 'image/png', desc: 'Blush pink with a painterly throat; a bridal favourite.'},
  {handle: 'alstroemeria-red', title: 'Scarlet Alstroemeria Bunch', color: 'Red', colorTag: 'red', price: '30.00', file: 'red.png', mime: 'image/png', desc: 'Rich scarlet red for bold, statement bouquets.'},
  {handle: 'alstroemeria-white', title: 'Ivory Alstroemeria Bunch', color: 'White', colorTag: 'white-ivory', price: '28.00', file: 'white.png', mime: 'image/png', desc: 'Pure ivory — sympathy, weddings, and clean modern work.'},
  {handle: 'alstroemeria-yellow', title: 'Golden Alstroemeria Bunch', color: 'Yellow', colorTag: 'yellow-orange', price: '27.00', file: 'yellow.jpg', mime: 'image/jpeg', desc: 'Sunny golden yellow that lifts any mixed design.'},
];

const CHANNELS = ['Online Store', 'New Greenhouse Luxury Storefront'];

const out = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}

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

function buildInput(a, resourceUrl) {
  const descriptionHtml =
    `<p>${a.desc}</p>` +
    `<p>Fresh-cut Alstroemeria by the wholesale bunch (approx. 10 stems). ` +
    `Long vase life; colours may vary slightly by season. Hand-prepared in Kingston, Jamaica.</p>`;
  const input = {
    handle: a.handle,
    title: a.title,
    descriptionHtml,
    vendor: VENDOR,
    productType: 'Fresh Flowers',
    status: 'ACTIVE',
    tags: [`flower:alstroemeria`, `channel:wholesale`, `color:${a.colorTag}`, 'occasion:everyday'],
    seo: {title: `${a.title} | The New Greenhouse`, description: a.desc},
    productOptions: [{name: 'Title', values: [{name: 'Default Title'}]}],
    variants: [
      {
        price: a.price,
        sku: `ALS-${a.color.slice(0, 3).toUpperCase()}`,
        taxable: true,
        inventoryPolicy: 'CONTINUE',
        inventoryItem: {
          tracked: false,
          requiresShipping: true,
          measurement: {weight: {unit: 'GRAMS', value: 500}},
        },
        optionValues: [{optionName: 'Title', name: 'Default Title'}],
      },
    ],
  };
  if (resourceUrl) {
    input.files = [{originalSource: resourceUrl, contentType: 'IMAGE', alt: `${a.title} — The New Greenhouse`}];
  }
  return input;
}

async function stageImage(a) {
  const st = await adminGraphQL(STAGED, {
    input: [{filename: a.file, mimeType: a.mime, resource: 'IMAGE', httpMethod: 'POST'}],
  });
  if (st.stagedUploadsCreate.userErrors.length) {
    throw new Error(st.stagedUploadsCreate.userErrors.map((e) => e.message).join('; '));
  }
  const target = st.stagedUploadsCreate.stagedTargets[0];
  const buf = readFileSync(join(IMG_DIR, a.file));
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([buf], {type: a.mime}), a.file);
  const res = await fetch(target.url, {method: 'POST', body: form});
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`staged upload HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return target.resourceUrl;
}

async function main() {
  out('════════════════════════════════════════════════════════════');
  out(`  Alstroemeria products — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN (read-only)'}`);
  out('════════════════════════════════════════════════════════════');
  out('  7 buyable products · status ACTIVE · USD · untracked inventory\n');

  // Publications
  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const targets = CHANNELS.map((n) => pubs.find((p) => p.name === n)).filter(Boolean);
  out('▸ Publish targets:');
  targets.forEach((p) => out(`     • ${p.name}  —  ${p.id}`));
  if (targets.length === 0) out('     (none found — products would be created unpublished)');

  // Classify existing vs new
  const plan = [];
  for (const a of ARRANGEMENTS) {
    const found = await adminGraphQL(BY_HANDLE, {q: `handle:${a.handle}`});
    const exists = found.products.nodes[0];
    plan.push({a, exists: exists?.id ?? null});
  }

  out('\n▸ Plan:');
  for (const {a, exists} of plan) {
    out(`     ${exists ? '↺ exists (skip)' : '＋ create'}  ${a.handle.padEnd(22)} "${a.title}"  $${a.price}  [${a.file}]`);
  }
  const toCreate = plan.filter((p) => !p.exists);
  out(`\n   → to create: ${toCreate.length} · skip (already exist): ${plan.length - toCreate.length}`);

  if (!COMMIT) {
    out('\nDRY-RUN only. Nothing written. Re-run with --commit to create + publish.');
    return;
  }
  if (toCreate.length === 0) {
    out('\nNothing to create — all 7 already exist. No writes.');
    return;
  }
  if (!YES) {
    const ans = await ask(`\nType "CREATE" to create + publish ${toCreate.length} products: `);
    if (ans.trim() !== 'CREATE') return out('Cancelled — nothing written.');
  }

  const created = [];
  const pubInput = targets.map((p) => ({publicationId: p.id}));
  for (const {a} of toCreate) {
    try {
      out(`\n▸ ${a.handle}`);
      const resourceUrl = await stageImage(a);
      out('   ✓ image staged');
      const r = await adminGraphQL(PRODUCT_SET, {input: buildInput(a, resourceUrl)});
      if (r.productSet.userErrors.length) {
        out(`   ✗ ${r.productSet.userErrors.map((e) => e.message).join('; ')}`);
        continue;
      }
      const product = r.productSet.product;
      out(`   ✓ created ${product.id} (${product.status})`);
      if (pubInput.length) {
        const pub = await adminGraphQL(PUBLISH, {id: product.id, input: pubInput});
        if (pub.publishablePublish.userErrors.length) {
          out(`   ⚠ publish: ${pub.publishablePublish.userErrors.map((e) => e.message).join('; ')}`);
        } else {
          out(`   ✓ published to ${targets.length} channel(s)`);
        }
      }
      created.push({handle: a.handle, id: product.id, title: a.title});
    } catch (e) {
      out(`   ✗ ${redact(e.message)}`);
    }
    await sleep(300);
  }

  mkdirSync(OUT_DIR, {recursive: true});
  const manifest = {
    generatedAt: new Date().toISOString(),
    kind: 'alstroemeria-products',
    note: 'To roll back: productDelete each id (removes the product + its media).',
    products: created,
  };
  writeFileSync(join(OUT_DIR, 'alstroemeria-products-manifest.json'), JSON.stringify(manifest, null, 2));
  out(`\n════════════════════════════════════════════════════════════`);
  out(`  DONE — created ${created.length}/${toCreate.length}`);
  out(`  Rollback manifest: reports/private/alstroemeria-products-manifest.json`);
  out('════════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
