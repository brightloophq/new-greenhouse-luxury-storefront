// The New Greenhouse — catalog generator.
// Reads catalog/data/<category>.json (author content), derives handles/SKUs/prices/
// tags/collections deterministically, and emits the Shopify import CSV + master data +
// update templates + image manifest + reports into catalog/.
// No network, no Shopify calls. Run: node catalog/build/generate.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); // catalog/
const DATA = join(ROOT, 'data');
const OUT = ROOT;

const VENDOR = 'The New Greenhouse';
const CURRENCY = 'USD';
const IMAGE_DIMS = '1200x1500';
const IMAGE_RATIO = '4:5';

const CATS = [
  {file: 'wholesale.json', code: 'WHL', category: 'wholesale'},
  {file: 'retail.json', code: 'RTL', category: 'retail'},
  {file: 'sympathy.json', code: 'SYM', category: 'sympathy'},
  {file: 'weddings.json', code: 'WED', category: 'weddings'},
  {file: 'supplies.json', code: 'SUP', category: 'supplies'},
  {file: 'plants.json', code: 'PLT', category: 'plants'},
];

// ---- pricing (provisional USD; REPLACE_BEFORE_PUBLISHING) ----
const TIERS = {
  'wholesale-rose': {map: {'25 Stems': 45, '50 Stems': 85, '100 Stems': 160}, premiumMult: 1.2, base: 85},
  'wholesale-spray-rose': {map: {'25 Stems': 40, '50 Stems': 75, '100 Stems': 140}, premiumMult: 1.2, base: 75},
  'wholesale-orchid': {map: {'25 Stems': 70, '50 Stems': 130, '100 Stems': 240}, premiumMult: 1.2, base: 130},
  'wholesale-lily': {map: {'25 Stems': 55, '50 Stems': 100, '100 Stems': 185}, premiumMult: 1.2, base: 100},
  'wholesale-hydrangea': {map: {'25 Stems': 90, '50 Stems': 170, '100 Stems': 320}, premiumMult: 1.2, base: 170},
  'wholesale-mum': {map: {'25 Stems': 35, '50 Stems': 65, '100 Stems': 120}, premiumMult: 1.2, base: 65},
  'wholesale-carnation': {map: {'25 Stems': 30, '50 Stems': 55, '100 Stems': 100}, premiumMult: 1.2, base: 55},
  'wholesale-tropical': {map: {'25 Stems': 85, '50 Stems': 160, '100 Stems': 300}, premiumMult: 1.2, base: 160},
  'wholesale-greenery': {map: {'25 Stems': 35, '50 Stems': 65, '100 Stems': 120}, premiumMult: 1.2, base: 65},
  'wholesale-filler': {map: {'25 Stems': 28, '50 Stems': 52, '100 Stems': 95}, premiumMult: 1.2, base: 52},
  'retail-arrangement': {map: {Classic: 65, Grand: 95, Signature: 135}, base: 85},
  'sympathy-arrangement': {map: {Standard: 110, Deluxe: 160, Premium: 220}, base: 150},
  'sympathy-large': {map: {}, base: 240},
  'wedding-bouquet': {map: {}, base: 150},
  'wedding-centerpiece': {map: {Classic: 85, Grand: 130}, base: 110},
  'wedding-package': {map: {}, base: 950},
  'supply-low': {map: {Small: 10, Medium: 14, Large: 20}, base: 12},
  'supply-mid': {map: {Small: 22, Medium: 30, Large: 42}, base: 30},
  'supply-high': {map: {}, base: 60},
  plant: {map: {Small: 45, Medium: 70, Large: 110, Standard: 65, 'Premium Wrap': 85}, base: 70},
  'gift-basket': {map: {Classic: 85, Grand: 130}, base: 95},
  addon: {map: {Small: 15, Large: 30}, base: 20},
};
// generic multipliers for values not in a tier's explicit map (e.g. supply pack qty / colors)
const GEN_MULT = {
  Small: 0.8, Medium: 1.0, Large: 1.4,
  'Set of 6': 1.0, 'Set of 12': 1.7,
  '6': 0.7, '12': 1.0, '24': 1.8,
  '25 sheets': 1.0, '50 sheets': 1.8, '10': 0.9, '25': 1.6,
  Classic: 1.0, Grand: 1.5, Signature: 2.05,
  Standard: 1.0, Deluxe: 1.45, Premium: 2.0,
};
const COLOR_VALUES = new Set(['Ivory', 'Champagne Gold', 'Black', 'Blush', 'Sage', 'Green', 'White']);

