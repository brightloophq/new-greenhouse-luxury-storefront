// scripts/shopify/collections.mjs — create the three dedicated Premium/Deluxe
// collections the storefront maps to. Idempotent: an existing handle is left
// exactly as it is, never modified or recreated.
//
//   npm run shopify:collections            (dry run — reports what it would do)
//   npm run shopify:collections -- --apply (creates the missing collections)
import {adminQuery, userErrorsOf, isApply, banner} from './admin.mjs';

/** Must stay in sync with PREMIUM_CATEGORIES in app/lib/catalogues.ts. */
const COLLECTIONS = [
  {
    handle: 'premium-handcrafted',
    title: 'Premium Handcrafted',
    descriptionHtml:
      '<p>Hand-composed premium arrangements, built stem by stem in our Kingston studio.</p>',
  },
  {
    handle: 'premium-vase',
    title: 'Premium Vase',
    descriptionHtml:
      '<p>Premium arrangements presented in a keepsake vase, ready to place.</p>',
  },
  {
    handle: 'premium-heart-box',
    title: 'Premium Heart Box',
    descriptionHtml:
      '<p>Signature heart-box arrangements — our most gifted premium presentation.</p>',
  },
];

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
  banner('Premium / Deluxe collections');

  let created = 0;
  let existing = 0;

  for (const collection of COLLECTIONS) {
    const {collectionByHandle} = await adminQuery(LOOKUP, {
      handle: collection.handle,
    });

    if (collectionByHandle) {
      existing += 1;
      console.log(`  = ${collection.handle} — already exists, left untouched`);
      continue;
    }

    if (!isApply) {
      console.log(`  + ${collection.handle} — would create "${collection.title}"`);
      continue;
    }

    const data = await adminQuery(CREATE, {
      input: {
        handle: collection.handle,
        title: collection.title,
        descriptionHtml: collection.descriptionHtml,
      },
    });
    const errors = userErrorsOf(data);
    if (errors.length) {
      console.error(`  ! ${collection.handle} — ${errors[0].message}`);
      process.exitCode = 1;
      continue;
    }
    created += 1;
    console.log(`  + ${collection.handle} — created`);
  }

  console.log(
    `\n  ${existing} already present, ${
      isApply ? `${created} created` : `${COLLECTIONS.length - existing} to create`
    }.`,
  );
  if (isApply && created) {
    console.log(
      '  Add products to each collection in admin — the storefront pages\n' +
        '  populate immediately, no deploy required.\n',
    );
  }
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
