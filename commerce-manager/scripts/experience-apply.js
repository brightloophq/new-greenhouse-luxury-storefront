// scripts/experience-apply.js — STEP 5: LIVE APPLY (guarded).
//
// PREVIEW by default. A real write requires BOTH --commit AND the typed phrase
// "APPLY EXPERIENCE". Only rows with approved=true in
// config/product-experience-map.csv are processed.
//
// Safety contract (enforced below):
//   • Creates the custom.experience definition ONLY if it does not exist.
//   • Sets values with metafieldsSet in batches of <= 25.
//   • Writes a rollback manifest of previous values BEFORE any write.
//   • Never alters titles, descriptions, variants, prices, inventory, images,
//     product status, or publication state. Never deletes an existing metafield.
//   • Stops on unexpected Shopify userErrors.
//
// DO NOT RUN until the mapping is explicitly approved.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact, safeSummary} from '../src/config.js';
import {METAFIELD} from '../src/experience.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM_ROOT = join(HERE, '..');
const PRIVATE = join(CM_ROOT, 'reports', 'private');
const CSV_PATH = join(CM_ROOT, 'config', 'product-experience-map.csv');

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const CONFIRM_PHRASE = 'APPLY EXPERIENCE';
const BATCH = 25;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}

// --- minimal RFC-4180-ish CSV parser ---------------------------------------
function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') rows.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const DEF_QUERY = `#graphql
  query { metafieldDefinitions(first: 25, ownerType: PRODUCT, namespace: "custom") {
    nodes { id key ownerType type { name } } } }`;
const DEF_CREATE = `#graphql
  mutation D($def: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $def) {
      createdDefinition { id key }
      userErrors { field message code }
    }
  }`;
const READ_VALUES = `#graphql
  query($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id handle metafield(namespace: "custom", key: "experience") { value } }
    }
  }`;
const MF_SET = `#graphql
  mutation S($mf: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $mf) {
      metafields { id key value ownerType }
      userErrors { field message code }
    }
  }`;

const ueMessages = (payload) =>
  (payload?.userErrors || []).map((e) => `${(e.field || []).join('.')}${e.code ? ` (${e.code})` : ''}: ${e.message}`.replace(/^: /, ''));

const chunk = (arr, n) => Array.from({length: Math.ceil(arr.length / n)}, (_, i) => arr.slice(i * n, i * n + n));

async function main() {
  const store = safeSummary();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  EXPERIENCE — STEP 5 · ${COMMIT ? 'LIVE APPLY' : 'PREVIEW (read-only)'}`);
  console.log(`  store: ${store.store} · api: ${store.apiVersion}`);
  console.log('  Metafield-only. No titles/prices/variants/inventory/images/');
  console.log('  status/publication touched. Existing metafields never deleted.');
  console.log('════════════════════════════════════════════════════════════\n');

  if (!existsSync(CSV_PATH)) {
    console.error('  ✗ Missing config/product-experience-map.csv. Run the dry-run first.');
    process.exitCode = 1;
    return;
  }
  const all = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const approved = all.filter((r) => String(r.approved).trim().toLowerCase() === 'true');
  const valid = approved.filter((r) =>
    METAFIELD.choices.includes(String(r.proposed_experience).trim()) && r.shopify_product_id,
  );
  const skippedNeedsReview = approved.length - valid.length;

  console.log(`▸ mapping rows: ${all.length} · approved: ${approved.length} · applicable: ${valid.length}`);
  if (skippedNeedsReview) console.log(`   (skipping ${skippedNeedsReview} approved rows whose value is not classic/deluxe/both)`);
  if (!valid.length) {
    console.log('\n  Nothing approved to apply. Set approved=true on reviewed rows in the CSV.');
    return;
  }

  // definition presence
  const d = await adminGraphQL(DEF_QUERY);
  const def = d.metafieldDefinitions.nodes.find((n) => n.key === METAFIELD.key);
  const defExists = Boolean(def);
  console.log(`▸ definition custom.experience: ${defExists ? 'exists' : 'MISSING → will create'}`);
  if (defExists && (def.type?.name !== METAFIELD.type || def.ownerType !== METAFIELD.ownerType)) {
    console.error(`  ✗ existing definition is incompatible (type ${def.type?.name}, owner ${def.ownerType}). Resolve manually. Aborting.`);
    process.exitCode = 1;
    return;
  }

  if (!COMMIT) {
    const byExp = valid.reduce((m, r) => ((m[r.proposed_experience] = (m[r.proposed_experience] || 0) + 1), m), {});
    console.log(`\n  PREVIEW — would set ${valid.length} values: ${JSON.stringify(byExp)}`);
    console.log(`  would create definition: ${defExists ? 'no (exists)' : 'yes'}`);
    console.log('\n  To apply (after approval):  npm run experience:apply -- --commit');
    return;
  }

  // ---- LIVE ----
  if (!YES) {
    const a = await ask(`\nType "${CONFIRM_PHRASE}" to set ${valid.length} metafields${defExists ? '' : ' and create the definition'} (anything else cancels): `);
    if (a.trim() !== CONFIRM_PHRASE) { console.log('Cancelled — no mutations performed.'); return; }
  }

  // create definition if missing (with choices validation)
  if (!defExists) {
    const data = await adminGraphQL(DEF_CREATE, {
      def: {
        name: METAFIELD.name,
        namespace: METAFIELD.namespace,
        key: METAFIELD.key,
        description: METAFIELD.description,
        type: METAFIELD.type,
        ownerType: METAFIELD.ownerType,
        validations: [{name: 'choices', value: JSON.stringify(METAFIELD.choices)}],
      },
    });
    const errs = ueMessages(data.metafieldDefinitionCreate);
    if (errs.length) { console.error('  ✗ definition create failed: ' + errs.join('; ')); process.exitCode = 1; return; }
    console.log('  ✓ definition created: custom.experience');
  }

  // rollback manifest — capture previous values BEFORE writing
  mkdirSync(PRIVATE, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const prev = [];
  for (const ids of chunk(valid.map((r) => r.shopify_product_id), 50)) {
    const r = await adminGraphQL(READ_VALUES, {ids});
    for (const n of r.nodes || []) if (n) prev.push({id: n.id, handle: n.handle, previous: n.metafield?.value ?? null});
    await sleep(120);
  }
  const rollbackPath = join(PRIVATE, `experience-apply-rollback-${ts}.json`);
  writeFileSync(rollbackPath, JSON.stringify({generatedAt: ts, definitionWasCreated: !defExists, previous: prev}, null, 2), 'utf8');
  console.log(`  ✓ rollback manifest: commerce-manager/reports/private/${rollbackPath.split(/[\\/]/).pop()}`);

  // set values in batches of <= 25, stop on unexpected userErrors
  let set = 0;
  for (const batch of chunk(valid, BATCH)) {
    const mf = batch.map((r) => ({
      ownerId: r.shopify_product_id,
      namespace: METAFIELD.namespace,
      key: METAFIELD.key,
      type: METAFIELD.type,
      value: String(r.proposed_experience).trim(),
    }));
    const data = await adminGraphQL(MF_SET, {mf});
    const errs = ueMessages(data.metafieldsSet);
    if (errs.length) { console.error('  ✗ metafieldsSet userErrors — stopping: ' + errs.join('; ')); process.exitCode = 1; return; }
    set += data.metafieldsSet.metafields?.length ?? 0;
    console.log(`   ✓ batch set ${data.metafieldsSet.metafields?.length ?? 0} (running ${set}/${valid.length})`);
    await sleep(200);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  APPLY COMPLETE — set ${set} custom.experience values.`);
  console.log('  No product field other than custom.experience was touched. Nothing published.');
  console.log(`  Rollback: reports/private/${rollbackPath.split(/[\\/]/).pop()}`);
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
