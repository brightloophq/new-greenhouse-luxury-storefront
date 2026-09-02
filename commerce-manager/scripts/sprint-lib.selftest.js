// sprint-lib.selftest.js — offline, deterministic tests for sprint-lib.js.
// No network, no Shopify, no filesystem writes. Exit 0 = all pass, 1 = any fail.
//
// Covers the Section-10 test matrix from the Phase-1 closure sprint task:
//   • exact canonical / retire / redirect allowlists (no drift, no invention)
//   • a canonical survivor can never be retired/redirected
//   • retail vs wholesale exclusion (bulk stems never enter a public retail occasion)
//   • wedding/event inventory excluded from public retail
//   • legitimate multi-occasion overlap is preserved (not treated as duplication)
//   • Gift Basket strict classification
//   • Tropical retail vs wholesale-stem classification
//   • SEO payload MUST carry both {title, description} — never title-only (Gate-1 incident)
//
// Usage (anywhere, offline):
//   node scripts/sprint-lib.selftest.js
//
import {
  CONSOLIDATION,
  RETIRE_HANDLES,
  CANONICAL_SURVIVORS,
  OCCASION_CANONICAL,
  REDIRECT_MATRIX,
  assertCanonicalSurvives,
  hasTag,
  isBulkBox,
  isWholesaleTagged,
  isRetailTagged,
  isWeddingProduct,
  isRetailOccasionMember,
  isAddOn,
  retailOccasionsFor,
  isTrueGiftBasket,
  isRetailTropical,
  isWholesaleTropicalStem,
  assertSeoInputComplete,
  assertRetireAllowed,
  assertSafeToRetire,
  chooseOccasionMechanism,
  minimalOccasionTagRemoval,
  assertRedirectMapComplete,
} from './sprint-lib.js';

let passed = 0;
let failed = 0;
const fails = [];
function ok(name, cond) {
  if (cond) {
    passed++;
  } else {
    failed++;
    fails.push(name);
    console.error(`  ✗ ${name}`);
  }
}
function throws(name, fn) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  ok(name, threw);
}
function noThrow(name, fn) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  ok(name, !threw);
}
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/* ---- product fixtures (secret-free, synthetic) ---------------------------------------- */
const retailBirthday = {handle: 'birthday-luxe', title: 'Birthday Luxe', productType: 'Floral Arrangement', tags: ['channel:retail', 'occasion:birthday']};
const retailMultiOccasion = {handle: 'rose-romance-anniv', title: 'Eternal Roses', productType: 'Floral Arrangement', tags: ['channel:retail', 'occasion:anniversary', 'occasion:romance']};
const bulkRoseStem = {handle: 'rose-red-bulk', title: 'Red Rose (Bulk Box)', productType: 'Fresh Cut Flowers', tags: ['channel:wholesale', 'format:bulk-box', 'occasion:romance']};
const wholesaleGreenery = {handle: 'eucalyptus-bunch', title: 'Eucalyptus', productType: 'Greenery', tags: ['channel:wholesale', 'occasion:birthday']};
const weddingArrangement = {handle: 'bridal-cascade', title: 'Bridal Cascade', productType: 'Floral Arrangement', tags: ['channel:retail', 'occasion:wedding', 'occasion:romance']};
const weddingByType = {handle: 'ceremony-arch', title: 'Ceremony Arch', productType: 'Wedding Flowers', tags: ['channel:retail', 'occasion:romance']};
const luxuryArrangementTagOnly = {handle: 'signature-noir', title: 'Signature Noir', productType: 'Custom', tags: ['channel:retail', 'type:luxury-arrangement', 'occasion:birthday']};
const giftBasketByType = {handle: 'gourmet-hamper', title: 'Gourmet Hamper', productType: 'Gift Basket', tags: ['channel:retail']};
const giftBasketByTag = {handle: 'spa-basket', title: 'Spa Basket', productType: 'Bundle', tags: ['channel:retail', 'format:gift-basket']};
const basketNameOnlyStem = {handle: 'basket-of-roses-bulk', title: 'Basket of Roses', productType: 'Fresh Cut Flowers', tags: ['channel:wholesale', 'format:bulk-box']};
const retailTropical = {handle: 'anthurium-arrangement', title: 'Anthurium Arrangement', productType: 'Floral Arrangement', tags: ['channel:retail', 'flower:anthurium']};
const wholesaleTropicalStem = {handle: 'heliconia-stems-bulk', title: 'Heliconia Stems', productType: 'Fresh Cut Flowers', tags: ['channel:wholesale', 'format:bulk-box', 'flower:tropicals']};
const teddyAddOn = {handle: 'teddy-bear', title: 'Teddy Bear Add-On', productType: 'Gift Add-on', tags: ['channel:retail', 'format:addon']};

