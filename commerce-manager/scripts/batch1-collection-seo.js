// batch1-collection-seo.js — Batch 1 collection SEO backfill (seo.title + seo.description ONLY).
//
// SAFETY MODEL
//   • DEFAULT = DRY-RUN. Running with no args performs READS ONLY and sends zero mutations.
//   • Writing requires a THREE-part interlock (all three, or it stays dry-run):
//        1) CLI flag           --commit
//        2) CLI acknowledgement --i-understand-this-writes-to-shopify
//        3) env var            TNG_BATCH1_WRITE_AUTH="AUTHORIZE BATCH1 COLLECTION SEO WRITE"
//     None of these is supplied during preparation, and this file never sets them.
//   • Hard allowlist: exactly premium-handcrafted, premium-vase, premium-heart-box. Any other
//     handle is rejected.
//   • Fail-closed prerequisites: if ANY live value differs from the authoritative snapshot
//     (SEO must be empty, counts 3/7/1, published to the storefront channel, body present),
//     zero mutations occur.
//   • Payload scope is asserted to be EXACTLY { id, seo: { title, description } } — any other
//     writable field throws before a write can happen.
//   • Automatic timestamped backup (before.json + fingerprints + full-52 baseline) is written
//     before any mutation. Backups are gitignored (operational/raw data).
//   • Sequential writes, per-response validation, immediate stop + rollback plan on any error.
//   • Secrets are never printed (all output passes through the client's redact()).
//
// USAGE
//   node scripts/batch1-collection-seo.js                 # DRY-RUN (read-only) — the default
//   node scripts/batch1-collection-seo.js --verify-only   # read + compare to approved copy
//   # WRITE (do NOT run during preparation):
//   TNG_BATCH1_WRITE_AUTH="AUTHORIZE BATCH1 COLLECTION SEO WRITE" \
//     node scripts/batch1-collection-seo.js --commit --i-understand-this-writes-to-shopify
//   # ROLLBACK (interlocked, later):
//   TNG_BATCH1_WRITE_AUTH="AUTHORIZE BATCH1 COLLECTION SEO WRITE" \
//     node scripts/batch1-collection-seo.js --rollback catalog/live-audit/backups/<UTC> --commit --i-understand-this-writes-to-shopify
//
import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