function round2(n) {
  // provisional prices to a tidy .00/.50
  return (Math.round(n * 2) / 2).toFixed(2);
}
function priceFor(tierKey, o1, o2) {
  const t = TIERS[tierKey];
  if (!t) throw new Error(`Unknown priceTierKey: ${tierKey}`);
  let p;
  if (o1 && t.map && t.map[o1] != null) p = t.map[o1];
  else if (o1 && COLOR_VALUES.has(o1)) p = t.base; // colour variants same price
  else if (o1 && GEN_MULT[o1] != null) p = t.base * GEN_MULT[o1];
  else p = t.base;
  if (o2 === 'Premium' && t.premiumMult) p *= t.premiumMult;
  return round2(p);
}

// ---- codes ----
const CODE_MAP = {
  '25 Stems': 'P25', '50 Stems': 'P50', '100 Stems': 'P100',
  Standard: 'STD', Premium: 'PRM', 'Premium Wrap': 'PWR',
  Classic: 'CLS', Grand: 'GRD', Signature: 'SIG', Deluxe: 'DLX',
  Small: 'SM', Medium: 'MD', Large: 'LG',
  Ivory: 'IVR', 'Champagne Gold': 'GLD', Black: 'BLK', Blush: 'BLS', Sage: 'SGE', Green: 'GRN', White: 'WHT',
  'Set of 6': 'S6', 'Set of 12': 'S12', '6': 'Q6', '12': 'Q12', '24': 'Q24',
  '25 sheets': 'Q25S', '50 sheets': 'Q50S', '10': 'Q10', '25': 'Q25',
};
const shortCode = (v) => CODE_MAP[v] || v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5);
const slug = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

