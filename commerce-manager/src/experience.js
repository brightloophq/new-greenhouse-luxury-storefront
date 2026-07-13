// src/experience.js — product → experience classification (custom.experience).
//
// Shared, side-effect-free logic used by the read-only audit + dry-run scripts
// and (after approval) the live apply script. Contains:
//   • PRODUCTS_QUERY + fetchAllProducts()  (read-only Admin GraphQL)
//   • classify(product)                     (deterministic rules → classic |
//                                            deluxe | both | needs-review)
//   • required-collection maps              (Step 6 collection-gap report)
//   • csv helpers
//
// Classification never uses price as a signal. The imported flower catalogue
// defaults to CLASSIC unless a product is clearly a finished premium arrangement
// or luxury gift. "both" is used sparingly. Wedding/Corporate are out of active
// scope and are surfaced as flags / needs-review, never silently placed.

/** Canonical metafield the classification writes to. */
export const METAFIELD = {
  namespace: 'custom',
  key: 'experience',
  name: 'Shopping Experience',
  ownerType: 'PRODUCT',
  type: 'single_line_text_field',
  choices: ['classic', 'deluxe', 'both'],
  description:
    'Which curated storefront experience surfaces this product. ' +
    'classic = wholesale flowers, greenery, fillers & florist supplies for the trade; ' +
    'deluxe = finished premium bouquets, luxury gifts & premium flowers for retail gifting; ' +
    'both = the same product is genuinely suitable for wholesale/professional and premium retail.',
};

// --- Collection taxonomy (handles) -----------------------------------------
const CLASSIC_COLLECTIONS = new Set([
  'bulk-flowers',
  'wholesale-roses',
  'wholesale-greenery',
  'greenery-and-fillers',
  'florist-essentials',
  'floral-supplies',
  'vases-and-containers',
  'ribbon',
  'wrapping-and-packaging',
  'tools-and-accessories',
]);
const DELUXE_COLLECTIONS = new Set([
  'luxury-bouquets',
  'signature-bouquets',
  'gift-baskets',
  'add-ons',
]);
const WEDDING_COLLECTIONS = new Set(['bridal-bouquets', 'centerpieces']);
const CORPORATE_COLLECTIONS = new Set(['corporate-gifting', 'corporate-gifts']);

// Product-type buckets (Shopify productType values seen in the catalogue).
const CLASSIC_TYPES = new Set([
  'Fresh Cut Flowers',
  'Fresh Flowers',
  'Floral Supply',
  'Greenery',
  'Floral Filler',
  'Plant',
]);
const DELUXE_TYPES = new Set([
  'Floral Arrangement',
  'Sympathy Arrangement',
  'Gift Basket',
  'Gift Add-on',
]);
const WEDDING_TYPES = new Set(['Wedding Flowers']);

// --- Required collections for the gap report (name → live handle) ----------
export const REQUIRED_CLASSIC_COLLECTIONS = [
  {name: 'Wholesale Flowers', handle: 'bulk-flowers'},
  {name: 'Floral Supplies', handle: 'floral-supplies'},
  {name: 'Greenery and Fillers', handle: 'greenery-and-fillers'},
  {name: 'Florist Essentials', handle: 'florist-essentials'},
];
export const REQUIRED_DELUXE_COLLECTIONS = [
  {name: 'Signature Bouquets', handle: 'luxury-bouquets'},
  {name: 'Luxury Gifts', handle: 'gift-baskets'},
  {name: 'Premium Flowers', handle: null, note: 'grouping of roses + orchids + lilies (no single collection)'},
  {name: 'Premium Roses', handle: 'roses'},
  {name: 'Premium Orchids', handle: 'orchids'},
  {name: 'Romance', handle: 'love-and-romance'},
  {name: 'Anniversary', handle: 'anniversary'},
  {name: 'Premium Birthday Gifts', handle: 'birthday'},
  {name: 'Curated Add-ons', handle: 'add-ons'},
  {name: 'Seasonal Deluxe', handle: 'seasonal-deluxe'},
];
export const WEDDING_CORPORATE_COLLECTIONS = [
  ...WEDDING_COLLECTIONS,
  ...CORPORATE_COLLECTIONS,
];

