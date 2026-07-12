// scripts/catalog-full.js — Phase 2: import remaining catalog products as DRAFT.
// DRY-RUN by default. Live import requires --commit + typed confirmation.
// Batches of 20, stops if any batch has > 2 Shopify user errors. Never publishes,
// never overwrites existing (matched by handle), no images. Idempotent by handle.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {buildProductSetInput} from '../src/pilot.js';
import {catalogPath} from '../src/catalog-files.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const numArg = (name, def) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) || def : def;
};
const BATCH_SIZE = numArg('batch-size', 20);
const MAX_ERRORS = numArg('max-errors', 2);
const CONFIRM_PHRASE = 'IMPORT REMAINING CATALOG';

const lines = [];
const out = (s = '') => {
  console.log(s);
  lines.push(s);
};

const BY_HANDLE_PAGE = `#graphql
  query H($after: String) {
    products(first: 250, after: $after) { nodes { handle } pageInfo { hasNextPage endCursor } }
  }`;
const SKU_PAGE = `#graphql
  query S($after: String) {
    productVariants(first: 250, after: $after) { nodes { sku } pageInfo { hasNextPage endCursor } }
  }`;
const PRODUCT_SET = `#graphql
  mutation Set($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle status variantsCount { count } }
      userErrors { field message }
    }
  }`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}
