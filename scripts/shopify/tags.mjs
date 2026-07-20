// scripts/shopify/tags.mjs — fill the facet-tag gaps so the Colour and Flower
// filters have data behind them.
//
// Design rule: this script NEVER guesses. A tag is proposed only when the
// product's own title states it ("Red Rose Arrangement" → color:red). Anything
// ambiguous is listed as unresolved for a human to decide — a wrong colour tag
// is worse than a missing one, because it makes the filter lie.
//
// Existing tags are never removed. Products that already carry a facet tag are
// left completely alone.
//
//   npm run shopify:tags            (dry run — prints the full plan)
//   npm run shopify:tags -- --apply (adds the proposed tags)
import {adminQuery, userErrorsOf, isApply, banner} from './admin.mjs';

/* Vocabularies mirror FACETS in app/lib/catalog.ts. */

/** An explicit "this is many colours" word in the title. */
const MULTI_COLOUR = /\bmixed\b|\bbrights?\b|\bpastels?\b|\brainbow\b|\bassorted\b/i;

const COLOUR_RULES = [
  [/\bred\b|\bcrimson\b|\bscarlet\b/i, 'red'],
  [/\bwhite\b|\bivory\b|\bcream\b/i, 'white-ivory'],
  [/\bblush\b|\bpink\b/i, 'pink'],
  [/\byellow\b|\bgold(en)?\b|\bsunshine\b|\borange\b|\bpeach\b/i, 'yellow-orange'],
  [/\bpurple\b|\blavender\b|\bviolet\b|\blilac\b/i, 'purple'],
  [/\bgreen\b/i, 'green'],
];

/**
 * Colour is inferred from named colours only — never from punctuation. An
 * ampersand is not a colour signal ("Florist Shears & Snips" is not "mixed");
 * two DISTINCT named colours are ("Ivory & Blush").
 */
function inferColour(title) {
  if (MULTI_COLOUR.test(title)) return 'mixed';
  const found = new Set();
  for (const [pattern, value] of COLOUR_RULES) {
    if (pattern.test(title)) found.add(value);
  }
  if (found.size > 1) return 'mixed';
  return found.size === 1 ? [...found][0] : null;
}

const FLOWER_RULES = [
  [/\bspray roses?\b/i, 'spray-roses'],
  [/\brose\b|\broses\b/i, 'roses-in-stock'],
  [/\borchid/i, 'orchids'],
  [/\bcalla\b/i, 'calla-lilies'],
  [/\blily\b|\blilies\b/i, 'lilies'],
  [/\bhydrangea/i, 'hydrangea'],
  [/\btulip/i, 'tulips'],
  [/\bcarnation/i, 'carnations'],
  [/\bgerbera|daisy|daisies\b/i, 'gerbera-daisies'],
  [/\bsunflower/i, 'novelties'],
  [/\btropical|heliconia|ginger\b/i, 'tropicals'],
  [/\balstroemeria/i, 'alstroemeria'],
  [/\bchrysanthemum|\bmums?\b/i, 'chrysanthemums'],
  [/\bsnapdragon/i, 'snapdragon'],
  [/\bdelphinium/i, 'delphinium'],
  [/\blisianthus/i, 'lisianthus'],
  [/\branunculus/i, 'ranunculus'],
  [/\beucalyptus/i, 'eucalyptus'],
  [/\bbaby'?s breath\b|\bgypsophila\b/i, 'babys-breath'],
  [/\baster/i, 'asters'],
  [/\bhypericum/i, 'hypericum'],
  [/\bstock\b/i, 'stock'],
];

/** Product types where a facet legitimately does not apply. */
const NO_FLOWER_TYPES = new Set(['Floral Supply', 'Plant', 'Gift Add-on']);
const NO_COLOUR_TYPES = new Set(['Plant', 'Gift Add-on']);

function infer(rules, title) {
  for (const [pattern, value] of rules) if (pattern.test(title)) return value;
  return null;
}

const PRODUCTS = `#graphql
  query AllProducts($cursor: String) {
    products(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id handle title productType tags }
    }
  }
`;

const ADD_TAGS = `#graphql
  mutation AddTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
    }
  }
`;

async function allProducts() {
  const nodes = [];
  let cursor = null;
  for (;;) {
    const {products} = await adminQuery(PRODUCTS, {cursor});
    nodes.push(...products.nodes);
    if (!products.pageInfo.hasNextPage) break;
    cursor = products.pageInfo.endCursor;
  }
  return nodes;
}

async function main() {
  banner('Facet tags — colour and flower type');

  const products = await allProducts();
  const planned = [];
  const unresolved = [];

  for (const product of products) {
    const has = (prefix) => product.tags.some((t) => t.startsWith(prefix));
    const add = [];
    const missing = [];

    if (!has('color:') && !NO_COLOUR_TYPES.has(product.productType)) {
      const colour = inferColour(product.title);
      if (colour) add.push(`color:${colour}`);
      else missing.push('color');
    }
    if (!has('flower:') && !NO_FLOWER_TYPES.has(product.productType)) {
      const flower = infer(FLOWER_RULES, product.title);
      if (flower) add.push(`flower:${flower}`);
      else missing.push('flower');
    }

    if (add.length) planned.push({product, add});
    if (missing.length) unresolved.push({product, missing});
  }

  console.log(`  ${products.length} products scanned.\n`);

  if (planned.length) {
    console.log(`  Proposed additions (${planned.length} products):`);
    for (const {product, add} of planned) {
      console.log(`    ${product.title.padEnd(42)} + ${add.join(', ')}`);
    }
    console.log('');
  }

  if (unresolved.length) {
    console.log(
      `  Needs a human decision (${unresolved.length}) — the title does not state it:`,
    );
    for (const {product, missing} of unresolved) {
      console.log(
        `    ${product.title.padEnd(42)} ? ${missing.join(', ')}  [${product.productType}]`,
      );
    }
    console.log('');
  }

  if (!isApply) {
    console.log(
      `  Dry run. Re-run with --apply to add ${planned.length} products' tags.\n`,
    );
    return;
  }

  let applied = 0;
  for (const {product, add} of planned) {
    const data = await adminQuery(ADD_TAGS, {id: product.id, tags: add});
    const errors = userErrorsOf(data);
    if (errors.length) {
      console.error(`  ! ${product.title} — ${errors[0].message}`);
      process.exitCode = 1;
      continue;
    }
    applied += 1;
  }
  console.log(`  Tagged ${applied} products. Existing tags were not modified.\n`);
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