// --- Product query (read-only) ---------------------------------------------
export const PRODUCTS_QUERY = `#graphql
  query ExperienceAudit($after: String) {
    products(first: 100, after: $after, sortKey: TITLE) {
      nodes {
        id
        title
        handle
        status
        productType
        vendor
        tags
        mediaCount { count }
        variantsCount { count }
        resourcePublicationsCount { count }
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        featuredImage { url }
        collections(first: 40) { nodes { handle title } }
        experience: metafield(namespace: "custom", key: "experience") { value }
        channel: metafield(namespace: "custom", key: "channel") { value }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;

/** Fetch every product (read-only). `adminGraphQL` is injected to keep this
 * module free of client/transport concerns. */
export async function fetchAllProducts(adminGraphQL, {maxPages = 60} = {}) {
  const all = [];
  let after = null;
  for (let i = 0; i < maxPages; i++) {
    const d = await adminGraphQL(PRODUCTS_QUERY, {after});
    all.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  return all;
}

// --- Helpers ----------------------------------------------------------------
function tagValues(tags, prefix) {
  return (tags || [])
    .filter((t) => t.startsWith(`${prefix}:`))
    .map((t) => t.slice(prefix.length + 1));
}

/** Data-completeness flags (informational; do NOT drive experience choice). */
export function dataFlags(p) {
  const flags = [];
  if ((p.mediaCount?.count ?? 0) === 0) flags.push('no-image');
  if ((p.tags || []).includes('price-status:placeholder')) flags.push('placeholder-price');
  if (p.status && p.status !== 'ACTIVE') flags.push(`status-${p.status.toLowerCase()}`);
  if ((p.resourcePublicationsCount?.count ?? 0) === 0) flags.push('unpublished');
  return flags;
}

/** Scope flags for wedding/corporate collection membership (reported, Step 6). */
export function scopeFlags(p) {
  const cols = new Set((p.collections?.nodes || []).map((c) => c.handle));
  const flags = [];
  if ([...WEDDING_COLLECTIONS].some((h) => cols.has(h))) flags.push('in-wedding-collection');
  if ([...CORPORATE_COLLECTIONS].some((h) => cols.has(h))) flags.push('in-corporate-collection');
  return flags;
}

/**
 * Deterministic experience classification.
 * Returns {experience, reason, confidence, flags}.
 *   experience  : 'classic' | 'deluxe' | 'both' | 'needs-review'
 *   confidence  : 'high' | 'medium' | 'low'
 */
export function classify(p) {
  const type = p.productType || '';
  const formats = tagValues(p.tags, 'format');
  const supplies = tagValues(p.tags, 'supply');
  const channel = (p.channel?.value || '').toLowerCase(); // retail | wholesale | both | ''
  const cols = new Set((p.collections?.nodes || []).map((c) => c.handle));
  const flags = [...scopeFlags(p), ...dataFlags(p)];

  const has = (fmts) => fmts.some((f) => formats.includes(f));

  // Product nature from type + format + supply tags (price is never used).
  const isSupply = type === 'Floral Supply' || has(['supply']) || supplies.length > 0;
  const isGreenery = type === 'Greenery' || type === 'Floral Filler';
  const isPlant = type === 'Plant' || has(['plant']);
  const isBulkStem =
    type === 'Fresh Cut Flowers' || type === 'Fresh Flowers' || has(['bulk-box', 'stem', 'bunch']);
  const isArrangement =
    type === 'Floral Arrangement' ||
    type === 'Sympathy Arrangement' ||
    has(['bouquet', 'arrangement']);
  const isGift = type === 'Gift Basket' || type === 'Gift Add-on' || has(['gift', 'add-on']);
  const isWedding = WEDDING_TYPES.has(type);

  const classicNature = isSupply || isGreenery || isBulkStem || isPlant;
  const deluxeNature = isArrangement || isGift;

  // 1) Wedding = out of active scope → needs-review, never silently placed.
  if (isWedding) {
    return {
      experience: 'needs-review',
      reason: `Wedding product (type "${type || 'Wedding Flowers'}") — Weddings are excluded from active scope`,
      confidence: 'high',
      flags: [...new Set([...flags, 'wedding-scope-excluded'])],
    };
  }

  // 2) Finished premium (arrangement / gift) and NOT a bulk/supply item → Deluxe,
  //    with channel refining sparingly-used "both".
  if (deluxeNature && !classicNature) {
    if (channel === 'wholesale') {
      return {
        experience: 'needs-review',
        reason: `Finished ${isGift ? 'gift' : 'arrangement'} but tagged channel:wholesale — conflicting signals`,
        confidence: 'low',
        flags,
      };
    }
    if (channel === 'both') {
      return {
        experience: 'both',
        reason: `Finished ${isGift ? 'gift' : 'arrangement'} (type "${type}") tagged channel:both — genuinely retail-gift and wholesale-suitable`,
        confidence: 'medium',
        flags,
      };
    }
    return {
      experience: 'deluxe',
      reason: `Finished ${isGift ? 'gift' : 'arrangement'} (type "${type}"${formats.length ? `, format:${formats.join('/')}` : ''}) — premium retail gifting`,
      confidence: type ? 'high' : 'medium',
      flags,
    };
  }

  // 3) Bulk stems / greenery / fillers / supplies / plants → Classic (default).
  //    The imported flower catalogue defaults here regardless of price/channel.
  if (classicNature && !deluxeNature) {
    const kind = isSupply
      ? 'floral supply'
      : isGreenery
        ? 'greenery/filler'
        : isPlant
          ? 'plant'
          : 'bulk/wholesale stems';
    return {
      experience: 'classic',
      reason: `Wholesale/professional ${kind} (type "${type || 'n/a'}"${formats.length ? `, format:${formats.join('/')}` : ''})`,
      confidence: 'high',
      flags,
    };
  }

  // 4) Conflicting natures (both bulk AND arrangement signals).
  if (classicNature && deluxeNature) {
    return {
      experience: 'needs-review',
      reason: `Conflicting signals — both wholesale (${type}) and finished-arrangement indicators`,
      confidence: 'low',
      flags,
    };
  }

  // 5) No usable signal → fall back to collection membership, else needs-review.
  const inClassicCol = [...CLASSIC_COLLECTIONS].some((h) => cols.has(h));
  const inDeluxeCol = [...DELUXE_COLLECTIONS].some((h) => cols.has(h));
  if (inClassicCol && !inDeluxeCol) {
    return {experience: 'classic', reason: 'No type/format signal; member of wholesale/supply collection(s)', confidence: 'medium', flags};
  }
  if (inDeluxeCol && !inClassicCol) {
    return {experience: 'deluxe', reason: 'No type/format signal; member of premium/gifting collection(s)', confidence: 'medium', flags};
  }
  return {
    experience: 'needs-review',
    reason: 'Insufficient / ambiguous data to classify (no clear type, format, or collection signal)',
    confidence: 'low',
    flags,
  };
}

/** Classify a whole catalogue → array of enriched rows. */
export function classifyAll(products) {
  return products.map((p) => {
    const c = classify(p);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      status: p.status,
      productType: p.productType || '',
      vendor: p.vendor || '',
      tags: p.tags || [],
      collections: (p.collections?.nodes || []).map((n) => n.handle),
      channel: p.channel?.value || '',
      currentExperience: p.experience?.value || '',
      proposedExperience: c.experience,
      reason: c.reason,
      confidence: c.confidence,
      flags: c.flags,
      mediaCount: p.mediaCount?.count ?? 0,
      variantsCount: p.variantsCount?.count ?? 0,
      publishedOn: p.resourcePublicationsCount?.count ?? 0,
      priceRange: p.priceRangeV2
        ? {
            min: p.priceRangeV2.minVariantPrice?.amount,
            max: p.priceRangeV2.maxVariantPrice?.amount,
            currency: p.priceRangeV2.minVariantPrice?.currencyCode,
          }
        : null,
      featuredImage: p.featuredImage?.url || null,
    };
  });
}

/** Tally proposed classifications + useful cross-cuts. */
export function summarize(rows) {
  const counts = {classic: 0, deluxe: 0, both: 0, 'needs-review': 0};
  let withExisting = 0;
  let wouldChange = 0;
  const duplicates = {};
  const wedding = [];
  const corporate = [];
  const missingData = [];
  for (const r of rows) {
    counts[r.proposedExperience] = (counts[r.proposedExperience] || 0) + 1;
    if (r.currentExperience) withExisting++;
    if (r.currentExperience && r.currentExperience !== r.proposedExperience) wouldChange++;
    if (!r.currentExperience) wouldChange++; // absent → will be set
    duplicates[r.handle] = (duplicates[r.handle] || 0) + 1;
    if (r.flags.includes('in-wedding-collection') || r.flags.includes('wedding-scope-excluded')) wedding.push(r.handle);
    if (r.flags.includes('in-corporate-collection')) corporate.push(r.handle);
    if (r.flags.includes('no-image') || r.flags.includes('placeholder-price')) missingData.push(r.handle);
  }
  const dupHandles = Object.entries(duplicates).filter(([, n]) => n > 1).map(([h]) => h);
  return {
    total: rows.length,
    counts,
    withExisting,
    wouldChange,
    duplicateHandles: dupHandles,
    weddingAssociated: wedding,
    corporateAssociated: corporate,
    incompleteData: missingData,
  };
}

// --- CSV --------------------------------------------------------------------
export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = [
  'shopify_product_id',
  'handle',
  'title',
  'current_experience',
  'proposed_experience',
  'classification_reason',
  'confidence',
  'approved',
  'notes',
];

export function toCsvRow(r) {
  return [
    r.id,
    r.handle,
    r.title,
    r.currentExperience,
    r.proposedExperience,
    r.reason,
    r.confidence,
    'false',
    r.flags.join('|'),
  ]
    .map(csvEscape)
    .join(',');
}
