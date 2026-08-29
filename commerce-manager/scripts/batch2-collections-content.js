// batch2-collections-content.js — Batch 2 collection content backfill.
// Writable fields (and ONLY these): descriptionHtml, seo.title, seo.description.
//
// SAFETY MODEL (same posture as Batch 1, extended for body copy)
//   • DEFAULT = DRY-RUN (read-only). Zero mutations without the interlock.
//   • THREE-part write interlock (all three, or it stays dry-run):
//        1) --commit
//        2) --i-understand-this-writes-to-shopify
//        3) env TNG_BATCH2_WRITE_AUTH="AUTHORIZE BATCH2 COLLECTION CONTENT WRITE"
//     No single flag can ever authorize a write. None supplied during preparation.
//   • Hard allowlist: exactly same-day-delivery, plants, thank-you, luxury-bouquets.
//   • Fail-closed prerequisites vs the authoritative snapshot: seo.title/seo.description
//     AND descriptionHtml must be EMPTY (pure backfill, never overwrite), published to the
//     storefront channel, product count > 0, approved copy within SEO limits.
//   • Deterministic count-drift policy (see classifyCount): PASS / WARN / HARD FAIL.
//   • Payload scope asserted EXACTLY { id, descriptionHtml, seo:{title,description} }.
//   • Auto timestamped backup before any write (gitignored). Sequential writes, per-response
//     validation, stop-on-error with rollback path. Rollback restores ONLY the 3 fields.
//   • Secrets never printed (client redact()). Pure logic import-safe (lazy credentials).
//
// USAGE
//   node scripts/batch2-collections-content.js                 # DRY-RUN (read-only) default
//   node scripts/batch2-collections-content.js --verify-only   # read + compare to approved
//   # WRITE (do NOT run during preparation):
//   TNG_BATCH2_WRITE_AUTH="AUTHORIZE BATCH2 COLLECTION CONTENT WRITE" \
//     node scripts/batch2-collections-content.js --commit --i-understand-this-writes-to-shopify
//   # ROLLBACK (interlocked, later):
//   TNG_BATCH2_WRITE_AUTH="AUTHORIZE BATCH2 COLLECTION CONTENT WRITE" \
//     node scripts/batch2-collections-content.js --rollback catalog/live-audit/backups/<UTC> --commit --i-understand-this-writes-to-shopify
//
import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

// Credentials + client imported lazily so pure exports are import-safe (offline self-test).
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
const STOREFRONT_CHANNEL = /New Greenhouse Luxury Storefront/i;

/* --------------------------------------------------- approved targets + copy (verbatim) ---- */
export const APPROVED = [
  {
    handle: 'same-day-delivery',
    expect: {products: 58},
    seoTitle: 'Same-Day Flower Delivery in Kingston | The New Greenhouse',
    seoDescription:
      'Order before 12:00 PM, Monday to Saturday, for same-day flower delivery within Kingston from The New Greenhouse.',
    descriptionHtml:
      '<p>Fresh flowers when the moment can’t wait — bouquets and arrangements hand-tied by our Kingston studio, ready to send today.</p>\n' +
      '<p><strong>Same-day delivery</strong> is available within <strong>Kingston</strong>, Monday to Saturday, for orders placed before <strong>12:00 PM</strong>.</p>\n' +
      '<p><strong>Regular delivery</strong> covers <strong>Kingston &amp; St. Andrew</strong>.</p>\n' +
      '<p><strong>Island-wide delivery</strong> is available by arrangement — contact us to confirm timing.</p>',
  },
  {
    handle: 'plants',
    expect: {products: 3},
    seoTitle: 'Indoor Plants & Orchids | The New Greenhouse',
    seoDescription:
      'A curated selection of potted plants and orchids from The New Greenhouse, a family florist in Kingston, Jamaica.',
    descriptionHtml:
      '<p>A curated selection of living plants and potted orchids from our Kingston studio — easy, long-lasting greenery for the home, the office, or a lasting gift. Prepared by The New Greenhouse, a family florist in Kingston, Jamaica.</p>',
  },
  {
    handle: 'thank-you',
    expect: {products: 21},
    seoTitle: 'Thank You Flowers | The New Greenhouse',
    seoDescription:
      'Say thank you with fresh, hand-arranged flowers from The New Greenhouse, a family florist in Kingston, Jamaica.',
    descriptionHtml:
      '<p>A little gratitude goes a long way. Our thank-you flowers are hand-arranged by The New Greenhouse studio in Kingston — a warm way to show appreciation to a friend, a host, a colleague or a client. Fresh blooms, thoughtfully composed and ready to send.</p>',
  },
  {
    handle: 'luxury-bouquets',
    expect: {products: 4},
    seoTitle: 'Luxury Bouquets | The New Greenhouse',
    seoDescription:
      'Premium hand-tied bouquets from The New Greenhouse, a family florist in Kingston, Jamaica, composed from seasonal blooms.',
    descriptionHtml:
      '<p>Our most refined hand-tied bouquets, composed from premium seasonal blooms by The New Greenhouse studio in Kingston. Each is arranged to order for gifting, a celebration, or a moment worth marking.</p>',
  },
];
export const ALLOWLIST = new Set(APPROVED.map((a) => a.handle));

