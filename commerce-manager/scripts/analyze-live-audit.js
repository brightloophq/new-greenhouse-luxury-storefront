// scripts/analyze-live-audit.js — LIVE-vs-source catalogue SEO analysis.
//
// Consumes ONLY the authoritative live export written by export-live-audit.js
// (../catalog/live-audit/raw/*.json). The catalog/ source dataset is used
// strictly as comparison/planning data. This script performs NO network calls
// and NO Shopify operations of any kind.
//
// If the live raw export is missing or empty, this script ABORTS. It never
// substitutes source data for live data.
//
// Emits (catalogue analysis only — no secrets):
//   catalog/live-audit/analysis.json
//   catalog/live-audit/live-vs-source-summary.md
//   docs/seo/shopify-live-content-audit.md
//
// Usage (local Mac, after export-live-audit.js):
//   cd commerce-manager
//   node scripts/analyze-live-audit.js
//
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..'); // repo root
const RAW = join(ROOT, 'catalog', 'live-audit', 'raw');
const OUT_DIR = join(ROOT, 'catalog', 'live-audit');
const DOCS_DIR = join(ROOT, 'docs', 'seo');

// ---- guards: live data must exist; never fall back to source --------------
function requireLive(name) {
  const p = join(RAW, name);
  if (!existsSync(p)) {
    console.error(`  ✗ Missing live export: catalog/live-audit/raw/${name}`);
    console.error('    Run `node scripts/export-live-audit.js` first. This script will NOT');
    console.error('    substitute catalog/ source data for live data.');
    process.exit(1);
  }
  const txt = readFileSync(p, 'utf8');
  let json;
  try {
    json = JSON.parse(txt);
  } catch {
    console.error(`  ✗ ${name} is not valid JSON.`);
    process.exit(1);
  }
  if (Array.isArray(json) && json.length === 0) {
    console.error(`  ✗ ${name} is empty — refusing to analyze an empty live export.`);
    process.exit(1);
  }
  return json;
}

const liveProducts = requireLive('products.json');
const liveCollections = requireLive('collections.json');
const meta = existsSync(join(RAW, 'meta.json')) ? JSON.parse(readFileSync(join(RAW, 'meta.json'), 'utf8')) : {};

// ---- source (comparison only) ---------------------------------------------
const srcProducts = JSON.parse(readFileSync(join(ROOT, 'catalog', 'product-master-data.json'), 'utf8'));
const srcCollections = parseCsv(readFileSync(join(ROOT, 'catalog', 'collection-plan.csv'), 'utf8'));

// ---- helpers --------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let field = '',
    row = [],
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const stripHtml = (h) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const len = (s) => (s ? String(s).length : 0);
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const WEDDING_RE = /wedding|bridal|bride/i;

function dupGroups(items, keyFn) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    (map.get(k) || map.set(k, []).get(k)).push(it);
  }
  return [...map.entries()].filter(([, v]) => v.length > 1);
}

// ---- product analysis (LIVE authoritative) --------------------------------
const P = liveProducts.length;
const productStats = {
  total: P,
  variants: liveProducts.reduce((n, p) => n + (p.variants?.nodes?.length || 0), 0),
  byStatus: {},
  seoTitle: 0,
  seoDesc: 0,
  seoTitleOver60: 0,
  seoDescShort: 0,
  seoDescOver160: 0,
  thinDescription: [], // handles with < 200 chars of body text
  missingSeoTitle: [],
  missingSeoDesc: [],
  featuredImage: 0,
  featuredAlt: 0,
  imagesTotal: 0,
  imagesWithAlt: 0,
  notPublishedOnlineStore: [], // when publications available
};
for (const p of liveProducts) {
  productStats.byStatus[p.status] = (productStats.byStatus[p.status] || 0) + 1;
  if (p.seo?.title) productStats.seoTitle++;
  else productStats.missingSeoTitle.push(p.handle);
  if (p.seo?.description) productStats.seoDesc++;
  else productStats.missingSeoDesc.push(p.handle);
  if (len(p.seo?.title) > 60) productStats.seoTitleOver60++;
  if (p.seo?.description && len(p.seo.description) < 70) productStats.seoDescShort++;
  if (len(p.seo?.description) > 160) productStats.seoDescOver160++;
  if (stripHtml(p.descriptionHtml).length < 200) productStats.thinDescription.push(p.handle);
  if (p.featuredImage) {
    productStats.featuredImage++;
    if (p.featuredImage.altText) productStats.featuredAlt++;
  }
  for (const img of p.images?.nodes || []) {
    productStats.imagesTotal++;
    if (img.altText) productStats.imagesWithAlt++;
  }
  const pubs = p.resourcePublications?.nodes;
  if (Array.isArray(pubs)) {
    const online = pubs.find((x) => /online store/i.test(x.publication?.name || ''));
    if (!online || !online.isPublished) productStats.notPublishedOnlineStore.push(p.handle);
  }
}
const dupProdSeoTitle = dupGroups(liveProducts.filter((p) => p.seo?.title), (p) => norm(p.seo.title));
const dupProdSeoDesc = dupGroups(liveProducts.filter((p) => p.seo?.description), (p) => norm(p.seo.description));
const dupProdTitle = dupGroups(liveProducts, (p) => norm(p.title));