// ---- collections (smart, tag-driven) ----
const has = (tags, t) => tags.includes(t);
const anyOcc = (tags, ...o) => o.some((x) => has(tags, `occasion:${x}`));
const COLLECTIONS = [
  // Shop Flowers
  {t: 'All Flowers', h: 'all-flowers', m: (p) => ['Fresh Cut Flowers', 'Greenery', 'Floral Filler', 'Floral Arrangement'].includes(p.productType)},
  {t: 'Roses', h: 'roses', m: (p) => p.tags.includes('flower:rose') || p.tags.includes('flower:spray-rose') || p.tags.includes('flower:garden-rose')},
  {t: 'Orchids', h: 'orchids', m: (p) => p.tags.includes('flower:orchid')},
  {t: 'Lilies', h: 'lilies', m: (p) => p.tags.includes('flower:lily') || p.tags.includes('flower:calla-lily')},
  {t: 'Tropical Flowers', h: 'tropical-flowers', m: (p) => ['anthurium', 'heliconia', 'ginger', 'bird-of-paradise', 'tropical-mixed'].some((f) => p.tags.includes(`flower:${f}`))},
  {t: 'Greenery and Fillers', h: 'greenery-and-fillers', m: (p) => p.productType === 'Greenery' || p.productType === 'Floral Filler'},
  // Shop by Color
  {t: 'White and Ivory', h: 'white-and-ivory', m: (p) => has(p.tags, 'color:white-ivory')},
  {t: 'Red', h: 'red', m: (p) => has(p.tags, 'color:red')},
  {t: 'Pink', h: 'pink', m: (p) => has(p.tags, 'color:pink')},
  {t: 'Yellow and Orange', h: 'yellow-and-orange', m: (p) => has(p.tags, 'color:yellow-orange')},
  {t: 'Purple', h: 'purple', m: (p) => has(p.tags, 'color:purple')},
  {t: 'Green', h: 'green-flowers', m: (p) => has(p.tags, 'color:green')},
  {t: 'Mixed Color', h: 'mixed-color', m: (p) => has(p.tags, 'color:mixed')},
  // Shop by Occasion
  {t: 'Birthday', h: 'birthday', m: (p) => anyOcc(p.tags, 'birthday')},
  {t: 'Anniversary', h: 'anniversary', m: (p) => anyOcc(p.tags, 'anniversary')},
  {t: 'Love and Romance', h: 'love-and-romance', m: (p) => anyOcc(p.tags, 'romance')},
  {t: 'Sympathy and Funeral', h: 'sympathy-and-funeral', m: (p) => anyOcc(p.tags, 'sympathy')},
  {t: 'Congratulations', h: 'congratulations', m: (p) => anyOcc(p.tags, 'congratulations')},
  {t: 'New Baby', h: 'new-baby', m: (p) => anyOcc(p.tags, 'new-baby')},
  {t: 'Get Well', h: 'get-well', m: (p) => anyOcc(p.tags, 'get-well')},
  {t: 'Corporate Gifting', h: 'corporate-gifting', m: (p) => anyOcc(p.tags, 'corporate')},
  // Weddings
  {t: 'Wedding Flowers', h: 'wedding-flowers', m: (p) => p.productType === 'Wedding Flowers'},
  {t: 'Bridal Bouquets', h: 'bridal-bouquets', m: (p) => p.productType === 'Wedding Flowers' && p.subtype.includes('bridal')},
  {t: 'Centerpieces', h: 'centerpieces', m: (p) => has(p.tags, 'format:centerpiece')},
  // Wholesale
  {t: 'Bulk Flowers', h: 'bulk-flowers', m: (p) => has(p.tags, 'channel:wholesale')},
  {t: 'Wholesale Roses', h: 'wholesale-roses', m: (p) => has(p.tags, 'channel:wholesale') && (p.tags.includes('flower:rose') || p.tags.includes('flower:spray-rose'))},
  {t: 'Wholesale Greenery', h: 'wholesale-greenery', m: (p) => has(p.tags, 'channel:wholesale') && (p.productType === 'Greenery' || p.productType === 'Floral Filler')},
  {t: 'Florist Essentials', h: 'florist-essentials', m: (p) => has(p.tags, 'customer:florist')},
  // Floral Supplies
  {t: 'Floral Supplies', h: 'floral-supplies', m: (p) => p.productType === 'Floral Supply'},
  {t: 'Vases and Containers', h: 'vases-and-containers', m: (p) => p.productType === 'Floral Supply' && /vase|container|basket/i.test(p.title)},
  {t: 'Ribbon', h: 'ribbon', m: (p) => /ribbon/i.test(p.title)},
  {t: 'Wrapping and Packaging', h: 'wrapping-and-packaging', m: (p) => /wrap|packag|box|cellophane/i.test(p.title)},
  {t: 'Tools and Accessories', h: 'tools-and-accessories', m: (p) => /shear|snip|tape|tool|wire|pick/i.test(p.title)},
  // Plants and Gifts
  {t: 'Plants', h: 'plants', m: (p) => p.productType === 'Plant'},
  {t: 'Gift Baskets', h: 'gift-baskets', m: (p) => p.productType === 'Gift Basket'},
  {t: 'Add-ons', h: 'add-ons', m: (p) => p.productType === 'Gift Add-on'},
  {t: 'Corporate Gifts', h: 'corporate-gifts', m: (p) => anyOcc(p.tags, 'corporate') && ['Plant', 'Gift Basket', 'Gift Add-on'].includes(p.productType)},
];

