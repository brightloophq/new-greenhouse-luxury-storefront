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
  classifyPublication,
  buildRetirementPublicationPlan,
  assertRetirementPlanSafe,
  assertCanonicalPublic,
  HYDROGEN_PUBLICATION,
  buildCumulativeOccasionRemovalPlan,
  overlapProducts,
  applyCumulativeRemoval,
  REMOVABLE_OCCASION_TAGS,
  seoCompanionStatus,
  seoCompanionOk,
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

/* ---- 15. Batch B publication targeting (Hydrogen-aware, POS-protected) ----------------- */
ok('classifyPublication: Hydrogen storefront', classifyPublication(HYDROGEN_PUBLICATION) === 'hydrogen');
ok('classifyPublication: Online Store', classifyPublication('Online Store') === 'online-store');
ok('classifyPublication: Point of Sale is protected', classifyPublication('Point of Sale') === 'protected');
ok('classifyPublication: unknown channel', classifyPublication('Some Marketplace') === 'unknown');

const pub = (name) => ({id: `gid://pub/${name}`, name});
const multi = [pub('Online Store'), pub('Point of Sale'), pub(HYDROGEN_PUBLICATION)];
const hydroOnly = [pub(HYDROGEN_PUBLICATION)];
const onlineOnly = [pub('Online Store')];
const withUnknown = [pub(HYDROGEN_PUBLICATION), pub('Mystery Channel')];

const planMulti = buildRetirementPublicationPlan(multi);
ok('plan(multi): unpublishes from Hydrogen + Online Store', planMulti.unpublishFrom.map((x) => x.name).sort().join('|') === ['New Greenhouse Luxury Storefront', 'Online Store'].sort().join('|'));
ok('plan(multi): leaves Point of Sale untouched', planMulti.leaveUntouched.length === 1 && planMulti.leaveUntouched[0].name === 'Point of Sale');
ok('plan(multi): Hydrogen present', planMulti.hydrogenPresent === true);
ok('plan(multi): safe (no unknown)', planMulti.safe === true);
ok('plan(multi): POS never in unpublish list', !planMulti.unpublishFrom.some((x) => x.name === 'Point of Sale'));

const planHydro = buildRetirementPublicationPlan(hydroOnly);
ok('plan(corporate-gifts case): unpublishes from Hydrogen', planHydro.unpublishFrom.length === 1 && planHydro.unpublishFrom[0].name === HYDROGEN_PUBLICATION);
ok('plan(corporate-gifts case): does NOT touch Online Store', !planHydro.onlineStorePresent);

const planOnline = buildRetirementPublicationPlan(onlineOnly);
ok('plan(online-only): no Hydrogen present', planOnline.hydrogenPresent === false);
throws('assertRetirementPlanSafe REJECTS an Online-Store-only action (no Hydrogen)', () => assertRetirementPlanSafe('x', planOnline));
noThrow('assertRetirementPlanSafe ok for multi-channel plan', () => assertRetirementPlanSafe('birthday-flowers', planMulti));
noThrow('assertRetirementPlanSafe ok for Hydrogen-only plan', () => assertRetirementPlanSafe('corporate-gifts', planHydro));

const planUnknown = buildRetirementPublicationPlan(withUnknown);
ok('plan(unknown): flagged unsafe', planUnknown.safe === false);
throws('assertRetirementPlanSafe REJECTS an unknown publication', () => assertRetirementPlanSafe('x', planUnknown));
throws('assertRetirementPlanSafe REJECTS nothing-to-unpublish', () => assertRetirementPlanSafe('x', buildRetirementPublicationPlan([pub('Point of Sale')])));

noThrow('assertCanonicalPublic ok when canonical is on Hydrogen', () => assertCanonicalPublic('birthday', ['Online Store', 'Point of Sale', HYDROGEN_PUBLICATION]));
throws('assertCanonicalPublic REJECTS a canonical not on Hydrogen', () => assertCanonicalPublic('birthday', ['Online Store', 'Point of Sale']));

/* ---- 16. Batch E cumulative cross-collection removal ---------------------------------- */
const perColl = [
  {handle: 'birthday', occasionTag: 'occasion:birthday', toRemove: ['long-stem-pink-roses', 'pink-hydrangeas', 'birthday-only-1']},
  {handle: 'anniversary', occasionTag: 'occasion:anniversary', toRemove: ['pink-hydrangeas', 'long-stem-red-roses', 'anniv-only-1']},
  {handle: 'love-and-romance', occasionTag: 'occasion:romance', toRemove: ['long-stem-pink-roses', 'long-stem-red-roses']},
];
const cum = buildCumulativeOccasionRemovalPlan(perColl);
ok('cumulative plan: 5 planned removals collapse to 5 unique products', cum.length === 5);
const byH = Object.fromEntries(cum.map((p) => [p.handle, p]));
ok('two-way overlap (birthday+romance) merges into one product with both tags', sameSet(byH['long-stem-pink-roses'].removeTags, ['occasion:birthday', 'occasion:romance']));
ok('two-way overlap (birthday+anniversary) merges', sameSet(byH['pink-hydrangeas'].removeTags, ['occasion:birthday', 'occasion:anniversary']));
ok('two-way overlap (anniversary+romance) merges', sameSet(byH['long-stem-red-roses'].removeTags, ['occasion:anniversary', 'occasion:romance']));
ok('single-collection product keeps a single tag', sameSet(byH['birthday-only-1'].removeTags, ['occasion:birthday']));
ok('overlapProducts returns exactly the multi-collection products', sameSet(overlapProducts(cum).map((p) => p.handle), ['long-stem-pink-roses', 'pink-hydrangeas', 'long-stem-red-roses']));
ok('each overlap product appears exactly once (one cumulative update)', cum.filter((p) => p.handle === 'long-stem-pink-roses').length === 1);