/* ------------------------------------------------------------------------- pure helpers ---- */
export const stripHtml = (h) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const sha256 = (s) => createHash('sha256').update(s || '', 'utf8').digest('hex');

export function assertAllowed(handle) {
  if (!ALLOWLIST.has(handle)) throw new Error(`REFUSED: handle "${handle}" is not on the Batch-2 allowlist.`);
}

export function validateCopy({seoTitle, seoDescription, descriptionHtml}) {
  const e = [];
  if (!seoTitle) e.push('seo.title empty');
  if (!seoDescription) e.push('seo.description empty');
  if (!descriptionHtml || !stripHtml(descriptionHtml)) e.push('descriptionHtml empty');
  if ((seoTitle || '').length > 60) e.push(`seo.title ${seoTitle.length} > 60`);
  if ((seoDescription || '').length > 160) e.push(`seo.description ${seoDescription.length} > 160`);
  return e;
}

/** The ONLY shape a Batch-2 mutation may carry. */
export function buildInput(id, descriptionHtml, seoTitle, seoDescription) {
  return {id, descriptionHtml, seo: {title: seoTitle, description: seoDescription}};
}

/** Throws unless input is EXACTLY { id, descriptionHtml, seo:{title,description} }. */
export function assertInputScope(input) {
  const top = Object.keys(input).sort().join(',');
  if (top !== 'descriptionHtml,id,seo') throw new Error(`ILLEGAL PAYLOAD: top keys must be descriptionHtml,id,seo — got ${top}`);
  const seoKeys = Object.keys(input.seo || {}).sort().join(',');
  if (seoKeys !== 'description,title') throw new Error(`ILLEGAL PAYLOAD: seo keys must be description,title — got ${seoKeys}`);
  if (typeof input.id !== 'string' || !input.id) throw new Error('ILLEGAL PAYLOAD: missing id');
}

/**
 * Deterministic product-count drift policy.
 *   tolerance = max(ceil(0.15 * baseline), 3)
 *   current === 0          → 'FAIL_ZERO'      (never write a 0-product collection)
 *   current === baseline   → 'PASS'
 *   |Δ| <= tolerance       → 'WARN'           (small plausible drift on a dynamic collection)
 *   |Δ| >  tolerance       → 'FAIL_MATERIAL'  (requires a fresh audit / manual approval)
 */
export function classifyCount(current, baseline) {
  if (current === 0) return 'FAIL_ZERO';
  if (current === baseline) return 'PASS';
  const tolerance = Math.max(Math.ceil(0.15 * baseline), 3);
  return Math.abs(current - baseline) <= tolerance ? 'WARN' : 'FAIL_MATERIAL';
}
export function countTolerance(baseline) {
  return Math.max(Math.ceil(0.15 * baseline), 3);
}

