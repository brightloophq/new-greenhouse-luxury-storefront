// sprint-state.fixture.js — SYNTHETIC evidence for OFFLINE dry-run tests only.
//
// This is NOT the live preflight output. It mirrors the shape of catalog/live-audit/
// sprint-state.json and the fresh live COUNTS reported for the sprint, so the batch dry-runs
// can be exercised without Shopify. The real evidence is produced on the Mac by
// scripts/sprint-preflight.js and always takes precedence at execution time.
//
// generatedAt is set to "now" so freshness checks pass during the test run.

const gid = (kind, n) => `gid://shopify/${kind}/${n}`;
const smart = (occasion) => ({appliedDisjunctively: false, rules: [{column: 'TAG', relation: 'EQUALS', condition: occasion}]});

function coll(handle, id, count, {smartRule = null, seo = true, body = true, published = ['Online Store'], members = []} = {}) {
  return {
    found: true,
    id: gid('Collection', id),
    title: handle,
    productsCount: count,
    liveMemberCount: members.length || count,
    liveMembers: members,
    seoTitle: seo ? `${handle} | The New Greenhouse` : null,
    seoDescription: seo ? `${handle} description` : null,
    seoComplete: seo,
    bodyPresent: body,
    hasImage: true,
    isSmart: !!smartRule,
    rule: smartRule ? smartRule.rules.map((r) => `${r.column} ${r.relation} "${r.condition}"`).join(' AND ') : '(manual / no smart rule)',
    ruleSet: smartRule,
    published,
  };
}

// wholesale-only removal reasons → exercises the rule-tighten mechanism path
const wholesaleRemoval = (handle) => ({handle, wedding: false, addOn: false, notRetailMember: true});