// three-way overlap generically
const threeWay = buildCumulativeOccasionRemovalPlan([
  {handle: 'birthday', occasionTag: 'occasion:birthday', toRemove: ['tri']},
  {handle: 'anniversary', occasionTag: 'occasion:anniversary', toRemove: ['tri']},
  {handle: 'love-and-romance', occasionTag: 'occasion:romance', toRemove: ['tri']},
]);
ok('three-way overlap merges to one product with all three tags', threeWay.length === 1 && sameSet(threeWay[0].removeTags, REMOVABLE_OCCASION_TAGS));

// duplicate removal request dedupes
const dup = buildCumulativeOccasionRemovalPlan([
  {handle: 'birthday', occasionTag: 'occasion:birthday', toRemove: ['x', 'x']},
  {handle: 'birthday', occasionTag: 'occasion:birthday', toRemove: ['x']},
]);
ok('duplicate removal requests collapse to a single tag', dup.length === 1 && sameSet(dup[0].removeTags, ['occasion:birthday']));

// allowlist enforcement
throws('cumulative plan rejects a non-allowlisted occasion tag', () => buildCumulativeOccasionRemovalPlan([{handle: 'x', occasionTag: 'occasion:wedding', toRemove: ['p']}]));

// applyCumulativeRemoval preserves unrelated tags and reports drift
const acr = applyCumulativeRemoval(['occasion:birthday', 'occasion:romance', 'occasion:wedding', 'channel:retail', 'channel:wholesale', 'flower:rose'], ['occasion:birthday', 'occasion:romance']);
ok('cumulative removal drops exactly the two approved occasion tags', sameSet(acr.removed, ['occasion:birthday', 'occasion:romance']));
ok('cumulative removal preserves wedding + channel + flower tags', sameSet(acr.after, ['occasion:wedding', 'channel:retail', 'channel:wholesale', 'flower:rose']));
ok('cumulative removal preserves tag order of survivors', acr.after.join('|') === ['occasion:wedding', 'channel:retail', 'channel:wholesale', 'flower:rose'].join('|'));
ok('cumulative removal reports unrelatedPreserved', acr.unrelatedPreserved === true);
ok('cumulative removal flags a stale/missing approved tag (precondition drift)', applyCumulativeRemoval(['channel:retail'], ['occasion:birthday']).missing.length === 1);
throws('applyCumulativeRemoval rejects a non-allowlisted tag', () => applyCumulativeRemoval(['occasion:birthday'], ['channel:retail']));
ok('applyCumulativeRemoval never touches wedding/wholesale/channel tags', applyCumulativeRemoval(['occasion:wedding', 'channel:wholesale', 'customer:event-planner', 'format:bulk-box'], ['occasion:birthday']).after.length === 4);
// rollback invariant: after ∪ removed restores the exact original tag set (backup sufficiency)
const orig = ['occasion:birthday', 'occasion:romance', 'occasion:wedding', 'channel:retail', 'flower:rose'];
const acr2 = applyCumulativeRemoval(orig, ['occasion:birthday', 'occasion:romance']);
ok('rollback (after + removed) restores the exact original tag set', sameSet([...acr2.after, ...acr2.removed], orig));

/* ---- 17. SEO companion truth table (Batch H semantics) -------------------------------- */
ok('companion status: both present', seoCompanionStatus({title: 'T', description: 'D'}) === 'both-present');
ok('companion status: both absent', seoCompanionStatus({title: null, description: null}) === 'both-absent');
ok('companion status: title only', seoCompanionStatus({title: 'T', description: null}) === 'title-only');
ok('companion status: description only', seoCompanionStatus({title: null, description: 'D'}) === 'description-only');
ok('companion status: empty strings count as absent', seoCompanionStatus({title: '   ', description: ''}) === 'both-absent');
ok('companion status: title + empty description = title only', seoCompanionStatus({title: 'T', description: '  '}) === 'title-only');
ok('companion status: missing seo object → both absent', seoCompanionStatus(null) === 'both-absent');
// truth table: both present = PASS, both absent = allowed, title-only = FAIL, description-only = FAIL
ok('companion OK: both present PASSES', seoCompanionOk({title: 'T', description: 'D'}) === true);
ok('companion OK: both absent PASSES (allowed by default)', seoCompanionOk({title: null, description: null}) === true);
ok('companion OK: both absent FAILS when not allowed', seoCompanionOk({title: null, description: null}, {allowBothAbsent: false}) === false);
ok('companion OK: title-only FAILS', seoCompanionOk({title: 'T', description: null}) === false);
ok('companion OK: description-only FAILS', seoCompanionOk({title: null, description: 'D'}) === false);
ok('companion OK: the live canonical case (title, no description) is NOT intact', seoCompanionOk({title: 'Birthday | The New Greenhouse', description: null}) === false);

/* ---- summary -------------------------------------------------------------------------- */
console.log(`\nsprint-lib.selftest: ${passed} passed, ${failed} failed`);
if (failed) {
  console.error('FAILURES:\n  - ' + fails.join('\n  - '));
  process.exit(1);
}
console.log('✓ all sprint-lib checks passed (offline, no Shopify, no mutation)');
