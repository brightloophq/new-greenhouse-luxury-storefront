// Create DRAFT products idempotently from product-master-data.json.
// Existing products (matched by handle) are SKIPPED, never modified.
// Products are always created with status DRAFT — never ACTIVE/published.
import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {loadProducts} from '../catalog.mjs';
import {step, ok, skip, info, err, plain} from '../log.mjs';

const VENDOR = 'The New Greenhouse';

const BY_HANDLE = `#graphql
  query ProdByHandle($handle: String!) {
    productByHandle(handle: $handle) { id }
  }
`;
const PRODUCT_SET = `#graphql
  mutation SetProduct($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle status }
      userErrors { field message }
    }
  }
`;

function buildInput(p) {
  const tags = (p.tagStr || '').split(',').map((t) => t.trim()).filter(Boolean);
  const hasOptions = Boolean(p.o1Name);
  const optNames = [p.o1Name, p.o2Name].filter(Boolean);

  const input = {
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    vendor: VENDOR,
    productType: p.productType,
    status: 'DRAFT', // hard invariant — never published here
    tags,
    seo: {title: p.seoTitle, description: p.seoDescription},
  };

  if (hasOptions) {
    input.productOptions = optNames.map((name, i) => {
      const key = i === 0 ? 'o1' : 'o2';
      const values = [...new Set(p.variants.map((v) => v[key]).filter(Boolean))];
      return {name, values: values.map((name2) => ({name: name2}))};
    });
  }

  input.variants = (p.variants || []).map((v) => {
    const variant = {
      price: String(v.price),
      sku: v.sku,
      taxable: true,
      inventoryPolicy: 'DENY',
      inventoryItem: {
        tracked: true,
        requiresShipping: true,
        measurement: {weight: {unit: 'GRAMS', value: v.grams ?? 500}},
      },
    };
    if (hasOptions) {
      variant.optionValues = optNames.map((name, i) => ({optionName: name, name: v[i === 0 ? 'o1' : 'o2']}));
    }
    return variant;
  });

  return input;
}

export async function run(ctx) {
  const products = loadProducts();
  const limit = ctx.limit || products.length;
  step(`Draft products (${products.length}, processing ${limit}) — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);

  const toCreate = [];
  for (const p of products.slice(0, limit)) {
    let exists = false;
    try {
      const data = await adminGraphql(BY_HANDLE, {handle: p.handle});
      exists = Boolean(data.productByHandle);
    } catch (e) {
      err(`lookup ${p.handle}: ${e.message}`);
      continue;
    }
    if (exists) skip(`exists: ${p.handle} (not modified)`);
    else {
      info(`would create DRAFT: ${p.handle} — "${p.title}" (${p.variants?.length || 0} variant(s))`);
      toCreate.push(p);
    }
  }

  if (!toCreate.length) return ok('No new products to create.');
  if (!ctx.commit) return plain(`\nDRY-RUN: ${toCreate.length} DRAFT product(s) would be created. Re-run with --commit to apply.`);

  const proceed = await confirmMutation(ctx, {action: `create ${toCreate.length} DRAFT products`, phrase: 'CREATE DRAFT PRODUCTS'});
  if (!proceed) return plain('Cancelled — nothing created.');

  let created = 0;
  for (const p of toCreate) {
    try {
      const data = await adminGraphql(PRODUCT_SET, {input: buildInput(p)});
      const errs = userErrorMessages(data.productSet);
      if (errs.length) err(`${p.handle}: ${errs.join('; ')}`);
      else {
        created++;
        ok(`created DRAFT: ${data.productSet.product.handle}`);
      }
    } catch (e) {
      err(`${p.handle}: ${e.message}`);
    }
  }
  plain(`\nDone. ${created}/${toCreate.length} created as DRAFT. Nothing published.`);
}