/* ---- 1. allowlists are exactly what the audit approved --------------------------------- */
ok('CONSOLIDATION has exactly 6 retire→canonical pairs', Object.keys(CONSOLIDATION).length === 6);
ok('retire list = the 6 approved duplicate handles', sameSet(RETIRE_HANDLES, ['birthday-flowers', 'anniversary-flowers', 'love-romance', 'corporate-gifts', 'corporate-flowers', 'sympathy']));
ok('canonical survivors are the 4 approved destinations', sameSet(CANONICAL_SURVIVORS, ['birthday', 'anniversary', 'love-and-romance', 'corporate-gifting', 'sympathy-and-funeral'].filter((v, i, a) => a.indexOf(v) === i)));
ok('birthday-flowers → birthday', CONSOLIDATION['birthday-flowers'] === 'birthday');
ok('anniversary-flowers → anniversary', CONSOLIDATION['anniversary-flowers'] === 'anniversary');
ok('love-romance → love-and-romance', CONSOLIDATION['love-romance'] === 'love-and-romance');
ok('corporate-gifts → corporate-gifting', CONSOLIDATION['corporate-gifts'] === 'corporate-gifting');
ok('corporate-flowers → corporate-gifting', CONSOLIDATION['corporate-flowers'] === 'corporate-gifting');
ok('sympathy → sympathy-and-funeral', CONSOLIDATION['sympathy'] === 'sympathy-and-funeral');
ok('OCCASION_CANONICAL is the 3 retail occasion collections', sameSet(OCCASION_CANONICAL, ['birthday', 'anniversary', 'love-and-romance']));

/* ---- 2. redirect matrix mirrors consolidation, path-shaped ----------------------------- */
ok('redirect matrix has one entry per retired handle', Object.keys(REDIRECT_MATRIX).length === RETIRE_HANDLES.length);
ok('redirect /collections/love-romance → /collections/love-and-romance', REDIRECT_MATRIX['/collections/love-romance'] === '/collections/love-and-romance');
ok('redirect /collections/corporate-flowers → /collections/corporate-gifting', REDIRECT_MATRIX['/collections/corporate-flowers'] === '/collections/corporate-gifting');
ok('every redirect source is a retired collection path', Object.keys(REDIRECT_MATRIX).every((k) => k.startsWith('/collections/')));
ok('no redirect points back at a retired handle', Object.values(REDIRECT_MATRIX).every((dest) => !RETIRE_HANDLES.includes(dest.replace('/collections/', ''))));

/* ---- 3. a canonical survivor can never be retired ------------------------------------- */
noThrow('assertCanonicalSurvives ok for a pure canonical handle', () => assertCanonicalSurvives('birthday'));
noThrow('assertCanonicalSurvives ok for a pure retire handle', () => assertCanonicalSurvives('birthday-flowers'));
ok('no handle is both canonical and retired', CANONICAL_SURVIVORS.every((h) => !RETIRE_HANDLES.includes(h)));

/* ---- 4. retail occasion membership: retail finished products only ---------------------- */
ok('retail birthday arrangement IS a retail occasion member', isRetailOccasionMember(retailBirthday) === true);
ok('luxury-arrangement tag (no standard type) still qualifies', isRetailOccasionMember(luxuryArrangementTagOnly) === true);
ok('bulk rose stem is NOT a retail occasion member (bulk-box)', isRetailOccasionMember(bulkRoseStem) === false);
ok('wholesale greenery is NOT a retail occasion member', isRetailOccasionMember(wholesaleGreenery) === false);
ok('wedding arrangement is NOT a retail occasion member (wedding)', isRetailOccasionMember(weddingArrangement) === false);
ok('wedding-by-productType is NOT a retail occasion member', isRetailOccasionMember(weddingByType) === false);

