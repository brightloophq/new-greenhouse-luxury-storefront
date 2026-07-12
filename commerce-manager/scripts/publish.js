// scripts/publish.js — publish the validated demo catalog to the HEADLESS Hydrogen
// channel only ("New Greenhouse Luxury Storefront"). NOT the public Online Store.
// DRY-RUN by default (full state report). Live requires --commit (+ typed confirm / --yes).
// Idempotent: already-published resources are skipped. Only sets product status ACTIVE
// (required for storefront visibility) + publishablePublish. Never edits price/desc/
// variants/inventory. Only touches the resources in the catalog manifests.
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
  return (j[arrKey] || []).filter((x) => x.id).map((x) => ({handle: x.handle, id: x.id}));
}
function saveReport(kind) {
  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(OUT_DIR, `publish-report-${kind}-${ts}.md`), '```\n' + lines.join('\n') + '\n```\n', 'utf8');
  console.log(`\n(report: commerce-manager/reports/private/publish-report-${kind}-${ts}.md)`);
}

const PUBS = `#graphql
  query { publications(first: 50) { nodes { id name } } }`;
const PRODUCT_STATE = `#graphql
  query PS($ids: [ID!]!, $pid: ID!) {
    nodes(ids: $ids) {
      __typename
      ... on Product { id title status variantsCount { count } publishedOnPublication(publicationId: $pid) }
    }
  }`;
const COLLECTION_STATE = `#graphql
  query CS($ids: [ID!]!, $pid: ID!) {
    nodes(ids: $ids) {
      __typename
      ... on Collection { id title publishedOnPublication(publicationId: $pid) }
    }
  }`;
const PUBLISH = `#graphql
  mutation Pub($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }`;
const ACTIVATE = `#graphql
  mutation Act($id: ID!) {
    productUpdate(input: {id: $id, status: ACTIVE}) { product { id status } userErrors { field message } }
  }`;

async function fetchStates(query, ids, pid) {
  const byId = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const d = await adminGraphQL(query, {ids: chunk, pid});
    d.nodes.forEach((n, k) => n && byId.set(chunk[k], n));
  }
  return byId;
}