// ---- CSV helpers ----
function csvCell(v) {
  if (v == null) v = '';
  v = String(v);
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
const csvRow = (arr) => arr.map(csvCell).join(',');
function writeCsv(path, headers, rows) {
  const lines = [csvRow(headers), ...rows.map((r) => csvRow(headers.map((h) => r[h])))];
  writeFileSync(path, lines.join('\r\n') + '\r\n', 'utf8');
}

// ---- build ----
const products = [];
const handleSet = new Set();
const skuSet = new Set();
let missingFiles = [];

for (const c of CATS) {
  const fp = join(DATA, c.file);
  if (!existsSync(fp)) {
    missingFiles.push(c.file);
    continue;
  }
  const arr = JSON.parse(readFileSync(fp, 'utf8'));
  arr.forEach((p, i) => {
    const seq = String(i + 1).padStart(3, '0');
    let handle = slug(p.title);
    let hb = handle,
      n = 2;
    while (handleSet.has(handle)) handle = `${hb}-${n++}`;
    handleSet.add(handle);
    const productCode = `TNG-${c.code}-${seq}`;

    // tags
    const tags = [];
    if (p.channel === 'both') tags.push('channel:retail', 'channel:wholesale');
    else tags.push(`channel:${p.channel}`);
    if (p.flowerType && p.flowerType !== 'none') tags.push(`flower:${p.flowerType}`);
    (p.colorFamily || []).forEach((col) => tags.push(`color:${col}`));
    (p.occasion || []).forEach((o) => tags.push(`occasion:${o}`));
    (p.customerType || []).forEach((cu) => tags.push(`customer:${cu}`));
    tags.push(`format:${p.format}`);
    if (p.productType === 'Floral Supply') tags.push(`supply:${slug(p.subtype)}`);
    tags.push(`season:${p.season || 'year-round'}`);
    tags.push(`type:${slug(p.productType)}`);
    tags.push('price-status:placeholder', 'image-status:required', 'content-status:reviewed');
    const tagStr = [...new Set(tags)].join(', ');

    const prod = {...p, category: c.category, handle, productCode, tags: [...new Set(tags)], tagStr};

    // variants
    const v = p.variant || {option1Name: null, option2Name: null, values: []};
    let variants;
    if (!v.values || v.values.length === 0) {
      variants = [{o1: null, o2: null}];
      prod.o1Name = '';
      prod.o2Name = '';
    } else {
      variants = v.values.map((x) => ({o1: x.o1 ?? null, o2: x.o2 ?? null}));
      prod.o1Name = v.option1Name || '';
      prod.o2Name = v.option2Name || '';
    }
    prod.variants = variants.map((vv, vi) => {
      const codeParts = [vv.o1, vv.o2].filter(Boolean).map(shortCode);
      let sku = codeParts.length ? `${productCode}-${codeParts.join('-')}` : productCode;
      let sb = sku,
        k = 2;
      while (skuSet.has(sku)) sku = `${sb}-${k++}`;
      skuSet.add(sku);
      return {
        ...vv,
        sku,
        price: priceFor(p.priceTierKey, vv.o1, vv.o2),
        grams: p.weightGramsPlaceholder ?? 500,
      };
    });

    // collections
    prod.collections = COLLECTIONS.filter((col) => {
      try {
        return col.m(prod);
      } catch {
        return false;
      }
    }).map((col) => col.t);

    prod.image = {
      filename: `products/${handle}-${IMAGE_DIMS}.jpg`,
      alt: `${p.title} — The New Greenhouse, Kingston Jamaica`,
      dims: IMAGE_DIMS,
      ratio: IMAGE_RATIO,
    };
    products.push(prod);
  });
}

if (missingFiles.length) {
  console.error('MISSING data files: ' + missingFiles.join(', ') + ' — run authors first.');
  process.exit(1);
}

// ---- 1. Shopify import CSV (standard columns; variant rows) ----
const SHOPIFY_HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
  'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
  'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
  'SEO Title', 'SEO Description', 'Status',
];
const shopifyRows = [];
for (const p of products) {
  p.variants.forEach((vv, vi) => {
    const first = vi === 0;
    shopifyRows.push({
      Handle: p.handle,
      Title: first ? p.title : '',
      'Body (HTML)': first ? p.descriptionHtml : '',
      Vendor: first ? VENDOR : '',
      'Product Category': '', // left blank for clean import; taxonomy noted in master data
      Type: first ? p.productType : '',
      Tags: first ? p.tagStr : '',
      Published: 'FALSE',
      'Option1 Name': first ? (p.o1Name || (p.variants.length > 1 ? 'Title' : 'Title')) : '',
      'Option1 Value': p.o1Name ? vv.o1 : 'Default Title',
      'Option2 Name': first ? p.o2Name : '',
      'Option2 Value': vv.o2 || '',
      'Option3 Name': '',
      'Option3 Value': '',
      'Variant SKU': vv.sku,
      'Variant Grams': vv.grams,
      'Variant Inventory Tracker': 'shopify',
      'Variant Inventory Qty': 0,
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': vv.price,
      'Variant Compare At Price': '',
      'Variant Requires Shipping': p.requiresShipping === false ? 'FALSE' : 'TRUE',
      'Variant Taxable': p.taxable === false ? 'FALSE' : 'TRUE',
      'Variant Barcode': '',
      'Image Src': '',
      'Image Position': '',
      'Image Alt Text': '',
      'Gift Card': 'FALSE',
      'SEO Title': first ? p.seoTitle : '',
      'SEO Description': first ? p.seoDescription : '',
      Status: 'draft',
    });
  });
}
writeCsv(join(OUT, 'shopify-products-draft.csv'), SHOPIFY_HEADERS, shopifyRows);