// ---- collection analysis (LIVE authoritative) -----------------------------
const C = liveCollections.length;
const collStats = {
  total: C,
  seoTitle: 0,
  seoDesc: 0,
  body: 0,
  image: 0,
  imageAlt: 0,
  empty: [], // 0 products
  missingSeoTitle: [],
  missingSeoDesc: [],
  missingBody: [],
};
for (const c of liveCollections) {
  if (c.seo?.title) collStats.seoTitle++;
  else collStats.missingSeoTitle.push(c.handle);
  if (c.seo?.description) collStats.seoDesc++;
  else collStats.missingSeoDesc.push(c.handle);
  if (stripHtml(c.descriptionHtml).length > 0) collStats.body++;
  else collStats.missingBody.push(c.handle);
  if (c.image) {
    collStats.image++;
    if (c.image.altText) collStats.imageAlt++;
  }
  if ((c.productsCount?.count || 0) === 0) collStats.empty.push(c.handle);
}
const dupCollSeoTitle = dupGroups(liveCollections.filter((c) => c.seo?.title), (c) => norm(c.seo.title));
const dupCollSeoDesc = dupGroups(liveCollections.filter((c) => c.seo?.description), (c) => norm(c.seo.description));

// ---- wedding conflict (LIVE) ----------------------------------------------
const weddingProducts = liveProducts.filter(
  (p) =>
    WEDDING_RE.test(p.productType || '') ||
    (p.tags || []).some((t) => WEDDING_RE.test(t)) ||
    (p.collections?.nodes || []).some((c) => WEDDING_RE.test(c.handle) || WEDDING_RE.test(c.title)),
);
const weddingCollections = liveCollections.filter((c) => WEDDING_RE.test(c.handle) || WEDDING_RE.test(c.title));
const weddingLiveVisible = weddingProducts.filter(
  (p) => p.status === 'ACTIVE' && !productStats.notPublishedOnlineStore.includes(p.handle),
);

// ---- confirmationRequired (SOURCE) mapped to LIVE -------------------------
const srcConfirm = srcProducts.filter((p) => Array.isArray(p.confirmationRequired) && p.confirmationRequired.length);
const liveByHandle = new Map(liveProducts.map((p) => [p.handle, p]));
const confirmLiveMatched = srcConfirm.filter((p) => liveByHandle.has(p.handle));
const confirmMissingLive = srcConfirm.filter((p) => !liveByHandle.has(p.handle)).map((p) => p.handle);

// ---- priority collections -------------------------------------------------
const PRIORITY = [
  ['Corporate Gifting', /corporate/i],
  ['Sympathy / Funeral', /sympathy|funeral/i],
  ['Wholesale / Bulk', /bulk|wholesale/i],
  ['Arrangements', /arrangement/i],
  ['Retail Flowers', /retail|^all-flowers$|^flowers$/i],
  ['Supplies', /essential|suppl/i],
];
const priority = PRIORITY.map(([label, re]) => {
  const matches = liveCollections.filter((c) => re.test(c.handle) || re.test(c.title));
  return {
    label,
    present: matches.length > 0,
    collections: matches.map((c) => ({
      handle: c.handle,
      title: c.title,
      products: c.productsCount?.count ?? null,
      seoTitle: !!c.seo?.title,
      seoDesc: !!c.seo?.description,
      body: stripHtml(c.descriptionHtml).length > 0,
      imageAlt: !!c.image?.altText,
    })),
  };
});

