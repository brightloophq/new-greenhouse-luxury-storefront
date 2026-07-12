// src/collections.js — smart-collection rule sets + SEO/description parsing.
// Rules mirror catalog/automated-collection-rules.md; SEO/descriptions come from
// catalog/collection-descriptions.md. Collections are created UNPUBLISHED, no image.
import {readFileSync} from 'node:fs';
import {catalogPath} from './catalog-files.js';

// column ∈ TAG | TYPE | TITLE ; relation ∈ EQUALS | CONTAINS ; or = appliedDisjunctively
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
  'wholesale-roses': {or: false, rules: [TAG('channel:wholesale'), TAG('flower:rose')], review: 'AND channel+rose; spray-rose omitted'},
  'wholesale-greenery': {or: false, rules: [TAG('channel:wholesale'), TYPE('Greenery')], review: 'AND channel+greenery; filler omitted'},
  'florist-essentials': {or: false, rules: [TAG('customer:florist')]},
  'floral-supplies': {or: false, rules: [TYPE('Floral Supply')]},
  'vases-and-containers': {or: true, rules: [TITLE('Vase'), TITLE('Basket')], review: 'title-based'},
  ribbon: {or: false, rules: [TITLE('Ribbon')]},
  'wrapping-and-packaging': {or: true, rules: [TITLE('Wrap'), TITLE('Box')]},
  'tools-and-accessories': {or: true, rules: [TITLE('Shears'), TITLE('Tape')]},
  plants: {or: false, rules: [TYPE('Plant')]},
  'gift-baskets': {or: false, rules: [TYPE('Gift Basket')]},
  'add-ons': {or: false, rules: [TYPE('Gift Add-on')]},
  'corporate-gifts': {or: false, rules: [TAG('occasion:corporate')], review: 'also gate by Type after import'},
};

export function ruleSetFor(handle) {
  const s = COLLECTION_RULES[handle];
  return s ? {appliedDisjunctively: Boolean(s.or), rules: s.rules, review: s.review} : null;
}

const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();

/** Parse collection-descriptions.md → Map(normalizedTitle → {description, seoTitle, seoDescription}). */
export function loadCollectionDescriptions() {
  const text = readFileSync(catalogPath('collection-descriptions.md'), 'utf8');
  const map = new Map();
  let last = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.match(/^\*\*(.+?)\*\*\s*—\s*(.+)$/);
    if (t) {
      last = norm(t[1]);
      map.set(last, {title: t[1].trim(), description: t[2].trim(), seoTitle: '', seoDescription: ''});
      continue;
    }
    const seo = line.match(/^-\s*SEO:\s*`(.+?)`\s*—\s*(.+)$/);
    if (seo && last && map.has(last)) {
      const e = map.get(last);
      e.seoTitle = seo[1].trim();
      e.seoDescription = seo[2].trim();
    }
  }
  return map;
}

export function descriptionFor(descMap, title) {
  return descMap.get(norm(title)) || null;
}

/** Build a Shopify CollectionInput for a smart collection. No image, no publications. */
export function buildCollectionInput(plan, rs, desc) {
  const input = {
    title: plan.title,
    handle: plan.handle,
    ruleSet: {appliedDisjunctively: rs.appliedDisjunctively, rules: rs.rules},
  };
  if (desc?.description) input.descriptionHtml = `<p>${desc.description}</p>`;
  const seoTitle = desc?.seoTitle || `${plan.title} | The New Greenhouse`;
  const seoDescription = desc?.seoDescription || desc?.description || '';
  input.seo = {title: seoTitle, description: seoDescription };
  return input;
}