// ---- 2. price update template (safe fields only) ----
const priceRows = [];
for (const p of products) p.variants.forEach((vv) => priceRows.push({Handle: p.handle, 'Variant SKU': vv.sku, 'Variant Price': vv.price, 'Variant Compare At Price': ''}));
writeCsv(join(OUT, 'shopify-products-price-update-template.csv'), ['Handle', 'Variant SKU', 'Variant Price', 'Variant Compare At Price'], priceRows);

// ---- 3. image update template ----
const imgRows = [];
for (const p of products) imgRows.push({Handle: p.handle, 'Image Src': '', 'Image Position': 1, 'Image Alt Text': p.image.alt});
writeCsv(join(OUT, 'shopify-products-image-update-template.csv'), ['Handle', 'Image Src', 'Image Position', 'Image Alt Text'], imgRows);

// ---- 4. product image manifest ----
const IMG_HEADERS = ['Handle', 'Title', 'Filename', 'Type', 'Orientation', 'Dimensions', 'Aspect Ratio', 'Alt Text', 'Photography Direction', 'Generation Prompt', 'Status'];
const imgManifest = products.map((p) => ({
  Handle: p.handle,
  Title: p.title,
  Filename: p.image.filename,
  Type: 'product',
  Orientation: 'portrait',
  Dimensions: p.image.dims,
  'Aspect Ratio': p.image.ratio,
  'Alt Text': p.image.alt,
  'Photography Direction': 'Single hero on warm-ivory or controlled charcoal seamless; premium studio softbox light; accurate botanical texture; natural proportions; black & champagne-gold packaging accents where relevant; no text/logos in image.',
  'Generation Prompt': `Studio product photograph of ${p.title.toLowerCase()} for a luxury florist catalog. ${p.summary} Warm ivory seamless background (or controlled charcoal for dramatic items), soft premium studio lighting, realistic floral texture and true-to-life color, centered with generous negative space for a 4:5 portrait crop, subtle champagne-gold and black accents. Catalog-clean, editorial, photorealistic. No text, no logo, no watermark.`,
  Status: 'REQUIRED',
}));
writeCsv(join(OUT, 'product-image-manifest.csv'), IMG_HEADERS, imgManifest);

// ---- 5. master data (CSV + JSON) ----
const MASTER_HEADERS = [
  'Handle', 'Product Code', 'Category', 'Title', 'Product Type', 'Shopify Category (planned)', 'Channel', 'Format',
  'Flower Type', 'Color Family', 'Occasion', 'Customer Type', 'Season', 'Care Level', 'Vase Life', 'Stem Length',
  'Bloom Size', 'Unit Type', 'Minimum Order Qty', 'Variant Option 1', 'Variant Option 2', 'Variant Count',
  'Provisional Prices (USD)', 'PRICE_STATUS', 'IMAGE_STATUS', 'Planned Image', 'Image Alt',
  'Collections', 'Tags', 'Delivery Note', 'Wholesale Note', 'Availability Note', 'Care Instructions',
  'Country of Origin', 'CONFIRMATION_REQUIRED', 'APPROVAL_STATUS', 'Status',
];
const masterRows = products.map((p) => ({
  Handle: p.handle,
  'Product Code': p.productCode,
  Category: p.category,
  Title: p.title,
  'Product Type': p.productType,
  'Shopify Category (planned)': p.shopifyCategory || '',
  Channel: p.channel,
  Format: p.format,
  'Flower Type': p.flowerType,
  'Color Family': (p.colorFamily || []).join('|'),
  Occasion: (p.occasion || []).join('|'),
  'Customer Type': (p.customerType || []).join('|'),
  Season: p.season,
  'Care Level': p.careLevel,
  'Vase Life': p.vaseLife || '',
  'Stem Length': p.stemLength || '',
  'Bloom Size': p.bloomSize || '',
  'Unit Type': p.unitType,
  'Minimum Order Qty': p.minimumOrderQuantity,
  'Variant Option 1': p.o1Name || '(single)',
  'Variant Option 2': p.o2Name || '',
  'Variant Count': p.variants.length,
  'Provisional Prices (USD)': p.variants.map((v) => `${v.o1 || 'Default'}${v.o2 ? '/' + v.o2 : ''}=${v.price}`).join('; '),
  PRICE_STATUS: 'REPLACE_BEFORE_PUBLISHING',
  IMAGE_STATUS: 'REQUIRED',
  'Planned Image': p.image.filename,
  'Image Alt': p.image.alt,
  Collections: p.collections.join('|'),
  Tags: p.tagStr,
  'Delivery Note': p.deliveryNote || '',
  'Wholesale Note': p.wholesaleNote || '',
  'Availability Note': p.availabilityNote || '',
  'Care Instructions': p.careInstructions || '',
  'Country of Origin': p.countryOfOrigin || '',
  CONFIRMATION_REQUIRED: (p.confirmationRequired || []).join('|'),
  APPROVAL_STATUS: 'DRAFT_PENDING_REVIEW',
  Status: 'draft',
}));
writeCsv(join(OUT, 'product-master-data.csv'), MASTER_HEADERS, masterRows);
writeFileSync(join(OUT, 'product-master-data.json'), JSON.stringify(products, null, 2), 'utf8');

