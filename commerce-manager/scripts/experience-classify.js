// scripts/experience-classify.js — STEPS 2-4 + 6: DRY-RUN (read-only).
//
// Loads the Step-1 audit, then:
//   • Step 2 — inspects whether custom.experience (PRODUCT) already exists and
//     reports type/validations/incompatibility. Prepares (but never runs) the
//     metafieldDefinitionCreate.
//   • Step 3 — classification dry-run counts (total / classic / deluxe / both /
//     needs-review, existing values, would-change, ambiguous, duplicates,
//     missing data, wedding/corporate-associated).
//   • Step 4 — writes config/product-experience-map.csv (approved=false).
//   • Step 6 — collection gap report vs the approved structure.
//
// Performs NO mutations. Nothing is created, set, published, or deleted.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact, safeSummary} from '../src/config.js';
import {
  METAFIELD,
  CSV_HEADER,
  toCsvRow,
  summarize,
  REQUIRED_CLASSIC_COLLECTIONS,
  REQUIRED_DELUXE_COLLECTIONS,
  WEDDING_CORPORATE_COLLECTIONS,
} from '../src/experience.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM_ROOT = join(HERE, '..');
const PRIVATE = join(CM_ROOT, 'reports', 'private');
const CONFIG = join(CM_ROOT, 'config');
const AUDIT_JSON = join(PRIVATE, 'experience-classification-audit.json');

const DEF_QUERY = `#graphql
  query {
    metafieldDefinitions(first: 25, ownerType: PRODUCT, namespace: "custom") {
      nodes {
        id name namespace key
        ownerType
        type { name }
        validations { name value }
      }
    }
  }`;

