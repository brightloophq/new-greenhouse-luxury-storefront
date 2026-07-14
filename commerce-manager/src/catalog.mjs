// Reads the production-ready catalog package (read-only).
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// commerce-manager/src -> repo root -> catalog
export const CATALOG_DIR = resolve(HERE, '..', '..', 'catalog');

export function catalogPath(...p) {
  return join(CATALOG_DIR, ...p);
}

export function catalogExists() {
  return existsSync(CATALOG_DIR);
}

/** Required files that make the package importable. */
export const REQUIRED_FILES = [
  'product-master-data.json',
  'shopify-products-draft.csv',
  'collection-plan.csv',
  'build/metafields-payload.jsonl',
  'provisional-price-report.md',
];

export function loadProducts() {
  const raw = readFileSync(catalogPath('product-master-data.json'), 'utf8');
  return JSON.parse(raw);
}

export function loadMetafieldValues() {
  const raw = readFileSync(catalogPath('build', 'metafields-payload.jsonl'), 'utf8');
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** Minimal CSV parser (quoted fields, commas, CRLF). */
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

export function loadCollectionPlan() {
  const rows = parseCsv(readFileSync(catalogPath('collection-plan.csv'), 'utf8'));
  const header = rows[0];
  const idx = (n) => header.indexOf(n);
  return rows.slice(1).map((r) => ({
    group: r[idx('Group')],
    title: r[idx('Collection Title')],
    handle: r[idx('Handle')],
    type: r[idx('Type')],
    rule: r[idx('Match Rule')],
    count: Number(r[idx('Product Count')] || 0),
  }));
}
