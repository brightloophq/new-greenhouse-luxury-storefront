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

/* ---- Batch B: retirement guards (reversible unpublish, never delete) ------------------ */
/** A handle may be retired only if it is on the frozen retire allowlist. */
export function assertRetireAllowed(handle) {
  if (!RETIRE_HANDLES.includes(handle)) throw new Error(`RETIRE DENIED: "${handle}" is not on the Phase-1 retire allowlist`);
  assertCanonicalSurvives(handle);
  return true;
}
/**
 * Fail-closed precondition for retiring one duplicate collection, evaluated against the
 * fresh preflight `consolidation` entry. Throws unless it is provably safe & reversible.
 */
export function assertSafeToRetire(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('retire precondition: missing consolidation entry');
  assertRetireAllowed(entry.retire);
  if (CONSOLIDATION[entry.retire] !== entry.canonical) throw new Error(`retire precondition: ${entry.retire} canonical must be ${CONSOLIDATION[entry.retire]}, got ${entry.canonical}`);
  if (!entry.retireFound) throw new Error(`retire precondition: retire collection ${entry.retire} not found live`);
  if (!entry.canonicalFound) throw new Error(`retire precondition: canonical ${entry.canonical} not found live — refuse to orphan`);
  if (!Array.isArray(entry.productsOnlyInRetire) || entry.productsOnlyInRetire.length !== 0)
    throw new Error(`retire precondition: ${entry.retire} has ${entry.productsOnlyInRetire?.length} product(s) only-in-retire — re-home before retiring`);
  if (entry.safeToRetire !== true) throw new Error(`retire precondition: ${entry.retire} safeToRetire is not true`);
  return true;
}

/* ---- Batch B: publication-target planning (Hydrogen-aware, POS-protected) ------------- */
// The PUBLIC storefront for this project is the Hydrogen channel published under this name.
export const HYDROGEN_PUBLICATION = 'New Greenhouse Luxury Storefront';
export const ONLINE_STORE_PUBLICATION = 'Online Store';
export const POINT_OF_SALE_PUBLICATION = 'Point of Sale';
// Public web publications a retirement removes the collection from.
export const PUBLIC_STOREFRONT_PUBLICATIONS = Object.freeze([HYDROGEN_PUBLICATION, ONLINE_STORE_PUBLICATION]);
// Publications retirement must NEVER touch without explicit business justification.
export const PROTECTED_PUBLICATIONS = Object.freeze([POINT_OF_SALE_PUBLICATION]);

/** Classify a publication by name: 'hydrogen' | 'online-store' | 'protected' | 'unknown'. */
export function classifyPublication(name) {
  const n = lc(name);
  if (n === lc(HYDROGEN_PUBLICATION)) return 'hydrogen';
  if (n === lc(ONLINE_STORE_PUBLICATION)) return 'online-store';
  if (PROTECTED_PUBLICATIONS.some((p) => lc(p) === n)) return 'protected';
  return 'unknown';
}

/**
 * Build the exact retirement unpublish plan for ONE collection from the channels it is
 * CURRENTLY published to. Pure — no I/O.
 * @param currentPublished array of {id, name} the collection is currently published to.
 * @returns {unpublishFrom, leaveUntouched, unknown, hydrogenPresent, onlineStorePresent, safe}
 *   • unpublishFrom   — public web publications to remove (Hydrogen + Online Store where present)
 *   • leaveUntouched  — protected publications (POS) left as-is
 *   • unknown         — publications we do not recognize → require a human decision (unsafe)
 */
export function buildRetirementPublicationPlan(currentPublished) {
  const cur = Array.isArray(currentPublished) ? currentPublished : [];
  const unpublishFrom = [];
  const leaveUntouched = [];
  const unknown = [];
  for (const p of cur) {
    const kind = classifyPublication(p.name);
    if (kind === 'hydrogen' || kind === 'online-store') unpublishFrom.push({...p, kind});
    else if (kind === 'protected') leaveUntouched.push({...p, kind});
    else unknown.push({...p, kind});
  }
  const hydrogenPresent = unpublishFrom.some((p) => p.kind === 'hydrogen');
  const onlineStorePresent = unpublishFrom.some((p) => p.kind === 'online-store');
  return {unpublishFrom, leaveUntouched, unknown, hydrogenPresent, onlineStorePresent, safe: unknown.length === 0};
}