/** Fail-closed prerequisites. Returns {failures[], warnings[], countClass}. */
export function checkPrereqs(live, approved) {
  const failures = [];
  const warnings = [];
  if (!live) return {failures: [`collection "${approved.handle}" not found`], warnings, countClass: 'FAIL_ZERO'};
  if (live.handle !== approved.handle) failures.push(`handle mismatch: ${live.handle} != ${approved.handle}`);
  if (live.seo?.title) failures.push('seo.title is NOT empty (would overwrite)');
  if (live.seo?.description) failures.push('seo.description is NOT empty (would overwrite)');
  if (stripHtml(live.descriptionHtml).length > 0) failures.push('descriptionHtml is NOT empty (would overwrite body)');
  const pubChans = (live.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name || '');
  if (!pubChans.some((n) => STOREFRONT_CHANNEL.test(n))) failures.push('not published to "New Greenhouse Luxury Storefront"');
  const copyErr = validateCopy(approved);
  if (copyErr.length) failures.push(...copyErr.map((e) => `copy: ${e}`));
  const current = live.productsCount?.count ?? 0;
  const countClass = classifyCount(current, approved.expect.products);
  if (countClass === 'FAIL_ZERO') failures.push('product count is 0');
  else if (countClass === 'FAIL_MATERIAL')
    failures.push(`material count drift: ${current} vs baseline ${approved.expect.products} (tol ±${countTolerance(approved.expect.products)}) — new audit required`);
  else if (countClass === 'WARN')
    warnings.push(`count drift: ${current} vs baseline ${approved.expect.products} (within ±${countTolerance(approved.expect.products)}) — proceeding, logged`);
  return {failures, warnings, countClass};
}

/** Immutable-field fingerprint for blast-radius verification (body hashed to detect change). */
export function fingerprint(c) {
  return {
    handle: c.handle,
    id: c.id,
    title: c.title,
    descriptionHtmlSha256: sha256(c.descriptionHtml || ''),
    productsCount: c.productsCount?.count ?? null,
    imageUrl: c.image?.url ?? null,
    imageAlt: c.image?.altText ?? null,
    channels: (c.resourcePublications?.nodes || []).map((n) => ({name: n.publication?.name || null, isPublished: !!n.isPublished})),
    ruleSet: c.ruleSet ?? null,
    sortOrder: c.sortOrder ?? null,
    templateSuffix: c.templateSuffix ?? null,
    updatedAt: c.updatedAt ?? null,
    seoTitle: c.seo?.title ?? null,
    seoDescription: c.seo?.description ?? null,
  };
}

/** Changed fingerprint keys between two snapshots. `updatedAt` is excluded (always changes on write). */
export function changedPaths(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out = [];
  for (const k of keys) {
    if (k === 'updatedAt') continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out.push(k);
  }
  return out;
}
export const ALLOWED_CHANGE_PATHS = ['descriptionHtmlSha256', 'seoDescription', 'seoTitle'];

/** THREE-part write interlock. */
export function writeAuthorized(argv, env) {
  return (
    argv.includes('--commit') &&
    argv.includes('--i-understand-this-writes-to-shopify') &&
    env.TNG_BATCH2_WRITE_AUTH === 'AUTHORIZE BATCH2 COLLECTION CONTENT WRITE'
  );
}

/** Build per-collection plan from live data (pure; no network, no writes). */
export function buildPlan(liveByHandle) {
  const plans = APPROVED.map((a) => {
    assertAllowed(a.handle);
    const live = liveByHandle.get(a.handle) || null;
    const {failures, warnings, countClass} = checkPrereqs(live, a);
    const input = live ? buildInput(live.id, a.descriptionHtml, a.seoTitle, a.seoDescription) : null;
    if (input) assertInputScope(input);
    return {
      handle: a.handle,
      id: live?.id ?? null,
      currentCount: live?.productsCount?.count ?? null,
      baseline: a.expect.products,
      countClass,
      before: {
        seoTitle: live?.seo?.title ?? null,
        seoDescription: live?.seo?.description ?? null,
        bodyChars: stripHtml(live?.descriptionHtml).length,
      },
      after: {seoTitle: a.seoTitle, seoDescription: a.seoDescription, bodyChars: stripHtml(a.descriptionHtml).length},
      input,
      prereqFailures: failures,
      warnings,
      fingerprintBefore: live ? fingerprint(live) : null,
    };
  });
  const allOk = plans.every((p) => p.prereqFailures.length === 0 && p.input);
  return {plans, allOk};
}

/* ------------------------------------------------------------------------- GraphQL (I/O) ---- */
const COLL_FIELDS = `
  id handle title descriptionHtml sortOrder templateSuffix updatedAt
  productsCount { count }
  seo { title description }
  image { url altText }
  ruleSet { appliedDisjunctively rules { column relation condition } }
  resourcePublications(first: 25) { nodes { isPublished publication { name } } }
`;
const READ_TARGETS = `#graphql
  query Batch2Read($h1: String!, $h2: String!, $h3: String!, $h4: String!) {
    c1: collectionByHandle(handle: $h1) { ${COLL_FIELDS} }
    c2: collectionByHandle(handle: $h2) { ${COLL_FIELDS} }
    c3: collectionByHandle(handle: $h3) { ${COLL_FIELDS} }
    c4: collectionByHandle(handle: $h4) { ${COLL_FIELDS} }
  }
`;
const READ_ALL = `#graphql
  query Batch2AllCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { ${COLL_FIELDS} }
    }
  }
`;
// WRITE mutation — reachable ONLY inside the interlocked write/rollback paths.
const UPDATE = `#graphql
  mutation Batch2Update($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id handle seo { title description } }
      userErrors { field message }
    }
  }
`;

