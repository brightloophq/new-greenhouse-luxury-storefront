// scripts/export-live-audit.js — READ-ONLY authoritative catalogue export.
//
// Exchanges the client-credentials grant for a short-lived token (in memory,
// never printed) and runs Admin GraphQL *queries only* to export the live
// products and collections into ../catalog/live-audit/raw/.
//
// GUARANTEES (enforced below):
//   • QUERIES ONLY — this file contains no mutation and refuses to send one.
//   • No secret is ever printed or written: every output is passed through the
//     client's `redact()` and an explicit shp*/atkn token scan before it lands
//     on disk; if anything matches, the export ABORTS and writes nothing.
//   • Read-only — creates/updates/deletes nothing in Shopify.
//
// Scopes required: read_products (+ read_publications for publication drift;
// the script degrades gracefully to status-only if that scope is absent).
//
// Usage (from the local Mac, where `npm run test:connection` already succeeds):
//   cd commerce-manager
//   node scripts/export-live-audit.js
//
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {safeSummary, redact} from '../src/config.js';
import {adminGraphQL} from '../src/shopify-admin.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(HERE, '..', '..', 'catalog', 'live-audit', 'raw');

// ---- hard read-only guard -------------------------------------------------
// Every operation sent from this file must be an anonymous/`query` document.
// A stray `mutation` keyword is treated as a programming error and refused.
function assertReadOnly(op) {
  if (/\bmutation\b/i.test(op)) {
    throw new Error('READ-ONLY VIOLATION: refusing to send a mutation from export-live-audit.');
  }
  return op;
}
async function query(op, variables) {
  return adminGraphQL(assertReadOnly(op), variables);
}

// ---- GraphQL documents (queries only) -------------------------------------
const SHOP_QUERY = `#graphql
  query LiveAuditShop {
    shop { name currencyCode primaryDomain { url host } }
    productsCount { count }
    collectionsCount { count }
  }
`;

function productsQuery(includePublications) {
  const pub = includePublications
    ? `resourcePublications(first: 25) { nodes { isPublished publishDate publication { name } } }`
    : ``;
  return `#graphql
    query LiveAuditProducts($cursor: String) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id title handle productType vendor status
          descriptionHtml description
          tags createdAt updatedAt publishedAt totalInventory onlineStoreUrl
          seo { title description }
          featuredImage { url altText }
          images(first: 30) { nodes { url altText } }
          variants(first: 100) { nodes { id title sku price selectedOptions { name value } } }
          collections(first: 50) { nodes { handle title } }
          ${pub}
        }
      }
    }
  `;
}

function collectionsQuery(includePublications) {
  const pub = includePublications
    ? `resourcePublications(first: 25) { nodes { isPublished publishDate publication { name } } }`
    : ``;
  return `#graphql
    query LiveAuditCollections($cursor: String) {
      collections(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id title handle sortOrder templateSuffix updatedAt
          descriptionHtml description
          productsCount { count }
          seo { title description }
          image { url altText }
          ruleSet { appliedDisjunctively rules { column relation condition } }
          ${pub}
        }
      }
    }
  `;
}