/**
 * Fail-closed assertion for a single collection's retirement publication plan.
 * Throws unless: no unknown publication is present; the collection is actually exposed on at
 * least one public web publication (so retirement is meaningful); and — because Hydrogen is
 * THE public storefront — the Hydrogen publication is among the channels being removed.
 */
export function assertRetirementPlanSafe(handle, plan) {
  if (plan.unknown.length) throw new Error(`RETIRE ${handle}: unknown publication(s) [${plan.unknown.map((p) => p.name).join(', ')}] — human decision required, refuse`);
  if (plan.unpublishFrom.length === 0) throw new Error(`RETIRE ${handle}: not published to any public web publication — nothing to retire; investigate`);
  if (!plan.hydrogenPresent) throw new Error(`RETIRE ${handle}: not published to the Hydrogen storefront ("${HYDROGEN_PUBLICATION}") — an Online-Store-only action would NOT retire it publicly; refuse`);
  return true;
}

/** The canonical destination must remain live on the Hydrogen storefront. */
export function assertCanonicalPublic(canonicalHandle, publishedNames) {
  const names = (publishedNames || []).map(lc);
  if (!names.includes(lc(HYDROGEN_PUBLICATION)))
    throw new Error(`CANONICAL ${canonicalHandle}: not published to the Hydrogen storefront ("${HYDROGEN_PUBLICATION}") — refuse to retire its duplicate`);
  return true;
}

/* ---- Batch E: smallest-safe occasion mechanism (pure decision) ------------------------ */
/**
 * Decide the smallest, safest mechanism to correct a SMART occasion collection's membership.
 * Input: the collection's live ruleSet, and the toRemove entries (each with reason flags
 * {handle, wedding, addOn, notRetailMember}). Returns a recommendation — never mutates.
 *
 * Preference order (smallest blast radius first):
 *   1. rule-tighten  — one rule mutation excludes ALL removals (only when every removal is
 *      excluded purely because it is not channel:retail, and the rule is a single tag-equals
 *      that a `+ channel:retail` AND-clause safely narrows). Touches 0 product tags.
 *   2. tag-correct   — per-product minimal tag removal (used when reasons are mixed:
 *      retail-tagged wedding/add-on items a channel rule cannot exclude).
 */
export function chooseOccasionMechanism(ruleSet, toRemove) {
  const removals = Array.isArray(toRemove) ? toRemove : [];
  if (removals.length === 0) return {mechanism: 'none', reason: 'no removals required'};
  const isSmart = !!(ruleSet && Array.isArray(ruleSet.rules) && ruleSet.rules.length);
  if (!isSmart) return {mechanism: 'manual', reason: 'collection is manual — use collectionRemoveProducts on exact handles', handles: removals.map((r) => r.handle)};

  const everyRemovalIsWholesaleOnly = removals.every((r) => r.notRetailMember === true && r.wedding !== true && r.addOn !== true);
  const singleTagEquals = ruleSet.rules.length === 1 && lc(ruleSet.rules[0].column) === 'tag';
  const alreadyHasChannelRetail = ruleSet.rules.some((r) => lc(r.column) === 'tag' && lc(r.condition) === 'channel:retail');
  if (everyRemovalIsWholesaleOnly && singleTagEquals && !alreadyHasChannelRetail && ruleSet.appliedDisjunctively !== true) {
    return {
      mechanism: 'rule-tighten',
      reason: 'every removal is excluded solely by not being channel:retail; one AND-clause narrows the rule and touches no product tag',
      addRule: {column: 'TAG', relation: 'EQUALS', condition: 'channel:retail'},
      blastRadius: {ruleMutations: 1, productTagMutations: 0},
    };
  }
  // mixed reasons (retail-tagged wedding/add-on, or a compound/OR rule) → per-product tag correction
  return {
    mechanism: 'tag-correct',
    reason: 'removals have mixed reasons (wedding/add-on retail items or a compound rule) — a single channel rule cannot exclude them all; remove only the minimum classification tag per product',
    blastRadius: {ruleMutations: 0, productTagMutations: removals.length},
    handles: removals.map((r) => r.handle),
  };
}

