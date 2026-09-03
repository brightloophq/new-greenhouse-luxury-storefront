// batch-h-audit.js — Phase-1 Batch H: READ-ONLY final audit. Sends QUERIES ONLY; refuses to send
// a mutation; mutates nothing. Certifies the AUTHORIZED Shopify closure (F2 + G) and separately
// reports two non-closure categories so they are never confused with catalogue-mutation failures:
//
//   A. SHOPIFY CLOSURE (drives PASS/FAIL + exit code): retirement, canonicals, occasion counts,
//      gift-baskets/tropical-flowers membership + SEO/body, zero leakage, no companion loss on
//      the collections Batch G actually writes.
//   B. PENDING CODE RELEASE (reported, never fails closure): the six retired→canonical redirect
//      mappings live in storefront CODE (app/lib/collectionRedirects.ts) — Batch C, activated by
//      a deploy, not by a Shopify mutation.
//   C. ADDITIONAL SEO FINDINGS outside Batch G (reported, never fails closure, never mutated):
//      canonical collections whose seo pair is title-only / description-only.
//
// Usage (local Mac):  cd commerce-manager && node scripts/batch-h-audit.js
//
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {
  RETIRE_HANDLES,
  CANONICAL_SURVIVORS,
  CONSOLIDATION,
  OCCASION_CANONICAL,
  isRetailOccasionMember,
  isWeddingProduct,
  isAddOn,
  isBulkBox,
  isWholesaleTagged,
  isRetailTagged,
  PUBLIC_STOREFRONT_PUBLICATIONS,
  HYDROGEN_PUBLICATION,
  seoCompanionStatus,
} from './sprint-lib.js';
import {loadState, assertReadOnly} from './sprint-io.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
// The redirect map now lives in the storefront lib (Batch C); the route imports it.
const REDIRECT_LIB = join(ROOT, 'app', 'lib', 'collectionRedirects.ts');
const GIFT_TROP = ['gift-baskets', 'tropical-flowers'];
const RETAIL_COLLECTIONS = [...OCCASION_CANONICAL, ...GIFT_TROP];

const COLL_QUERY = `#graphql
  query H_Coll($handle: String!) {
    collectionByHandle(handle: $handle) {
      id handle title descriptionHtml
      productsCount { count }
      seo { title description }
      resourcePublications(first: 25) { nodes { isPublished publication { name } } }
      products(first: 250) { nodes { handle title tags productType } }
    }
  }
`;

