// scripts/catalog-pilot.js — controlled 5-product pilot import.
// DRY-RUN by default. Live import requires --commit AND a typed confirmation.
// Products are created DRAFT, no images, no publishing. Existing handles are skipped.
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {selectPilotProducts, buildProductSetInput, pilotSummary} from '../src/pilot.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const CONFIRM_PHRASE = 'IMPORT 5 PILOT PRODUCTS';

const BY_HANDLE = `#graphql
  query P($handle: String!) { productByHandle(handle: $handle) { id status } }
`;
const PRODUCT_SET = `#graphql
  mutation SetProduct($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle status variantsCount { count } }
      userErrors { field message }
    }
  }
`;

function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}

async function main() {
  const pilots = selectPilotProducts();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  TNG Commerce Manager — PILOT IMPORT (5 products) — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Constraints: DRAFT only · no images · no publishing · skip existing by handle\n');

  // Read-only existence check + display
  const decisions = [];
  for (const p of pilots) {
    let existing = null;
    try {
      const data = await adminGraphQL(BY_HANDLE, {handle: p.handle});
      existing = data.productByHandle;
    } catch (e) {
      console.error(`  ✗ lookup ${p.handle}: ${redact(e.message)}`);
    }
    const s = pilotSummary(p);
    const action = existing ? 'SKIP (already exists)' : 'CREATE (draft)';
    decisions.push({p, existing, action});
    console.log(`▸ [${s.category}] ${s.title}`);
    console.log(`    handle:   ${s.handle}`);
    console.log(`    type:     ${s.productType}   vendor: The New Greenhouse   status: DRAFT`);
    console.log(`    variants: ${s.variantCount} (${s.options})   prices: ${s.prices}`);
    console.log(`    tags:     ${s.tagCount}   seo: "${s.seoTitle}"`);
    console.log(`    → action: ${action}\n`);
  }

  const toCreate = decisions.filter((d) => !d.existing);
  const toSkip = decisions.filter((d) => d.existing);
  console.log('────────────────────────────────────────────');
  console.log(`  Would CREATE (draft): ${toCreate.length}   |   SKIP (exists): ${toSkip.length}`);
  console.log(`  Variants to create:   ${toCreate.reduce((a, d) => a + d.p.variants.length, 0)}`);
  console.log('────────────────────────────────────────────');

  if (!COMMIT) {
    console.log('\nDRY-RUN only. No data was written. Nothing published.');
    console.log('To import for real (after approval):  npm run catalog:pilot:import');
    return;
  }

  // ---- LIVE COMMIT PATH ----
  if (!toCreate.length) {
    console.log('\nNothing to create (all exist). No mutations performed.');
    return;
  }
  if (!YES) {
    const answer = await ask(`\nType "${CONFIRM_PHRASE}" to create ${toCreate.length} DRAFT products (anything else cancels): `);
    if (answer.trim() !== CONFIRM_PHRASE) {
      console.log('Cancelled — no mutations performed.');
      return;
    }
  }

  const created = [];
  const errors = [];
  for (const {p} of toCreate) {
    const input = buildProductSetInput(p);
    console.log(`\n→ MUTATION productSet: ${p.handle} (${input.variants.length} variants, DRAFT)`);
    try {
      const data = await adminGraphQL(PRODUCT_SET, {input});
      const ue = data.productSet.userErrors || [];
      if (ue.length) {
        ue.forEach((e) => console.error(`   ⚠ userError [${(e.field || []).join('.')}]: ${e.message}`));
        errors.push({handle: p.handle, userErrors: ue});
      }
      const prod = data.productSet.product;
      if (prod) {
        console.log(`   ✓ created: ${prod.id} (${prod.handle}) status=${prod.status} variants=${prod.variantsCount?.count}`);
        created.push({category: p.pilotCategory, handle: prod.handle, id: prod.id, status: prod.status, variants: prod.variantsCount?.count ?? input.variants.length});
      }
    } catch (e) {
      console.error(`   ✗ ${p.handle}: ${redact(e.message)}`);
      errors.push({handle: p.handle, error: redact(e.message)});
    }
  }

  // Rollback manifest — full pilot set (created this run + already-existing), each with ID.
  const existingSkipped = toSkip
    .filter((d) => d.existing)
    .map((d) => ({category: d.p.pilotCategory, handle: d.p.handle, id: d.existing.id, status: d.existing.status, source: 'existing'}));
  const pilotProducts = [...created.map((c) => ({...c, source: 'created'})), ...existingSkipped];
  const manifest = {
    generatedAt: new Date().toISOString(),
    kind: 'pilot-import',
    note: 'Products are DRAFT, not published. To roll back, delete these product IDs in Shopify admin or via productDelete.',
    createdThisRun: created.length,
    pilotTotal: pilotProducts.length,
    pilotProducts,
    errors,
  };
  mkdirSync(OUT_DIR, {recursive: true});
  const manifestPath = join(OUT_DIR, 'pilot-rollback.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  PILOT COMPLETE — created ${created.length}/${toCreate.length} DRAFT products, ${errors.length} error(s)`);
  console.log('  Nothing was published to any sales channel.');
  console.log(`  Rollback manifest: commerce-manager/reports/private/pilot-rollback.json`);
  console.log('════════════════════════════════════════════════════════════');
  created.forEach((c) => console.log(`   ${c.handle}  ${c.id}  (${c.status})`));
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
