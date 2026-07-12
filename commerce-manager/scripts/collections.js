// scripts/collections.js — create planned automated (smart) collections.
// DRY-RUN by default (rich read-only analysis). Live requires --commit + typed
// confirmation. Skips existing by handle (never overwrites). No image. Not published.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import readline from 'node:readline';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {loadCollectionPlan} from '../src/catalog-files.js';
import {ruleSetFor, loadCollectionDescriptions, descriptionFor, buildCollectionInput} from '../src/collections.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'reports', 'private');
const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const YES = argv.includes('--yes');
const CONFIRM_PHRASE = 'CREATE COLLECTIONS';

const lines = [];
const out = (s = '') => {
  console.log(s);
  lines.push(s);
};

const ALL_COLLECTIONS = `#graphql
  query($after: String) {
    collections(first: 250, after: $after) { nodes { handle title } pageInfo { hasNextPage endCursor } }
  }`;
const COUNT = `#graphql
  query($q: String) { productsCount(query: $q) { count } }`;
const CREATE = `#graphql
  mutation Create($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle title resourcePublicationsCount { count } }
      userErrors { field message }
    }
  }`;

function ask(q) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}
function saveReport(kind) {
  mkdirSync(OUT_DIR, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `collections-report-${kind}-${ts}.md`;
  writeFileSync(join(OUT_DIR, name), '```\n' + lines.join('\n') + '\n```\n', 'utf8');
  console.log(`\n(report: commerce-manager/reports/private/${name})`);
}
function writeManifest(created) {
  mkdirSync(OUT_DIR, {recursive: true});
  const path = join(OUT_DIR, 'collections-manifest.json');
  let prior = [];
  if (existsSync(path)) {
    try {
      prior = JSON.parse(readFileSync(path, 'utf8')).collections || [];
    } catch {
      /* ignore */
    }
  }
  const map = new Map(prior.map((c) => [c.handle, c]));
  created.forEach((c) => map.set(c.handle, c));
  writeFileSync(path, JSON.stringify({generatedAt: new Date().toISOString(), kind: 'collections', count: map.size, note: 'Smart collections, unpublished. Roll back via collectionDelete on these IDs.', collections: [...map.values()]}, null, 2), 'utf8');
}

// Map a smart-collection ruleSet to a products search query for an expected-count estimate.
function ruleToQuery(rs) {
  const parts = rs.rules
    .map((r) => {
      if (r.column === 'TAG') return `tag:'${r.condition}'`;
      if (r.column === 'TYPE') return `product_type:'${r.condition}'`;
      if (r.column === 'TITLE') return `title:*${r.condition}*`;
      if (r.column === 'VENDOR') return `vendor:'${r.condition}'`;
      return null;
    })
    .filter(Boolean);
  if (!parts.length) return '';
  return rs.appliedDisjunctively ? '(' + parts.join(' OR ') + ')' : parts.join(' AND ');
}
async function expectedCount(q) {
  if (!q) return 0;
  try {
    const d = await adminGraphQL(COUNT, {q});
    return d.productsCount?.count ?? null;
  } catch {
    return null; // productsCount(query:) unsupported → n/a
  }
}

async function existingCollections() {
  const list = [];
  let after = null;
  for (let i = 0; i < 40; i++) {
    const d = await adminGraphQL(ALL_COLLECTIONS, {after});
    d.collections.nodes.forEach((n) => list.push(n));
    if (!d.collections.pageInfo.hasNextPage) break;
    after = d.collections.pageInfo.endCursor;
  }
  return list;
}

async function main() {
  const plan = loadCollectionPlan();
  const descMap = loadCollectionDescriptions();
  out('════════════════════════════════════════════════════════════');
  out(`  TNG Commerce Manager — COLLECTION SETUP — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN (read-only)'}`);
  out('════════════════════════════════════════════════════════════');
  out('  Automated (smart) collections · not published · no image · skip existing by handle\n');

  // duplicate handles within the plan
  const handleCounts = {};
  plan.forEach((c) => (handleCounts[c.handle] = (handleCounts[c.handle] || 0) + 1));
  const dupHandles = Object.entries(handleCounts).filter(([, n]) => n > 1).map(([h]) => h);

  // existing store collections (single read)
  out('▸ Reading existing Shopify collections (read-only)…');
  const existing = await existingCollections();
  const existingSet = new Set(existing.map((c) => c.handle));
  out(`   store has ${existing.length} collections\n`);

  // build decisions (+ expected counts in dry-run)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const decisions = [];
  for (const c of plan) {
    const rs = ruleSetFor(c.handle);
    const desc = descriptionFor(descMap, c.title);
    const exists = existingSet.has(c.handle);
    const query = rs ? ruleToQuery(rs) : '';
    let expected;
    if (!COMMIT && rs) {
      expected = await expectedCount(query);
      await sleep(150); // pace the count queries to avoid throttling
    } else if (!COMMIT) {
      expected = 0;
    }
    decisions.push({c, rs, desc, exists, query, expected});
  }

  const toCreate = decisions.filter((d) => !d.exists && d.rs);
  const skipExisting = decisions.filter((d) => d.exists);
  const invalidRules = decisions.filter((d) => !d.exists && (!d.rs || !d.rs.rules?.length));
  const empties = toCreate.filter((d) => d.expected === 0);

  // ---- report ----
  out('▸ Existing collections (matched by handle, will be skipped)');
  existing.forEach((c) => out(`   • ${c.handle}  (${c.title})${plan.some((p) => p.handle === c.handle) ? '  ← in plan' : ''}`));

  out('\n▸ Collections to CREATE (with rule + expected products)');
  let group = '';
  for (const d of toCreate) {
    if (d.c.group !== group) {
      group = d.c.group;
      out(`\n  ── ${group} ──`);
    }
    const rule = `[${d.rs.appliedDisjunctively ? 'OR' : 'AND'}] ${d.rs.rules.map((r) => `${r.column}:${r.condition}`).join(', ')}`;
    const cnt = d.expected === null ? 'n/a' : d.expected;
    out(`  • ${d.c.handle}  — expected products: ${cnt}`);
    out(`      title: ${d.c.title}   seo: "${d.desc?.seoTitle || d.c.title + ' | The New Greenhouse'}"`);
    out(`      rule:  ${rule}`);
    if (d.rs.review) out(`      ⚠ review: ${d.rs.review}`);
  }

  out('\n▸ Collections to SKIP (already exist — not overwritten)');
  skipExisting.forEach((d) => out(`   • ${d.c.handle}  (${existing.find((e) => e.handle === d.c.handle)?.title})`));

  out('\n────────────────────────────────────────────');
  out(`  planned ................. ${plan.length}`);
  out(`  → to create ............. ${toCreate.length}`);
  out(`  → skip (existing) ....... ${skipExisting.length}`);
  out(`  invalid / unmapped rules  ${invalidRules.length}${invalidRules.length ? ' [' + invalidRules.map((d) => d.c.handle).join(', ') + ']' : ''}`);
  out(`  empty collections (0 products) ${empties.length}${empties.length ? ' [' + empties.map((d) => d.c.handle).join(', ') + ']' : ''}`);
  out(`  duplicate handles (plan)  ${dupHandles.length}${dupHandles.length ? ' [' + dupHandles.join(', ') + ']' : ''}`);
  out(`  images: none   publishing: none`);
  out('────────────────────────────────────────────');

  if (!COMMIT) {
    out('\nDRY-RUN only. No collections created. Nothing published. Storefront untouched.');
    out('To create for real (after approval):  npm run collections:import');
    saveReport('dryrun');
    return;
  }

  // ---- LIVE ----
  if (!toCreate.length) {
    out('\nNothing to create. No mutations.');
    saveReport('live');
    return;
  }
  if (!YES) {
    const a = await ask(`\nType "${CONFIRM_PHRASE}" to create ${toCreate.length} smart collections (anything else cancels): `);
    if (a.trim() !== CONFIRM_PHRASE) {
      out('Cancelled — no mutations performed.');
      return;
    }
  }

  const created = [];
  const failed = [];
  let published = 0;
  let halted = null;
  for (const {c, rs, desc} of toCreate) {
    try {
      const data = await adminGraphQL(CREATE, {input: buildCollectionInput(c, rs, desc)});
      const ue = data.collectionCreate.userErrors || [];
      const col = data.collectionCreate.collection;
      if (ue.length) {
        // rule error / duplicate handle / any userError → STOP.
        ue.forEach((e) => out(`   ⚠ ${c.handle} [${(e.field || []).join('.')}]: ${e.message}`));
        failed.push({handle: c.handle, userErrors: ue});
        halted = `user error on ${c.handle}: ${ue.map((e) => e.message).join('; ')}`;
        break;
      }
      if (col) {
        const pubs = col.resourcePublicationsCount?.count ?? 0;
        created.push({handle: col.handle, id: col.id, title: col.title, publishedOn: pubs});
        writeManifest(created);
        out(`   ✓ ${col.handle} → ${col.id}`);
        if (pubs > 0) {
          published++;
          halted = `unexpected publication: ${col.handle} is on ${pubs} channel(s)`;
          out(`   ⚠ ${halted}`);
          break;
        }
      }
    } catch (e) {
      out(`   ✗ ${c.handle}: ${redact(e.message)}`);
      failed.push({handle: c.handle, error: redact(e.message)});
      halted = `exception on ${c.handle}`;
      break;
    }
    await sleep(150);
  }

  out('\n════════════════════════════════════════════════════════════');
  if (halted) out(`  ⛔ HALTED — ${halted}`);
  out(`  ${halted ? 'COLLECTION SETUP HALTED' : 'COLLECTION SETUP COMPLETE'}`);
  out(`  created ......... ${created.length}`);
  out(`  skipped existing  ${skipExisting.length}`);
  out(`  failed .......... ${failed.length}`);
  out(`  published ....... ${published} (expected 0)`);
  out(`  manifest: reports/private/collections-manifest.json`);
  out('════════════════════════════════════════════════════════════');
  if (published > 0) out('  ⚠ Some collections are on a channel — investigate (no publish action was taken).');
  saveReport('live');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
