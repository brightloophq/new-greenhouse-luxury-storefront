// Catalog QC validator. Parses the GENERATED files in catalog/ and asserts the
// data-quality rules. Run after generate.mjs:  node catalog/build/validate.mjs
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

let pass = 0,
  fail = 0;
const results = [];
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    results.push(`  PASS  ${name}`);
  } else {
    fail++;
    results.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// --- minimal CSV parser (handles quotes/commas/newlines) ---
function parseCsv(text) {
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
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c === '\r') {
      /* skip */
    } else cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

const EXPECTED_HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
  'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
  'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
  'SEO Title', 'SEO Description', 'Status',
];

const raw = read('shopify-products-draft.csv');
const rows = parseCsv(raw);
const headers = rows[0];
const body = rows.slice(1);
const col = (r, name) => r[headers.indexOf(name)];
const master = JSON.parse(read('product-master-data.json'));

// 1. UTF-8 (no replacement char)
check('1. CSV is valid UTF-8 (no U+FFFD)', !raw.includes('�'));
// 2. headers exact
check('2. Headers match Shopify format', JSON.stringify(headers) === JSON.stringify(EXPECTED_HEADERS), 'header mismatch');
// 3. unique handles (product-level = rows with a Title)
const productRows = body.filter((r) => col(r, 'Title'));
const handles = productRows.map((r) => col(r, 'Handle'));
check('3. Every handle unique', new Set(handles).size === handles.length, `${handles.length - new Set(handles).size} dupes`);
// 4. unique SKUs
const skus = body.map((r) => col(r, 'Variant SKU')).filter(Boolean);
check('4. Every SKU unique & present', new Set(skus).size === skus.length && skus.length === body.length, 'dupe/blank SKU');
// 5. variant rows belong to a known handle
const handleSet = new Set(handles);
check('5. Every variant row has a known Handle', body.every((r) => handleSet.has(col(r, 'Handle'))));
// 6. HTML descriptions valid (allowed tags, balanced)
const allowed = new Set(['p', 'ul', 'li', 'strong', 'em', 'br']);
let htmlOk = true,
  htmlDetail = '';
for (const p of master) {
  const tags = [...p.descriptionHtml.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)].map((m) => m[1].toLowerCase());
  const bad = tags.find((t) => !allowed.has(t));
  if (bad) {
    htmlOk = false;
    htmlDetail = `${p.handle}: <${bad}>`;
    break;
  }
  const stack = [];
  for (const m of p.descriptionHtml.matchAll(/<(\/?)([a-z0-9]+)[^>]*?(\/?)>/gi)) {
    const [, close, tag, self] = m;
    if (tag === 'br' || self) continue;
    if (close) {
      if (stack.pop() !== tag.toLowerCase()) {
        htmlOk = false;
        htmlDetail = `${p.handle}: unbalanced </${tag}>`;
        break;
      }
    } else stack.push(tag.toLowerCase());
  }
  if (stack.length) {
    htmlOk = false;
    htmlDetail = `${p.handle}: unclosed <${stack[0]}>`;
    break;
  }
  if (!htmlOk) break;
}
check('6. Descriptions use only allowed, balanced HTML', htmlOk, htmlDetail);
// 7. all draft / unpublished
check('7. No product active — Status=draft & Published=FALSE on all rows', body.every((r) => col(r, 'Status') === 'draft' && col(r, 'Published') === 'FALSE'));
// 8. image src blank
check('8. Image Src blank on every row', body.every((r) => col(r, 'Image Src') === ''));
// 9. price report covers every variant price
const report = read('provisional-price-report.md');
const reportSkus = [...report.matchAll(/\| (TNG-[A-Z]+-\d{3}[^ |]*) \|/g)].map((m) => m[1]);
check('9. Every variant price listed in price report', skus.every((s) => report.includes(s)), `${skus.filter((s) => !report.includes(s)).length} missing`);
// 10. unique titles + SEO
const titles = master.map((p) => p.title);
const seoT = master.map((p) => p.seoTitle);
const seoD = master.map((p) => p.seoDescription);
check('10a. Titles unique', new Set(titles).size === titles.length);
check('10b. SEO titles unique', new Set(seoT).size === seoT.length);
check('10c. SEO descriptions unique', new Set(seoD).size === seoD.length);
// 11. tags against taxonomy
const PREFIXES = ['channel', 'flower', 'color', 'occasion', 'customer', 'format', 'supply', 'season', 'type', 'price-status', 'image-status', 'content-status'];
let tagOk = true,
  tagDetail = '';
for (const p of master)
  for (const t of p.tags) {
    if (!PREFIXES.includes(t.split(':')[0])) {
      tagOk = false;
      tagDetail = `${p.handle}: ${t}`;
      break;
    }
  }
check('11. All tags use documented namespaces', tagOk, tagDetail);
// 12. collection assignment
check('12. Every product in ≥1 collection', master.every((p) => p.collections.length >= 1), master.filter((p) => !p.collections.length).map((p) => p.handle).join(','));
// 13. price present & numeric > 0
check('13. Every price numeric > 0', body.every((r) => Number(col(r, 'Variant Price')) > 0));
// 14. no customer-facing placeholder leakage
const leak = master.find((p) => /CLIENT CONFIRMATION REQUIRED|placeholder/i.test(p.title + p.summary + p.descriptionHtml + p.seoTitle + p.seoDescription));
check('14. No internal flags leaked into customer-facing copy', !leak, leak ? leak.handle : '');
// 15. SEO length sanity
check('15. SEO titles ≤ 70 chars, descriptions ≤ 165', master.every((p) => p.seoTitle.length <= 70 && p.seoDescription.length <= 165));

console.log('\nCATALOG VALIDATION\n' + results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