// ---- live-vs-source drift -------------------------------------------------
const liveHandles = new Set(liveProducts.map((p) => p.handle));
const srcHandles = new Set(srcProducts.map((p) => p.handle));
const liveOnly = [...liveHandles].filter((h) => !srcHandles.has(h));
const sourceOnly = [...srcHandles].filter((h) => !liveHandles.has(h));
const srcByHandle = new Map(srcProducts.map((p) => [p.handle, p]));
let seoTitleDrift = 0,
  seoDescDrift = 0;
const driftExamples = [];
for (const h of liveHandles) {
  if (!srcByHandle.has(h)) continue;
  const l = liveByHandle.get(h),
    s = srcByHandle.get(h);
  const tChanged = norm(l.seo?.title) !== norm(s.seoTitle);
  const dChanged = norm(l.seo?.description) !== norm(s.seoDescription);
  if (tChanged) seoTitleDrift++;
  if (dChanged) seoDescDrift++;
  if ((tChanged || dChanged) && driftExamples.length < 15)
    driftExamples.push({handle: h, seoTitleDrift: tChanged, seoDescDrift: dChanged});
}

// ---- Phase 1 data extension (publication, counts, imageless, targets) -----
// Publication helpers. A Hydrogen (headless) storefront publishes to its own
// sales channel, which may NOT be named "Online Store" — so we tally EVERY
// channel and never treat "not on Online Store" as "hidden" on its own.
function publishedChannels(node) {
  const pubs = node.resourcePublications?.nodes;
  if (!Array.isArray(pubs)) return null; // scope unavailable
  return pubs.filter((x) => x.isPublished).map((x) => x.publication?.name || '(unnamed)');
}
function onOnlineStore(node) {
  const ch = publishedChannels(node);
  if (ch === null) return null;
  return ch.some((n) => /online store/i.test(n));
}
const isImageless = (p) => !p.featuredImage && (p.images?.nodes?.length || 0) === 0;

// Catalogue-wide channel tally (the key to interpreting "unpublished").
const channelTally = {};
for (const p of liveProducts) {
  for (const name of publishedChannels(p) || []) channelTally[name] = (channelTally[name] || 0) + 1;
}
const collectionChannelTally = {};
for (const c of liveCollections) {
  for (const name of publishedChannels(c) || []) collectionChannelTally[name] = (collectionChannelTally[name] || 0) + 1;
}

// Segment classifier (handle + membership + type), priority-ordered.
const weddingHandles = new Set(weddingProducts.map((p) => p.handle));
const legacyDupHandles = new Set(dupProdTitle.flatMap(([, v]) => v.map((p) => p.handle)));
const WHOLESALE_HANDLE =
  /^(alstroemeria|asters|calla-lilies|carnations|chrysanthemums|delphinium|eucalyptus|fillers|gerbera-daisies|greenery|hydrangea|hypericum|lilies|lisianthus|novelties|orchids|ranunculus|roses-in-stock|snapdragon|spray-roses|stock|tropicals|tulips|gift-bouquets|babys-breath)-/;
const PREMIUM_HANDLE = /(arrangement|vase|bouquet|heart-box|luxe|dome|bunch|centerpiece)/;
const wholesaleMember = (p) => (p.collections?.nodes || []).some((c) => /^(bulk-flowers|wholesale-)/.test(c.handle));
function segmentOf(p) {
  if (weddingHandles.has(p.handle)) return 'wedding';
  if (legacyDupHandles.has(p.handle)) return 'legacy-duplicate';
  if (WHOLESALE_HANDLE.test(p.handle) || wholesaleMember(p)) return 'wholesale';
  if (PREMIUM_HANDLE.test(p.handle) || /arrangement/i.test(p.productType || '')) return 'premium-retail';
  return 'other';
}