/**
 * Compute the minimal tag delta to drop a product from a smart occasion collection whose
 * rule keys on `occasionTag`, WITHOUT touching any unrelated tag. Returns {before, after,
 * removed}. Only the single matching occasion tag is removed; everything else is preserved.
 */
export function minimalOccasionTagRemoval(currentTags, occasionTag) {
  const before = Array.isArray(currentTags) ? [...currentTags] : [];
  const target = lc(occasionTag);
  const after = before.filter((t) => lc(t) !== target);
  const removed = before.filter((t) => lc(t) === target);
  return {before, after, removed, unrelatedPreserved: before.length - removed.length === after.length};
}

/* ---- Batch E: cumulative per-product removal (cross-collection overlap safe) ---------- */
// The ONLY tag values Batch E may remove — and only for a product/tag pair that appears in the
// freshly-validated intended-removal plan. Nothing else may ever be added/removed/renamed.
export const REMOVABLE_OCCASION_TAGS = Object.freeze(['occasion:birthday', 'occasion:anniversary', 'occasion:romance']);

/**
 * Collapse the three occasion collections' independent removal sets into ONE cumulative plan
 * per UNIQUE product, so a product targeted by two collections receives a single combined
 * update (never two stale before/after writes). Pure — no I/O.
 *
 * @param perCollection [{handle, occasionTag, toRemove:[productHandle,...]}, ...]
 * @returns array of {handle, removeTags:[sorted occasion tags], fromCollections:[collHandles]}
 *          deduped by product; removeTags is a set (a duplicate removal request collapses).
 * @throws if a collection's occasionTag is not on REMOVABLE_OCCASION_TAGS.
 */
