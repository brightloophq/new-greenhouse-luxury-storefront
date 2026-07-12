// Structured specs the Admin mutations need but which live as prose/CSV in the
// catalog docs. Mirrors catalog/metafield-definitions.md, automated-collection-rules.md,
// navigation-plan.md. Keep in sync with those docs.

// --- Metafield definitions (owner: PRODUCT, namespace: custom) ---
export const METAFIELD_DEFINITIONS = [
  ['channel', 'Channel', 'single_line_text_field'],
  ['flower_type', 'Flower Type', 'single_line_text_field'],
  ['color_family', 'Colour Family', 'list.single_line_text_field'],
  ['stem_count', 'Stem Count', 'number_integer'],
  ['stem_length', 'Stem Length', 'single_line_text_field'],
  ['pack_size', 'Pack Size', 'list.single_line_text_field'],
  ['bloom_size', 'Bloom Size', 'single_line_text_field'],
  ['vase_life', 'Vase Life', 'single_line_text_field'],
  ['season', 'Season', 'single_line_text_field'],
  ['country_of_origin', 'Country of Origin', 'single_line_text_field'],
  ['care_level', 'Care Level', 'single_line_text_field'],
  ['care_instructions', 'Care Instructions', 'multi_line_text_field'],
  ['ideal_for', 'Ideal For', 'list.single_line_text_field'],
  ['minimum_order_quantity', 'Minimum Order Qty', 'single_line_text_field'],
  ['unit_type', 'Unit Type', 'single_line_text_field'],
  ['price_status', 'Price Status', 'single_line_text_field'],
  ['image_status', 'Image Status', 'single_line_text_field'],
  ['delivery_note', 'Delivery Note', 'multi_line_text_field'],
  ['wholesale_note', 'Wholesale Note', 'multi_line_text_field'],
  ['confirmation_required', 'Confirmation Required', 'list.single_line_text_field'],
].map(([key, name, type]) => ({namespace: 'custom', key, name, type, ownerType: 'PRODUCT'}));

// --- Smart-collection rule sets (keyed by handle) ---
// column ∈ TAG | TYPE | TITLE ; relation ∈ EQUALS | CONTAINS ; disjunctive = OR
const TAG = (v) => ({column: 'TAG', relation: 'EQUALS', condition: v});
const TYPE = (v) => ({column: 'TYPE', relation: 'EQUALS', condition: v});
const TITLE = (v) => ({column: 'TITLE', relation: 'CONTAINS', condition: v});

export const COLLECTION_RULES = {
  'all-flowers': {or: true, rules: ['Fresh Cut Flowers', 'Greenery', 'Floral Filler', 'Floral Arrangement'].map(TYPE)},
  roses: {or: true, rules: [TAG('flower:rose'), TAG('flower:spray-rose'), TAG('flower:garden-rose')]},
  orchids: {or: false, rules: [TAG('flower:orchid')]},
  lilies: {or: true, rules: [TAG('flower:lily'), TAG('flower:calla-lily')]},
  'tropical-flowers': {or: true, rules: ['anthurium', 'heliconia', 'ginger', 'bird-of-paradise', 'tropical-mixed'].map((f) => TAG(`flower:${f}`))},
  'greenery-and-fillers': {or: true, rules: [TYPE('Greenery'), TYPE('Floral Filler')]},
  'white-and-ivory': {or: false, rules: [TAG('color:white-ivory')]},
  red: {or: false, rules: [TAG('color:red')]},
  pink: {or: false, rules: [TAG('color:pink')]},
  'yellow-and-orange': {or: false, rules: [TAG('color:yellow-orange')]},
  purple: {or: false, rules: [TAG('color:purple')]},
  'green-flowers': {or: false, rules: [TAG('color:green')]},
  'mixed-color': {or: false, rules: [TAG('color:mixed')]},
  birthday: {or: false, rules: [TAG('occasion:birthday')]},
  anniversary: {or: false, rules: [TAG('occasion:anniversary')]},
  'love-and-romance': {or: false, rules: [TAG('occasion:romance')]},
  'sympathy-and-funeral': {or: false, rules: [TAG('occasion:sympathy')]},
  congratulations: {or: false, rules: [TAG('occasion:congratulations')]},
  'new-baby': {or: false, rules: [TAG('occasion:new-baby')]},
  'get-well': {or: false, rules: [TAG('occasion:get-well')]},
  'corporate-gifting': {or: false, rules: [TAG('occasion:corporate')]},
  'wedding-flowers': {or: false, rules: [TYPE('Wedding Flowers')]},
  'bridal-bouquets': {or: false, rules: [TAG('format:bouquet'), TYPE('Wedding Flowers')], review: 'bridal subset — refine after import'},
  centerpieces: {or: false, rules: [TAG('format:centerpiece')]},
  'bulk-flowers': {or: false, rules: [TAG('channel:wholesale')]},
  'wholesale-roses': {or: false, rules: [TAG('channel:wholesale'), TAG('flower:rose')], review: 'AND channel+rose; spray-rose omitted (Shopify single-logic ruleset)'},
  'wholesale-greenery': {or: false, rules: [TAG('channel:wholesale'), TYPE('Greenery')], review: 'AND channel+greenery; floral-filler omitted'},
  'florist-essentials': {or: false, rules: [TAG('customer:florist')]},
  'floral-supplies': {or: false, rules: [TYPE('Floral Supply')]},
  'vases-and-containers': {or: true, rules: [TITLE('Vase'), TITLE('Basket')], review: 'title-based; also gate by Type Floral Supply after import'},
  ribbon: {or: false, rules: [TITLE('Ribbon')]},
  'wrapping-and-packaging': {or: true, rules: [TITLE('Wrap'), TITLE('Box')]},
  'tools-and-accessories': {or: true, rules: [TITLE('Shears'), TITLE('Tape')]},
  plants: {or: false, rules: [TYPE('Plant')]},
  'gift-baskets': {or: false, rules: [TYPE('Gift Basket')]},
  'add-ons': {or: false, rules: [TYPE('Gift Add-on')]},
  'corporate-gifts': {or: false, rules: [TAG('occasion:corporate')], review: 'also gate by Type Plant/Basket/Add-on after import'},
};

// --- Pages (existing store pages are skipped idempotently; this is the missing one) ---
export const PAGES = [
  {handle: 'wholesale', title: 'Wholesale & Trade', bodyHtml: '<p>Wholesale and trade ordering for florists, planners, hotels and businesses. Contact our team to open a trade account.</p>'},
];

// --- Navigation menus (mirror navigation-plan.md) ---
export const MENUS = [
  {
    handle: 'main-menu',
    title: 'Main menu',
    items: [
      {title: 'Shop Flowers', type: 'HTTP', url: '/collections/all-flowers'},
      {title: 'Occasions', type: 'HTTP', url: '/collections/birthday'},
      {title: 'Weddings & Events', type: 'HTTP', url: '/pages/wedding-events'},
      {title: 'Wholesale', type: 'HTTP', url: '/collections/bulk-flowers'},
      {title: 'Supplies', type: 'HTTP', url: '/collections/floral-supplies'},
      {title: 'Plants & Gifts', type: 'HTTP', url: '/collections/plants'},
      {title: 'About', type: 'HTTP', url: '/pages/about-us'},
      {title: 'Contact', type: 'HTTP', url: '/pages/contact'},
    ],
  },
];

export function ruleSetFor(handle) {
  const spec = COLLECTION_RULES[handle];
  if (!spec) return null;
  return {appliedDisjunctively: Boolean(spec.or), rules: spec.rules, review: spec.review};
}
