// scripts/verify-pilot.js — READ-ONLY verification of the 5 pilot products.
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact} from '../src/config.js';
import {selectPilotProducts} from '../src/pilot.js';

const Q = `#graphql
  query V($h: String!) {
    productByHandle(handle: $h) {
      id
      handle
      status
      vendor
      productType
      variantsCount { count }
      tags
      resourcePublicationsCount { count }
    }
  }
`;

const pilots = selectPilotProducts();
console.log('READ-ONLY verification of pilot products:\n');
let published = 0;
for (const p of pilots) {
  try {
    const d = await adminGraphQL(Q, {h: p.handle});
    const x = d.productByHandle;
    if (!x) {
      console.log(`  ✗ ${p.handle}: not found`);
      continue;
    }
    if ((x.resourcePublicationsCount?.count ?? 0) > 0) published++;
    console.log(`  • ${x.handle}`);
    console.log(`      id:          ${x.id}`);
    console.log(`      status:      ${x.status}   type: ${x.productType}   vendor: ${x.vendor}`);
    console.log(`      variants:    ${x.variantsCount?.count}   tags: ${x.tags.length}`);
    console.log(`      publishedOn: ${x.resourcePublicationsCount?.count} channel(s)`);
  } catch (e) {
    console.log(`  ✗ ${p.handle}: ${redact(e.message)}`);
  }
}
console.log(`\n${published === 0 ? '✓ None published to any sales channel.' : `⚠ ${published} product(s) are on a channel!`}`);
