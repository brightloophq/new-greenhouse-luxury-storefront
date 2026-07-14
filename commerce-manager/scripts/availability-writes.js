// Make every ACTIVE product available to order — untracked inventory + CONTINUE
// policy ("no invented stock"): nothing shows Sold Out. Prices are NOT touched.
// DRY-RUN by default; --commit to write. Rollback manifest captures prior state.
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const COMMIT = process.argv.includes('--commit');
const ts = process.env.NOW_TS || 'manual';
const ue = (o) => (o?.userErrors || []).map((e) => e.message).join('; ');

const PRODUCTS = `#graphql
  query($cursor:String){ products(first:100, after:$cursor, query:"status:active"){
    pageInfo{ hasNextPage endCursor }
    nodes{ id handle status
      variants(first:25){ nodes{ id availableForSale inventoryPolicy inventoryItem{ id tracked } } } } } }`;
const VARIANTS_UPDATE = `#graphql
  mutation($productId:ID!, $variants:[ProductVariantsBulkInput!]!){
    productVariantsBulkUpdate(productId:$productId, variants:$variants){
      productVariants{ id } userErrors{ field message } } }`;

/** A variant needs the change if it is tracked or its policy denies overselling. */
const needsFix = (v) => v.inventoryItem?.tracked === true || v.inventoryPolicy === 'DENY';

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  AVAILABILITY WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'} (untracked + CONTINUE)`);
  console.log('════════════════════════════════════════════════════════════');

  const all = [];
  let cursor = null;
  do {
    const r = await adminGraphQL(PRODUCTS, {cursor});
    all.push(...r.products.nodes);
    cursor = r.products.pageInfo.hasNextPage ? r.products.pageInfo.endCursor : null;
  } while (cursor);

  const rollback = {};
  const plan = [];
  let variantCount = 0;
  for (const p of all) {
    const fix = p.variants.nodes.filter(needsFix);
    if (!fix.length) continue;
    rollback[p.handle] = {
      id: p.id,
      variants: p.variants.nodes.map((v) => ({
        id: v.id,
        inventoryPolicy: v.inventoryPolicy,
        tracked: v.inventoryItem?.tracked,
      })),
    };
    plan.push({
      id: p.id,
      handle: p.handle,
      variants: fix.map((v) => ({
        id: v.id,
        inventoryPolicy: 'CONTINUE',
        inventoryItem: {tracked: false},
      })),
    });
    variantCount += fix.length;
  }

  console.log(`\n  active products scanned: ${all.length}`);
  console.log(`  products needing availability fix: ${plan.length} (${variantCount} variants)`);

  mkdirSync(join(CM, 'rollback'), {recursive: true});
  const rbPath = join(CM, 'rollback', `availability-${ts}.json`);
  writeFileSync(rbPath, JSON.stringify(rollback, null, 2));
  console.log(`  rollback → ${rbPath}`);

  if (!COMMIT) {
    console.log(`\n  sample: ${plan.slice(0, 8).map((p) => p.handle).join(', ')}${plan.length > 8 ? ' …' : ''}`);
    console.log('\n  DRY-RUN — no writes. Re-run with --commit.');
    return;
  }

  console.log('\n── updating variants → untracked + CONTINUE ──');
  let ok = 0, err = 0;
  for (const p of plan) {
    try {
      const r = await adminGraphQL(VARIANTS_UPDATE, {productId: p.id, variants: p.variants});
      if (ue(r.productVariantsBulkUpdate)) throw new Error(ue(r.productVariantsBulkUpdate));
      ok++;
      if (ok % 25 === 0) console.log(`   … ${ok}/${plan.length}`);
    } catch (e) {
      err++;
      console.error(`   ✗ ${p.handle}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`\n  DONE — updated ${ok} products · errors ${err}`);
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
