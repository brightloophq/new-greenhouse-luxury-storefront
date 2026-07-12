// src/pilot.js — selects exactly 5 pilot products (one per category) from the
// validated catalog and builds DRAFT productSet inputs. No publishing, no images.
import {readFileSync} from 'node:fs';
import {catalogPath} from './catalog-files.js';

const VENDOR = 'The New Greenhouse';

// One representative product per category, in this order.
export const PILOT_CATEGORIES = ['wholesale', 'retail', 'sympathy', 'supplies', 'plants'];

export function selectPilotProducts() {
  const all = JSON.parse(readFileSync(catalogPath('product-master-data.json'), 'utf8'));
  return PILOT_CATEGORIES.map((cat) => {
    const p = all.find((x) => x.category === cat);
    if (!p) throw new Error(`No catalog product found for category "${cat}".`);
    return {...p, pilotCategory: cat};
  });
}

/** Build a Shopify ProductSetInput. status is hard-locked to DRAFT. No images. */
export function buildProductSetInput(p) {
  const tags = (p.tagStr || '').split(',').map((t) => t.trim()).filter(Boolean);
  const hasOptions = Boolean(p.o1Name);
  const optNames = [p.o1Name, p.o2Name].filter(Boolean);

  const input = {
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    vendor: VENDOR,
    productType: p.productType,
    status: 'DRAFT', // invariant — never published
    tags,
    seo: {title: p.seoTitle, description: p.seoDescription},
  };

  if (hasOptions) {
    input.productOptions = optNames.map((name, i) => {
      const key = i === 0 ? 'o1' : 'o2';
      const values = [...new Set(p.variants.map((v) => v[key]).filter(Boolean))];
      return {name, values: values.map((n) => ({name: n}))};
    });
  } else {
    // Single-variant products still need the default "Title" option; productSet
    // requires every variant to carry non-null optionValues.
    input.productOptions = [{name: 'Title', values: [{name: 'Default Title'}]}];
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
    variant.optionValues = hasOptions
      ? optNames.map((name, i) => ({optionName: name, name: v[i === 0 ? 'o1' : 'o2']}))
      : [{optionName: 'Title', name: 'Default Title'}];
    return variant;
  });

  return input;
}

/** Human-readable one-line summary for dry-run display. */
export function pilotSummary(p) {
  const prices = (p.variants || []).map((v) => `$${v.price}`).join('/');
  const opt = p.o1Name ? `${p.o1Name}${p.o2Name ? ' × ' + p.o2Name : ''}` : 'single variant';
  return {
    category: p.pilotCategory,
    handle: p.handle,
    title: p.title,
    productType: p.productType,
    variantCount: (p.variants || []).length,
    options: opt,
    prices,
    tagCount: (p.tagStr || '').split(',').filter(Boolean).length,
    seoTitle: p.seoTitle,
  };
}