async function readTargets() {
  const {gql} = await io();
  const [h1, h2, h3, h4] = APPROVED.map((a) => a.handle);
  const data = await gql(READ_TARGETS, {h1, h2, h3, h4});
  const map = new Map();
  for (const c of [data.c1, data.c2, data.c3, data.c4]) if (c) map.set(c.handle, c);
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
  return join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
}
function writeBackup(dir, targets, allCollections) {
  mkdirSync(dir, {recursive: true});
  const content = APPROVED.map((a) => {
    const c = targets.get(a.handle);
    return {
      handle: a.handle,
      id: c?.id ?? null,
      descriptionHtml: c?.descriptionHtml ?? null,
      seo: {title: c?.seo?.title ?? null, description: c?.seo?.description ?? null},
    };
  });
  writeFileSync(join(dir, 'collections-content.before.json'), JSON.stringify(content, null, 2));
  writeFileSync(join(dir, 'fingerprint.before.json'), JSON.stringify([...targets.values()].map(fingerprint), null, 2));
  writeFileSync(join(dir, 'collections.full.before.json'), JSON.stringify(allCollections, null, 2));
  return dir;
}
const rel = (p) => p.replace(join(HERE, '..', '..') + '/', '');

/* ------------------------------------------------------------------------------- main ------ */
async function main() {
  const argv = process.argv.slice(2);
  const rollbackIdx = argv.indexOf('--rollback');
  const verifyOnly = argv.includes('--verify-only');
  const DRY_RUN = !writeAuthorized(argv, process.env);
  const {config} = await io();

  console.log('─────────────────────────────────────────────');
  console.log('  Batch 2 — collection content backfill (descriptionHtml + seo.title + seo.description)');
  console.log(`  store: ${config.storeDomain} · api ${config.apiVersion}`);
  console.log(`  MODE:  ${DRY_RUN ? 'DRY-RUN (read-only, ZERO mutations)' : 'WRITE (interlock satisfied)'}`);
  console.log(`  targets: ${[...ALLOWLIST].join(', ')}`);
  console.log('─────────────────────────────────────────────');

  if (rollbackIdx !== -1) {
    if (DRY_RUN) {
      console.log('\n▸ Rollback requested but interlock NOT satisfied → refusing (dry-run). Zero mutations.');
      return;
    }
    return rollback(argv[rollbackIdx + 1]);
  }

  console.log('\n▸ Reading the 4 target collections (read-only)…');
  const targets = await readTargets();
  const {plans, allOk} = buildPlan(targets);

  for (const p of plans) {
    console.log(`\n  • ${p.handle}  (id: ${p.id ?? 'NOT FOUND'})`);
    console.log(`    count:   ${p.currentCount ?? '—'} vs baseline ${p.baseline} → ${p.countClass}${p.warnings.length ? ' ⚠ ' + p.warnings.join('; ') : ''}`);
    console.log(`    prereqs: ${p.prereqFailures.length ? 'FAIL → ' + p.prereqFailures.join('; ') : 'OK'}`);
    console.log(`    before:  seoTitle=${JSON.stringify(p.before.seoTitle)} seoDesc=${JSON.stringify(p.before.seoDescription)} bodyChars=${p.before.bodyChars}`);
    console.log(`    after:   seoTitle(${p.after.seoTitle.length}/60)=${JSON.stringify(p.after.seoTitle)}`);
    console.log(`             seoDesc(${p.after.seoDescription.length}/160)=${JSON.stringify(p.after.seoDescription)}`);
    console.log(`             bodyChars=${p.after.bodyChars}`);
    console.log(`    payload keys: ${Object.keys(p.input || {}).sort().join(',')} · seo keys: ${Object.keys(p.input?.seo || {}).sort().join(',')}`);
  }

  if (verifyOnly) {
    console.log('\n▸ --verify-only complete (read-only). Zero mutations.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n──────────── DRY-RUN SUMMARY ────────────');
    console.log(`  prerequisites all pass: ${allOk ? 'YES' : 'NO — write would be refused'}`);
    console.log(`  backup path that WOULD be used: ${rel(backupDir())}`);
    console.log('  backups/files created THIS run: 0 (dry-run writes nothing)');
    console.log('  rollback scope: descriptionHtml + seo.title + seo.description only.');
    console.log('  verify scope:   exact copy match + all-52 diff (only descriptionHtmlSha256/seoTitle/seoDescription on the 4).');
    console.log('  MUTATIONS SENT: 0');
    console.log('\n  To ever write (all three required; not set now):');
    console.log('    TNG_BATCH2_WRITE_AUTH="AUTHORIZE BATCH2 COLLECTION CONTENT WRITE" \\');
    console.log('      node scripts/batch2-collections-content.js --commit --i-understand-this-writes-to-shopify');
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
  console.log(`  ✓ backup written: ${rel(dir)}`);

  console.log('\n▸ Applying updates sequentially…');
  const {gql, redact} = await io();
  const done = [];
  for (const p of plans) {
    assertAllowed(p.handle);
    assertInputScope(p.input);
    let data;
    try {
      data = await gql(UPDATE, {input: p.input});
    } catch (e) {
      console.error(`  ✗ ${p.handle}: ${redact(e.message)} — STOPPING. Completed: ${done.join(', ') || 'none'}; failed: ${p.handle}`);
      console.error(`    Roll back with: --rollback ${rel(dir)} --commit --i-understand-this-writes-to-shopify`);
      process.exit(1);
    }
    const ue = data.collectionUpdate?.userErrors || [];
    if (ue.length) {
      console.error(`  ✗ ${p.handle}: userErrors ${JSON.stringify(ue)} — STOPPING. Completed: ${done.join(', ') || 'none'}; failed: ${p.handle}`);
      console.error(`    Roll back with: --rollback ${rel(dir)} --commit --i-understand-this-writes-to-shopify`);
      process.exit(1);
    }
    done.push(p.handle);
    console.log(`  ✓ ${p.handle} updated`);
  }
  console.log('\n▸ Verifying…');
  await verify(dir);
  console.log('\n✓ Batch 2 complete.');
}

async function verify(dir) {
  const targets = await readTargets();
  const beforeFull = JSON.parse(readFileSync(join(dir, 'collections.full.before.json'), 'utf8'));
  const beforeFp = new Map(beforeFull.map((c) => [c.handle, fingerprint(c)]));
  let ok = true;
  for (const a of APPROVED) {
    const c = targets.get(a.handle);
    if (c?.seo?.title !== a.seoTitle || c?.seo?.description !== a.seoDescription || c?.descriptionHtml !== a.descriptionHtml) {
      ok = false;
      console.error(`  ✗ ${a.handle}: content does not exactly match approved copy`);
    }
    const changed = changedPaths(beforeFp.get(a.handle), fingerprint(c));
    const illegal = changed.filter((k) => !ALLOWED_CHANGE_PATHS.includes(k));
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
  console.log(ok ? '  ✓ verification passed (only descriptionHtml/seoTitle/seoDescription on the 4 targets changed)' : '  ✗ VERIFICATION FAILED — investigate / roll back');
  if (!ok) process.exit(1);
}

async function rollback(dir) {
  if (!dir || !existsSync(join(dir, 'collections-content.before.json'))) {
    console.error('✗ Rollback requires a backup dir containing collections-content.before.json');
    process.exit(1);
  }
  const before = JSON.parse(readFileSync(join(dir, 'collections-content.before.json'), 'utf8'));
  const {gql} = await io();
  console.log('▸ Rolling back descriptionHtml + seo.title/description only…');
  for (const b of before) {
    assertAllowed(b.handle);
    const input = buildInput(b.id, b.descriptionHtml ?? '', b.seo.title, b.seo.description);
    assertInputScope(input);
    const data = await gql(UPDATE, {input});
    const ue = data.collectionUpdate?.userErrors || [];
    if (ue.length) {
      console.error(`  ✗ ${b.handle}: ${JSON.stringify(ue)}`);
      process.exit(1);
    }
    console.log(`  ✓ ${b.handle} restored`);
  }
  console.log('✓ Rollback complete (descriptionHtml + seo fields only).');
}

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