// ---- 6. collection plan CSV ----
const colCounts = {};
for (const p of products) p.collections.forEach((t) => (colCounts[t] = (colCounts[t] || 0) + 1));
const COL_GROUP = {};
const groupOf = (h) => {
  if (['all-flowers', 'roses', 'orchids', 'lilies', 'tropical-flowers', 'greenery-and-fillers'].includes(h)) return 'Shop Flowers';
  if (['white-and-ivory', 'red', 'pink', 'yellow-and-orange', 'purple', 'green-flowers', 'mixed-color'].includes(h)) return 'Shop by Color';
  if (['birthday', 'anniversary', 'love-and-romance', 'sympathy-and-funeral', 'congratulations', 'new-baby', 'get-well', 'corporate-gifting'].includes(h)) return 'Shop by Occasion';
  if (['wedding-flowers', 'bridal-bouquets', 'centerpieces'].includes(h)) return 'Weddings & Events';
  if (['bulk-flowers', 'wholesale-roses', 'wholesale-greenery', 'florist-essentials'].includes(h)) return 'Wholesale';
  if (['floral-supplies', 'vases-and-containers', 'ribbon', 'wrapping-and-packaging', 'tools-and-accessories'].includes(h)) return 'Floral Supplies';
  return 'Plants & Gifts';
};
const collectionRows = COLLECTIONS.map((c) => ({
  Group: groupOf(c.h),
  'Collection Title': c.t,
  Handle: c.h,
  Type: 'smart (automated)',
  'Match Rule': ruleText(c.h),
  'Product Count': colCounts[c.t] || 0,
}));
writeCsv(join(OUT, 'collection-plan.csv'), ['Group', 'Collection Title', 'Handle', 'Type', 'Match Rule', 'Product Count'], collectionRows);

function ruleText(h) {
  const R = {
    'all-flowers': 'Type is one of Fresh Cut Flowers/Greenery/Floral Filler/Floral Arrangement',
    roses: 'Tag = flower:rose OR flower:spray-rose OR flower:garden-rose',
    orchids: 'Tag = flower:orchid', lilies: 'Tag = flower:lily OR flower:calla-lily',
    'tropical-flowers': 'Tag = flower:anthurium/heliconia/ginger/bird-of-paradise/tropical-mixed',
    'greenery-and-fillers': 'Type = Greenery OR Floral Filler',
    'white-and-ivory': 'Tag = color:white-ivory', red: 'Tag = color:red', pink: 'Tag = color:pink',
    'yellow-and-orange': 'Tag = color:yellow-orange', purple: 'Tag = color:purple', 'green-flowers': 'Tag = color:green', 'mixed-color': 'Tag = color:mixed',
    birthday: 'Tag = occasion:birthday', anniversary: 'Tag = occasion:anniversary', 'love-and-romance': 'Tag = occasion:romance',
    'sympathy-and-funeral': 'Tag = occasion:sympathy', congratulations: 'Tag = occasion:congratulations', 'new-baby': 'Tag = occasion:new-baby',
    'get-well': 'Tag = occasion:get-well', 'corporate-gifting': 'Tag = occasion:corporate',
    'wedding-flowers': 'Type = Wedding Flowers', 'bridal-bouquets': 'Type = Wedding Flowers AND subtype bridal', centerpieces: 'Tag = format:centerpiece',
    'bulk-flowers': 'Tag = channel:wholesale', 'wholesale-roses': 'Tag = channel:wholesale AND flower:rose/spray-rose',
    'wholesale-greenery': 'Tag = channel:wholesale AND Type Greenery/Floral Filler', 'florist-essentials': 'Tag = customer:florist',
    'floral-supplies': 'Type = Floral Supply', 'vases-and-containers': 'Type = Floral Supply AND title vase/container/basket',
    ribbon: 'Title contains ribbon', 'wrapping-and-packaging': 'Title contains wrap/packaging/box/cellophane',
    'tools-and-accessories': 'Title contains shear/snip/tape/tool/wire/pick',
    plants: 'Type = Plant', 'gift-baskets': 'Type = Gift Basket', 'add-ons': 'Type = Gift Add-on',
    'corporate-gifts': 'Tag = occasion:corporate AND Type Plant/Gift Basket/Gift Add-on',
  };
  return R[h] || '';
}