// Every collection: exact count + Online-Store publication + coverage booleans.
const collectionDetail = liveCollections
  .map((c) => ({
    handle: c.handle,
    title: c.title,
    products: c.productsCount?.count ?? null,
    channels: publishedChannels(c),
    onlineStorePublished: onOnlineStore(c),
    seoTitle: !!c.seo?.title,
    seoDescription: !!c.seo?.description,
    body: stripHtml(c.descriptionHtml).length > 0,
    image: !!c.image,
  }))
  .sort((a, b) => (b.products || 0) - (a.products || 0));

// Products NOT on the "Online Store" channel — categorized (not dumped).
const notOnOnlineStore = liveProducts.filter((p) => onOnlineStore(p) === false);
const unpublishedBreakdown = {
  total: notOnOnlineStore.length,
  byStatus: {},
  bySegment: {},
  // ACTIVE but not on Online Store AND not on any channel at all = truly hidden.
  activeOnNoChannel: [],
  // ACTIVE, not on Online Store, but published somewhere (e.g. Hydrogen) = expected headless.
  activeHeadlessOnly: 0,
};
for (const p of notOnOnlineStore) {
  unpublishedBreakdown.byStatus[p.status] = (unpublishedBreakdown.byStatus[p.status] || 0) + 1;
  const seg = segmentOf(p);
  unpublishedBreakdown.bySegment[seg] = (unpublishedBreakdown.bySegment[seg] || 0) + 1;
  const ch = publishedChannels(p) || [];
  if (p.status === 'ACTIVE') {
    if (ch.length === 0) unpublishedBreakdown.activeOnNoChannel.push({handle: p.handle, segment: seg});
    else unpublishedBreakdown.activeHeadlessOnly++;
  }
}

// Imageless products, grouped by segment, with status + Online-Store state.
const imageless = liveProducts.filter(isImageless);
const imagelessGrouped = {wholesale: [], 'premium-retail': [], 'legacy-duplicate': [], wedding: [], other: []};
for (const p of imageless) {
  const seg = segmentOf(p);
  (imagelessGrouped[seg] ||= []).push({handle: p.handle, status: p.status, onlineStore: onOnlineStore(p)});
}
const imagelessSummary = {total: imageless.length, groups: imagelessGrouped};

// Target + Batch-1 verification (exact current values).
const collByHandle = new Map(liveCollections.map((c) => [c.handle, c]));
const TARGETS = [
  'same-day-delivery', 'plants', 'thank-you', 'luxury-bouquets',
  'premium-handcrafted', 'premium-vase', 'premium-heart-box',
];
const targetVerification = TARGETS.map((h) => {
  const c = collByHandle.get(h);
  if (!c) return {handle: h, found: false};
  return {
    handle: h,
    found: true,
    title: c.title,
    products: c.productsCount?.count ?? null,
    channels: publishedChannels(c),
    onlineStorePublished: onOnlineStore(c),
    seoTitle: c.seo?.title ?? null,
    seoDescription: c.seo?.description ?? null,
    bodyExists: stripHtml(c.descriptionHtml).length > 0,
    bodyChars: stripHtml(c.descriptionHtml).length,
    image: !!c.image,
    imageAlt: !!c.image?.altText,
  };
});
const BATCH1 = ['premium-handcrafted', 'premium-vase', 'premium-heart-box'];
const batch1Safety = BATCH1.map((h) => {
  const c = collByHandle.get(h) || {};
  return {
    handle: h,
    found: collByHandle.has(h),
    currentSeoTitle: c.seo?.title ?? null,
    currentSeoDescription: c.seo?.description ?? null,
    bodyChars: stripHtml(c.descriptionHtml || '').length,
    products: c.productsCount?.count ?? null,
    image: !!c.image,
    onlineStorePublished: onOnlineStore(c),
    // Fields a seo-only update MUST NOT alter (snapshot for post-write diff).
    preserve: ['descriptionHtml', 'products', 'image', 'resourcePublications', 'status', 'ruleSet', 'sortOrder'],
  };
});