/* ---- 5. wholesale cannot leak into a retail occasion; wedding excluded ----------------- */
ok('bulk rose stem carries occasion:romance yet yields NO retail occasions', retailOccasionsFor(bulkRoseStem).length === 0);
ok('wholesale greenery carries occasion:birthday yet yields NO retail occasions', retailOccasionsFor(wholesaleGreenery).length === 0);
ok('wedding arrangement carries occasion:romance yet yields NO retail occasions', retailOccasionsFor(weddingArrangement).length === 0);
ok('isWeddingProduct true for occasion:wedding tag', isWeddingProduct(weddingArrangement) === true);
ok('isWeddingProduct true for Wedding Flowers productType', isWeddingProduct(weddingByType) === true);
ok('isWeddingProduct false for a plain birthday arrangement', isWeddingProduct(retailBirthday) === false);

/* ---- 6. legitimate multi-occasion overlap is preserved -------------------------------- */
ok('multi-occasion retail piece belongs to anniversary AND love-and-romance', sameSet(retailOccasionsFor(retailMultiOccasion), ['anniversary', 'love-and-romance']));
ok('single-occasion retail piece belongs to birthday only', sameSet(retailOccasionsFor(retailBirthday), ['birthday']));

/* ---- 7. Gift Basket strict ------------------------------------------------------------ */
ok('Gift Basket productType classifies as a true gift basket', isTrueGiftBasket(giftBasketByType) === true);
ok('format:gift-basket tag classifies as a true gift basket', isTrueGiftBasket(giftBasketByTag) === true);
ok('a bulk stem named "Basket of Roses" is NOT a gift basket', isTrueGiftBasket(basketNameOnlyStem) === false);
ok('a floral arrangement is NOT a gift basket', isTrueGiftBasket(retailBirthday) === false);

/* ---- 8. Tropical retail vs wholesale stem --------------------------------------------- */
ok('anthurium arrangement (retail) is a retail tropical', isRetailTropical(retailTropical) === true);
ok('heliconia bulk stems are NOT a retail tropical', isRetailTropical(wholesaleTropicalStem) === false);
ok('heliconia bulk stems ARE a wholesale tropical stem', isWholesaleTropicalStem(wholesaleTropicalStem) === true);
ok('anthurium retail arrangement is NOT a wholesale tropical stem', isWholesaleTropicalStem(retailTropical) === false);

/* ---- 9. add-ons flagged, not silently placed ------------------------------------------ */
ok('teddy add-on detected as add-on', isAddOn(teddyAddOn) === true);
ok('teddy add-on is NOT a retail occasion member', isRetailOccasionMember(teddyAddOn) === false);
ok('floral arrangement is not an add-on', isAddOn(retailBirthday) === false);

/* ---- 10. SEO payload guard — NEVER title-only (Gate-1 incident regression) ------------- */
noThrow('valid {title, description} passes', () => assertSeoInputComplete({title: 'A', description: 'B'}));
throws('title-only payload is REJECTED', () => assertSeoInputComplete({title: 'A'}));
throws('description-only payload is REJECTED', () => assertSeoInputComplete({description: 'B'}));
throws('null description is REJECTED', () => assertSeoInputComplete({title: 'A', description: null}));
throws('null title is REJECTED', () => assertSeoInputComplete({title: null, description: 'B'}));
throws('extra keys are REJECTED', () => assertSeoInputComplete({title: 'A', description: 'B', foo: 1}));
throws('empty object is REJECTED', () => assertSeoInputComplete({}));
throws('non-object is REJECTED', () => assertSeoInputComplete(null));

/* ---- 11. Batch B retirement guards ---------------------------------------------------- */
noThrow('assertRetireAllowed ok for a retire handle', () => assertRetireAllowed('birthday-flowers'));
throws('assertRetireAllowed rejects a canonical', () => assertRetireAllowed('birthday'));
throws('assertRetireAllowed rejects an unknown handle', () => assertRetireAllowed('roses'));
const safeEntry = {retire: 'birthday-flowers', canonical: 'birthday', retireFound: true, canonicalFound: true, productsOnlyInRetire: [], safeToRetire: true};
noThrow('assertSafeToRetire ok for a provably-safe entry', () => assertSafeToRetire(safeEntry));
throws('assertSafeToRetire rejects wrong canonical', () => assertSafeToRetire({...safeEntry, canonical: 'anniversary'}));
throws('assertSafeToRetire rejects missing canonical', () => assertSafeToRetire({...safeEntry, canonicalFound: false}));
throws('assertSafeToRetire rejects onlyInRetire > 0', () => assertSafeToRetire({...safeEntry, productsOnlyInRetire: ['x']}));
throws('assertSafeToRetire rejects safeToRetire=false', () => assertSafeToRetire({...safeEntry, safeToRetire: false}));

