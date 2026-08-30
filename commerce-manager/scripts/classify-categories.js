// classify-categories.js — READ-ONLY offline classification of category membership.
//
// Consumes ONLY the authoritative live export written by export-live-audit.js
// (../catalog/live-audit/raw/products.json + collections.json). No network, no
// Shopify calls, NO mutations of any kind. Never fabricates: if the raw export is
// missing it ABORTS.
//
// Answers: why are the five confirmed commercial categories empty, and which EXISTING
// products legitimately belong in each — with catalogue evidence, not name guessing.
//
// Emits (analysis only, no secrets):
//   catalog/live-audit/category-classification.json
//   catalog/live-audit/category-classification.md
//
// Usage (local Mac, after export-live-audit.js):
//   cd commerce-manager
//   node scripts/classify-categories.js
//
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RAW = join(ROOT, 'catalog', 'live-audit', 'raw');
const OUT_DIR = join(ROOT, 'catalog', 'live-audit');

/* ---- target + validation collections --------------------------------------------------- */
export const TARGETS = ['birthday-flowers', 'anniversary-flowers', 'love-romance', 'gift-baskets', 'tropical-flowers'];
const VALIDATION = ['corporate-gifting', 'corporate-gifts', 'corporate-flowers', 'sympathy', 'sympathy-and-funeral'];
const WEDDING_COLLECTIONS = ['wedding-flowers', 'bridal-bouquets', 'centerpieces'];

/* ---- pure helpers ---------------------------------------------------------------------- */
const lc = (s) => String(s ?? '').toLowerCase();
const tagsOf = (p) => (p.tags || []).map((t) => String(t));
export const hasTag = (p, t) => tagsOf(p).some((x) => lc(x) === lc(t));
export const hasAnyTag = (p, arr) => arr.some((t) => hasTag(p, t));
const hasTagPrefix = (p, pre) => tagsOf(p).some((x) => lc(x).startsWith(lc(pre)));
const eqType = (p, t) => lc(p.productType) === lc(t);
const nameBlob = (p) => lc(`${p.handle} ${p.title}`);

// Admin GraphQL serializes connections as { nodes: [...] }. Normalize any
// connection-or-array-or-null shape to a plain array. Also tolerates an already
// normalized array, so both raw exports and fixtures work.
export const normalizeConnection = (x) => (Array.isArray(x) ? x : x && Array.isArray(x.nodes) ? x.nodes : []);
export const collectionsOf = (p) => normalizeConnection(p && p.collections);
export const publicationsOf = (node) => normalizeConnection(node && node.resourcePublications);
export const publishedNames = (node) => publicationsOf(node).filter((n) => n && n.isPublished).map((n) => n.publication?.name);
/** Per-candidate evidence for the membership review (read-only). */
export const candidateEvidence = (p) => ({channels: publishedNames(p), memberships: collectionsOf(p).map((c) => c.handle)});
/** Secret-free metadata snapshot of a collection for consolidation review. */
export const collMeta = (c) => (c ? {
  handle: c.handle, productsCount: c.productsCount?.count ?? null,
  seoTitle: !!c.seo?.title, seoDescription: !!c.seo?.description,
  bodyPresent: String(c.descriptionHtml || '').replace(/<[^>]*>/g, '').trim().length > 0,
  channels: publishedNames(c),
} : {found: false});

/** Evaluate one Shopify smart-collection rule against a product. */
export function productMatchesRule(p, rule) {
  const col = lc(rule.column);
  const rel = lc(rule.relation);
  const cond = rule.condition;
  const eq = (a, b) => lc(a) === lc(b);
  const contains = (a, b) => lc(a).includes(lc(b));
  switch (col) {
    case 'tag':
      return {supported: true, match: tagsOf(p).some((t) => eq(t, cond))}; // Shopify TAG => equals
    case 'type':
    case 'product_type':
      return {supported: true, match: rel === 'not_equals' ? !eq(p.productType, cond) : eq(p.productType, cond)};
    case 'title':
      if (rel === 'contains') return {supported: true, match: contains(p.title, cond)};
      if (rel === 'starts_with') return {supported: true, match: lc(p.title).startsWith(lc(cond))};
      if (rel === 'ends_with') return {supported: true, match: lc(p.title).endsWith(lc(cond))};
      return {supported: true, match: eq(p.title, cond)};
    case 'vendor':
      return {supported: true, match: rel === 'not_equals' ? !eq(p.vendor, cond) : eq(p.vendor, cond)};
    default:
      return {supported: false, match: false};
  }
}