// ---- assemble analysis ----------------------------------------------------
const analysis = {
  generatedAt: new Date().toISOString(),
  source: 'LIVE Shopify export (authoritative). catalog/ used for comparison only.',
  meta,
  products: productStats,
  productDuplicates: {
    seoTitle: dupProdSeoTitle.map(([k, v]) => ({value: k, handles: v.map((p) => p.handle)})),
    seoDescription: dupProdSeoDesc.map(([k, v]) => ({value: k, handles: v.map((p) => p.handle)})),
    title: dupProdTitle.map(([k, v]) => ({value: k, handles: v.map((p) => p.handle)})),
  },
  collections: collStats,
  collectionDuplicates: {
    seoTitle: dupCollSeoTitle.map(([k, v]) => ({value: k, handles: v.map((c) => c.handle)})),
    seoDescription: dupCollSeoDesc.map(([k, v]) => ({value: k, handles: v.map((c) => c.handle)})),
  },
  wedding: {
    liveProducts: weddingProducts.map((p) => ({handle: p.handle, status: p.status})),
    liveCollections: weddingCollections.map((c) => c.handle),
    visibleToShoppers: weddingLiveVisible.map((p) => p.handle),
  },
  confirmationRequired: {
    sourceFlagged: srcConfirm.length,
    matchedLive: confirmLiveMatched.length,
    missingFromLive: confirmMissingLive,
  },
  priorityCollections: priority,
  phase1Extension: {
    channelTally,
    collectionChannelTally,
    collectionDetail,
    unpublishedBreakdown,
    imageless: imagelessSummary,
    targetVerification,
    batch1Safety,
  },
  drift: {
    liveOnlyProducts: liveOnly,
    sourceOnlyProducts: sourceOnly,
    seoTitleDrift,
    seoDescDrift,
    examples: driftExamples,
  },
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true});
if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, {recursive: true});
writeFileSync(join(OUT_DIR, 'analysis.json'), JSON.stringify(analysis, null, 2));

// ---- markdown emitters ----------------------------------------------------
const list = (arr, n = 12) =>
  arr.length ? arr.slice(0, n).map((x) => `\`${x}\``).join(', ') + (arr.length > n ? ` … (+${arr.length - n})` : '') : '—';

function summaryMd() {
  const m = meta.counts || {};
  return `# Live vs Source — Catalogue Summary

> Generated ${analysis.generatedAt} from the **authoritative LIVE Shopify export**.
> \`catalog/\` source data is comparison/planning only. Raw dumps live in
> \`catalog/live-audit/raw/\` (gitignored).

## Counts

| Metric | LIVE | Source | Match |
|---|---|---|---|
| Products | ${productStats.total} | ${srcProducts.length} | ${productStats.total === srcProducts.length ? '✓' : '✗ drift'} |
| Variants | ${productStats.variants} | — | — |
| Collections | ${collStats.total} | ${srcCollections.length} | ${collStats.total === srcCollections.length ? '✓' : '✗ drift'} |
| Export pagination verified | ${meta?.pagination?.productCountMatches && meta?.pagination?.collectionCountMatches ? '✓ shop count == exported' : '✗ CHECK meta.json'} | | |

## Product drift (matched by handle)

- Live-only products (in Shopify, not in source): **${liveOnly.length}** — ${list(liveOnly)}
- Source-only products (planned, not live): **${sourceOnly.length}** — ${list(sourceOnly)}
- SEO **title** differs live vs source: **${seoTitleDrift}** products
- SEO **description** differs live vs source: **${seoDescDrift}** products

## confirmationRequired (source flag → live)

- Source products with a non-empty \`confirmationRequired\` list: **${srcConfirm.length}**
- Of those, present in LIVE catalogue: **${confirmLiveMatched.length}**
- Flagged in source but NOT found live: ${list(confirmMissingLive)}

## Wedding conflict (LIVE)

- Live products matching wedding/bridal: **${weddingProducts.length}**
- Live wedding/bridal collections: **${weddingCollections.length}** — ${list(weddingCollections.map((c) => c.handle))}
- **Visible to shoppers right now** (ACTIVE + published to Online Store): **${weddingLiveVisible.length}** — ${list(weddingLiveVisible.map((p) => p.handle))}

> The storefront code states weddings/events are **not offered** (routes 301, footer hides links).
> Any wedding product visible to shoppers above is a live conflict for the owner to resolve.
`;
}

