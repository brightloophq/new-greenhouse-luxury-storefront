// sprint-preflight.js — READ-ONLY live revalidation for the Phase-1 closure sprint.
//
// The approved audit was computed from an earlier export; the sprint task requires the
// relationships to be RE-CONFIRMED against LIVE Shopify before any write. This script
// does exactly that and NOTHING else: it runs Admin GraphQL *queries only*, computes the
// intended end-state with the pure logic in sprint-lib.js, and writes a single evidence
// file the write batches (B–G) will consume so they carry no stale hardcoded IDs.
//
// GUARANTEES (enforced below):
//   • QUERIES ONLY — contains no mutation and refuses to send one.
//   • No secret is written: every output is redact()-checked + token-scanned before it
//     lands on disk; on any match the run ABORTS and writes nothing.
//   • Creates/updates/deletes NOTHING in Shopify.
//
// Emits: catalog/live-audit/sprint-state.json   (catalogue metadata only, gitignored)
//
// Usage (local Mac, where `npm run test:connection` already succeeds):
//   cd commerce-manager
//   node scripts/sprint-preflight.js
//
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {safeSummary, redact} from '../src/config.js';
import {adminGraphQL} from '../src/shopify-admin.js';
import {
  CONSOLIDATION,
  RETIRE_HANDLES,
  CANONICAL_SURVIVORS,
  OCCASION_CANONICAL,
  REDIRECT_MATRIX,
  isRetailOccasionMember,
  retailOccasionsFor,
  isAddOn,
  isTrueGiftBasket,
  isRetailTropical,
  isWholesaleTropicalStem,
  isWeddingProduct,
} from './sprint-lib.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', '..', 'catalog', 'live-audit');
const OUT_FILE = join(OUT_DIR, 'sprint-state.json');

const GIFT_BASKET_HANDLE = 'gift-baskets';
const TROPICAL_HANDLE = 'tropical-flowers';
// Collections whose SEO/body drafts land in Batch G — captured here so gaps are evidenced.
const SEO_TARGET_HANDLES = [...CANONICAL_SURVIVORS, GIFT_BASKET_HANDLE, TROPICAL_HANDLE];
// Every sprint collection we must have live metadata for.
const ALL_SPRINT_HANDLES = [...new Set([...RETIRE_HANDLES, ...CANONICAL_SURVIVORS, GIFT_BASKET_HANDLE, TROPICAL_HANDLE])];

// ---- hard read-only guard -------------------------------------------------
function assertReadOnly(op) {
  if (/\bmutation\b/i.test(op)) throw new Error('READ-ONLY VIOLATION: refusing to send a mutation from sprint-preflight.');
  return op;
}
const query = (op, variables) => adminGraphQL(assertReadOnly(op), variables);

// ---- GraphQL (queries only) ----------------------------------------------
const SCOPES_QUERY = `#graphql
  query SprintScopes { currentAppInstallation { accessScopes { handle } } }
`;
const PRODUCTS_QUERY = `#graphql
  query SprintProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title productType status tags
        seo { title description }
        collections(first: 50) { nodes { id handle } }
        resourcePublications(first: 25) { nodes { isPublished publication { name } } }
      }
    }
  }
`;
const COLLECTIONS_QUERY = `#graphql
  query SprintCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title sortOrder updatedAt
        descriptionHtml
        productsCount { count }
        seo { title description }
        image { url altText }
        ruleSet { appliedDisjunctively rules { column relation condition } }
        resourcePublications(first: 25) { nodes { isPublished publication { name } } }
      }
    }
  }
`;

// ---- normalizers ----------------------------------------------------------
const nodesOf = (x) => (x && Array.isArray(x.nodes) ? x.nodes : []);
const publishedNames = (n) => nodesOf(n && n.resourcePublications).filter((r) => r.isPublished).map((r) => r.publication?.name);
const collHandles = (p) => nodesOf(p.collections).map((c) => c.handle);
const countOf = (c) => (c && c.productsCount && Number.isFinite(c.productsCount.count) ? c.productsCount.count : null);
const bodyPresent = (html) => String(html || '').replace(/<[^>]*>/g, '').trim().length > 0;
const ruleText = (rs) =>
  rs && Array.isArray(rs.rules)
    ? rs.rules.map((r) => `${r.column} ${r.relation} "${r.condition}"`).join(rs.appliedDisjunctively ? ' OR ' : ' AND ')
    : '(manual / no smart rule)';

