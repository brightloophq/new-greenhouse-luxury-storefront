// batch-h-audit.js — Phase-1 Batch H: READ-ONLY final audit. Proves the sprint's intended
// end-state after Batches B/C/E/F/G. Sends QUERIES ONLY; refuses to send a mutation; mutates
// nothing. Run after the writes to certify the catalogue is clean.
//
// Also usable BEFORE writes as a readiness check (it simply reports current vs expected).
//
// Usage (local Mac):
//   cd commerce-manager
//   node scripts/batch-h-audit.js
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
} from './sprint-lib.js';
import {loadState, assertReadOnly} from './sprint-io.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const REDIRECT_FILE = join(ROOT, 'app', 'routes', '($locale).collections.$handle.tsx');
const RETAIL_COLLECTIONS = [...OCCASION_CANONICAL, 'gift-baskets', 'tropical-flowers'];

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

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  (cond ? pass++ : fail++);
  results.push(`  ${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const publishedNamesOf = (c) => (c?.resourcePublications?.nodes || []).filter((n) => n.isPublished).map((n) => n.publication?.name || '');
const lcEq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
// Publicly exposed on the web = published to ANY public storefront publication (Hydrogen or Online Store).
const publiclyExposed = (c) => publishedNamesOf(c).some((n) => PUBLIC_STOREFRONT_PUBLICATIONS.some((p) => lcEq(p, n)));
const onHydrogen = (c) => publishedNamesOf(c).some((n) => lcEq(n, HYDROGEN_PUBLICATION));

async function main() {
  const {adminGraphQL} = await import('../src/shopify-admin.js');
  const q = (h) => adminGraphQL(assertReadOnly(COLL_QUERY), {handle: h});

  // expected end-state numbers — prefer fresh evidence, fall back to the approved sprint targets
  let expected = {birthday: 16, anniversary: 9, 'love-and-romance': 17, 'gift-baskets': 1, 'tropical-flowers': 3};
  try {
    const {state} = loadState();
    for (const h of OCCASION_CANONICAL) if (state.occasion?.[h]) expected[h] = state.occasion[h].intendedMemberCount;
    if (state.giftBaskets) expected['gift-baskets'] = (state.giftBaskets.candidates || []).length;
    if (state.tropical) expected['tropical-flowers'] = (state.tropical.retailCandidates || []).length;
  } catch { /* evidence optional for a post-write audit */ }

  console.log('════════════ BATCH H — FINAL AUDIT (READ-ONLY) ════════════');

  // 1) retired collections no longer publicly exposed (Hydrogen or Online Store); 2) canonicals survive on Hydrogen
  for (const h of RETIRE_HANDLES) {
    const c = (await q(h)).collectionByHandle;
    const exposed = c ? publiclyExposed(c) : false;
    check(`retired ${h} not on any public storefront`, !exposed, c ? (exposed ? `STILL PUBLIC: [${publishedNamesOf(c).join(', ')}]` : `unpublished (remaining: [${publishedNamesOf(c).join(', ') || 'none'}])`) : 'absent');
  }
  for (const h of CANONICAL_SURVIVORS) {
    const c = (await q(h)).collectionByHandle;
    check(`canonical ${h} survives on Hydrogen storefront`, !!c && onHydrogen(c), c ? `count=${c.productsCount?.count} published=[${publishedNamesOf(c).join(', ')}]` : 'MISSING');
  }

  // 3) redirect map covers all six retired handles (code-level, since write_url_redirects absent)
  if (existsSync(REDIRECT_FILE)) {
    const src = readFileSync(REDIRECT_FILE, 'utf8');
    for (const h of RETIRE_HANDLES) {
      const want = `/collections/${CONSOLIDATION[h]}`;
      const has = src.includes(`'${h}'`) || src.includes(`"${h}"`);
      const toCanonical = src.includes(want);
      check(`redirect map has ${h} → ${want}`, has && toCanonical);
    }
  } else {
    check('redirect map file present', false, 'collections.$handle.tsx not found');
  }

  // 4) membership counts + 5) leakage in every retail collection
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
    // occasion collections: every member is a legitimate retail occasion member
    if (OCCASION_CANONICAL.includes(h)) {
      const nonMembers = members.filter((p) => !isRetailOccasionMember(p));
      check(`${h} every member is a retail occasion member`, nonMembers.length === 0, nonMembers.map((p) => p.handle).join(', '));
    }
  }

  // 6) gift-baskets + tropical SEO/body complete; 7) no SEO companion-field loss anywhere checked
  for (const h of ['gift-baskets', 'tropical-flowers']) {
    const c = (await q(h)).collectionByHandle;
    check(`${h} SEO complete (both fields)`, !!(c?.seo?.title && c?.seo?.description));
    check(`${h} body present`, String(c?.descriptionHtml || '').replace(/<[^>]*>/g, '').trim().length > 0);
  }
  for (const h of CANONICAL_SURVIVORS) {
    const c = (await q(h)).collectionByHandle;
    // if a canonical has a title, it must still have a description (no companion loss)
    if (c?.seo?.title) check(`${h} SEO companion intact`, !!c.seo.description, 'title present without description!' );
  }

  console.log(results.join('\n'));
  console.log('\n════════════ SUMMARY ════════════');
  console.log(`  checks: ${pass} passed, ${fail} failed`);
  console.log('  MUTATIONS SENT: 0 (read-only audit)');
  if (fail) process.exit(1);
}

main().catch(async (e) => {
  let msg = e?.message || String(e);
  try { const {redact} = await import('../src/config.js'); msg = redact(msg); } catch {}
  console.error('  ✗ ' + msg);
  process.exit(1);
});