function auditMd() {
  const priorityRows = priority
    .flatMap((g) =>
      g.collections.length
        ? g.collections.map(
            (c) =>
              `| ${g.label} | \`${c.handle}\` | ${c.products ?? '?'} | ${c.seoTitle ? '✓' : '✗'} | ${c.seoDesc ? '✓' : '✗'} | ${c.body ? '✓' : '✗'} | ${c.imageAlt ? '✓' : '✗'} |`,
          )
        : [`| ${g.label} | — (not found live) | — | — | — | — | — |`],
    )
    .join('\n');

  return `# Shopify LIVE Content SEO Audit

> **Authoritative.** Generated ${analysis.generatedAt} from a read-only LIVE Shopify
> export (\`catalog/live-audit/raw/\`). No Shopify data was modified. The \`catalog/\`
> source dataset is referenced only for drift comparison. **No changes were executed.**

## Access & Provenance

- Method: Admin GraphQL **queries only**, client-credentials grant, via \`commerce-manager\`.
- Store: ${meta.store || '(see meta.json)'} · API ${meta.apiVersion || ''}.
- Pagination verified: products ${meta?.pagination?.productCountMatches ? 'OK' : 'CHECK'}, collections ${meta?.pagination?.collectionCountMatches ? 'OK' : 'CHECK'}.
- Publications data included: products=${meta?.publicationsIncluded?.products}, collections=${meta?.publicationsIncluded?.collections}.
- Writes performed: **NONE**.

## Catalogue at a glance (LIVE)

- **Products:** ${productStats.total} · **Variants:** ${productStats.variants} · **Collections:** ${collStats.total}
- **By status:** ${Object.entries(productStats.byStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}
- Products not published to Online Store: **${productStats.notPublishedOnlineStore.length}**${meta?.publicationsIncluded?.products ? '' : ' (publications scope unavailable — not measured)'}

## Product SEO coverage (LIVE)

| Field | Coverage | Notes |
|---|---|---|
| SEO title | ${productStats.seoTitle}/${P} (${pct(productStats.seoTitle, P)}%) | ${productStats.seoTitleOver60} over ~60 chars |
| SEO description | ${productStats.seoDesc}/${P} (${pct(productStats.seoDesc, P)}%) | ${productStats.seoDescOver160} over 160; ${productStats.seoDescShort} very short |
| Body description | ${P - productStats.thinDescription.length}/${P} substantive | ${productStats.thinDescription.length} thin (<200 chars) |
| Featured image | ${productStats.featuredImage}/${P} | alt text on ${productStats.featuredAlt} |
| Image alt (all images) | ${productStats.imagesWithAlt}/${productStats.imagesTotal} (${pct(productStats.imagesWithAlt, productStats.imagesTotal)}%) | |

- Missing SEO title: ${list(productStats.missingSeoTitle)}
- Missing SEO description: ${list(productStats.missingSeoDesc)}
- Thin descriptions: ${list(productStats.thinDescription)}

## Collection SEO coverage (LIVE)

| Field | Coverage |
|---|---|
| SEO title | ${collStats.seoTitle}/${C} (${pct(collStats.seoTitle, C)}%) |
| SEO description | ${collStats.seoDesc}/${C} (${pct(collStats.seoDesc, C)}%) |
| Body description | ${collStats.body}/${C} (${pct(collStats.body, C)}%) |
| Image + alt | ${collStats.image}/${C} image · ${collStats.imageAlt} with alt |
| Empty (0 products) | ${collStats.empty.length} — ${list(collStats.empty)} |

- Missing SEO title: ${list(collStats.missingSeoTitle)}
- Missing SEO description: ${list(collStats.missingSeoDesc)}
- Missing body copy: ${list(collStats.missingBody)}

## Priority collections (LIVE)

| Segment | Handle | Products | SEO title | SEO desc | Body | Img alt |
|---|---|---|---|---|---|---|
${priorityRows}

## Duplicate metadata (LIVE)

- Duplicate product SEO titles: **${dupProdSeoTitle.length}** group(s)
- Duplicate product SEO descriptions: **${dupProdSeoDesc.length}** group(s)
- Duplicate product titles: **${dupProdTitle.length}** group(s)
- Duplicate collection SEO titles: **${dupCollSeoTitle.length}** · descriptions: **${dupCollSeoDesc.length}**
${dupProdSeoDesc.slice(0, 5).map((g) => `  - desc \`${g[0].slice(0, 40)}…\` → ${g[1].map((p) => p.handle).join(', ')}`).join('\n') || ''}