export function buildCumulativeOccasionRemovalPlan(perCollection) {
  const byProduct = new Map();
  for (const c of perCollection || []) {
    const tag = lc(c.occasionTag);
    if (!REMOVABLE_OCCASION_TAGS.includes(tag)) throw new Error(`Batch E: "${c.occasionTag}" is not a removable occasion tag (allowlist: ${REMOVABLE_OCCASION_TAGS.join(', ')})`);
    for (const h of c.toRemove || []) {
      if (!byProduct.has(h)) byProduct.set(h, {handle: h, removeTags: new Set(), fromCollections: []});
      const e = byProduct.get(h);
      e.removeTags.add(tag);
      if (!e.fromCollections.includes(c.handle)) e.fromCollections.push(c.handle);
    }
  }
  return [...byProduct.values()]
    .map((e) => ({handle: e.handle, removeTags: [...e.removeTags].sort(), fromCollections: e.fromCollections.slice()}))
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

/** Products in the cumulative plan targeted by more than one collection. */
export function overlapProducts(cumulativePlan) {
  return (cumulativePlan || []).filter((p) => p.fromCollections.length > 1);
}

/**
 * Compute the ONE final tag array for a product from its FRESH current tags and the approved
 * occasion tags to remove. Enforces the allowlist and preserves every unrelated tag exactly.
 * @throws if any approved tag is outside REMOVABLE_OCCASION_TAGS.
 * @returns {before, after, removed, missing, unrelatedPreserved}
 *   • removed  — approved tags actually present and dropped
 *   • missing  — approved tags NOT currently present (precondition drift — caller must STOP)
 */
export function applyCumulativeRemoval(currentTags, approvedRemoveTags) {
  const approved = (approvedRemoveTags || []).map(lc);
  for (const t of approved) if (!REMOVABLE_OCCASION_TAGS.includes(t)) throw new Error(`Batch E: illegal removal tag "${t}" — not on allowlist`);
  const approvedSet = new Set(approved);
  const before = Array.isArray(currentTags) ? [...currentTags] : [];
  const after = before.filter((t) => !approvedSet.has(lc(t)));
  const removed = before.filter((t) => approvedSet.has(lc(t)));
  const presentLc = new Set(before.map(lc));
  const missing = approved.filter((t) => !presentLc.has(t));
  // every tag that is NOT an approved-and-present removal must survive, unchanged and in order
  const expectedSurvivors = before.filter((t) => !approvedSet.has(lc(t)));
  const unrelatedPreserved = after.length === expectedSurvivors.length && after.every((t, i) => t === expectedSurvivors[i]);
  return {before, after, removed, missing, unrelatedPreserved};
}

/* ---- Phase-1 closure orchestrator: Stage-0 precondition guard (pure) ------------------ */
// Confirmed state before the remaining Shopify-side work (F2, G, H). Batches B/E/F1 are done.
export const PHASE1_EXPECTED = Object.freeze({
  occasion: Object.freeze({birthday: 16, anniversary: 9, 'love-and-romance': 17}),
  giftBaskets: Object.freeze({count: 1, member: 'fruit-flower-gift-basket'}),
  catalogue: Object.freeze({products: 274, collections: 52}),
  tropical: Object.freeze({handle: 'tropical-flowers', intended: 3}),
});

/**
 * Fail-closed Stage-0 guard evaluated against a FRESH preflight state. Confirms the catalogue,
 * scopes, and the already-completed batches (E occasion counts + no residual removals, F1
 * gift-baskets=1 with the exact member) have not drifted before any remaining mutation. Pure.
 * @throws with an itemized message if anything drifted.
 */
export function assertPhase1Preconditions(state) {
  const errs = [];
  if (!state || typeof state !== 'object') throw new Error('PHASE-1 PRECONDITION: state missing');
  if (!state.store) errs.push('store/domain target missing from evidence');
  // catalogue counts
  if (state.counts?.products !== PHASE1_EXPECTED.catalogue.products) errs.push(`products ${state.counts?.products} != ${PHASE1_EXPECTED.catalogue.products}`);
  if (state.counts?.collections !== PHASE1_EXPECTED.catalogue.collections) errs.push(`collections ${state.counts?.collections} != ${PHASE1_EXPECTED.catalogue.collections}`);
  // required scope for F2/G writes
  if (!(state.scopes?.all || []).includes('write_products')) errs.push('missing required scope write_products');
  // Batch E: occasion canonicals settled at intended counts, no residual removals
  for (const [h, exp] of Object.entries(PHASE1_EXPECTED.occasion)) {
    const occ = state.occasion?.[h];
    if (!occ) { errs.push(`occasion ${h} missing from evidence`); continue; }
    if (occ.liveMemberCount !== exp) errs.push(`occasion ${h} live ${occ.liveMemberCount} != ${exp} (Batch E drift)`);
    if ((occ.toRemove || []).length !== 0) errs.push(`occasion ${h} still has ${occ.toRemove.length} pending removal(s) (Batch E not settled)`);
  }
  // Batch F1: gift-baskets exactly one member = fruit-flower-gift-basket
  const gb = state.collections?.['gift-baskets'];
  if (!gb?.found) errs.push('gift-baskets collection missing from evidence');
  else {
    if (gb.productsCount !== PHASE1_EXPECTED.giftBaskets.count) errs.push(`gift-baskets count ${gb.productsCount} != ${PHASE1_EXPECTED.giftBaskets.count}`);
    const members = gb.liveMembers || [];
    if (!members.includes(PHASE1_EXPECTED.giftBaskets.member)) errs.push(`gift-baskets missing member ${PHASE1_EXPECTED.giftBaskets.member}`);
    if (members.length !== 1) errs.push(`gift-baskets has ${members.length} members != 1`);
  }
  if (errs.length) throw new Error('PHASE-1 PRECONDITION DRIFT — STOP before first mutation:\n    - ' + errs.join('\n    - '));
  return true;
}

/* ---- redirect map shape guard (code-level, since write_url_redirects is not granted) --- */
/** The storefront redirect map must be exactly the 6 retired handles → canonical paths. */
export function assertRedirectMapComplete(map) {
  const keys = Object.keys(map).sort();
  const expect = RETIRE_HANDLES.map((h) => h).sort();
  if (keys.join(',') !== expect.join(',')) throw new Error(`redirect map handles must be exactly the 6 retired handles — got ${keys.join(',')}`);
  for (const h of RETIRE_HANDLES) {
    const want = `/collections/${CONSOLIDATION[h]}`;
    if (map[h] !== want) throw new Error(`redirect ${h} must target ${want} — got ${map[h]}`);
  }
  return true;
}