// Category A — Shopify closure (drives PASS/FAIL)
let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  (cond ? pass++ : fail++);
  results.push(`  ${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const publishedNamesOf = (c) => (c?.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name || '');
const lcEq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const publiclyExposed = (c) => publishedNamesOf(c).some((n) => PUBLIC_STOREFRONT_PUBLICATIONS.some((p) => lcEq(p, n)));
const onHydrogen = (c) => publishedNamesOf(c).some((n) => lcEq(n, HYDROGEN_PUBLICATION));

// Read-only query source. Production imports the live Admin client; an offline test may inject a
// deterministic fixture (handle → collection) via TNG_H_FIXTURE. Neither path ever mutates.
async function getQuery() {
  if (process.env.TNG_H_FIXTURE) {
    const data = JSON.parse(readFileSync(process.env.TNG_H_FIXTURE, 'utf8'));
    return (h) => Promise.resolve({collectionByHandle: data[h] || null});
  }
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  return (h) => adminGraphQL(assertReadOnly(COLL_QUERY), {handle: h});
}

async function main() {
  const q = await getQuery();

  let expected = {birthday: 16, anniversary: 9, 'love-and-romance': 17, 'gift-baskets': 1, 'tropical-flowers': 3};
  try {
    const {state} = loadState();
    for (const h of OCCASION_CANONICAL) if (state.occasion?.[h]) expected[h] = state.occasion[h].intendedMemberCount;
    if (state.giftBaskets) expected['gift-baskets'] = (state.giftBaskets.candidates || []).length;
    if (state.tropical) expected['tropical-flowers'] = (state.tropical.retailCandidates || []).length;
  } catch { /* evidence optional for a post-write audit */ }

  console.log('════════════ BATCH H — FINAL AUDIT (READ-ONLY) ════════════');

  // A1) retired collections not publicly exposed; A2) canonicals survive on Hydrogen
  for (const h of RETIRE_HANDLES) {
    const c = (await q(h)).collectionByHandle;
    const exposed = c ? publiclyExposed(c) : false;
    check(`retired ${h} not on any public storefront`, !exposed, c ? (exposed ? `STILL PUBLIC: [${publishedNamesOf(c).join(', ')}]` : `unpublished (remaining: [${publishedNamesOf(c).join(', ') || 'none'}])`) : 'absent');
  }
  for (const h of CANONICAL_SURVIVORS) {
    const c = (await q(h)).collectionByHandle;
    check(`canonical ${h} survives on Hydrogen storefront`, !!c && onHydrogen(c), c ? `count=${c.productsCount?.count}` : 'MISSING');
  }

  // A3) membership counts + leakage in every retail collection
  for (const h of RETAIL_COLLECTIONS) {
    const c = (await q(h)).collectionByHandle;
    if (!c) { check(`${h} exists`, false); continue; }
    const cnt = c.productsCount?.count;
    check(`${h} membership == ${expected[h]}`, cnt === expected[h], `live=${cnt}`);
    const members = c.products?.nodes || [];
    const wholesaleLeak = members.filter((p) => isBulkBox(p) || (isWholesaleTagged(p) && !isRetailTagged(p)));
    const weddingLeak = members.filter((p) => isWeddingProduct(p));
    const addonLeak = members.filter((p) => isAddOn(p));
    check(`${h} wholesale leakage == 0`, wholesaleLeak.length === 0, wholesaleLeak.map((p) => p.handle).join(', '));
    check(`${h} wedding leakage == 0`, weddingLeak.length === 0, weddingLeak.map((p) => p.handle).join(', '));
    check(`${h} add-on not introduced`, addonLeak.length === 0, addonLeak.map((p) => p.handle).join(', '));
    if (OCCASION_CANONICAL.includes(h)) {
      const nonMembers = members.filter((p) => !isRetailOccasionMember(p));
      check(`${h} every member is a retail occasion member`, nonMembers.length === 0, nonMembers.map((p) => p.handle).join(', '));
    }
  }

  // A4) gift-baskets + tropical-flowers SEO/body complete (Batch G targets) — BOTH companion fields
  for (const h of GIFT_TROP) {
    const c = (await q(h)).collectionByHandle;
    const status = seoCompanionStatus(c?.seo);
    check(`${h} SEO companion (both title+description)`, status === 'both-present', `status=${status}`);
    check(`${h} body present`, String(c?.descriptionHtml || '').replace(/<[^>]*>/g, '').trim().length > 0);
  }

  // ---- Category C — canonical SEO companion findings (report accurately, DO NOT mutate) ----
  const seoFindings = [];
  for (const h of CANONICAL_SURVIVORS) {
    const c = (await q(h)).collectionByHandle;
    const status = seoCompanionStatus(c?.seo);
    if (status === 'title-only') seoFindings.push(`${h}: seo.title present, seo.description MISSING (companion NOT intact)`);
    else if (status === 'description-only') seoFindings.push(`${h}: seo.description present, seo.title MISSING (companion NOT intact)`);
  }

  // ---- Category B — code-side redirect map (Batch C), reported, never fails closure ----
  const redirectRows = [];
  let redirectPresent = 0;
  if (existsSync(REDIRECT_LIB)) {
    const src = readFileSync(REDIRECT_LIB, 'utf8');
    for (const h of RETIRE_HANDLES) {
      const want = `/collections/${CONSOLIDATION[h]}`;
      const keyRe = new RegExp(`(['"]?)${h.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\1\\s*:`);
      const okc = keyRe.test(src) && src.includes(want);
      if (okc) redirectPresent++;
      redirectRows.push(`  ${okc ? '•' : '·'} ${h} → ${want} ${okc ? 'present in code' : 'MISSING in code'}`);
    }
  } else {
    for (const h of RETIRE_HANDLES) redirectRows.push(`  · ${h} → /collections/${CONSOLIDATION[h]} — redirect lib not found`);
  }

  // ---- Output ----
  console.log(results.join('\n'));

  const closurePass = fail === 0;
  console.log('\n════════════ SUMMARY ════════════');
  console.log(`  SHOPIFY CLOSURE: ${closurePass ? 'PASS' : 'FAIL'}  (${pass} passed, ${fail} failed — catalogue mutations only)`);

  console.log(`\n  PENDING CODE RELEASE (Batch C — not a Shopify mutation):`);
  console.log(`    ${redirectPresent}/${RETIRE_HANDLES.length} retired→canonical redirect mappings present in app/lib/collectionRedirects.ts`);
  console.log(`    → ${redirectPresent === RETIRE_HANDLES.length ? 'code complete; still requires a deploy to activate the 6 redirects' : `${RETIRE_HANDLES.length - redirectPresent} mapping(s) missing in code`}`);
  console.log(redirectRows.join('\n'));

  console.log(`\n  ADDITIONAL SEO FINDINGS (outside Batch G scope — reported, NOT mutated):`);
  if (seoFindings.length === 0) {
    console.log('    none — all canonical collections have an intact SEO companion pair');
  } else {
    console.log(`    ${seoFindings.length} canonical collection(s) have seo.title without seo.description:`);
    for (const f of seoFindings) console.log(`      - ${f}`);
    console.log('    NOTE: global SEO is NOT fully complete. These are an audit finding, not authorized Batch G targets (Batch G = gift-baskets, tropical-flowers ONLY).');
  }

  console.log('\n  MUTATIONS SENT: 0 (read-only audit)');
  // Exit code reflects the AUTHORIZED Shopify closure only. Category B/C are informational.
  if (!closurePass) process.exit(1);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  console.error('  ✗ ' + msg);
  process.exit(1);
});