## Wedding conflict (LIVE)

- Wedding/bridal products live: **${weddingProducts.length}** · collections: **${weddingCollections.length}**
- **Visible to shoppers now** (ACTIVE + on Online Store): **${weddingLiveVisible.length}** — ${list(weddingLiveVisible.map((p) => p.handle))}
- Storefront stance: weddings/events **not offered**. Owner must reconcile (publish + restore routes, or unpublish these).

## confirmationRequired (source → live)

- ${srcConfirm.length} source products flagged for owner confirmation; **${confirmLiveMatched.length}** are live.
- Do NOT finalise SEO/body for these until the owner confirms the flagged facts.

## Live-vs-source drift

- Live-only products: **${liveOnly.length}** · Source-only: **${sourceOnly.length}**
- SEO title drift: **${seoTitleDrift}** · SEO description drift: **${seoDescDrift}**

## Proposed FIRST optimization batch (NOT executed)

Chosen for highest search leverage + lowest risk, gated on owner-approved copy and a
pre-write export. **Read-only until explicitly authorized.**

1. **Collection SEO copy** for the priority segments missing it (see table): SEO title +
   meta description + short body for Corporate Gifting, Sympathy/Funeral, Wholesale/Bulk,
   Arrangements, Retail Flowers, Supplies — whichever rows show ✗ above. This is the
   biggest structural gap and is customer-visible.
2. Scope: \`collectionUpdate\` on \`seo.title\`, \`seo.description\`, \`descriptionHtml\` only.
3. Risk: Low–Med (visible copy). Rollback: restore from the pre-write collection export.
4. Excluded from batch 1: the ${confirmLiveMatched.length} confirmationRequired products and
   any wedding decision — both need owner input first.

_All figures above are computed from the authoritative live export; nothing was changed._
`;
}

function extensionMd() {
  const tv = targetVerification
    .map((t) =>
      t.found
        ? `| \`${t.handle}\` | ${t.title} | ${t.products ?? '?'} | ${t.onlineStorePublished === null ? 'n/a' : t.onlineStorePublished ? 'yes' : 'no'} | ${t.seoTitle ? '✓' : '✗'} | ${t.seoDescription ? '✓' : '✗'} | ${t.bodyExists ? `✓ (${t.bodyChars})` : '✗'} | ${t.image ? '✓' : '✗'} |`
        : `| \`${t.handle}\` | — NOT FOUND LIVE | — | — | — | — | — | — |`,
    )
    .join('\n');
  const chan = Object.entries(channelTally).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n}: ${v}`).join(' · ') || '(no publication data)';
  const cchan = Object.entries(collectionChannelTally).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n}: ${v}`).join(' · ') || '(no publication data)';
  const seg = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ');
  const grp = (arr) => (arr.length ? arr.map((x) => `\`${x.handle}\`${x.status === 'DRAFT' ? ' (DRAFT)' : ''}`).join(', ') : '—');
  return `# Phase 1 — Live Data Extension

> Generated ${analysis.generatedAt} from the authoritative LIVE export. Read-only; nothing modified.
> Interpreting publication: this is a **Hydrogen (headless)** storefront, so the "Online Store"
> channel is NOT necessarily the storefront's channel — read the channel tally first.

## Publication channels (products published, by channel)
${chan}

## Publication channels (collections published, by channel)
${cchan}

## Target collection verification

| Handle | Title | Products | On Online Store | SEO title | SEO desc | Body (chars) | Image |
|---|---|---|---|---|---|---|---|
${tv}

## "Not on Online Store" breakdown (${unpublishedBreakdown.total} products)

- By status: ${seg(unpublishedBreakdown.byStatus)}
- By segment: ${seg(unpublishedBreakdown.bySegment)}
- ACTIVE, published on another channel only (expected for headless): **${unpublishedBreakdown.activeHeadlessOnly}**
- ACTIVE, on NO channel at all (truly hidden — REVIEW): **${unpublishedBreakdown.activeOnNoChannel.length}**
${grp(unpublishedBreakdown.activeOnNoChannel)}

## Imageless products (${imagelessSummary.total})

- Wholesale (${imagelessGrouped.wholesale.length}): ${grp(imagelessGrouped.wholesale)}
- Premium/retail (${imagelessGrouped['premium-retail'].length}): ${grp(imagelessGrouped['premium-retail'])}
- Legacy/duplicate (${imagelessGrouped['legacy-duplicate'].length}): ${grp(imagelessGrouped['legacy-duplicate'])}
- Wedding (${imagelessGrouped.wedding.length}): ${grp(imagelessGrouped.wedding)}
- Other (${imagelessGrouped.other.length}): ${grp(imagelessGrouped.other)}

## Batch-1 field safety (seo-only update leaves everything else intact)

${batch1Safety
  .map(
    (b) =>
      `- \`${b.handle}\`: found=${b.found}, products=${b.products}, body chars=${b.bodyChars} (PRESERVED), image=${b.image}, on Online Store=${b.onlineStorePublished}. Current SEO title=${b.currentSeoTitle ? JSON.stringify(b.currentSeoTitle) : 'null'}, desc=${b.currentSeoDescription ? 'set' : 'null'}. Fields NOT touched: ${b.preserve.join(', ')}.`,
  )
  .join('\n')}

