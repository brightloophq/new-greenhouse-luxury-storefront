// scripts/metafields.js — create metafield definitions + populate values idempotently.
// DRY-RUN by default. Live requires --commit + typed confirmation.
// Never overwrites existing metafield values (only sets keys that are absent).
// Never publishes. Never touches products beyond their custom.* metafields.
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {definitions, values} from '../src/metafields.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');
const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const CONFIRM_PHRASE = 'SET METAFIELDS';

const lines = [];
const out = (s = '') => {
  console.log(s);
  lines.push(s);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}
function saveReport(kind) {
  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `metafields-report-${kind}-${ts}.md`;
  writeFileSync(join(OUT_DIR, name), '```\n' + lines.join('\n') + '\n```\n', 'utf8');
  console.log(`\n(report: commerce-manager/reports/private/${name})`);
}

const EXISTING_DEFS = `#graphql
  query { metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: "custom") { nodes { key } } }`;
const DEF_CREATE = `#graphql
  mutation D($def: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $def) {
      createdDefinition { id key }
      userErrors { field message code }
    }
  }`;
const PRODUCT_MF = `#graphql
  query P($handle: String!) {
    productByHandle(handle: $handle) {
      id
      metafields(first: 50, namespace: "custom") { nodes { key } }
    }
  }`;
const MF_SET = `#graphql
  mutation S($mf: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $mf) {
      metafields { id key }
      userErrors { field message code }
    }
  }`;

function ueMessages(payload) {
  return (payload?.userErrors || []).map((e) => `${(e.field || []).join('.')}${e.code ? ` (${e.code})` : ''}: ${e.message}`.replace(/^: /, ''));
}

async function main() {
  const defs = definitions();
  const vals = values();
  out('════════════════════════════════════════════════════════════');
  out(`  TNG Commerce Manager — METAFIELDS — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN (read-only)'}`);
  out('════════════════════════════════════════════════════════════');
  out('  Idempotent · never overwrite existing values · no publishing · custom.* only\n');

  // ---- Phase A: definitions ----
  out('▸ Phase A — Metafield definitions (custom.*, ownerType PRODUCT)');
  let existingDefKeys = new Set();
  try {
    const d = await adminGraphQL(EXISTING_DEFS);
    existingDefKeys = new Set(d.metafieldDefinitions.nodes.map((n) => n.key));
  } catch (e) {
    out('   ✗ could not read existing definitions: ' + redact(e.message));
    process.exitCode = 1;
    return saveReport(COMMIT ? 'live' : 'dryrun');
  }
  const defsToCreate = defs.filter((d) => !existingDefKeys.has(d.key));
  defs.filter((d) => existingDefKeys.has(d.key)).forEach((d) => out(`   • exists: custom.${d.key}`));
  defsToCreate.forEach((d) => out(`   → create: custom.${d.key} (${d.type})`));
  out(`   definitions: ${defs.length} total · ${defsToCreate.length} to create · ${defs.length - defsToCreate.length} exist`);

  // ---- Phase B: values (compute what would be set, without overwriting) ----
  out('\n▸ Phase B — Values (only keys not already present are set)');
  const plan = [];
  let toSetTotal = 0;
  let alreadyTotal = 0;
  let notFound = 0;
  for (const row of vals) {
    let prod = null;
    try {
      const d = await adminGraphQL(PRODUCT_MF, {handle: row.handle});
      prod = d.productByHandle;
    } catch (e) {
      out(`   ✗ lookup ${row.handle}: ${redact(e.message)}`);
    }
    if (!prod) {
      notFound++;
      plan.push({row, id: null, toSet: [], already: 0});
      await sleep(120);
      continue;
    }
    const have = new Set(prod.metafields.nodes.map((n) => n.key));
    const toSet = row.metafields.filter((m) => !have.has(m.key));
    const already = row.metafields.length - toSet.length;
    toSetTotal += toSet.length;
    alreadyTotal += already;
    plan.push({row, id: prod.id, toSet, already});
    await sleep(120);
  }
  out(`   products: ${vals.length} · not found: ${notFound}`);
  out(`   metafield values → to set: ${toSetTotal} · already present (skip): ${alreadyTotal}`);

  if (!COMMIT) {
    out('\nDRY-RUN only. No definitions created, no values set. Nothing published.');
    out('To apply (after approval):  npm run metafields:import');
    saveReport('dryrun');
    return;
  }

  // ---- LIVE ----
  if (!YES) {
    const a = await ask(`\nType "${CONFIRM_PHRASE}" to create ${defsToCreate.length} definitions and set ${toSetTotal} values (anything else cancels): `);
    if (a.trim() !== CONFIRM_PHRASE) {
      out('Cancelled — no mutations performed.');
      return;
    }
  }

  // create definitions (validate each)
  out('\n▸ Creating definitions…');
  let defsCreated = 0;
  const defErrors = [];
  for (const d of defsToCreate) {
    try {
      const data = await adminGraphQL(DEF_CREATE, {def: {name: d.name, namespace: 'custom', key: d.key, type: d.type, ownerType: 'PRODUCT'}});
      const errs = ueMessages(data.metafieldDefinitionCreate);
      if (errs.length) {
        out(`   ⚠ custom.${d.key}: ${errs.join('; ')}`);
        defErrors.push({key: d.key, errors: errs});
      } else {
        defsCreated++;
        out(`   ✓ custom.${d.key}`);
      }
    } catch (e) {
      out(`   ✗ custom.${d.key}: ${redact(e.message)}`);
      defErrors.push({key: d.key, error: redact(e.message)});
    }
    await sleep(150);
  }

  // set values (validate each)
  out('\n▸ Setting values (skipping already-present keys)…');
  let productsUpdated = 0;
  let valuesSet = 0;
  const valErrors = [];
  for (const item of plan) {
    if (!item.id || !item.toSet.length) continue;
    const mf = item.toSet.map((m) => ({ownerId: item.id, namespace: m.namespace, key: m.key, type: m.type, value: m.value}));
    try {
      const data = await adminGraphQL(MF_SET, {mf});
      const errs = ueMessages(data.metafieldsSet);
      if (errs.length) {
        out(`   ⚠ ${item.row.handle}: ${errs.join('; ')}`);
        valErrors.push({handle: item.row.handle, errors: errs});
      }
      const setN = data.metafieldsSet.metafields?.length ?? 0;
      valuesSet += setN;
      if (setN) productsUpdated++;
      out(`   ✓ ${item.row.handle}: set ${setN}${item.already ? ` (skipped ${item.already} present)` : ''}`);
    } catch (e) {
      out(`   ✗ ${item.row.handle}: ${redact(e.message)}`);
      valErrors.push({handle: item.row.handle, error: redact(e.message)});
    }
    await sleep(150);
  }

  out('\n════════════════════════════════════════════════════════════');
  out('  METAFIELDS COMPLETE');
  out(`  definitions created ... ${defsCreated} (of ${defsToCreate.length} needed; ${defs.length - defsToCreate.length} pre-existing)`);
  out(`  definition errors ..... ${defErrors.length}`);
  out(`  products updated ...... ${productsUpdated} / ${vals.length}`);
  out(`  values set ............ ${valuesSet}   (already present, skipped: ${alreadyTotal})`);
  out(`  value errors .......... ${valErrors.length}`);
  out(`  Nothing published. No product changed beyond its custom.* metafields.`);
  out('════════════════════════════════════════════════════════════');
  saveReport('live');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