// Credentials + Admin client are imported LAZILY (only on the I/O path) so the pure
// exports below can be imported by the offline self-test without a .env present.
let _io = null;
async function io() {
  if (!_io) {
    const [{config, redact}, {adminGraphQL}] = await Promise.all([
      import('../src/config.js'),
      import('../src/shopify-admin.js'),
    ]);
    _io = {config, redact, gql: adminGraphQL};
  }
  return _io;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKUP_ROOT = join(HERE, '..', '..', 'catalog', 'live-audit', 'backups');

/* ---------------------------------------------------------------- authoritative targets ---- */
export const APPROVED = [
  {
    handle: 'premium-handcrafted',
    expect: {products: 3},
    seoTitle: 'Premium Handcrafted Arrangements | The New Greenhouse',
    seoDescription:
      'Hand-crafted premium floral arrangements from The New Greenhouse, a family florist in Kingston, Jamaica. Fresh flowers arranged to order.',
  },
  {
    handle: 'premium-vase',
    expect: {products: 7},
    seoTitle: 'Premium Vase Arrangements | The New Greenhouse',
    seoDescription:
      'Premium vase arrangements from The New Greenhouse, a family florist in Kingston, Jamaica — fresh blooms hand-arranged in a vase.',
  },
  {
    handle: 'premium-heart-box',
    expect: {products: 1},
    seoTitle: 'Premium Heart Box Flowers | The New Greenhouse',
    seoDescription:
      'Luxury flowers hand-arranged in a keepsake heart box by The New Greenhouse, a family florist in Kingston, Jamaica. Made to order for gifting.',
  },
];
export const ALLOWLIST = new Set(APPROVED.map((a) => a.handle));
const STOREFRONT_CHANNEL = /New Greenhouse Luxury Storefront/i;

/* ------------------------------------------------------------------------- pure helpers ---- */
export const stripHtml = (h) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const sha256 = (s) => createHash('sha256').update(s || '', 'utf8').digest('hex');

export function assertAllowed(handle) {
  if (!ALLOWLIST.has(handle)) throw new Error(`REFUSED: handle "${handle}" is not on the Batch-1 allowlist.`);
}

export function validateCopy({seoTitle, seoDescription}) {
  const e = [];
  if (!seoTitle) e.push('seo.title empty');
  if (!seoDescription) e.push('seo.description empty');
  if ((seoTitle || '').length > 60) e.push(`seo.title ${seoTitle.length} > 60`);
  if ((seoDescription || '').length > 160) e.push(`seo.description ${seoDescription.length} > 160`);
  return e;
}

/** The ONLY shape a Batch-1 mutation may carry. */
export function buildInput(id, seoTitle, seoDescription) {
  return {id, seo: {title: seoTitle, description: seoDescription}};
}

/** Throws unless the input is EXACTLY { id, seo:{title,description} } — no other writable field. */
export function assertInputScope(input) {
  const top = Object.keys(input).sort().join(',');
  if (top !== 'id,seo') throw new Error(`ILLEGAL PAYLOAD: top-level keys must be id,seo — got ${top}`);
  const seoKeys = Object.keys(input.seo || {}).sort().join(',');
  if (seoKeys !== 'description,title') throw new Error(`ILLEGAL PAYLOAD: seo keys must be description,title — got ${seoKeys}`);
  if (typeof input.id !== 'string' || !input.id) throw new Error('ILLEGAL PAYLOAD: missing id');
}

/** Fail-closed prerequisite check against the authoritative snapshot. Returns array of failures. */
export function checkPrereqs(live, approved) {
  const f = [];
  if (!live) return [`collection "${approved.handle}" not found`];
  if (live.handle !== approved.handle) f.push(`handle mismatch: ${live.handle} != ${approved.handle}`);
  if (live.seo?.title) f.push('seo.title is NOT empty (would overwrite)');
  if (live.seo?.description) f.push('seo.description is NOT empty (would overwrite)');
  const pc = live.productsCount?.count;
  if (pc !== approved.expect.products) f.push(`product count ${pc} != expected ${approved.expect.products}`);
  const pubChans = (live.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name || '');
  if (!pubChans.some((n) => STOREFRONT_CHANNEL.test(n))) f.push('not published to "New Greenhouse Luxury Storefront"');
  if (stripHtml(live.descriptionHtml).length === 0) f.push('descriptionHtml is empty (expected existing body)');
  return f;
}

/** Immutable-field fingerprint for blast-radius verification. */
export function fingerprint(c) {
  return {
    handle: c.handle,
    id: c.id,
    title: c.title,
    descriptionHtmlSha256: sha256(c.descriptionHtml || ''),
    descriptionHtmlChars: stripHtml(c.descriptionHtml).length,
    productsCount: c.productsCount?.count ?? null,
    imageUrl: c.image?.url ?? null,
    imageAlt: c.image?.altText ?? null,
    channels: (c.resourcePublications?.nodes || []).map((n) => ({name: n.publication?.name || null, isPublished: !!n.isPublished})),
    ruleSet: c.ruleSet ?? null,
    sortOrder: c.sortOrder ?? null,
    templateSuffix: c.templateSuffix ?? null,
    seoTitle: c.seo?.title ?? null,
    seoDescription: c.seo?.description ?? null,
  };
}

/** Returns the list of fingerprint keys that changed between two snapshots. */
export function changedPaths(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out = [];
  for (const k of keys) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out.push(k);
  return out;
}

/** THREE-part write interlock. Returns true only if all three are satisfied. */
export function writeAuthorized(argv, env) {
  const flag = argv.includes('--commit');
  const ack = argv.includes('--i-understand-this-writes-to-shopify');
  const auth = env.TNG_BATCH1_WRITE_AUTH === 'AUTHORIZE BATCH1 COLLECTION SEO WRITE';
  return flag && ack && auth;
}

/** Build the per-collection plan from live data (pure; no network, no writes). */
export function buildPlan(liveByHandle) {
  const plans = APPROVED.map((a) => {
    assertAllowed(a.handle);
    const live = liveByHandle.get(a.handle) || null;
    const prereqFailures = checkPrereqs(live, a);
    const copyErrors = validateCopy(a);
    const input = live ? buildInput(live.id, a.seoTitle, a.seoDescription) : null;
    if (input) assertInputScope(input);
    return {
      handle: a.handle,
      id: live?.id ?? null,
      before: {seoTitle: live?.seo?.title ?? null, seoDescription: live?.seo?.description ?? null},
      after: {seoTitle: a.seoTitle, seoDescription: a.seoDescription},
      input,
      prereqFailures,
      copyErrors,
      fingerprintBefore: live ? fingerprint(live) : null,
    };
  });
  const allOk = plans.every((p) => p.prereqFailures.length === 0 && p.copyErrors.length === 0 && p.input);
  return {plans, allOk};
}

/* ------------------------------------------------------------------------- GraphQL (I/O) ---- */
const COLL_FIELDS = `
  id handle title descriptionHtml sortOrder templateSuffix
  productsCount { count }
  seo { title description }
  image { url altText }
  ruleSet { appliedDisjunctively rules { column relation condition } }
  resourcePublications(first: 25) { nodes { isPublished publication { name } } }
`;
const READ_TARGETS = `#graphql
  query Batch1Read($h1: String!, $h2: String!, $h3: String!) {
    c1: collectionByHandle(handle: $h1) { ${COLL_FIELDS} }
    c2: collectionByHandle(handle: $h2) { ${COLL_FIELDS} }
    c3: collectionByHandle(handle: $h3) { ${COLL_FIELDS} }
  }
`;
const READ_ALL = `#graphql
  query Batch1AllCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { ${COLL_FIELDS} }
    }
  }
`;
// WRITE mutation — reachable ONLY inside the interlocked write path (never in dry-run).
const UPDATE = `#graphql
  mutation Batch1Update($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id handle seo { title description } }
      userErrors { field message }
    }
  }
`;

async function readTargets() {
  const {gql} = await io();
  const [h1, h2, h3] = APPROVED.map((a) => a.handle);
  const data = await gql(READ_TARGETS, {h1, h2, h3});
  const map = new Map();
  for (const c of [data.c1, data.c2, data.c3]) if (c) map.set(c.handle, c);
  return map;
}
async function readAllCollections() {
  const {gql} = await io();
  const nodes = [];
  let cursor = null;
  for (;;) {
    const d = await gql(READ_ALL, {cursor});
    nodes.push(...d.collections.nodes);
    if (!d.collections.pageInfo.hasNextPage) break;
    cursor = d.collections.pageInfo.endCursor;
  }
  return nodes;
}

function backupDir() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return join(BACKUP_ROOT, ts);
}
function writeBackup(dir, targets, allCollections) {
  mkdirSync(dir, {recursive: true});
  const before = APPROVED.map((a) => {
    const c = targets.get(a.handle);
    return {handle: a.handle, id: c?.id ?? null, seo: {title: c?.seo?.title ?? null, description: c?.seo?.description ?? null}};
  });
  writeFileSync(join(dir, 'collections-seo.before.json'), JSON.stringify(before, null, 2));
  writeFileSync(join(dir, 'fingerprint.before.json'), JSON.stringify([...targets.values()].map(fingerprint), null, 2));
  writeFileSync(join(dir, 'collections.full.before.json'), JSON.stringify(allCollections, null, 2));
  return dir;
}

