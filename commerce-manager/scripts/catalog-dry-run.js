// scripts/catalog-dry-run.js — READ-ONLY catalog dry-run.
// Reads the catalog package, compares it against the live Shopify store using
// read-only Admin GraphQL queries, and prints a plan. NO mutations. NO publishing.
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {
  SOURCE_FILES,
  fileStatus,
  loadDraftProducts,
  loadMasterData,
  loadCollectionPlan,
  loadMetafieldDefs,
  loadNavigationPlan,
} from '../src/catalog-files.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');
const lines = [];
const out = (s = '') => {
  console.log(s);
  lines.push(s);
};

// ---------- read-only store readers ----------
async function paginateHandles(field) {
  const handles = new Set();
  let after = null;
  for (let i = 0; i < 20; i++) {
    const data = await adminGraphQL(
      `#graphql
      query($after: String) {
        ${field}(first: 250, after: $after) {
          nodes { handle }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {after},
    );
    data[field].nodes.forEach((n) => handles.add(n.handle));
    if (!data[field].pageInfo.hasNextPage) break;
    after = data[field].pageInfo.endCursor;
  }
  return handles;
}

async function existingMetafieldKeys() {
  const data = await adminGraphQL(`#graphql
    query { metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: "custom") { nodes { key } } }`);
  return new Set(data.metafieldDefinitions.nodes.map((n) => n.key));
}
async function existingMenus() {
  const data = await adminGraphQL(`#graphql
    query { menus(first: 50) { nodes { handle title itemsCount: items { id } } } }`);
  return data.menus.nodes.map((n) => ({handle: n.handle, title: n.title, items: (n.itemsCount || []).length}));
}
async function existingPublications() {
  const data = await adminGraphQL(`#graphql
    query { publications(first: 25) { nodes { name } } }`);
  return data.publications.nodes.map((n) => n.name);
}

// ---------- validation ----------
function validateProduct(p) {
  const issues = [];
  if (!p.title) issues.push('missing title');
  if (!p.variants.length) issues.push('no variants');
  for (const v of p.variants) {
    if (!v.sku) issues.push('variant missing SKU');
    if (!(Number(v.price) > 0)) issues.push(`variant price not > 0 (${v.sku || '?'})`);
  }
  if ((p.status || '').toLowerCase() !== 'draft') issues.push(`status is "${p.status}" (expected draft)`);
  if ((p.published || '').toUpperCase() !== 'FALSE') issues.push('Published is not FALSE');
  return issues;
}

// ---------- main ----------
async function main() {
  out('════════════════════════════════════════════════════════════');
  out('  TNG Commerce Manager — CATALOG DRY-RUN (read-only, no writes)');
  out('════════════════════════════════════════════════════════════');

  // 1) validate files
  out('\n▸ 1. Catalog files');
  const files = fileStatus();
  let missing = 0;
  for (const f of files) {
    out(`   ${f.exists ? '✓' : '✗'} ${f.file}`);
    if (!f.exists) missing++;
  }
  if (missing) {
    out(`\n✗ ${missing} required file(s) missing — aborting dry-run (nothing was queried).`);
    process.exitCode = 1;
    return finish();
  }

  const products = loadDraftProducts();
  const master = loadMasterData();
  const collections = loadCollectionPlan();
  const metafields = loadMetafieldDefs();
  const nav = loadNavigationPlan();
  const totalVariants = products.reduce((a, p) => a + p.variants.length, 0);

  // 2) validation errors
  out('\n▸ 2. Validation');
  const validationErrors = [];
  const allSkus = products.flatMap((p) => p.variants.map((v) => v.sku));
  if (new Set(products.map((p) => p.handle)).size !== products.length) validationErrors.push('duplicate product handles in CSV');
  if (new Set(allSkus).size !== allSkus.length) validationErrors.push('duplicate SKUs in CSV');
  const perProductIssues = new Map();
  for (const p of products) {
    const issues = validateProduct(p);
    if (issues.length) perProductIssues.set(p.handle, issues);
  }
  if (!validationErrors.length && !perProductIssues.size) out('   ✓ no validation errors');
  else {
    validationErrors.forEach((e) => out(`   ✗ ${e}`));
    for (const [h, iss] of perProductIssues) out(`   ✗ ${h}: ${iss.join('; ')}`);
  }

  // Query the live store (read-only). Each read is resilient — an unsupported
  // query degrades gracefully instead of aborting the whole dry-run.
  out('\n▸ Reading current Shopify store (read-only)…');
  const safe = async (label, fn, fallback) => {
    try {
      return await fn();
    } catch (e) {
      out(`   ⚠ ${label}: ${redact(e.message)}`);
      return fallback;
    }
  };
  const storeProducts = await safe('products', () => paginateHandles('products'), new Set());
  const storeCollections = await safe('collections', () => paginateHandles('collections'), new Set());
  const storeMfKeys = await safe('metafield definitions', existingMetafieldKeys, new Set());
  const storePages = await safe('pages', () => paginateHandles('pages'), new Set());
  const storeMenus = await safe('menus', existingMenus, []);
  const pubs = await safe('publications', existingPublications, []);
  out(`   store has: ${storeProducts.size} products, ${storeCollections.size} collections, ${storePages.size} pages, ${storeMenus.length} menus, ${pubs.length} publications`);

  // 3) products
  const toCreate = [];
  const alreadyExist = [];
  const toSkip = [];
  for (const p of products) {
    if (perProductIssues.has(p.handle)) toSkip.push(p);
    else if (storeProducts.has(p.handle)) alreadyExist.push(p);
    else toCreate.push(p);
  }
  const variantsToCreate = toCreate.reduce((a, p) => a + p.variants.length, 0);
  out('\n▸ 3. Products');
  out(`   catalog:            ${products.length} products / ${totalVariants} variants`);
  out(`   → to create (DRAFT): ${toCreate.length} products / ${variantsToCreate} variants`);
  out(`   → already exist:     ${alreadyExist.length} (would skip)`);
  out(`   → skip (needs fix):  ${toSkip.length}`);
  if (toSkip.length) toSkip.slice(0, 10).forEach((p) => out(`       • ${p.handle}: ${perProductIssues.get(p.handle).join('; ')}`));
  sampleList('   first to create:', toCreate.map((p) => p.handle));

  // 4) collections
  const collToCreate = collections.filter((c) => !storeCollections.has(c.handle));
  const collExist = collections.filter((c) => storeCollections.has(c.handle));
  out('\n▸ 4. Collections (automated/smart)');
  out(`   planned: ${collections.length}  → to create: ${collToCreate.length}  → already exist: ${collExist.length}`);
  sampleList('   to create:', collToCreate.map((c) => c.handle));
  if (collExist.length) sampleList('   exist (skip):', collExist.map((c) => c.handle));

  // 5) metafield definitions
  const mfToCreate = metafields.filter((d) => !storeMfKeys.has(d.key));
  out('\n▸ 5. Metafield definitions (custom.* on products)');
  out(`   defined in md: ${metafields.length}  → to create: ${mfToCreate.length}  → already exist: ${metafields.length - mfToCreate.length}`);
  sampleList('   to create:', mfToCreate.map((d) => `custom.${d.key} (${d.type})`));

  // 6) pages
  const pagesNeeded = nav.referencedPages;
  const pagesToCreate = pagesNeeded.filter((h) => !storePages.has(h));
  out('\n▸ 6. Pages (referenced by navigation plan)');
  out(`   referenced: ${pagesNeeded.length} [${pagesNeeded.join(', ') || '—'}]`);
  out(`   → to create: ${pagesToCreate.length} [${pagesToCreate.join(', ') || 'none — all referenced pages exist'}]`);
  out('   (page bodies are authored in Shopify; the importer creates only missing pages, never overwrites)');

  // 7) navigation
  out('\n▸ 7. Navigation changes');
  out(`   plan proposes ${nav.items.length} top-level main-menu items: ${nav.items.map((i) => i.label).join(', ') || '—'}`);
  storeMenus.forEach((m) => out(`   store menu exists: "${m.handle}" (${m.title}, ${m.items} items) — would NOT be overwritten`));
  const menusToCreate = ['main-menu', 'footer'].filter((h) => !storeMenus.some((m) => m.handle === h));
  out(`   → menus to create (absent only): ${menusToCreate.length ? menusToCreate.join(', ') : 'none'}`);
  out('   (existing menus are never modified without explicit approval — item-level changes are a separate step)');

  // 8) publications
  out('\n▸ 8. Publications required');
  out(`   available channels: ${pubs.join(', ') || '—'}`);
  out('   → products would be assigned to a channel ONLY in a later, explicitly-approved step.');
  out('   → assigned now: 0 (dry-run).');

  // summary
  out('\n════════════════════════════════════════════════════════════');
  out('  SUMMARY (dry-run — nothing was written)');
  out('════════════════════════════════════════════════════════════');
  out(`  products to create ....... ${toCreate.length}`);
  out(`  variants to create ....... ${variantsToCreate}`);
  out(`  products already exist ... ${alreadyExist.length}`);
  out(`  products skipped (fix) ... ${toSkip.length}`);
  out(`  collections to create .... ${collToCreate.length} (of ${collections.length})`);
  out(`  metafield defs to create . ${mfToCreate.length} (of ${metafields.length})`);
  out(`  pages to create .......... ${pagesToCreate.length}`);
  out(`  menus to create .......... ${menusToCreate.length}`);
  out(`  publications available ... ${pubs.length}`);
  out(`  validation errors ........ ${validationErrors.length + perProductIssues.size}`);
  out('\n✓ Dry-run complete. No mutations. No publishing. Storefront untouched.');
  finish();
}

function sampleList(label, arr) {
  if (!arr.length) return;
  out(`${label} ${arr.slice(0, 8).join(', ')}${arr.length > 8 ? `, …(+${arr.length - 8})` : ''}`);
}

function finish() {
  try {
    mkdirSync(OUT_DIR, {recursive: true});
    const path = join(OUT_DIR, 'catalog-dry-run.md');
    writeFileSync(path, '```\n' + lines.join('\n') + '\n```\n', 'utf8');
    console.log(`\n(report written to commerce-manager/reports/private/catalog-dry-run.md — gitignored)`);
  } catch {
    /* non-fatal */
  }
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