export function makeFixture() {
  // Real live publication state (from Mac live preview): the public storefront is the Hydrogen
  // channel "New Greenhouse Luxury Storefront"; most collections are also on Online Store + POS,
  // but corporate-gifts is on the Hydrogen storefront ONLY.
  const PUBLIC3 = ['Online Store', 'Point of Sale', 'New Greenhouse Luxury Storefront'];
  const HYDRO_ONLY = ['New Greenhouse Luxury Storefront'];
  const collections = {
    // retired duplicates (empty or fully-shadowed)
    'birthday-flowers': coll('birthday-flowers', 5001, 0, {published: PUBLIC3}),
    'anniversary-flowers': coll('anniversary-flowers', 5002, 0, {published: PUBLIC3}),
    'love-romance': coll('love-romance', 5003, 0, {published: PUBLIC3}),
    'corporate-gifts': coll('corporate-gifts', 5004, 40, {published: HYDRO_ONLY}),
    'corporate-flowers': coll('corporate-flowers', 5005, 0, {published: PUBLIC3}),
    sympathy: coll('sympathy', 5006, 0, {published: PUBLIC3}),
    // canonicals (survive, already have SEO/body) — must stay live on Hydrogen
    birthday: coll('birthday', 6001, 27, {smartRule: smart('occasion:birthday'), published: PUBLIC3}),
    anniversary: coll('anniversary', 6002, 19, {smartRule: smart('occasion:anniversary'), published: PUBLIC3}),
    'love-and-romance': coll('love-and-romance', 6003, 21, {smartRule: smart('occasion:romance'), published: PUBLIC3}),
    'corporate-gifting': coll('corporate-gifting', 6004, 40, {published: PUBLIC3}),
    'sympathy-and-funeral': coll('sympathy-and-funeral', 6005, 33, {published: PUBLIC3}),
    // categories to populate (fresh SEO/body gaps)
    'gift-baskets': coll('gift-baskets', 7001, 0, {smartRule: {appliedDisjunctively: false, rules: [{column: 'TYPE', relation: 'EQUALS', condition: 'Gift Basket'}]}, seo: false, body: false, published: PUBLIC3}),
    'tropical-flowers': coll('tropical-flowers', 7002, 0, {smartRule: {appliedDisjunctively: false, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'flower:tropicals'}]}, seo: false, body: false, published: PUBLIC3}),
  };

  const consolidation = [
    ['birthday-flowers', 'birthday', 0, 27],
    ['anniversary-flowers', 'anniversary', 0, 19],
    ['love-romance', 'love-and-romance', 0, 21],
    ['corporate-gifts', 'corporate-gifting', 40, 40],
    ['corporate-flowers', 'corporate-gifting', 0, 40],
    ['sympathy', 'sympathy-and-funeral', 0, 33],
  ].map(([retire, canonical, rc, cc]) => ({
    retire, canonical,
    redirect: `/collections/${retire} → /collections/${canonical}`,
    retireFound: true, canonicalFound: true,
    retireCount: rc, canonicalCount: cc,
    retireIsEmptyDuplicate: rc === 0,
    productsOnlyInRetire: [],
    safeToRetire: true,
    revalidate: 'confirm live before Batch B',
  }));

  const occasion = {
    birthday: {liveMemberCount: 27, intendedMemberCount: 16, toAdd: [], toRemove: Array.from({length: 11}, (_, i) => `wholesale-birthday-${i + 1}`), toRemoveReasons: Array.from({length: 11}, (_, i) => wholesaleRemoval(`wholesale-birthday-${i + 1}`)), isSmart: true, rule: 'TAG EQUALS "occasion:birthday"'},
    anniversary: {liveMemberCount: 19, intendedMemberCount: 9, toAdd: [], toRemove: Array.from({length: 10}, (_, i) => `wholesale-anniv-${i + 1}`), toRemoveReasons: Array.from({length: 10}, (_, i) => wholesaleRemoval(`wholesale-anniv-${i + 1}`)), isSmart: true, rule: 'TAG EQUALS "occasion:anniversary"'},
    'love-and-romance': {liveMemberCount: 21, intendedMemberCount: 17, toAdd: [], toRemove: Array.from({length: 4}, (_, i) => `wholesale-love-${i + 1}`), toRemoveReasons: Array.from({length: 4}, (_, i) => wholesaleRemoval(`wholesale-love-${i + 1}`)), isSmart: true, rule: 'TAG EQUALS "occasion:romance"'},
  };

  const giftBaskets = {
    targetHandle: 'gift-baskets', found: true, liveCount: 0,
    candidates: [{handle: 'fruit-flower-gift-basket', title: 'Fruit & Flower Gift Basket', productType: 'Gift Basket', alreadyMember: false}],
  };
  const tropical = {
    targetHandle: 'tropical-flowers', found: true, liveCount: 0,
    retailCandidates: [
      {handle: 'luxury-tropical-arrangement', title: 'Luxury Tropical Arrangement', productType: 'Floral Arrangement', alreadyMember: false},
      {handle: 'island-modern-tropical-vase', title: 'Island Modern Tropical Vase', productType: 'Floral Arrangement', alreadyMember: false},
      {handle: 'paradise-tropical-bouquet', title: 'Paradise Tropical Bouquet', productType: 'Floral Arrangement', alreadyMember: false},
    ],
    wholesaleStemsExcluded: Array.from({length: 11}, (_, i) => ({handle: `tropical-stem-${i + 1}`, title: `Tropical Stem ${i + 1}`, productType: 'Fresh Cut Flowers'})),
  };

  const seoTargets = [
    ...['birthday', 'anniversary', 'love-and-romance', 'corporate-gifting', 'sympathy-and-funeral'].map((h) => ({handle: h, found: true, seoComplete: true, seoTitle: `${h} | The New Greenhouse`, seoDescription: 'ok', bodyPresent: true, needsSeo: false, needsBody: false})),
    {handle: 'gift-baskets', found: true, seoComplete: false, seoTitle: null, seoDescription: null, bodyPresent: false, needsSeo: true, needsBody: true},
    {handle: 'tropical-flowers', found: true, seoComplete: false, seoTitle: null, seoDescription: null, bodyPresent: false, needsSeo: true, needsBody: true},
  ];

  return {
    generatedAt: new Date().toISOString(),
    source: 'SYNTHETIC FIXTURE (offline dry-run tests only) — not live data.',
    store: 'fixture.myshopify.com',
    apiVersion: 'fixture',
    scopes: {all: ['read_products', 'write_products', 'read_publications', 'write_publications'], canWriteRedirects: false, canWriteProducts: true},
    redirectMatrix: {
      '/collections/birthday-flowers': '/collections/birthday',
      '/collections/anniversary-flowers': '/collections/anniversary',
      '/collections/love-romance': '/collections/love-and-romance',
      '/collections/corporate-gifts': '/collections/corporate-gifting',
      '/collections/corporate-flowers': '/collections/corporate-gifting',
      '/collections/sympathy': '/collections/sympathy-and-funeral',
    },
    counts: {products: 274, collections: 52},
    collections,
    consolidation,
    occasion,
    giftBaskets,
    tropical,
    seoTargets,
    note: 'SYNTHETIC — offline test fixture.',
  };
}