/* ------------------------------------------------------------------------------- main ------ */
async function main() {
  const argv = process.argv.slice(2);
  const env = process.env;
  const rollbackIdx = argv.indexOf('--rollback');
  const verifyOnly = argv.includes('--verify-only');
  const authorized = writeAuthorized(argv, env);
  const DRY_RUN = !authorized; // default and always-unless-interlocked
  const {config} = await io();

  console.log('─────────────────────────────────────────────');
  console.log('  Batch 1 — collection SEO backfill');
  console.log(`  store: ${config.storeDomain} · api ${config.apiVersion}`);
  console.log(`  MODE:  ${DRY_RUN ? 'DRY-RUN (read-only, ZERO mutations)' : 'WRITE (interlock satisfied)'}`);
  console.log(`  targets: ${[...ALLOWLIST].join(', ')}`);
  console.log('─────────────────────────────────────────────');

  // Rollback path (interlocked; not exercised in preparation).
  if (rollbackIdx !== -1) {
    if (DRY_RUN) {
      console.log('\n▸ Rollback requested but write interlock NOT satisfied → refusing (dry-run). Zero mutations.');
      return;
    }
    return rollback(argv[rollbackIdx + 1]);
  }

  console.log('\n▸ Reading the 3 target collections (read-only)…');
  const targets = await readTargets();
  const {plans, allOk} = buildPlan(targets);

  for (const p of plans) {
    console.log(`\n  • ${p.handle}  (id: ${p.id ?? 'NOT FOUND'})`);
    console.log(`    prereqs: ${p.prereqFailures.length ? 'FAIL → ' + p.prereqFailures.join('; ') : 'OK'}`);
    console.log(`    copy:    ${p.copyErrors.length ? 'FAIL → ' + p.copyErrors.join('; ') : `OK (title ${p.after.seoTitle.length}/60, desc ${p.after.seoDescription.length}/160)`}`);
    console.log(`    before:  title=${JSON.stringify(p.before.seoTitle)} desc=${JSON.stringify(p.before.seoDescription)}`);
    console.log(`    after:   title=${JSON.stringify(p.after.seoTitle)}`);
    console.log(`             desc=${JSON.stringify(p.after.seoDescription)}`);
    console.log(`    payload: ${JSON.stringify(p.input)}`);
  }

  if (verifyOnly) {
    console.log('\n▸ --verify-only complete (read-only). Zero mutations.');
    return;
  }

  if (DRY_RUN) {
    const wouldBackup = backupDir();
    console.log('\n──────────── DRY-RUN SUMMARY ────────────');
    console.log(`  prerequisites all pass: ${allOk ? 'YES' : 'NO — write would be refused'}`);
    console.log(`  backup path that WOULD be used: ${wouldBackup.replace(join(HERE, '..', '..') + '/', '')}`);
    console.log('  rollback plan: restore seo.title/description from collections-seo.before.json (seo-only).');
    console.log('  verify plan:   re-read 3 targets + all-52 diff; only seoTitle/seoDescription may differ on exactly these 3.');
    console.log('  MUTATIONS SENT: 0');
    console.log('\n  To ever write (all three required; not set now):');
    console.log('    TNG_BATCH1_WRITE_AUTH="AUTHORIZE BATCH1 COLLECTION SEO WRITE" \\');
    console.log('      node scripts/batch1-collection-seo.js --commit --i-understand-this-writes-to-shopify');
    console.log('\n✓ Dry-run only. Nothing was created, updated, or deleted.');
    return;
  }

  /* ---- WRITE PATH (interlock satisfied) — sequential, fail-closed. Not run in preparation. */
  if (!allOk) {
    console.error('\n✗ Prerequisites failed — refusing to write. Zero mutations.');
    process.exit(1);
  }
  console.log('\n▸ Capturing pre-write backup…');
  const allBefore = await readAllCollections();
  const dir = writeBackup(backupDir(), targets, allBefore);
  console.log(`  ✓ backup written: ${dir}`);

  console.log('\n▸ Applying updates sequentially…');
  const {gql, redact} = await io();
  const results = [];
  for (const p of plans) {
    assertAllowed(p.handle);
    assertInputScope(p.input);
    let data;
    try {
      data = await gql(UPDATE, {input: p.input});
    } catch (e) {
      console.error(`  ✗ ${p.handle}: ${redact(e.message)} — STOPPING. Applied: ${results.map((r) => r.handle).join(', ') || 'none'}`);
      console.error(`    Roll back with: --rollback ${dir} --commit --i-understand-this-writes-to-shopify`);
      process.exit(1);
    }
    const ue = data.collectionUpdate?.userErrors || [];
    if (ue.length) {
      console.error(`  ✗ ${p.handle}: userErrors ${JSON.stringify(ue)} — STOPPING.`);
      console.error(`    Roll back with: --rollback ${dir} --commit --i-understand-this-writes-to-shopify`);
      process.exit(1);
    }
    results.push({handle: p.handle, ok: true});
    console.log(`  ✓ ${p.handle} updated`);
  }
  console.log('\n▸ Verifying…');
  await verify(dir);
  console.log('\n✓ Batch 1 complete.');
}

