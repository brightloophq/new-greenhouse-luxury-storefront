// scripts/verify-catalog.js — READ-ONLY final verification of the whole catalog.
import {adminGraphQL} from '../src/shopify-admin.js';

const Q = `#graphql
  query($after: String) {
    products(first: 250, after: $after) {
      nodes { id handle status variantsCount { count } resourcePublicationsCount { count } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

let after = null,
  total = 0,
  variants = 0,
  active = 0,
  draft = 0,
  archived = 0,
  published = 0;
for (let i = 0; i < 40; i++) {
  const d = await adminGraphQL(Q, {after});
  for (const p of d.products.nodes) {
    total++;
    variants += p.variantsCount?.count ?? 0;
    if (p.status === 'ACTIVE') active++;
    else if (p.status === 'DRAFT') draft++;
    else archived++;
    if ((p.resourcePublicationsCount?.count ?? 0) > 0) published++;
  }
  if (!d.products.pageInfo.hasNextPage) break;
  after = d.products.pageInfo.endCursor;
}

console.log('Final store verification (read-only):');
console.log(`  total products:    ${total}`);
console.log(`  total variants:    ${variants}`);
console.log(`  DRAFT:             ${draft}`);
console.log(`  ACTIVE:            ${active}`);
console.log(`  ARCHIVED:          ${archived}`);
console.log(`  published on ≥1 channel: ${published}`);
console.log(
  active === 0 && published === 0
    ? '\n✓ All products DRAFT and unpublished. No product is active or on any sales channel.'
    : `\n⚠ ${active} active / ${published} published — investigate!`,
);
