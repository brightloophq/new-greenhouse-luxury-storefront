// sprint-lib.js — pure, deterministic decision logic for the Phase-1 closure sprint.
// No I/O, no network, no mutation. Imported by the read-only preflight and (later) by the
// data-driven write batches, and covered by sprint-lib.selftest.js. All facts here come from
// the approved Phase-1 audit; nothing is invented.

/* ---- canonical / retire / redirect maps (from the approved audit) --------------------- */
export const CONSOLIDATION = Object.freeze({
  'birthday-flowers': 'birthday',
  'anniversary-flowers': 'anniversary',
  'love-romance': 'love-and-romance',
  'corporate-gifts': 'corporate-gifting',
  'corporate-flowers': 'corporate-gifting',
  sympathy: 'sympathy-and-funeral',
});
export const RETIRE_HANDLES = Object.freeze(Object.keys(CONSOLIDATION));
export const CANONICAL_SURVIVORS = Object.freeze([...new Set(Object.values(CONSOLIDATION))]);
export const OCCASION_CANONICAL = Object.freeze(['birthday', 'anniversary', 'love-and-romance']);

/** Retired public collection handle → canonical destination path (301). */
export const REDIRECT_MATRIX = Object.freeze(
  Object.fromEntries(RETIRE_HANDLES.map((h) => [`/collections/${h}`, `/collections/${CONSOLIDATION[h]}`])),
);

/** A canonical survivor must never be retired/redirected. */
export function assertCanonicalSurvives(handle) {
  if (CANONICAL_SURVIVORS.includes(handle) && RETIRE_HANDLES.includes(handle)) {
    throw new Error(`SAFETY: ${handle} is both canonical and retire — refuse.`);
  }
  return true;
}

/* ---- retail vs wholesale signals (tags/type) ------------------------------------------ */
const lc = (s) => String(s ?? '').toLowerCase();
const tags = (p) => (p.tags || []).map(lc);
export const hasTag = (p, t) => tags(p).includes(lc(t));
export const isBulkBox = (p) => tags(p).some((t) => t === 'format:bulk-box');
export const isWholesaleTagged = (p) => hasTag(p, 'channel:wholesale');
export const isRetailTagged = (p) => hasTag(p, 'channel:retail');
export const isWeddingProduct = (p) => /wedding|bridal/i.test(p.productType || '') || tags(p).some((t) => /occasion:wedding|type:wedding/.test(t));
// Finished retail products that legitimately headline an occasion collection.
// Deliberately EXCLUDES "gift add-on": add-ons are cross-sells, handled by isAddOn and
// reported for manual review — never auto-placed into a public occasion collection.
const RETAIL_TYPES = new Set(['floral arrangement', 'gift basket']);

/** Add-ons (e.g. teddy bear) are OPTIONAL — reported, never silently included/excluded. */
export function isAddOn(p) {
  return lc(p.productType) === 'gift add-on' || tags(p).some((t) => t === 'format:addon' || t === 'type:gift-add-on');
}

/**
 * A product BELONGS in a public retail occasion collection when it is a finished retail
 * product (retail channel, not a bulk-box stem, not wedding/event inventory, not an add-on).
 * Wholesale bulk stems, greenery, fillers, wedding items and cross-sell add-ons are excluded.
 */
export function isRetailOccasionMember(p) {
  if (isWeddingProduct(p)) return false; // wedding/event never leaks into public retail
  if (isBulkBox(p)) return false; // wholesale bulk box
  if (isAddOn(p)) return false; // add-ons are optional cross-sells, reported not auto-placed
  if (!isRetailTagged(p)) return false; // must be a retail-channel product
  // finished retail product type OR an explicit luxury-arrangement tag
  return RETAIL_TYPES.has(lc(p.productType)) || tags(p).some((t) => t === 'type:luxury-arrangement');
}

/** Which occasion collections a retail product legitimately belongs to (overlap allowed). */
export function retailOccasionsFor(p) {
  if (!isRetailOccasionMember(p)) return [];
  const map = {birthday: 'occasion:birthday', anniversary: 'occasion:anniversary', 'love-and-romance': 'occasion:romance'};
  return OCCASION_CANONICAL.filter((c) => hasTag(p, map[c]));
}

/* ---- Gift Baskets: strict ------------------------------------------------------------- */
export function isTrueGiftBasket(p) {
  return lc(p.productType) === 'gift basket' || tags(p).some((t) => t === 'format:gift-basket' || t === 'type:gift-basket');
}

/* ---- Tropical Flowers: retail-only ---------------------------------------------------- */
export function isRetailTropical(p) {
  const tropical = tags(p).some((t) => t === 'flower:tropicals' || /^flower:(anthurium|heliconia|ginger|bird-of-paradise|protea)/.test(t)) || /tropical/i.test(p.title || '');
  return tropical && isRetailTagged(p) && !isBulkBox(p) && (RETAIL_TYPES.has(lc(p.productType)) || tags(p).some((t) => t === 'type:luxury-arrangement'));
}
export function isWholesaleTropicalStem(p) {
  const tropical = tags(p).some((t) => t === 'flower:tropicals') || /tropical|anthurium|heliconia|ginger|bird-of-paradise|protea/i.test(`${p.handle} ${p.title}`);
  return tropical && (isBulkBox(p) || (isWholesaleTagged(p) && !isRetailTagged(p)) || /fresh (cut )?flowers/i.test(p.productType || ''));
}

/* ---- SEO payload guard (post-incident: never title-only SEOInput) --------------------- */
/** A collection/product SEO write MUST include both companion fields. Throws otherwise. */
export function assertSeoInputComplete(seo) {
  if (!seo || typeof seo !== 'object') throw new Error('SEO payload missing');
  const keys = Object.keys(seo).sort().join(',');
  if (keys !== 'description,title') throw new Error(`SEO payload must be exactly {title, description} — got ${keys}`);
  if (seo.title == null || seo.description == null) throw new Error('SEO payload: title and description must both be non-null (never title-only)');
  return true;
}