async function verify(dir) {
  const targets = await readTargets();
  const beforeFull = JSON.parse(readFileSync(join(dir, 'collections.full.before.json'), 'utf8'));
  const beforeFp = new Map(beforeFull.map((c) => [c.handle, fingerprint(c)]));
  let ok = true;
  for (const a of APPROVED) {
    const c = targets.get(a.handle);
    if (c?.seo?.title !== a.seoTitle || c?.seo?.description !== a.seoDescription) {
      ok = false;
      console.error(`  ✗ ${a.handle}: SEO not as approved`);
    }
    const changed = changedPaths(beforeFp.get(a.handle), fingerprint(c));
    const illegal = changed.filter((k) => !['seoTitle', 'seoDescription'].includes(k));
    if (illegal.length) {
      ok = false;
      console.error(`  ✗ ${a.handle}: unexpected field change(s): ${illegal.join(', ')}`);
    }
  }
  const afterAll = await readAllCollections();
  const afterFp = new Map(afterAll.map((c) => [c.handle, fingerprint(c)]));
  for (const [handle, bfp] of beforeFp) {
    if (ALLOWLIST.has(handle)) continue;
    const changed = changedPaths(bfp, afterFp.get(handle) || {});
    if (changed.length) {
      ok = false;
      console.error(`  ✗ BLAST RADIUS: non-target ${handle} changed: ${changed.join(', ')}`);
    }
  }
  console.log(ok ? '  ✓ verification passed (only seoTitle/seoDescription on the 3 targets changed)' : '  ✗ VERIFICATION FAILED — investigate / roll back');
  if (!ok) process.exit(1);
}