_Read-only. No Shopify operation performed._
`;
}

writeFileSync(join(OUT_DIR, 'live-vs-source-summary.md'), summaryMd());
writeFileSync(join(DOCS_DIR, 'shopify-live-content-audit.md'), auditMd());
writeFileSync(join(OUT_DIR, 'phase1-data-extension.md'), extensionMd());

// ---- console summary ------------------------------------------------------
console.log('─────────────────────────────────────────────');
console.log('  LIVE catalogue analysis complete (read-only)');
console.log('─────────────────────────────────────────────');
console.log(`  products ${productStats.total} · variants ${productStats.variants} · collections ${collStats.total}`);
console.log(`  product SEO title ${productStats.seoTitle}/${P} · desc ${productStats.seoDesc}/${P}`);
console.log(`  collection SEO title ${collStats.seoTitle}/${C} · desc ${collStats.seoDesc}/${C} · body ${collStats.body}/${C}`);
console.log(`  wedding products live ${weddingProducts.length} (visible ${weddingLiveVisible.length}) · collections ${weddingCollections.length}`);
console.log(`  confirmationRequired live ${confirmLiveMatched.length}/${srcConfirm.length}`);
console.log(`  dup SEO title(prod) ${dupProdSeoTitle.length} · dup SEO desc(prod) ${dupProdSeoDesc.length}`);
console.log(`  drift: live-only ${liveOnly.length} · source-only ${sourceOnly.length} · title ${seoTitleDrift} · desc ${seoDescDrift}`);
console.log(`  channels(products): ${Object.entries(channelTally).map(([n, v]) => `${n}=${v}`).join(' · ') || '(none)'}`);
console.log(`  not-on-Online-Store ${unpublishedBreakdown.total}: headless-only ${unpublishedBreakdown.activeHeadlessOnly} · truly-hidden ${unpublishedBreakdown.activeOnNoChannel.length} · drafts ${unpublishedBreakdown.byStatus.DRAFT || 0}`);
console.log(`  imageless ${imagelessSummary.total}: wholesale ${imagelessGrouped.wholesale.length} · premium ${imagelessGrouped['premium-retail'].length} · legacy ${imagelessGrouped['legacy-duplicate'].length} · other ${imagelessGrouped.other.length}`);
console.log('\n  wrote:');
console.log('    catalog/live-audit/analysis.json');
console.log('    catalog/live-audit/live-vs-source-summary.md');
console.log('    docs/seo/shopify-live-content-audit.md');
console.log('    catalog/live-audit/phase1-data-extension.md');
console.log('\n✓ No network calls. No Shopify operations. Nothing modified.');
