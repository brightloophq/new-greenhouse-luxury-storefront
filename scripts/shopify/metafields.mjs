// scripts/shopify/metafields.mjs — create the nine CUSTOMER metafield
// definitions the wholesale business profile writes to, each with Customer
// Account API read+write access. Idempotent: existing definitions are reported
// and left alone (this script never edits or deletes an existing definition).
//
//   npm run shopify:metafields            (dry run)
//   npm run shopify:metafields -- --apply (creates the missing definitions)
import {adminQuery, userErrorsOf, isApply, banner} from './admin.mjs';

/** Must stay in sync with WHOLESALE_PROFILE_FIELDS in app/lib/wholesaleProfile.ts. */
const DEFINITIONS = [
  ['business_name', 'Business name', 'single_line_text_field'],
  ['business_type', 'Business type', 'single_line_text_field'],
  ['business_phone', 'Business phone', 'single_line_text_field'],
  ['business_address', 'Business address', 'multi_line_text_field'],
  ['city_parish', 'City / parish', 'single_line_text_field'],
  ['delivery_area', 'Preferred delivery area', 'single_line_text_field'],
  ['website_social', 'Website or social', 'single_line_text_field'],
  ['purchase_frequency', 'Purchase frequency', 'single_line_text_field'],
  ['business_notes', 'Business notes', 'multi_line_text_field'],
].map(([key, name, type]) => ({key, name, type}));

const EXISTING = `#graphql
  query CustomerMetafieldDefinitions {
    metafieldDefinitions(ownerType: CUSTOMER, namespace: "custom", first: 250) {
      nodes { key name type { name } }
    }
  }
`;

const CREATE = `#graphql
  mutation CreateDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { key name }
      userErrors { field message code }
    }
  }
`;

async function main() {
  banner('Wholesale profile — customer metafield definitions');

  const {metafieldDefinitions} = await adminQuery(EXISTING);
  const present = new Set(metafieldDefinitions.nodes.map((node) => node.key));

  let created = 0;
  const todo = DEFINITIONS.filter((definition) => !present.has(definition.key));

  for (const definition of DEFINITIONS) {
    if (present.has(definition.key)) {
      console.log(`  = custom.${definition.key} — already defined`);
      continue;
    }
    if (!isApply) {
      console.log(`  + custom.${definition.key} — would create (${definition.type})`);
      continue;
    }

    const data = await adminQuery(CREATE, {
      definition: {
        namespace: 'custom',
        key: definition.key,
        name: definition.name,
        type: definition.type,
        ownerType: 'CUSTOMER',
        // The signed-in customer reads and writes their OWN profile from the
        // storefront — without this the metafieldsSet mutation is rejected.
        access: {customerAccount: 'READ_WRITE'},
      },
    });
    const errors = userErrorsOf(data);
    if (errors.length) {
      console.error(`  ! custom.${definition.key} — ${errors[0].message}`);
      process.exitCode = 1;
      continue;
    }
    created += 1;
    console.log(`  + custom.${definition.key} — created`);
  }

  console.log(
    `\n  ${DEFINITIONS.length - todo.length} already present, ${
      isApply ? `${created} created` : `${todo.length} to create`
    }.\n`,
  );
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