// ---- 7. provisional price report ----
let pr = `# Provisional Price Report\n\nAll prices are **PROVISIONAL (USD)** and flagged \`PRICE_STATUS = REPLACE_BEFORE_PUBLISHING\`. Products are DRAFT/unpublished. Replace via \`shopify-products-price-update-template.csv\` (safe fields only) before publishing.\n\n| Handle | SKU | Variant | Provisional USD |\n|---|---|---|---|\n`;
let priceCount = 0;
for (const p of products)
  p.variants.forEach((v) => {
    pr += `| ${p.handle} | ${v.sku} | ${v.o1 || 'Default'}${v.o2 ? ' / ' + v.o2 : ''} | ${v.price} |\n`;
    priceCount++;
  });
pr += `\n**Total provisional variant prices:** ${priceCount}\n`;
writeFileSync(join(OUT, 'provisional-price-report.md'), pr, 'utf8');

// ---- 8. metafields payload (JSONL for Admin API; CSV metafield import is unreliable) ----
const mfLines = products.map((p) => {
  const mf = [];
  const add = (key, type, value) => {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
    mf.push({namespace: 'custom', key, type, value: Array.isArray(value) ? JSON.stringify(value) : String(value)});
  };
  add('channel', 'single_line_text_field', p.channel);
  add('flower_type', 'single_line_text_field', p.flowerType !== 'none' ? p.flowerType : '');
  add('color_family', 'list.single_line_text_field', p.colorFamily);
  add('stem_length', 'single_line_text_field', p.stemLength);
  add('bloom_size', 'single_line_text_field', p.bloomSize);
  add('vase_life', 'single_line_text_field', p.vaseLife);
  const packVals = (p.variant && p.variant.option1Name === 'Pack Size') ? p.variant.values.map((v) => v.o1) : [];
  add('pack_size', 'list.single_line_text_field', [...new Set(packVals)]);
  add('season', 'single_line_text_field', p.season);
  add('country_of_origin', 'single_line_text_field', p.countryOfOrigin);
  add('care_level', 'single_line_text_field', p.careLevel);
  add('care_instructions', 'multi_line_text_field', p.careInstructions);
  add('ideal_for', 'list.single_line_text_field', p.occasion);
  add('minimum_order_quantity', 'single_line_text_field', p.minimumOrderQuantity);
  add('unit_type', 'single_line_text_field', p.unitType);
  add('price_status', 'single_line_text_field', 'REPLACE_BEFORE_PUBLISHING');
  add('image_status', 'single_line_text_field', 'REQUIRED');
  add('delivery_note', 'multi_line_text_field', p.deliveryNote);
  add('wholesale_note', 'multi_line_text_field', p.wholesaleNote);
  add('confirmation_required', 'list.single_line_text_field', p.confirmationRequired);
  return JSON.stringify({handle: p.handle, metafields: mf});
});
writeFileSync(join(OUT, 'build', 'metafields-payload.jsonl'), mfLines.join('\n') + '\n', 'utf8');

// ---- stats ----
const stats = {
  products: products.length,
  variants: products.reduce((a, p) => a + p.variants.length, 0),
  byCategory: Object.fromEntries(CATS.map((c) => [c.category, products.filter((p) => p.category === c.category).length])),
  collections: COLLECTIONS.length,
  provisionalPrices: priceCount,
  missingImages: products.length,
  confirmationRequiredFields: products.reduce((a, p) => a + (p.confirmationRequired || []).length, 0),
};
writeFileSync(join(OUT, 'build', 'stats.json'), JSON.stringify(stats, null, 2), 'utf8');
console.log('Generated catalog. Stats:\n' + JSON.stringify(stats, null, 2));