async function main() {
  const productIds = loadIds('rollback-manifest.json', 'products');
  const collectionIds = loadIds('collections-manifest.json', 'collections');
  out('════════════════════════════════════════════════════════════');
  out(`  TNG Commerce Manager — PUBLISH TO HYDROGEN — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN (read-only)'}`);
  out('════════════════════════════════════════════════════════════');
  out(`  Target: "${CHANNEL}" (headless Hydrogen) ONLY — NOT the public Online Store.\n`);

  // Task 1 — all publications
  const pubs = (await adminGraphQL(PUBS)).publications.nodes;
  out('▸ 1. Available Shopify publications (sales channels)');
  pubs.forEach((p) => out(`     • ${p.name}  —  ${p.id}`));

  // Task 2 — identify Hydrogen publication
  const channel = pubs.find((p) => p.name === CHANNEL);
  if (!channel) {
    out(`\n✗ Target publication "${CHANNEL}" not found. Aborting.`);
    process.exitCode = 1;
    return saveReport(COMMIT ? 'live' : 'dryrun');
  }
  out(`\n▸ 2. Target publication (Hydrogen): "${channel.name}"  —  ${channel.id}`);

  // Query current state
  out('\n▸ Reading current publication state (read-only)…');
  const pState = await fetchStates(PRODUCT_STATE, productIds.map((p) => p.id), channel.id);
  const cState = await fetchStates(COLLECTION_STATE, collectionIds.map((c) => c.id), channel.id);

  // Classify products
  const pMissing = [],
    pInvalid = [],
    pAlready = [],
    pToPublish = [];
  for (const p of productIds) {
    const s = pState.get(p.id);
    if (!s) {
      pMissing.push(p);
      continue;
    }
    if (!(s.variantsCount?.count > 0)) {
      pInvalid.push({...p, reason: 'no variants'});
      continue;
    }
    if (s.publishedOnPublication) pAlready.push(p);
    else pToPublish.push({...p, needsActivate: s.status !== 'ACTIVE'});
  }
  // Classify collections
  const cMissing = [],
    cAlready = [],
    cToPublish = [];
  for (const c of collectionIds) {
    const s = cState.get(c.id);
    if (!s) {
      cMissing.push(c);
      continue;
    }
    if (s.publishedOnPublication) cAlready.push(c);
    else cToPublish.push(c);
  }

  // Task 5 — report
  out('\n▸ 5. Dry-run report');
  out(`   PRODUCTS (${productIds.length} in manifest)`);
  out(`     → to publish ......... ${pToPublish.length}${pToPublish.some((p) => p.needsActivate) ? ` (${pToPublish.filter((p) => p.needsActivate).length} also need Active)` : ''}`);
  out(`     → already published .. ${pAlready.length}`);
  out(`     → invalid/incomplete . ${pInvalid.length}${pInvalid.length ? ' [' + pInvalid.map((p) => p.handle).join(', ') + ']' : ''}`);
  out(`     → missing (not found)  ${pMissing.length}${pMissing.length ? ' [' + pMissing.map((p) => p.handle).join(', ') + ']' : ''}`);
  out(`   COLLECTIONS (${collectionIds.length} in manifest)`);
  out(`     → to publish ......... ${cToPublish.length}`);
  out(`     → already published .. ${cAlready.length}`);
  out(`     → missing (not found)  ${cMissing.length}${cMissing.length ? ' [' + cMissing.map((c) => c.handle).join(', ') + ']' : ''}`);
  if (pToPublish.length) out(`   first products to publish: ${pToPublish.slice(0, 8).map((p) => p.handle).join(', ')}${pToPublish.length > 8 ? ', …' : ''}`);
  if (cToPublish.length) out(`   first collections to publish: ${cToPublish.slice(0, 8).map((c) => c.handle).join(', ')}${cToPublish.length > 8 ? ', …' : ''}`);

  if (!COMMIT) {
    out('\nDRY-RUN only. Nothing published, nothing activated. Not on the public Online Store.');
    out(pToPublish.length || cToPublish.length ? 'To apply (after approval):  npm run publish:hydrogen' : 'Everything is already published — publishing would be a no-op.');
    return saveReport('dryrun');
  }

  // ---- LIVE ----
  if (!pToPublish.length && !cToPublish.length) {
    out('\nNothing to publish — all resources already on the channel. No mutations.');
    return saveReport('live');
  }
  if (!YES) {
    const a = await ask(`\nType "${CONFIRM_PHRASE}" to publish ${cToPublish.length} collections + ${pToPublish.length} products to "${CHANNEL}": `);
    if (a.trim() !== CONFIRM_PHRASE) {
      out('Cancelled — nothing published.');
      return;
    }
  }

  const input = [{publicationId: channel.id}];
  const publishedCollections = [];
  const publishedProducts = [];
  let errs = 0;

  out('\n▸ Publishing collections…');
  for (const c of cToPublish) {
    try {
      const d = await adminGraphQL(PUBLISH, {id: c.id, input});
      if (d.publishablePublish.userErrors.length) {
        out(`   ⚠ ${c.handle}: ${d.publishablePublish.userErrors.map((e) => e.message).join('; ')}`);
        errs++;
      } else {
        publishedCollections.push(c);
        out(`   ✓ ${c.handle}`);
      }
    } catch (e) {
      out(`   ✗ ${c.handle}: ${redact(e.message)}`);
      errs++;
    }
    await sleep(200);
  }

  out('\n▸ Activating (if draft) + publishing products…');
  for (const p of pToPublish) {
    try {
      if (p.needsActivate) {
        const a = await adminGraphQL(ACTIVATE, {id: p.id});
        if (a.productUpdate.userErrors.length) {
          out(`   ⚠ activate ${p.handle}: ${a.productUpdate.userErrors.map((e) => e.message).join('; ')}`);
          errs++;
        }
      }
      const d = await adminGraphQL(PUBLISH, {id: p.id, input});
      if (d.publishablePublish.userErrors.length) {
        out(`   ⚠ publish ${p.handle}: ${d.publishablePublish.userErrors.map((e) => e.message).join('; ')}`);
        errs++;
      } else {
        publishedProducts.push(p);
        out(`   ✓ ${p.handle}`);
      }
    } catch (e) {
      out(`   ✗ ${p.handle}: ${redact(e.message)}`);
      errs++;
    }
    await sleep(250);
  }

  // Task 10 — rollback manifest (this run + already-published, for completeness)
  const manifest = {
    generatedAt: new Date().toISOString(),
    kind: 'publish-hydrogen',
    publication: {id: channel.id, name: channel.name},
    note: 'To roll back: publishableUnpublish these IDs from the publication (and, if desired, set products status DRAFT via productUpdate). Not on the public Online Store.',
    collections: [...cAlready, ...publishedCollections].map((c) => ({handle: c.handle, id: c.id})),
    products: [...pAlready, ...publishedProducts].map((p) => ({handle: p.handle, id: p.id})),
  };
  mkdirSync(OUT_DIR, {recursive: true});
  writeFileSync(join(OUT_DIR, 'publish-rollback-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  out('\n════════════════════════════════════════════════════════════');
  out('  PUBLISH COMPLETE (headless Hydrogen channel only)');
  out(`  collections published this run .. ${publishedCollections.length} (already: ${cAlready.length})`);
  out(`  products published this run ..... ${publishedProducts.length} (already: ${pAlready.length})`);
  out(`  errors .......................... ${errs}`);
  out(`  invalid/incomplete skipped ...... ${pInvalid.length}`);
  out(`  NOT published to the public Online Store.`);
  out(`  Rollback manifest: reports/private/publish-rollback-manifest.json`);
  out('════════════════════════════════════════════════════════════');
  saveReport('live');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
