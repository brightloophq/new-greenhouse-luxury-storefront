// scripts/verify-collections.js — READ-ONLY verification of created collections.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(HERE, '..', 'reports', 'private', 'collections-manifest.json'), 'utf8'));
const createdHandles = new Set(manifest.collections.map((c) => c.handle));

const Q = `#graphql
  query($after: String) {
    collections(first: 250, after: $after) {
      nodes { id handle title productsCount { count } resourcePublicationsCount { count } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

const rows = [];
let after = null;
for (let i = 0; i < 40; i++) {
  const d = await adminGraphQL(Q, {after});
  d.collections.nodes.forEach((n) => createdHandles.has(n.handle) && rows.push(n));
  if (!d.collections.pageInfo.hasNextPage) break;
  after = d.collections.pageInfo.endCursor;
}

rows.sort((a, b) => a.handle.localeCompare(b.handle));
let published = 0;
let totalProducts = 0;
console.log(`Verified ${rows.length} created collections (read-only):\n`);
for (const r of rows) {
  const pubs = r.resourcePublicationsCount?.count ?? 0;
  published += pubs > 0 ? 1 : 0;
  totalProducts += r.productsCount?.count ?? 0;
  console.log(`  ${r.handle.padEnd(24)} ${r.id}  products=${String(r.productsCount?.count).padStart(3)}  publishedOn=${pubs}`);
}
console.log(`\n  collections: ${rows.length}   total product memberships: ${totalProducts}   published: ${published}`);
console.log(published === 0 ? '  ✓ None published to any sales channel.' : `  ⚠ ${published} published — investigate!`);