/** Evaluate a whole ruleSet (AND/OR) against a product. */
export function productMatchesRuleSet(p, ruleSet) {
  if (!ruleSet || !Array.isArray(ruleSet.rules) || !ruleSet.rules.length)
    return {supported: true, match: false, unsupported: [], manual: true};
  const results = ruleSet.rules.map((r) => ({r, ...productMatchesRule(p, r)}));
  const unsupported = results.filter((x) => !x.supported).map((x) => x.r.column);
  const supported = results.filter((x) => x.supported);
  if (!supported.length) return {supported: false, match: false, unsupported, manual: false};
  const match = ruleSet.appliedDisjunctively ? supported.some((x) => x.match) : supported.every((x) => x.match);
  return {supported: true, match, unsupported, manual: false};
}

/** Commercial-appropriateness heuristic per category (signal detection, NOT final membership). */
export const CATEGORY_SIGNALS = {
  'birthday-flowers': (p) => hasTag(p, 'occasion:birthday') || /\bbirthday\b/.test(nameBlob(p)),
  'anniversary-flowers': (p) => hasTag(p, 'occasion:anniversary') || /anniversar/.test(nameBlob(p)),
  'love-romance': (p) =>
    hasTag(p, 'occasion:romance') || /romance|valentine|amour|sweetheart|\blove\b/.test(nameBlob(p)) ||
    (hasTagPrefix(p, 'flower:rose') && /heart|romance|amour/.test(nameBlob(p))),
  'gift-baskets': (p) => eqType(p, 'Gift Basket') || /\bbasket\b|hamper/.test(nameBlob(p)),
  'tropical-flowers': (p) =>
    hasAnyTag(p, ['flower:anthurium', 'flower:heliconia', 'flower:ginger', 'flower:bird-of-paradise', 'flower:tropical-mixed', 'flower:protea']) ||
    /tropical|anthurium|heliconia|\bginger\b|bird-of-paradise|protea/.test(nameBlob(p)),
};

/** The strongest catalogue-evidence tag/type expected for HIGH confidence per category. */
const CATEGORY_STRONG = {
  'birthday-flowers': (p) => hasTag(p, 'occasion:birthday'),
  'anniversary-flowers': (p) => hasTag(p, 'occasion:anniversary'),
  'love-romance': (p) => hasTag(p, 'occasion:romance'),
  'gift-baskets': (p) => eqType(p, 'Gift Basket'),
  'tropical-flowers': (p) => hasTagPrefix(p, 'flower:') && /anthurium|heliconia|ginger|bird-of-paradise|protea|tropical/.test(tagsOf(p).join(',').toLowerCase()),
};

/** Classify a candidate's confidence for a category using catalogue evidence only. */
export function classifyConfidence(p, cat, relatedCollections) {
  if (CATEGORY_STRONG[cat](p)) return 'HIGH'; // explicit occasion tag / matching productType / strong taxonomy
  const related = collectionsOf(p).some((c) => relatedCollections.has(c.handle));
  if (related) return 'HIGH'; // already in a strongly-related collection
  // medium: has SOME taxonomy tag in the right family but not the canonical one
  if (cat === 'tropical-flowers' && hasTagPrefix(p, 'flower:')) return 'MEDIUM';
  if ((cat === 'gift-baskets') && /gift|basket/.test(lc(p.productType))) return 'MEDIUM';
  if (hasTagPrefix(p, 'occasion:')) return 'MEDIUM'; // carries some occasion tag, not the target one
  // otherwise only a title/handle keyword → ambiguous
  return 'AMBIGUOUS';
}