const COLLECTIONS_QUERY = `#graphql
  query($after: String) {
    collections(first: 250, after: $after) {
      nodes { handle title productsCount { count } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

async function fetchCollections() {
  const map = new Map();
  let after = null;
  for (let i = 0; i < 20; i++) {
    const d = await adminGraphQL(COLLECTIONS_QUERY, {after});
    for (const n of d.collections.nodes) map.set(n.handle, {title: n.title, count: n.productsCount?.count ?? 0});
    if (!d.collections.pageInfo.hasNextPage) break;
    after = d.collections.pageInfo.endCursor;
  }
  return map;
}

async function main() {
  const store = safeSummary();
  console.log('════════════════════════════════════════════════════════════');
  console.log('  EXPERIENCE — STEPS 2-4 + 6 · DRY-RUN (read-only)');
  console.log(`  store: ${store.store} · api: ${store.apiVersion}`);
  console.log('  No mutations. Nothing created, set, published, or deleted.');
  console.log('════════════════════════════════════════════════════════════\n');

  if (!existsSync(AUDIT_JSON)) {
    console.error('  ✗ Missing audit. Run  npm run experience:audit  first.');
    process.exitCode = 1;
    return;
  }
  const audit = JSON.parse(readFileSync(AUDIT_JSON, 'utf8'));
  const rows = audit.products;
  const s = summarize(rows);

  // ---- STEP 2 — metafield definition dry-run ----
  console.log('▸ STEP 2 — Metafield definition (custom.experience, PRODUCT)');
  let defReport = {exists: false};
  try {
    const d = await adminGraphQL(DEF_QUERY);
    const found = d.metafieldDefinitions.nodes.find((n) => n.key === METAFIELD.key);
    if (found) {
      const typeName = found.type?.name;
      const compatible = typeName === METAFIELD.type && found.ownerType === METAFIELD.ownerType;
      defReport = {
        exists: true,
        id: found.id,
        ownerType: found.ownerType,
        type: typeName,
        validations: found.validations || [],
        compatible,
      };
      console.log(`   • EXISTS: ${found.id}`);
      console.log(`     ownerType=${found.ownerType} type=${typeName}`);
      console.log(`     validations=${JSON.stringify(found.validations || [])}`);
      console.log(
        compatible
          ? '     ✓ compatible with the intended definition — will NOT be replaced.'
          : `     ⚠ INCOMPATIBLE (expected type ${METAFIELD.type}, ownerType ${METAFIELD.ownerType}). Do not replace blindly — resolve manually.`,
      );
    } else {
      console.log('   • Does NOT exist. Live apply would create:');
      console.log(`     namespace=${METAFIELD.namespace} key=${METAFIELD.key} name="${METAFIELD.name}"`);
      console.log(`     ownerType=${METAFIELD.ownerType} type=${METAFIELD.type}`);
      console.log(`     validations=[{name:"choices", value:${JSON.stringify(JSON.stringify(METAFIELD.choices))}}]`);
    }
  } catch (e) {
    console.log('   ✗ could not read definitions: ' + redact(e.message));
  }

  // ---- STEP 3 — classification dry-run ----
  const nr = rows.filter((r) => r.proposedExperience === 'needs-review');
  console.log('\n▸ STEP 3 — Classification dry-run (no mutations)');
  console.log(`   total products ......... ${s.total}`);
  console.log(`   classic ................ ${s.counts.classic || 0}`);
  console.log(`   deluxe ................. ${s.counts.deluxe || 0}`);
  console.log(`   both ................... ${s.counts.both || 0}`);
  console.log(`   needs-review .......... ${s.counts['needs-review'] || 0}`);
  console.log(`   with existing value .... ${s.withExisting}`);
  console.log(`   would change/set ....... ${s.wouldChange} (all are currently unset)`);
  console.log(`   skipped (already equal)  ${s.total - s.wouldChange}`);
  console.log(`   ambiguous (needs-review) ${nr.length}`);
  console.log(`   duplicate handles ...... ${s.duplicateHandles.length}`);
  console.log(`   missing product data ... ${s.incompleteData.length} (no image / placeholder price)`);
  console.log(`   wedding-associated ..... ${s.weddingAssociated.length}`);
  console.log(`   corporate-associated ... ${s.corporateAssociated.length}`);

  // ---- STEP 4 — reviewable CSV ----
  mkdirSync(CONFIG, {recursive: true});
  const csv = [CSV_HEADER.join(','), ...rows.map(toCsvRow)].join('\n') + '\n';
  const csvPath = join(CONFIG, 'product-experience-map.csv');
  writeFileSync(csvPath, csv, 'utf8');
  console.log(`\n▸ STEP 4 — wrote reviewable mapping (approved=false):`);
  console.log(`   commerce-manager/config/product-experience-map.csv`);

  // ---- STEP 6 — collection gap report ----
  console.log('\n▸ STEP 6 — Collection gap report');
  const live = await fetchCollections();
  const gap = {classic: [], deluxe: [], weddingCorporate: [], empty: [], duplicatesOverlap: []};

  function checkReq(list, bucket) {
    for (const req of list) {
      if (!req.handle) {
        gap[bucket].push({name: req.name, handle: '(none)', state: 'grouping', note: req.note || ''});
        continue;
      }
      const c = live.get(req.handle);
      if (!c) gap[bucket].push({name: req.name, handle: req.handle, state: 'MISSING'});
      else if ((c.count ?? 0) === 0) gap[bucket].push({name: req.name, handle: req.handle, state: 'EXISTS-EMPTY'});
      else gap[bucket].push({name: req.name, handle: req.handle, state: `EXISTS (${c.count})`});
    }
  }
  checkReq(REQUIRED_CLASSIC_COLLECTIONS, 'classic');
  checkReq(REQUIRED_DELUXE_COLLECTIONS, 'deluxe');
  for (const h of WEDDING_CORPORATE_COLLECTIONS) {
    const c = live.get(h);
    if (c) gap.weddingCorporate.push({handle: h, count: c.count, note: 'excluded scope — hide from active nav'});
  }
  for (const [h, c] of live) if ((c.count ?? 0) === 0) gap.empty.push(h);

  console.log('   CLASSIC required:');
  gap.classic.forEach((g) => console.log(`     ${String(g.state).padEnd(16)} ${g.name} (${g.handle})`));
  console.log('   DELUXE required:');
  gap.deluxe.forEach((g) => console.log(`     ${String(g.state).padEnd(16)} ${g.name} (${g.handle})`));
  console.log(`   Wedding/Corporate live collections (hide from active nav): ${gap.weddingCorporate.map((g) => `${g.handle}(${g.count})`).join(', ') || 'none'}`);
  console.log(`   Empty collections: ${gap.empty.join(', ') || 'none'}`);
  console.log('   Note: the 25 flower "types" are filter facets on all-flowers, not separate collections (by design).');

  // persist the gap report as JSON for the record
  writeFileSync(
    join(PRIVATE, 'experience-collection-gap.json'),
    JSON.stringify({generatedAt: new Date().toISOString(), definition: defReport, gap}, null, 2),
    'utf8',
  );

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  DRY-RUN COMPLETE — no Shopify data changed.');
  console.log('  Review commerce-manager/config/product-experience-map.csv, set approved=true');
  console.log('  on the rows you accept, then (after explicit approval) run:');
  console.log('    npm run experience:apply   (still requires --commit + typed confirm)');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