async function rollback(dir) {
  if (!dir || !existsSync(join(dir, 'collections-seo.before.json'))) {
    console.error('✗ Rollback requires a backup dir containing collections-seo.before.json');
    process.exit(1);
  }
  const before = JSON.parse(readFileSync(join(dir, 'collections-seo.before.json'), 'utf8'));
  const {gql} = await io();
  console.log('▸ Rolling back seo.title/description only…');
  for (const b of before) {
    assertAllowed(b.handle);
    const input = buildInput(b.id, b.seo.title, b.seo.description);
    assertInputScope(input);
    const data = await gql(UPDATE, {input});
    const ue = data.collectionUpdate?.userErrors || [];
    if (ue.length) {
      console.error(`  ✗ ${b.handle}: ${JSON.stringify(ue)}`);
      process.exit(1);
    }
    console.log(`  ✓ ${b.handle} restored`);
  }
  console.log('✓ Rollback complete (seo fields only).');
}

// Only run main() when executed directly (keeps pure exports importable for the self-test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(async (e) => {
    let msg = e?.message || String(e);
    try {
      const {redact} = await import('../src/config.js');
      msg = redact(msg);
    } catch {
      /* config unavailable — msg has no secret content here */
    }
    console.error('  ✗ ' + msg);
    process.exit(1);
  });
}
