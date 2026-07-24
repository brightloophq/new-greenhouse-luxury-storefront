// scripts/shopify/varieties.mjs — make the remaining "Shop by Flower Variety"
// collections real, and reconcile the singular/plural tag split that keeps the
// storefront filters from matching retail stock.
//
// Three jobs, all idempotent and additive. NOTHING is ever deleted:
//
//   1. CREATE the missing variety collections (hydrangea, tulips, carnations).
//      `tropical-flowers` already exists and is left in place — it is populated,
//      not recreated and not removed.
//   2. POPULATE each variety collection from products carrying its flower tag.
//      Products stay in every collection they are already in; this only adds.
//   3. RECONCILE tags: products tagged with a singular form (rose, orchid,
//      lily, carnation, chrysanthemum) also get the canonical plural the
//      storefront facets use. The singular tags are KEPT, so nothing that
//      currently relies on them breaks.
//
//   npm run shopify:varieties            (dry run — prints the full plan)
//   npm run shopify:varieties -- --apply (writes)
import {adminQuery, userErrorsOf, isApply, banner} from './admin.mjs';

/**
 * Mirrors FLOWER_VARIETIES in app/lib/flowerVarieties.ts. A collection appears
 * on the homepage automatically once it holds stock — no code change needed.
 */
const VARIETIES = [
  {
    handle: 'hydrangea',
    title: 'Hydrangea',
    tag: 'hydrangea',
    description: 'Full, romantic hydrangea heads — by the stem and by the bunch.',
  },
  {
    handle: 'tulips',
    title: 'Tulips',
    tag: 'tulips',
    description: 'Clean, seasonal tulips in a full range of colours.',
  },
  {
    handle: 'carnations',
    title: 'Carnations',
    tag: 'carnations',
    description: 'Long-lasting carnations — a florist’s workhorse bloom.',
  },
  {
    handle: 'tropical-flowers',
    title: 'Tropical Flowers',
    tag: 'tropicals',
    description: 'Heliconia, anthurium, ginger and island greenery.',
  },
];

/**
 * Canonical plural the storefront facets use ← singular variants found in the
 * store. Both are kept on the product; only the canonical form is added.
 */
const TAG_ALIASES = {
  'roses-in-stock': ['rose'],
  orchids: ['orchid'],
  lilies: ['lily'],
  carnations: ['carnation'],
  chrysanthemums: ['chrysanthemum'],
  'calla-lilies': ['calla-lily'],
  'spray-roses': ['spray-rose'],
};

const COLLECTION_BY_HANDLE = `#graphql
  query CollectionByHandle($handle: String!) {
    collectionByHandle(handle: $handle) { id handle title }
  }
`;

const CREATE_COLLECTION = `#graphql
  mutation CreateCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle }
      userErrors { field message }
    }
  }
`;

const ADD_PRODUCTS = `#graphql
  mutation AddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      userErrors { field message }
    }
  }
`;

const ADD_TAGS = `#graphql
  mutation AddTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
  }
`;

const ALL_PRODUCTS = `#graphql
  query AllProducts($cursor: String) {
    products(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id title tags }
    }
  }
`;

async function allProducts() {
  const nodes = [];
  let cursor = null;
  for (;;) {
    const {products} = await adminQuery(ALL_PRODUCTS, {cursor});
    nodes.push(...products.nodes);
    if (!products.pageInfo.hasNextPage) break;
    cursor = products.pageInfo.endCursor;
  }
  return nodes;
}

async function main() {
  banner('Flower variety collections + tag reconciliation');

  let products = await allProducts();
  console.log(`  ${products.length} products scanned.\n`);

  /* -------------------------------------------------------------------- 1 -- */
  // Tags are reconciled FIRST, deliberately. Retail products carrying only the
  // singular form (e.g. `flower:carnation`) gain the canonical plural here, so
  // the collection step below picks them up too — otherwise the retail-facing
  // variety collections would contain wholesale stock only.
  console.log('  TAG RECONCILIATION (singular → canonical plural; singular kept)');
  const plan = [];
  for (const product of products) {
    const add = [];
    for (const [canonical, singulars] of Object.entries(TAG_ALIASES)) {
      const hasCanonical = product.tags.includes(`flower:${canonical}`);
      const hasSingular = singulars.some((s) => product.tags.includes(`flower:${s}`));
      if (hasSingular && !hasCanonical) add.push(`flower:${canonical}`);
    }
    if (add.length) plan.push({product, add});
  }

  if (!plan.length) {
    console.log('    nothing to reconcile.');
  } else if (!isApply) {
    for (const {product, add} of plan) {
      console.log(`    ${product.title.padEnd(40)} + ${add.join(', ')}`);
    }
  } else {
    let tagged = 0;
    for (const {product, add} of plan) {
      const data = await adminQuery(ADD_TAGS, {id: product.id, tags: add});
      const errors = userErrorsOf(data);
      if (errors.length) {
        console.error(`    ! ${product.title} — ${errors[0].message}`);
        process.exitCode = 1;
      } else tagged += 1;
    }
    console.log(`    reconciled ${tagged} products; nothing was removed.`);
    // Re-read so the collection step sees the tags we just added.
    products = await allProducts();
  }

  // In dry run, model the post-reconciliation state so the counts printed below
  // match what --apply would actually produce.
  if (!isApply) {
    const added = new Map(plan.map(({product, add}) => [product.id, add]));
    products = products.map((p) =>
      added.has(p.id) ? {...p, tags: [...p.tags, ...added.get(p.id)]} : p,
    );
  }

  /* ---------------------------------------------------------------- 2 + 3 -- */
  console.log('\n  COLLECTIONS');
  for (const variety of VARIETIES) {
    const members = products.filter((p) => p.tags.includes(`flower:${variety.tag}`));
    const {collectionByHandle: existing} = await adminQuery(COLLECTION_BY_HANDLE, {
      handle: variety.handle,
    });

    if (!members.length) {
      console.log(
        `    ! ${variety.handle} — no products tagged flower:${variety.tag}, skipped`,
      );
      continue;
    }

    let id = existing?.id;
    if (existing) {
      console.log(`    = ${variety.handle} — exists, will populate (${members.length})`);
    } else if (!isApply) {
      console.log(`    + ${variety.handle} — would create + add ${members.length}`);
      continue;
    } else {
      const data = await adminQuery(CREATE_COLLECTION, {
        input: {
          handle: variety.handle,
          title: variety.title,
          descriptionHtml: `<p>${variety.description}</p>`,
        },
      });
      const errors = userErrorsOf(data);
      if (errors.length) {
        console.error(`    ! ${variety.handle} — ${errors[0].message}`);
        process.exitCode = 1;
        continue;
      }
      id = data.collectionCreate.collection.id;
      console.log(`    + ${variety.handle} — created`);
    }

    if (!isApply) {
      console.log(`      would add ${members.length} products`);
      continue;
    }

    // collectionAddProducts is additive and ignores products already present.
    const data = await adminQuery(ADD_PRODUCTS, {
      id,
      productIds: members.map((p) => p.id),
    });
    const errors = userErrorsOf(data);
    if (errors.length) {
      console.error(`      ! ${errors[0].message}`);
      process.exitCode = 1;
    } else {
      console.log(`      added ${members.length} products`);
    }
  }

  if (!isApply) {
    console.log(
      `\n  Dry run. Re-run with --apply to reconcile ${plan.length} products' ` +
        `tags, then create and populate the collections above.\n`,
    );
  } else {
    console.log('\n  Done. No collection, product or tag was removed.\n');
  }
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
