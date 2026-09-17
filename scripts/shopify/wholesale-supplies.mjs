// scripts/shopify/wholesale-supplies.mjs — create the dedicated wholesale
// supplies collection the storefront's /wholesale/supplies route prefers.
// Idempotent: an existing handle is left exactly as it is, never modified.
//
//   npm run shopify:wholesale-supplies            (dry run — reports what it would do)
//   npm run shopify:wholesale-supplies -- --apply (creates it if missing)
//
// The handle MUST stay `wholesale-supplies` — it matches TRADE_COLLECTIONS
// .wholesaleSupplies in app/lib/catalogues.ts. This creates a MANUAL collection;
// add your trade-priced supply products to it in Shopify admin afterwards.
//
// Safe to run before you have products: /wholesale/supplies keeps serving the
// retail supplies collection until this one has stock (see loadCatalogueWithFallback),
// so there is no blank-page window while you populate it.
import {adminQuery, userErrorsOf, isApply, banner} from './admin.mjs';

/** Must stay in sync with TRADE_COLLECTIONS.wholesaleSupplies in app/lib/catalogues.ts. */
const COLLECTION = {
  handle: 'wholesale-supplies',
  title: 'Wholesale Supplies',
  descriptionHtml:
    '<p>Florist and studio supplies at trade prices — vases, ribbon, tools and ' +
    'packaging, by the case. Buy by the bunch or the box, no account required.</p>',
};

const LOOKUP = `#graphql
  query CollectionByHandle($handle: String!) {
    collectionByHandle(handle: $handle) { id handle title }
  }
`;

const CREATE = `#graphql
  mutation CreateCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle title }
      userErrors { field message }
    }
  }
`;

async function main() {
  banner('Wholesale supplies collection');

  const {collectionByHandle} = await adminQuery(LOOKUP, {
    handle: COLLECTION.handle,
  });

  if (collectionByHandle) {
    console.log(`  = ${COLLECTION.handle} — already exists, left untouched`);
    console.log('\n  Nothing to do.\n');
    return;
  }

  if (!isApply) {
    console.log(`  + ${COLLECTION.handle} — would create "${COLLECTION.title}"`);
    console.log('\n  Dry run. Re-run with -- --apply to create it.\n');
    return;
  }

  const data = await adminQuery(CREATE, {
    input: {
      handle: COLLECTION.handle,
      title: COLLECTION.title,
      descriptionHtml: COLLECTION.descriptionHtml,
    },
  });
  const errors = userErrorsOf(data);
  if (errors.length) {
    console.error(`  ! ${COLLECTION.handle} — ${errors[0].message}`);
    process.exit(1);
  }

  console.log(`  + ${COLLECTION.handle} — created`);
  console.log(
    '\n  Next: add your trade-priced supply products to this collection in\n' +
      '  Shopify admin. /wholesale/supplies serves retail supplies until then,\n' +
      '  and switches to this collection automatically once it has products —\n' +
      '  no deploy required.\n',
  );
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