/* ---- 12. Batch E mechanism selection -------------------------------------------------- */
const singleTagRule = {appliedDisjunctively: false, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'occasion:birthday'}]};
const wholesaleOnly = [{handle: 'a', wedding: false, addOn: false, notRetailMember: true}, {handle: 'b', wedding: false, addOn: false, notRetailMember: true}];
const mixedReasons = [{handle: 'a', wedding: true, addOn: false, notRetailMember: true}, {handle: 'b', wedding: false, addOn: true, notRetailMember: false}];
ok('rule-tighten chosen when every removal is wholesale-only + single tag rule', chooseOccasionMechanism(singleTagRule, wholesaleOnly).mechanism === 'rule-tighten');
ok('rule-tighten adds channel:retail AND-clause, 0 tag mutations', chooseOccasionMechanism(singleTagRule, wholesaleOnly).blastRadius.productTagMutations === 0);
ok('tag-correct chosen when reasons are mixed (wedding/add-on retail items)', chooseOccasionMechanism(singleTagRule, mixedReasons).mechanism === 'tag-correct');
ok('no removals → mechanism none', chooseOccasionMechanism(singleTagRule, []).mechanism === 'none');
ok('manual collection (no ruleSet) → manual mechanism', chooseOccasionMechanism(null, wholesaleOnly).mechanism === 'manual');
ok('rule already has channel:retail → not rule-tighten again', chooseOccasionMechanism({appliedDisjunctively: false, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'occasion:birthday'}, {column: 'TAG', relation: 'EQUALS', condition: 'channel:retail'}]}, wholesaleOnly).mechanism === 'tag-correct');
ok('disjunctive (OR) rule is not safe to tighten with AND → tag-correct', chooseOccasionMechanism({appliedDisjunctively: true, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'occasion:birthday'}]}, wholesaleOnly).mechanism === 'tag-correct');

/* ---- 13. minimal tag removal preserves unrelated tags --------------------------------- */
const mt = minimalOccasionTagRemoval(['occasion:birthday', 'channel:wholesale', 'flower:rose'], 'occasion:birthday');
ok('minimal removal drops only the occasion tag', sameSet(mt.after, ['channel:wholesale', 'flower:rose']));
ok('minimal removal records what was removed', sameSet(mt.removed, ['occasion:birthday']));
ok('minimal removal preserves every unrelated tag', mt.unrelatedPreserved === true);
ok('minimal removal is case-insensitive on the target', minimalOccasionTagRemoval(['Occasion:Birthday', 'flower:rose'], 'occasion:birthday').after.length === 1);
ok('minimal removal no-ops when tag absent', minimalOccasionTagRemoval(['flower:rose'], 'occasion:birthday').removed.length === 0);

/* ---- 14. redirect map completeness ---------------------------------------------------- */
noThrow('assertRedirectMapComplete ok for the exact 6-handle map', () => assertRedirectMapComplete({'birthday-flowers': '/collections/birthday', 'anniversary-flowers': '/collections/anniversary', 'love-romance': '/collections/love-and-romance', 'corporate-gifts': '/collections/corporate-gifting', 'corporate-flowers': '/collections/corporate-gifting', sympathy: '/collections/sympathy-and-funeral'}));
throws('assertRedirectMapComplete rejects a missing handle', () => assertRedirectMapComplete({'birthday-flowers': '/collections/birthday'}));
throws('assertRedirectMapComplete rejects a wrong target', () => assertRedirectMapComplete({'birthday-flowers': '/collections/anniversary', 'anniversary-flowers': '/collections/anniversary', 'love-romance': '/collections/love-and-romance', 'corporate-gifts': '/collections/corporate-gifting', 'corporate-flowers': '/collections/corporate-gifting', sympathy: '/collections/sympathy-and-funeral'}));

/* ---- summary -------------------------------------------------------------------------- */
console.log(`\nsprint-lib.selftest: ${passed} passed, ${failed} failed`);
if (failed) {
  console.error('FAILURES:\n  - ' + fails.join('\n  - '));
  process.exit(1);
}
console.log('✓ all sprint-lib checks passed (offline, no Shopify, no mutation)');