/** Why does a commercially-appropriate product fail the collection's actual rule? */
export function failureReason(p, ruleSet) {
  const res = productMatchesRuleSet(p, ruleSet);
  if (res.match) return null;
  if (res.manual) return 'collection is manual/empty (no smart rule) — product not manually added';
  if (!res.supported) return `rule uses analyzer-unsupported column(s): ${[...new Set(res.unsupported)].join(', ')}`;
  const reasons = [];
  for (const r of ruleSet.rules) {
    const col = lc(r.column);
    const one = productMatchesRule(p, r);
    if (!one.supported || one.match) continue;
    if (col === 'tag') reasons.push(`missing required tag "${r.condition}"`);
    else if (col === 'type' || col === 'product_type') reasons.push(`productType "${p.productType || ''}" ≠ required "${r.condition}"`);
    else if (col === 'title') reasons.push(`title does not ${r.relation} "${r.condition}"`);
    else reasons.push(`${r.column} ${r.relation} "${r.condition}" not met`);
  }
  const prefix = ruleSet.appliedDisjunctively ? 'fails all OR-rules' : 'fails an AND-rule';
  return `${prefix}: ${reasons.join('; ')}. Product tags: [${tagsOf(p).join(', ')}]`;
}

/* ---- load raw (fail closed) ------------------------------------------------------------ */
function requireRaw(name) {
  const p = join(RAW, name);
  if (!existsSync(p)) {
    console.error(`  ✗ Missing live export: catalog/live-audit/raw/${name}`);
    console.error('    Run `node scripts/export-live-audit.js` first. This script never fabricates data.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

/* ---- main ------------------------------------------------------------------------------ */
function main() {
  const products = requireRaw('products.json');
  const collections = requireRaw('collections.json');
  const collByHandle = new Map(collections.map((c) => [c.handle, c]));

  const relatedByCat = {
    'birthday-flowers': new Set(['birthday-flowers', 'birthday']),
    'anniversary-flowers': new Set(['anniversary-flowers', 'anniversary']),
    'love-romance': new Set(['love-romance', 'love-and-romance']),
    'gift-baskets': new Set(['gift-baskets', 'add-ons']),
    'tropical-flowers': new Set(['tropical-flowers']),
  };

  const categories = {};
  for (const cat of TARGETS) {
    const coll = collByHandle.get(cat);
    const ruleSet = coll?.ruleSet || null;
    const currentlySatisfy = products.filter((p) => productMatchesRuleSet(p, ruleSet).match).map((p) => p.handle);
    const candidates = products.filter((p) => CATEGORY_SIGNALS[cat](p));
    const rows = candidates.map((p) => {
      const conf = classifyConfidence(p, cat, relatedByCat[cat]);
      const reason = failureReason(p, ruleSet);
      return {handle: p.handle, title: p.title, productType: p.productType, status: p.status, tags: tagsOf(p), ...candidateEvidence(p), confidence: conf, satisfiesRule: reason === null, failReason: reason};
    });
    // recommendation heuristic
    const highFailing = rows.filter((r) => r.confidence === 'HIGH' && !r.satisfiesRule);
    const rec = recommend(cat, ruleSet, rows, highFailing);
    categories[cat] = {
      handle: cat,
      found: !!coll,
      productsCount: coll?.productsCount?.count ?? null,
      publication: publishedNames(coll),
      ruleSet,
      currentlySatisfyCount: currentlySatisfy.length,
      candidateCount: rows.length,
      byConfidence: {
        HIGH: rows.filter((r) => r.confidence === 'HIGH').length,
        MEDIUM: rows.filter((r) => r.confidence === 'MEDIUM').length,
        AMBIGUOUS: rows.filter((r) => r.confidence === 'AMBIGUOUS').length,
      },
      candidates: rows,
      recommendation: rec,
    };
  }

  // cross-category overlap (merchandising vs accidental)
  const overlap = {};
  const highByCat = {};
  for (const cat of TARGETS) highByCat[cat] = new Set(categories[cat].candidates.filter((r) => r.confidence !== 'AMBIGUOUS').map((r) => r.handle));
  const allHigh = new Set([].concat(...TARGETS.map((c) => [...highByCat[c]])));
  for (const h of allHigh) {
    const inCats = TARGETS.filter((c) => highByCat[c].has(h));
    if (inCats.length > 1) overlap[h] = inCats;
  }

  // wedding / event evidence
  const weddingColl = new Set(WEDDING_COLLECTIONS);
  const weddingProducts = products.filter(
    (p) => /wedding|bridal|bride/i.test(p.productType || '') || tagsOf(p).some((t) => /wedding|bridal/i.test(t)) ||
      collectionsOf(p).some((c) => weddingColl.has(c.handle) || /wedding|bridal/i.test(c.handle)),
  );
  const wedding = {
    specific: weddingProducts.filter((p) => /wedding|bridal/i.test(p.productType || '') || collectionsOf(p).some((c) => weddingColl.has(c.handle)))
      .map((p) => ({handle: p.handle, status: p.status, productType: p.productType, weddingTags: tagsOf(p).filter((t) => /wedding|bridal|event/i.test(t)), ...candidateEvidence(p)})),
    multipurposeStems: weddingProducts.filter((p) => !/wedding|bridal/i.test(p.productType || '') && !collectionsOf(p).some((c) => weddingColl.has(c.handle)))
      .map((p) => ({handle: p.handle, status: p.status, productType: p.productType, weddingTags: tagsOf(p).filter((t) => /wedding|bridal|event/i.test(t)), ...candidateEvidence(p)})),
    collections: WEDDING_COLLECTIONS.map((h) => {
      const c = collByHandle.get(h);
      return c ? {handle: h, products: c.productsCount?.count ?? null, ruleSet: c.ruleSet, published: publishedNames(c)} : {handle: h, found: false};
    }),
  };

  // corporate / sympathy validation
  const membersOf = (h) => new Set(products.filter((p) => collectionsOf(p).some((c) => c.handle === h)).map((p) => p.handle));
  const cg = membersOf('corporate-gifting');
  const cgs = membersOf('corporate-gifts');
  const validation = {
    corporate: {
      'corporate-gifting': {...collMeta(collByHandle.get('corporate-gifting')), memberCount: cg.size, ruleSet: collByHandle.get('corporate-gifting')?.ruleSet},
      'corporate-gifts': {...collMeta(collByHandle.get('corporate-gifts')), memberCount: cgs.size, ruleSet: collByHandle.get('corporate-gifts')?.ruleSet},
      'corporate-flowers': {...collMeta(collByHandle.get('corporate-flowers')), memberCount: membersOf('corporate-flowers').size},
      onlyInGifting: [...cg].filter((h) => !cgs.has(h)),
      onlyInGifts: [...cgs].filter((h) => !cg.has(h)),
      equivalent: cg.size === cgs.size && [...cg].every((h) => cgs.has(h)),
    },
    sympathy: {
      sympathy: {...collMeta(collByHandle.get('sympathy')), memberCount: membersOf('sympathy').size},
      'sympathy-and-funeral': {...collMeta(collByHandle.get('sympathy-and-funeral')), memberCount: membersOf('sympathy-and-funeral').size, ruleSet: collByHandle.get('sympathy-and-funeral')?.ruleSet},
    },
  };

  const analysis = {generatedAt: new Date().toISOString(), source: 'LIVE raw export (authoritative); read-only classification.', categories, overlap, wedding, validation};
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true});
  writeFileSync(join(OUT_DIR, 'category-classification.json'), JSON.stringify(analysis, null, 2));
  writeFileSync(join(OUT_DIR, 'category-classification.md'), renderMd(analysis));

  // console summary
  console.log('─────────────────────────────────────────────');
  console.log('  Category classification (read-only, offline)');
  console.log('─────────────────────────────────────────────');
  for (const cat of TARGETS) {
    const c = categories[cat];
    console.log(`  ${cat}: live=${c.productsCount} candidates=${c.candidateCount} (H${c.byConfidence.HIGH}/M${c.byConfidence.MEDIUM}/A${c.byConfidence.AMBIGUOUS}) → ${c.recommendation.code} ${c.recommendation.label}`);
  }
  console.log(`  cross-category overlap products: ${Object.keys(overlap).length}`);
  console.log(`  wedding: specific=${wedding.specific.length} multipurpose=${wedding.multipurposeStems.length}`);
  console.log(`  corporate equivalent(gifting==gifts)=${validation.corporate.equivalent} · corporate-flowers=${validation.corporate['corporate-flowers'].count} · sympathy=${validation.sympathy.sympathy.count}`);
  console.log('\n  wrote: catalog/live-audit/category-classification.json + .md');
  console.log('✓ No network calls. No Shopify operations. Nothing modified.');
}

function recommend(cat, ruleSet, rows, highFailing) {
  if (!ruleSet || !ruleSet.rules?.length) return {code: 'E', label: 'restructure: no smart rule present (manual/empty)'};
  const tagRules = ruleSet.rules.filter((r) => lc(r.column) === 'tag');
  const typeRules = ruleSet.rules.filter((r) => lc(r.column) === 'type' || lc(r.column) === 'product_type');
  if (highFailing.length === 0) return {code: 'F', label: 'no change — no high-confidence products currently fail the rule'};
  // If high-confidence products carry occasion tags but under a different value → prefer B (retag) or A (rule).
  if (tagRules.length) return {code: 'B', label: `correct/add product tags to match rule tag(s): ${tagRules.map((r) => r.condition).join(', ')} (or A: broaden the rule) — ${highFailing.length} high-confidence products failing`};
  if (typeRules.length) return {code: 'C', label: `correct productType to "${typeRules.map((r) => r.condition).join('/')}" (or A: change rule) — ${highFailing.length} high-confidence products failing`};
  return {code: 'A', label: 'modify smart rule to match actual taxonomy'};
}

function renderMd(a) {
  const catBlock = (cat) => {
    const c = a.categories[cat];
    const rule = c.ruleSet && Array.isArray(c.ruleSet.rules)
      ? c.ruleSet.rules.map((r) => `${r.column} ${r.relation} "${r.condition}"`).join(c.ruleSet.appliedDisjunctively ? ' OR ' : ' AND ')
      : '(no smart rule / manual)';
    const rows = c.candidates
      .sort((x, y) => ({HIGH: 0, MEDIUM: 1, AMBIGUOUS: 2}[x.confidence] - {HIGH: 0, MEDIUM: 1, AMBIGUOUS: 2}[y.confidence]))
      .map((r) => `| \`${r.handle}\` | ${r.confidence} | ${r.status} | ${(r.channels || []).join('; ') || '—'} | ${r.productType || '—'} | ${(r.tags || []).filter((t) => /occasion:|flower:|wholesale|retail|format:/i.test(t)).join('; ') || '—'} | ${(r.memberships || []).join('; ') || '—'} |`)
      .join('\n');
    return `### ${cat}  (live ${c.productsCount} products)
- Current rule: \`${rule}\`
- Candidates: ${c.candidateCount} — HIGH ${c.byConfidence.HIGH} / MEDIUM ${c.byConfidence.MEDIUM} / AMBIGUOUS ${c.byConfidence.AMBIGUOUS}
- **Classifier recommendation: ${c.recommendation.code} — ${c.recommendation.label}**

| handle | confidence | status | channels | productType | relevant tags | existing memberships |
|---|---|---|---|---|---|---|
${rows || '| (none) | | | | | | |'}`;
  };
  const overlapRows = Object.entries(a.overlap).map(([h, cats]) => `- \`${h}\` → ${cats.join(', ')} (merchandising overlap)`).join('\n') || '- none';
  return `# Category Membership Classification (read-only)

> Generated ${a.generatedAt} from the authoritative live raw export. No Shopify data modified.
> Confidence definitions — HIGH: explicit occasion/category tag, matching productType, or
> membership in a strongly-related collection. MEDIUM: related-but-different taxonomy.
> AMBIGUOUS: title/handle keyword only. Do not populate from AMBIGUOUS alone.

## Five target categories
${TARGETS.map(catBlock).join('\n\n')}

## Cross-category overlap (legitimate merchandising, not duplication)
${overlapRows}

## Wedding / event (evidence for the wholesale architecture task)
- Clearly wedding/event-specific: ${a.wedding.specific.length}
- Multipurpose stems carrying wedding taxonomy: ${a.wedding.multipurposeStems.length}
- Collections: ${a.wedding.collections.map((c) => `${c.handle}=${c.products ?? 'n/a'}`).join(', ')}

## Corporate / sympathy validation
- corporate-gifting: ${a.validation.corporate['corporate-gifting'].count} · corporate-gifts: ${a.validation.corporate['corporate-gifts'].count} · corporate-flowers: ${a.validation.corporate['corporate-flowers'].count}
- gifting == gifts membership equivalent: **${a.validation.corporate.equivalent}** (only-in-gifting: ${a.validation.corporate.onlyInGifting.length}, only-in-gifts: ${a.validation.corporate.onlyInGifts.length})
- sympathy: ${a.validation.sympathy.sympathy.count} (expect 0) · sympathy-and-funeral: ${a.validation.sympathy['sympathy-and-funeral'].count}

_Read-only. No mutation performed._
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