async function paginate(query, field) {
  const set = new Set();
  let after = null;
  for (let i = 0; i < 40; i++) {
    const d = await adminGraphQL(query, {after});
    d[field].nodes.forEach((n) => n[field === 'products' ? 'handle' : 'sku'] && set.add(n[field === 'products' ? 'handle' : 'sku']));
    if (!d[field].pageInfo.hasNextPage) break;
    after = d[field].pageInfo.endCursor;
  }
  return set;
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ---- rollback manifest (consolidated: pilot + full) ----
function loadManifest() {
  const map = new Map();
  for (const f of ['rollback-manifest.json', 'pilot-rollback.json']) {
    const p = join(OUT_DIR, f);
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      for (const e of j.products || j.pilotProducts || []) {
        if (e.handle && e.id) map.set(e.handle, {handle: e.handle, id: e.id, category: e.category, status: e.status || 'DRAFT', source: e.source || 'prior'});
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}
function writeManifest(map) {
  mkdirSync(OUT_DIR, {recursive: true});
  const products = [...map.values()];
  writeFileSync(
    join(OUT_DIR, 'rollback-manifest.json'),
    JSON.stringify(
      {generatedAt: new Date().toISOString(), kind: 'catalog-import', count: products.length, note: 'DRAFT products, not published. Roll back via productDelete on these IDs.', products},
      null,
      2,
    ),
    'utf8',
  );
}
function saveReport(kind) {
  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `import-report-${kind}-${ts}.md`;
  writeFileSync(join(OUT_DIR, name), '```\n' + lines.join('\n') + '\n```\n', 'utf8');
  console.log(`\n(report: commerce-manager/reports/private/${name})`);
}

function validateProduct(p) {
  const issues = [];
  if (!p.title) issues.push('missing title');
  if (!p.handle) issues.push('missing handle');
  if (!p.variants?.length) issues.push('no variants');
  for (const v of p.variants || []) {
    if (!v.sku) issues.push('variant missing SKU');
    if (!(Number(v.price) > 0)) issues.push('variant price not > 0');
  }
  return issues;
}

async function main() {
  const products = JSON.parse(readFileSync(catalogPath('product-master-data.json'), 'utf8'));
  out('════════════════════════════════════════════════════════════');
  out(`  TNG Commerce Manager — FULL CATALOG IMPORT (Phase 2) — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  out('════════════════════════════════════════════════════════════');
  out(`  batch size: ${BATCH_SIZE}   stop if a batch exceeds ${MAX_ERRORS} user errors`);
  out('  DRAFT only · no publishing · no images · skip existing by handle · no overwrite\n');

  // catalog-internal validation
  const handles = products.map((p) => p.handle);
  const skus = products.flatMap((p) => (p.variants || []).map((v) => v.sku));
  const dupHandles = handles.filter((h, i) => handles.indexOf(h) !== i);
  const dupSkus = skus.filter((s, i) => skus.indexOf(s) !== i);
  const invalid = products.filter((p) => validateProduct(p).length);

  // read store (read-only)
  out('▸ Reading current Shopify store (read-only)…');
  const storeHandles = await paginate(BY_HANDLE_PAGE, 'products');
  const storeSkus = await paginate(SKU_PAGE, 'productVariants');
  out(`   store has ${storeHandles.size} products, ${storeSkus.size} variant SKUs`);

  // partition
  const skipped = []; // validation failures
  const existing = []; // already in store (incl. pilot 5) — excluded
  const toCreate = [];
  for (const p of products) {
    if (validateProduct(p).length) skipped.push(p);
    else if (storeHandles.has(p.handle)) existing.push(p);
    else toCreate.push(p);
  }
  const variantsToCreate = toCreate.reduce((a, p) => a + (p.variants?.length || 0), 0);
  const batches = chunk(toCreate, BATCH_SIZE);

  out('\n▸ Plan');
  out(`   catalog total ................ ${products.length} products / ${skus.length} variants`);
  out(`   already in store (excluded) .. ${existing.length}  [${existing.map((p) => p.handle).slice(0, 6).join(', ')}${existing.length > 6 ? ', …' : ''}]`);
  out(`   validation failures (skip) ... ${skipped.length}`);
  out(`   → REMAINING to create ........ ${toCreate.length} products / ${variantsToCreate} variants`);
  out(`   duplicate handles (catalog) .. ${new Set(dupHandles).size}`);
  out(`   duplicate SKUs (catalog) ..... ${new Set(dupSkus).size}`);
  out(`   estimated batches (of ${BATCH_SIZE}) ..... ${batches.length}`);
  if (invalid.length) invalid.forEach((p) => out(`     ✗ ${p.handle}: ${validateProduct(p).join('; ')}`));

  if (!COMMIT) {
    out('\nDRY-RUN only. No data written. Nothing published.');
    out('To import for real (after approval):  npm run catalog:full:import');
    saveReport('dryrun');
    return;
  }

  // ---- LIVE ----
  if (!toCreate.length) {
    out('\nNothing to create — all products already exist. No mutations.');
    saveReport('live');
    return;
  }
  if (!YES) {
    const answer = await ask(`\nType "${CONFIRM_PHRASE}" to create ${toCreate.length} DRAFT products in ${batches.length} batches (anything else cancels): `);
    if (answer.trim() !== CONFIRM_PHRASE) {
      out('Cancelled — no mutations performed.');
      return;
    }
  }

  const manifest = loadManifest();
  const created = [];
  const failed = [];
  const allUserErrors = [];
  let createdVariants = 0;
  let stopped = false;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    out(`\n──────── Batch ${b + 1}/${batches.length} (${batch.length} products) ────────`);
    let batchErrorProducts = 0;

    for (const p of batch) {
      try {
        const data = await adminGraphQL(PRODUCT_SET, {input: buildProductSetInput(p)});
        const ue = data.productSet.userErrors || [];
        const prod = data.productSet.product;
        if (ue.length) {
          ue.forEach((e) => out(`   ⚠ ${p.handle} [${(e.field || []).join('.')}]: ${e.message}`));
          allUserErrors.push({handle: p.handle, userErrors: ue});
          batchErrorProducts++;
          if (!prod) {
            failed.push({handle: p.handle, reason: 'userErrors', userErrors: ue});
            continue;
          }
        }
        if (prod) {
          const vc = prod.variantsCount?.count ?? p.variants.length;
          createdVariants += vc;
          created.push({category: p.category, handle: prod.handle, id: prod.id, status: prod.status, variants: vc, source: 'created'});
          manifest.set(prod.handle, {handle: prod.handle, id: prod.id, category: p.category, status: prod.status, source: 'created'});
          out(`   ✓ ${prod.handle} → ${prod.id} (${prod.status}, ${vc} variants)`);
        }
      } catch (e) {
        out(`   ✗ ${p.handle}: ${redact(e.message)}`);
        failed.push({handle: p.handle, error: redact(e.message)});
        batchErrorProducts++;
      }
      await sleep(250); // gentle pacing
    }

    writeManifest(manifest); // persist progress after each batch
    out(`   batch ${b + 1} summary: ${batchErrorProducts} error product(s)`);
    if (batchErrorProducts > MAX_ERRORS) {
      out(`\n⛔ STOP: batch ${b + 1} had ${batchErrorProducts} user errors (> ${MAX_ERRORS}). Halting import.`);
      stopped = true;
      break;
    }
  }

  out('\n════════════════════════════════════════════════════════════');
  out(`  ${stopped ? 'IMPORT HALTED' : 'IMPORT COMPLETE'}`);
  out(`  created products ..... ${created.length}`);
  out(`  created variants ..... ${createdVariants}`);
  out(`  existing (skipped) ... ${existing.length}`);
  out(`  validation skipped ... ${skipped.length}`);
  out(`  failed products ...... ${failed.length}`);
  out(`  user errors .......... ${allUserErrors.length}`);
  out(`  Nothing published to any sales channel.`);
  out(`  Rollback manifest: reports/private/rollback-manifest.json (${manifest.size} products total)`);
  out('════════════════════════════════════════════════════════════');
  if (failed.length) {
    out('  Failed:');
    failed.forEach((f) => out(`    ✗ ${f.handle}: ${f.reason ? JSON.stringify(f.userErrors) : f.error}`));
  }
  saveReport('live');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
