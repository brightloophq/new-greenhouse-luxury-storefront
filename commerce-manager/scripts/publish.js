// scripts/publish.js — publish the catalog to the HEADLESS Hydrogen channel only.
// Publishes the 33 collections, sets the 80 products Active, and publishes them to
// "New Greenhouse Luxury Storefront" (NOT the public Online Store).
// DRY-RUN by default. Live requires --commit (+ typed confirmation unless --yes).
// Idempotent: publishablePublish + status=ACTIVE are safe to re-run.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');
const CHANNEL = 'New Greenhouse Luxury Storefront';
const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const CONFIRM_PHRASE = 'PUBLISH TO HYDROGEN';

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
function loadIds(file, arrKey) {
  const p = join(OUT_DIR, file);
  if (!existsSync(p)) return [];
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return (j[arrKey] || []).filter((x) => x.id).map((x) => ({handle: x.handle, id: x.id, status: x.status}));
}
function saveReport(kind) {
  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(OUT_DIR, `publish-report-${kind}-${ts}.md`), '```\n' + lines.join('\n') + '\n```\n', 'utf8');
  console.log(`\n(report: commerce-manager/reports/private/publish-report-${kind}-${ts}.md)`);
}

const PUBS = `#graphql
  query { publications(first: 25) { nodes { id name } } }`;
const PUBLISH = `#graphql
  mutation Pub($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }`;
const ACTIVATE = `#graphql
  mutation Act($id: ID!) {
    productUpdate(input: {id: $id, status: ACTIVE}) {
      product { id status }
      userErrors { field message }
    }
  }`;

async function main() {
  const collections = loadIds('collections-manifest.json', 'collections');
  const products = loadIds('rollback-manifest.json', 'products');
  out('════════════════════════════════════════════════════════════');
  out(`  TNG Commerce Manager — PUBLISH TO HYDROGEN — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  out('════════════════════════════════════════════════════════════');
  out(`  Target channel: "${CHANNEL}" (headless) ONLY — NOT the public Online Store.\n`);

  // resolve channel id
  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  const channel = pubs.find((p) => p.name === CHANNEL);
  if (!channel) {
    out(`✗ Publication "${CHANNEL}" not found.`);
    process.exitCode = 1;
    return saveReport(COMMIT ? 'live' : 'dryrun');
  }
  out(`  channel id: ${channel.id}`);
  out(`  collections to publish: ${collections.length}`);
  out(`  products to activate + publish: ${products.length}`);

  if (!COMMIT) {
    out('\nDRY-RUN only. Nothing published. Nothing activated.');
    out('To apply:  npm run publish:hydrogen');
    return saveReport('dryrun');
  }
  if (!YES) {
    const a = await ask(`\nType "${CONFIRM_PHRASE}" to publish ${collections.length} collections + activate/publish ${products.length} products to "${CHANNEL}": `);
    if (a.trim() !== CONFIRM_PHRASE) {
      out('Cancelled — nothing published.');
      return;
    }
  }

  const input = [{publicationId: channel.id}];
  let colPub = 0,
    colErr = 0,
    prodAct = 0,
    prodPub = 0,
    prodErr = 0;

  out('\n▸ Publishing collections…');
  for (const c of collections) {
    try {
      const d = await adminGraphQL(PUBLISH, {id: c.id, input});
      const ue = d.publishablePublish.userErrors;
      if (ue.length) {
        out(`   ⚠ ${c.handle}: ${ue.map((e) => e.message).join('; ')}`);
        colErr++;
      } else colPub++;
    } catch (e) {
      out(`   ✗ ${c.handle}: ${redact(e.message)}`);
      colErr++;
    }
    await sleep(200);
  }
  out(`   collections published: ${colPub} (errors: ${colErr})`);

  out('\n▸ Activating + publishing products…');
  for (const p of products) {
    try {
      const a = await adminGraphQL(ACTIVATE, {id: p.id});
      const aue = a.productUpdate.userErrors;
      if (aue.length) {
        out(`   ⚠ activate ${p.handle}: ${aue.map((e) => e.message).join('; ')}`);
        prodErr++;
      } else if (a.productUpdate.product?.status === 'ACTIVE') prodAct++;

      const d = await adminGraphQL(PUBLISH, {id: p.id, input});
      const ue = d.publishablePublish.userErrors;
      if (ue.length) {
        out(`   ⚠ publish ${p.handle}: ${ue.map((e) => e.message).join('; ')}`);
        prodErr++;
      } else prodPub++;
    } catch (e) {
      out(`   ✗ ${p.handle}: ${redact(e.message)}`);
      prodErr++;
    }
    await sleep(250);
  }

  out('\n════════════════════════════════════════════════════════════');
  out('  PUBLISH COMPLETE (headless Hydrogen channel only)');
  out(`  collections published .... ${colPub} / ${collections.length}`);
  out(`  products set ACTIVE ...... ${prodAct} / ${products.length}`);
  out(`  products published ....... ${prodPub} / ${products.length}`);
  out(`  errors ................... ${colErr + prodErr}`);
  out(`  NOT published to the public Online Store.`);
  out('════════════════════════════════════════════════════════════');
  saveReport('live');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
