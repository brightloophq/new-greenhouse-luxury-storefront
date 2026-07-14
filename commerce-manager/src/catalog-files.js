// src/catalog-files.js — read-only parsers for the catalog package.
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CATALOG_DIR = resolve(HERE, '..', '..', 'catalog');
export const catalogPath = (...p) => join(CATALOG_DIR, ...p);

export const SOURCE_FILES = [
  'shopify-products-draft.csv',
  'product-master-data.csv',
  'collection-plan.csv',
  'metafield-definitions.md',
  'navigation-plan.md',
];

export function fileStatus() {
  return SOURCE_FILES.map((f) => ({file: f, exists: existsSync(catalogPath(f))}));
}

// --- CSV ---
export function parseCsv(text) {
  const rows = [];
  let row = [],
    cur = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      row.push(cur);
      cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    if (row.some((x) => x !== '')) rows.push(row);
  }
  return rows;
}

function csvObjects(file) {
  const rows = parseCsv(readFileSync(catalogPath(file), 'utf8'));
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// --- shopify-products-draft.csv → products with variants ---
export function loadDraftProducts() {
  const rows = csvObjects('shopify-products-draft.csv');
  const byHandle = new Map();
  for (const r of rows) {
    const handle = r['Handle'];
    if (!handle) continue;
    if (!byHandle.has(handle)) {
      byHandle.set(handle, {
        handle,
        title: r['Title'],
        type: r['Type'],
        vendor: r['Vendor'],
        tags: r['Tags'],
        status: r['Status'],
        published: r['Published'],
        seoTitle: r['SEO Title'],
        seoDescription: r['SEO Description'],
        option1Name: r['Option1 Name'],
        option2Name: r['Option2 Name'],
        variants: [],
      });
    }
    const p = byHandle.get(handle);
    // Product-level fields only appear on the first row; capture if this row has a title.
    if (r['Title'] && !p.title) p.title = r['Title'];
    p.variants.push({
      sku: r['Variant SKU'],
      price: r['Variant Price'],
      option1: r['Option1 Value'],
      option2: r['Option2 Value'],
      status: r['Status'],
      published: r['Published'],
    });
  }
  return [...byHandle.values()];
}

// --- product-master-data.csv (keyed by handle) ---
export function loadMasterData() {
  const rows = csvObjects('product-master-data.csv');
  const byHandle = new Map();
  for (const r of rows) byHandle.set(r['Handle'], r);
  return byHandle;
}

// --- collection-plan.csv ---
export function loadCollectionPlan() {
  return csvObjects('collection-plan.csv').map((r) => ({
    group: r['Group'],
    title: r['Collection Title'],
    handle: r['Handle'],
    type: r['Type'],
    rule: r['Match Rule'],
    count: Number(r['Product Count'] || 0),
  }));
}

// --- metafield-definitions.md (parse the table) ---
const MF_TYPES = new Set([
  'single_line_text_field',
  'multi_line_text_field',
  'list.single_line_text_field',
  'number_integer',
  'number_decimal',
  'boolean',
]);
export function loadMetafieldDefs() {
  const text = readFileSync(catalogPath('metafield-definitions.md'), 'utf8');
  const defs = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] is '' (leading pipe). key=cells[1], name=cells[2], type=cells[3]
    const key = (cells[1] || '').replace(/`/g, '').trim();
    const type = (cells[3] || '').replace(/`/g, '').trim();
    if (/^[a-z][a-z0-9_]*$/.test(key) && MF_TYPES.has(type)) {
      defs.push({namespace: 'custom', key, name: (cells[2] || '').trim(), type});
    }
  }
  return defs;
}

// --- navigation-plan.md (extract intended main-menu items) ---
export function loadNavigationPlan() {
  const text = readFileSync(catalogPath('navigation-plan.md'), 'utf8');
  const items = [];
  // lines like: - **Shop Flowers** → `/collections/all-flowers`
  const re = /\*\*([^*]+)\*\*\s*→\s*`?([^`\n]+?)`?\s*$/gm;
  let m;
  while ((m = re.exec(text))) items.push({label: m[1].trim(), target: m[2].trim()});
  // pages referenced by the plan
  const pages = [...new Set([...text.matchAll(/\/pages\/([a-z0-9-]+)/g)].map((x) => x[1]))];
  return {items, referencedPages: pages};
}
