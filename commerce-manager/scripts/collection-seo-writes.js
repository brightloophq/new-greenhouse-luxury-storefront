// Priority Collection Landing-Page SEO — collection descriptionHtml writes.
//
//   DRY-RUN by default. Prints BEFORE -> AFTER for all five collections and
//   writes a rollback snapshot. NOTHING is mutated without --commit.
//
//   Scope: descriptionHtml ONLY. SEO title/description are KEEP (verified good)
//   and are never sent. If a future content file adds `seo`, this script refuses
//   unless BOTH seo.title AND seo.description are present (companion-field rule).
//
// Usage:
//   node scripts/collection-seo-writes.js                 # dry-run (default)
//   node scripts/collection-seo-writes.js --commit        # live write (gated)
//   node scripts/collection-seo-writes.js --rollback rollback/collection-seo-<ts>.json
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const ARGS = process.argv.slice(2);
const COMMIT = ARGS.includes('--commit');
const ROLLBACK_IDX = ARGS.indexOf('--rollback');
const ROLLBACK_FILE = ROLLBACK_IDX >= 0 ? ARGS[ROLLBACK_IDX + 1] : null;
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const ue = (o) => (o?.userErrors || []).map((e) => e.message).join('; ');

const READ = `#graphql
  query($id: ID!) {
    collection(id: $id) {
      id handle title description descriptionHtml
      seo { title description }
    }
  }`;
const UPDATE = `#graphql
  mutation($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id handle }
      userErrors { field message }
    }
  }`;

function loadContent() {
  const raw = JSON.parse(
    readFileSync(join(CM, 'config', 'collection-seo-content.json'), 'utf8'),
  );
  for (const c of raw.collections) {
    if (!c.handle || !c.gid || typeof c.descriptionHtml !== 'string') {
      throw new Error(`content entry missing handle/gid/descriptionHtml: ${c.handle}`);
    }
    // Companion-field rule: SEO is out of scope; if present it must be a pair.
    if (c.seo && (!c.seo.title || !c.seo.description)) {
      throw new Error(
        `${c.handle}: seo present without BOTH title and description — refusing (companion-field rule)`,
      );
    }
  }
  return raw.collections;
}

function snapshotDir() {
  const dir = join(CM, 'rollback');
  mkdirSync(dir, {recursive: true});
  return dir;
}

async function runForward() {
  const items = loadContent();
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  COLLECTION SEO WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  console.log('  scope: descriptionHtml only · seo: UNTOUCHED');
  console.log('════════════════════════════════════════════════════════════');

  const snapshot = {ts, mode: COMMIT ? 'commit' : 'dry-run', collections: {}};
  const plan = [];

  for (const item of items) {
    const before = (await adminGraphQL(READ, {id: item.gid})).collection;
    if (!before) {
      console.log(`  ! ${item.handle}: NOT FOUND (${item.gid})`);
      continue;
    }
    if (before.handle !== item.handle) {
      throw new Error(
        `GID ${item.gid} resolved to "${before.handle}", expected "${item.handle}" — aborting`,
      );
    }
    // Rollback snapshot captures every field, even those we do not touch.
    snapshot.collections[item.handle] = {
      id: before.id,
      title: before.title,
      description: before.description,
      descriptionHtml: before.descriptionHtml,
      seo: before.seo,
    };
    const changed = before.descriptionHtml !== item.descriptionHtml;
    plan.push({item, before, changed});

    console.log(`\n── ${item.handle} (${before.id})`);
    console.log(`   fields changed:   ${changed ? 'descriptionHtml' : '(none — already current)'}`);
    console.log(`   fields untouched: seo.title, seo.description, title, image`);
    console.log(`   BEFORE descriptionHtml: ${JSON.stringify(before.descriptionHtml)}`);
    console.log(`   AFTER  descriptionHtml: ${JSON.stringify(item.descriptionHtml)}`);
  }

  const snapPath = join(snapshotDir(), `collection-seo-${ts}.json`);
  writeFileSync(snapPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n  rollback snapshot written: ${snapPath}`);

  if (!COMMIT) {
    console.log('\n  DRY-RUN complete. No data was changed. Re-run with --commit to write.');
    return;
  }

  console.log('\n  Committing descriptionHtml (seo omitted)…');
  const results = {ts, updated: [], skipped: [], errors: []};
  for (const {item, changed} of plan) {
    if (!changed) {
      results.skipped.push(item.handle);
      console.log(`   = ${item.handle}: unchanged, skipped`);
      continue;
    }
    const res = await adminGraphQL(UPDATE, {
      input: {id: item.gid, descriptionHtml: item.descriptionHtml},
    });
    const err = ue(res.collectionUpdate);
    if (err) {
      results.errors.push({handle: item.handle, error: err});
      console.log(`   ✗ ${item.handle}: ${err}`);
      continue;
    }
    // Verify read-back.
    const after = (await adminGraphQL(READ, {id: item.gid})).collection;
    const ok = after.descriptionHtml === item.descriptionHtml;
    results.updated.push({handle: item.handle, verified: ok});
    console.log(`   ${ok ? '✓' : '⚠'} ${item.handle}: written${ok ? ' + verified' : ' but read-back MISMATCH'}`);
  }
  const resPath = join(snapshotDir(), `collection-seo-${ts}-results.json`);
  writeFileSync(resPath, JSON.stringify(results, null, 2));
  console.log(`\n  results written: ${resPath}`);
}

async function runRollback() {
  const snap = JSON.parse(readFileSync(join(CM, ROLLBACK_FILE), 'utf8'));
  console.log(`  ROLLBACK from ${ROLLBACK_FILE} — ${COMMIT ? 'LIVE' : 'DRY-RUN'}`);
  for (const [handle, s] of Object.entries(snap.collections)) {
    console.log(`\n── ${handle}: restore descriptionHtml -> ${JSON.stringify(s.descriptionHtml)}`);
    if (!COMMIT) continue;
    const res = await adminGraphQL(UPDATE, {
      input: {id: s.id, descriptionHtml: s.descriptionHtml},
    });
    const err = ue(res.collectionUpdate);
    console.log(err ? `   ✗ ${err}` : `   ✓ ${handle} restored`);
  }
  if (!COMMIT) console.log('\n  DRY-RUN rollback preview. Re-run with --commit to restore.');
}

(ROLLBACK_FILE ? runRollback() : runForward()).catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