// ---- paginated collector --------------------------------------------------
async function collectAll(kind, buildQuery, includePublications) {
  const nodes = [];
  let cursor = null;
  let pages = 0;
  // Attempt with publications; on an access/scope error, fall back once.
  let withPub = includePublications;
  for (;;) {
    let data;
    try {
      data = await query(buildQuery(withPub), {cursor});
    } catch (e) {
      const msg = String(e?.message || e);
      if (withPub && /access|scope|permission|read_publications/i.test(msg)) {
        console.log(`  ! publications unavailable for ${kind} (scope) — continuing status-only`);
        withPub = false;
        continue; // retry same cursor without publication fields
      }
      throw e;
    }
    const conn = data[kind];
    nodes.push(...conn.nodes);
    pages++;
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return {nodes, pages, publicationsIncluded: withPub};
}

// ---- secret / leak guard --------------------------------------------------
const TOKEN_SCAN = [/shpss_[A-Za-z0-9]+/, /shpat_[A-Za-z0-9]+/, /shpca_[A-Za-z0-9]+/, /atkn_[A-Za-z0-9._-]+/];
function assertNoSecrets(label, serialized) {
  // 1) registered-sensitive redaction must be a no-op (else a secret is present)
  if (redact(serialized) !== serialized) {
    throw new Error(`SECRET GUARD: redactable content detected in ${label}; aborting without writing.`);
  }
  // 2) explicit Shopify token shapes must not appear in catalogue data
  for (const re of TOKEN_SCAN) {
    if (re.test(serialized)) {
      throw new Error(`SECRET GUARD: token-shaped string detected in ${label}; aborting without writing.`);
    }
  }
}

// ---- main -----------------------------------------------------------------
async function main() {
  const s = safeSummary();
  console.log('─────────────────────────────────────────────');
  console.log('  TNG Commerce Manager — LIVE catalogue export (READ-ONLY)');
  console.log(`  store:       ${s.store}`);
  console.log(`  api version: ${s.apiVersion}`);
  console.log('  mode:        QUERIES ONLY — no mutation is sent; nothing is modified');
  console.log('─────────────────────────────────────────────');

  console.log('\n▸ Reading shop identity + counts (read-only)…');
  const shop = await query(SHOP_QUERY, {});
  const expectedProducts = shop.productsCount?.count ?? null;
  const expectedCollections = shop.collectionsCount?.count ?? null;
  console.log(`  ✓ ${shop.shop?.name} — products: ${expectedProducts}, collections: ${expectedCollections}`);

  console.log('\n▸ Exporting products (paginated)…');
  const products = await collectAll('products', productsQuery, true);
  console.log(`  ✓ ${products.nodes.length} products over ${products.pages} page(s)`);

  console.log('\n▸ Exporting collections (paginated)…');
  const collections = await collectAll('collections', collectionsQuery, true);
  console.log(`  ✓ ${collections.nodes.length} collections over ${collections.pages} page(s)`);

  const variantTotal = products.nodes.reduce((n, p) => n + (p.variants?.nodes?.length || 0), 0);

  const meta = {
    exportedAt: new Date().toISOString(),
    store: s.store,
    apiVersion: s.apiVersion,
    counts: {
      products: products.nodes.length,
      collections: collections.nodes.length,
      variants: variantTotal,
      expectedProducts,
      expectedCollections,
    },
    pagination: {
      productPages: products.pages,
      collectionPages: collections.pages,
      productCountMatches: expectedProducts == null || expectedProducts === products.nodes.length,
      collectionCountMatches: expectedCollections == null || expectedCollections === collections.nodes.length,
    },
    publicationsIncluded: {
      products: products.publicationsIncluded,
      collections: collections.publicationsIncluded,
    },
    note: 'Authoritative LIVE Shopify export. Catalogue data only — no credentials. raw/ is gitignored.',
  };

  // Serialize, then secret-scan BEFORE any file is written.
  const files = {
    'products.json': JSON.stringify(products.nodes, null, 2),
    'collections.json': JSON.stringify(collections.nodes, null, 2),
    'meta.json': JSON.stringify(meta, null, 2),
  };
  console.log('\n▸ Secret-scanning export before writing…');
  for (const [name, body] of Object.entries(files)) assertNoSecrets(name, body);
  console.log('  ✓ no secrets or token-shaped strings found');

  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, {recursive: true});
  for (const [name, body] of Object.entries(files)) writeFileSync(join(RAW_DIR, name), body);

  console.log('\n──────────── Export complete (read-only) ────────────');
  console.log(`  wrote: catalog/live-audit/raw/products.json     (${products.nodes.length} products)`);
  console.log(`  wrote: catalog/live-audit/raw/collections.json  (${collections.nodes.length} collections)`);
  console.log(`  wrote: catalog/live-audit/raw/meta.json`);
  console.log(`  variants: ${variantTotal}`);
  console.log(`  pagination OK: products=${meta.pagination.productCountMatches} collections=${meta.pagination.collectionCountMatches}`);
  if (!meta.pagination.productCountMatches || !meta.pagination.collectionCountMatches) {
    console.log('  ! WARNING: exported count != shop count — investigate before trusting the audit.');
  }
  console.log('\n✓ Nothing was created, updated, published, or deleted.');
  console.log('  Next: node scripts/analyze-live-audit.js');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exit(1);
});