async function collectAll(kind, op) {
  const nodes = [];
  let cursor = null;
  let pages = 0;
  for (;;) {
    const data = await query(op, {cursor});
    const conn = data[kind];
    nodes.push(...conn.nodes);
    pages++;
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return {nodes, pages};
}

// ---- secret / leak guard --------------------------------------------------
const TOKEN_SCAN = [/shpss_[A-Za-z0-9]+/, /shpat_[A-Za-z0-9]+/, /shpca_[A-Za-z0-9]+/, /atkn_[A-Za-z0-9._-]+/];
function assertNoSecrets(label, serialized) {
  if (redact(serialized) !== serialized) throw new Error(`SECRET GUARD: redactable content detected in ${label}; aborting.`);
  for (const re of TOKEN_SCAN) if (re.test(serialized)) throw new Error(`SECRET GUARD: token-shaped string in ${label}; aborting.`);
}

// ---- main -----------------------------------------------------------------
async function main() {
  const s = safeSummary();
  console.log('─────────────────────────────────────────────');
  console.log('  Phase-1 closure sprint — LIVE PREFLIGHT (READ-ONLY)');
  console.log(`  store: ${s.store} · api: ${s.apiVersion}`);
  console.log('  mode:  QUERIES ONLY — no mutation is sent; nothing is modified');
  console.log('─────────────────────────────────────────────');

  // 1) access scopes — is write_url_redirects granted? (decides redirect architecture)
  let scopes = [];
  try {
    const sc = await query(SCOPES_QUERY, {});
    scopes = (sc.currentAppInstallation?.accessScopes || []).map((a) => a.handle).sort();
  } catch (e) {
    console.log('  ! could not read access scopes: ' + redact(String(e?.message || e)));
  }
  const canWriteRedirects = scopes.includes('write_url_redirects');
  const canWriteProducts = scopes.includes('write_products');
  console.log(`\n▸ scopes: ${scopes.join(', ') || '(none reported)'}`);
  console.log(`  write_url_redirects: ${canWriteRedirects ? 'GRANTED' : 'NOT granted'} · write_products: ${canWriteProducts ? 'GRANTED' : 'NOT granted'}`);

  // 2) live catalogue (paginated, read-only)
  console.log('\n▸ reading products (paginated)…');
  const products = (await collectAll('products', PRODUCTS_QUERY)).nodes;
  console.log(`  ✓ ${products.length} products`);
  console.log('▸ reading collections (paginated)…');
  const collections = (await collectAll('collections', COLLECTIONS_QUERY)).nodes;
  console.log(`  ✓ ${collections.length} collections`);
  const byHandle = new Map(collections.map((c) => [c.handle, c]));
  const membersLive = (h) => products.filter((p) => collHandles(p).includes(h)).map((p) => p.handle);

  // 3) collection metadata snapshot for every sprint collection
  const collMeta = {};
  for (const h of ALL_SPRINT_HANDLES) {
    const c = byHandle.get(h);
    collMeta[h] = c
      ? {
          found: true,
          id: c.id,
          title: c.title,
          productsCount: countOf(c),
          liveMemberCount: membersLive(h).length,
          liveMembers: membersLive(h),
          seoTitle: c.seo?.title ?? null,
          seoDescription: c.seo?.description ?? null,
          seoComplete: !!(c.seo?.title && c.seo?.description),
          bodyPresent: bodyPresent(c.descriptionHtml),
          hasImage: !!c.image?.url,
          isSmart: !!(c.ruleSet && c.ruleSet.rules && c.ruleSet.rules.length),
          rule: ruleText(c.ruleSet),
          ruleSet: c.ruleSet || null,
          published: publishedNames(c),
        }
      : {found: false};
  }

  // 4) consolidation revalidation — each retire→canonical pair, LIVE
  const consolidation = RETIRE_HANDLES.map((retire) => {
    const canonical = CONSOLIDATION[retire];
    const r = collMeta[retire];
    const cn = collMeta[canonical];
    const retireMembers = r.found ? r.liveMembers : [];
    const canonMembers = cn.found ? cn.liveMembers : [];
    const onlyInRetire = retireMembers.filter((h) => !canonMembers.includes(h));
    return {
      retire,
      canonical,
      redirect: `/collections/${retire} → /collections/${canonical}`,
      retireFound: r.found,
      canonicalFound: cn.found,
      retireCount: r.found ? r.productsCount : null,
      canonicalCount: cn.found ? cn.productsCount : null,
      retireIsEmptyDuplicate: r.found && (r.productsCount === 0 || onlyInRetire.length === 0),
      productsOnlyInRetire: onlyInRetire, // must be re-homed to canonical BEFORE retiring
      safeToRetire: r.found && cn.found && onlyInRetire.length === 0,
      revalidate: 'confirm live before Batch B',
    };
  });

  // 5) occasion membership correction — intended vs live (marked revalidate)
  const occasion = {};
  for (const h of OCCASION_CANONICAL) {
    const live = new Set(membersLive(h));
    const intended = products.filter((p) => retailOccasionsFor(p).includes(h));
    const intendedHandles = intended.map((p) => p.handle);
    const toAdd = intendedHandles.filter((x) => !live.has(x)); // belongs, not a member
    const toRemove = [...live].filter((x) => {
      const p = products.find((pp) => pp.handle === x);
      return p && !retailOccasionsFor(p).includes(h); // member, but does not belong
    });
    occasion[h] = {
      liveMemberCount: live.size,
      intendedMemberCount: intendedHandles.length,
      toAdd,
      toRemove,
      toRemoveReasons: toRemove.map((x) => {
        const p = products.find((pp) => pp.handle === x);
        return {handle: x, wedding: p ? isWeddingProduct(p) : null, addOn: p ? isAddOn(p) : null, notRetailMember: p ? !isRetailOccasionMember(p) : null};
      }),
      isSmart: collMeta[h].isSmart,
      rule: collMeta[h].rule,
      mechanism: collMeta[h].isSmart
        ? 'smart collection — correct via product TAGS or rule (see plan Batch E open decision)'
        : 'manual collection — correct via collectionAddProducts / collectionRemoveProducts',
      revalidate: 'confirm live before Batch E',
    };
  }

  // 6) gift baskets + tropical candidate populations (live)
  const giftBaskets = products.filter(isTrueGiftBasket).map((p) => ({handle: p.handle, title: p.title, productType: p.productType, alreadyMember: collHandles(p).includes(GIFT_BASKET_HANDLE)}));
  const tropicalRetail = products.filter(isRetailTropical).map((p) => ({handle: p.handle, title: p.title, productType: p.productType, alreadyMember: collHandles(p).includes(TROPICAL_HANDLE)}));
  const tropicalWholesaleStems = products.filter(isWholesaleTropicalStem).map((p) => ({handle: p.handle, title: p.title, productType: p.productType}));

  // 7) SEO / body target gaps
  const seoTargets = SEO_TARGET_HANDLES.map((h) => ({
    handle: h,
    found: collMeta[h].found,
    seoComplete: collMeta[h].found ? collMeta[h].seoComplete : null,
    seoTitle: collMeta[h].found ? collMeta[h].seoTitle : null,
    seoDescription: collMeta[h].found ? collMeta[h].seoDescription : null,
    bodyPresent: collMeta[h].found ? collMeta[h].bodyPresent : null,
    needsSeo: collMeta[h].found ? !collMeta[h].seoComplete : null,
    needsBody: collMeta[h].found ? !collMeta[h].bodyPresent : null,
  }));

  const state = {
    generatedAt: new Date().toISOString(),
    source: 'LIVE Shopify Admin GraphQL — read-only preflight. Catalogue metadata only.',
    store: s.store,
    apiVersion: s.apiVersion,
    scopes: {all: scopes, canWriteRedirects, canWriteProducts},
    redirectMatrix: REDIRECT_MATRIX,
    counts: {products: products.length, collections: collections.length},
    collections: collMeta,
    consolidation,
    occasion,
    giftBaskets: {targetHandle: GIFT_BASKET_HANDLE, found: collMeta[GIFT_BASKET_HANDLE].found, liveCount: collMeta[GIFT_BASKET_HANDLE].found ? collMeta[GIFT_BASKET_HANDLE].productsCount : null, candidates: giftBaskets},
    tropical: {targetHandle: TROPICAL_HANDLE, found: collMeta[TROPICAL_HANDLE].found, liveCount: collMeta[TROPICAL_HANDLE].found ? collMeta[TROPICAL_HANDLE].productsCount : null, retailCandidates: tropicalRetail, wholesaleStemsExcluded: tropicalWholesaleStems},
    seoTargets,
    note: 'Consume this file in write batches B–G so no stale IDs are hardcoded. Re-run immediately before each write. Nothing was modified.',
  };

  const body = JSON.stringify(state, null, 2);
  console.log('\n▸ secret-scanning before writing…');
  assertNoSecrets('sprint-state.json', body);
  console.log('  ✓ no secrets or token-shaped strings found');
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true});
  writeFileSync(OUT_FILE, body);

  // console summary
  console.log('\n──────────── PREFLIGHT SUMMARY (read-only) ────────────');
  for (const c of consolidation) {
    console.log(`  ${c.retire} (${c.retireCount}) → ${c.canonical} (${c.canonicalCount}) · onlyInRetire=${c.productsOnlyInRetire.length} · safeToRetire=${c.safeToRetire}`);
  }
  for (const h of OCCASION_CANONICAL) {
    const o = occasion[h];
    console.log(`  occasion ${h}: live=${o.liveMemberCount} intended=${o.intendedMemberCount} +${o.toAdd.length}/-${o.toRemove.length} (${o.isSmart ? 'smart' : 'manual'})`);
  }
  console.log(`  gift-baskets candidates: ${giftBaskets.length} · tropical retail: ${tropicalRetail.length} (wholesale stems excluded: ${tropicalWholesaleStems.length})`);
  console.log(`  SEO gaps: ${seoTargets.filter((t) => t.needsSeo).map((t) => t.handle).join(', ') || 'none'}`);
  console.log(`  body gaps: ${seoTargets.filter((t) => t.needsBody).map((t) => t.handle).join(', ') || 'none'}`);
  console.log(`\n  wrote: catalog/live-audit/sprint-state.json`);
  console.log('✓ QUERIES ONLY. Nothing created, updated, published, or deleted.');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exit(1);
});
