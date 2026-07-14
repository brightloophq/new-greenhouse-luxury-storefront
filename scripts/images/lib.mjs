// scripts/images/lib.mjs — shared, side-effect-free pipeline logic.
//
// Deterministic filenames, per-experience prompt construction, format/aspect
// tables, and the approved PILOT concept list (Alstroemeria / Roses / Orchids).
// No network, no secrets, no image writes here.
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PATHS = {
  matrixCsv: join(ROOT, 'config', 'image-generation-matrix.csv'),
  generated: join(ROOT, 'public', 'images', 'generated'),
  originals: join(ROOT, 'source-images', 'generated-originals'),
  reports: join(ROOT, 'reports'),
  reportsPrivate: join(ROOT, 'reports', 'private'),
  sourceFlowers: join(ROOT, 'source-images', 'flowers'),
};

// --- Formats -----------------------------------------------------------------
// One generated ORIGINAL per concept at the ratio's master size; responsive
// derivatives are produced by image processing (npm run images:optimize), not by
// re-generating.
export const FORMATS = {
  card: {ratio: '4:5', ratioSlug: '4x5', width: 1200, height: 1500, widths: [400, 600, 800, 1200]},
  hero: {ratio: '16:9', ratioSlug: '16x9', width: 1920, height: 1080, widths: [768, 1280, 1920]},
  pdp: {ratio: '4:5', ratioSlug: '4x5', width: 1200, height: 1500, widths: [600, 900, 1200]},
  'mobile-hero': {ratio: '4:5', ratioSlug: '4x5', width: 1080, height: 1350, widths: [414, 768, 1080]},
  thumb: {ratio: '1:1', ratioSlug: '1x1', width: 800, height: 800, widths: [200, 300, 400, 800]},
};

// --- Visual standards (prompt fragments) ------------------------------------
const CLASSIC_STD =
  'Photorealistic commercial catalog product photography. Accurate flower ' +
  'morphology and true-to-life natural colour, visible fresh stems, soft ' +
  'natural shadows, clean bright white or warm-neutral studio seamless ' +
  'background, even soft studio lighting. Catalog-clear and sharp so the flower ' +
  'type is immediately identifiable. Practical wholesale presentation; neat ' +
  'commercial wrapping only where necessary; no luxury props, no excessive styling.';

const DELUXE_STD =
  'Photorealistic premium editorial floral photography. A finished luxury ' +
  'arrangement with refined bouquet density and elegant wrapping, finished with ' +
  'a plain champagne-gold and black satin ribbon — the ribbon is smooth and ' +
  'blank with absolutely no text, lettering, words, or writing on it. Matte ' +
  'black, warm ivory or refined neutral background with controlled ' +
  'champagne-gold accents and realistic premium lighting. Editorial gifting ' +
  'composition with generous negative space. Natural and true-to-life — not ' +
  'CGI, no artificial glow.';

const NEGATIVE =
  'text, typography, letters, numbers, watermark, signature, logo, brand mark, ' +
  'gibberish, extra flowers, duplicated stems, malformed or fused petals, ' +
  'wilted or brown flowers, plastic or fake look, CGI, 3d render, oversaturated, ' +
  'blurry, low resolution, noise, hands, people, vase (unless specified), ' +
  'cluttered background, competitor packaging, harsh glare';

function ratioFraming(placement) {
  const f = FORMATS[placement];
  if (f.ratio === '16:9') {
    return 'Wide 16:9 cinematic composition, subject off-centre with clear negative space for text overlay.';
  }
  if (f.ratio === '1:1') {
    return 'Square 1:1 composition, subject centred and filling the frame.';
  }
  return 'Vertical 4:5 composition, subject centred with comfortable headroom, no cropped focal point.';
}

/** Build the positive + negative prompt for a concept row. */
export function buildPrompts(c) {
  const framing = ratioFraming(c.placement);
  if (c.experience === 'classic') {
    const positive =
      `${CLASSIC_STD} Subject: a wholesale ${c.arrangement} of ${c.color} ` +
      `${c.flowerLabel}, true ${c.color} colour, fresh graded stems, presented for ` +
      `florist and trade buyers. ${framing} No text, no logo, no watermark.`;
    return {positive, negative: NEGATIVE};
  }
  const positive =
    `${DELUXE_STD} Subject: a finished luxury ${c.arrangement} of ${c.color} ` +
    `${c.flowerLabel} for premium gifting, refined and hand-tied. ${framing} ` +
    `No text, no logo, no watermark.`;
  return {positive, negative: NEGATIVE};
}

/** Deterministic kebab-case filename (no spaces, no random ids). */
export function buildFilename(c) {
  const parts = [c.experience, c.flower, c.color, c.arrangementSlug, c.placement, FORMATS[c.placement].ratioSlug];
  return `${parts.join('-')}.webp`;
}

export function assetId(c) {
  return buildFilename(c).replace(/\.webp$/, '');
}

// --- The approved PILOT (12 concepts) ---------------------------------------
// Alstroemeria / Roses / Orchids. Per flower: two Classic wholesale cards (two
// colours, 4:5) + one Deluxe premium card (4:5) + one Deluxe hero (16:9).
// 6 Classic + 6 Deluxe = 12. Cards identify the flower; the Deluxe hero shows the
// editorial gifting treatment. (Trade-off vs "two colours AND card+hero on every
// flow": within the 12-concept cap, colours are covered on Classic cards and the
// hero on Deluxe — adjust in the matrix before live generation if preferred.)
const RAW_PILOT = [
  // Alstroemeria
  {flower: 'alstroemeria', color: 'purple', experience: 'classic', placement: 'card', arrangement: 'bunch', arrangementSlug: 'wholesale-bunch', collection: 'bulk-flowers'},
  {flower: 'alstroemeria', color: 'pink', experience: 'classic', placement: 'card', arrangement: 'bunch', arrangementSlug: 'wholesale-bunch', collection: 'bulk-flowers'},
  {flower: 'alstroemeria', color: 'purple', experience: 'deluxe', placement: 'card', arrangement: 'signature bouquet', arrangementSlug: 'signature-bouquet', collection: 'luxury-bouquets'},
  {flower: 'alstroemeria', color: 'pink', experience: 'deluxe', placement: 'hero', arrangement: 'signature arrangement', arrangementSlug: 'signature', collection: 'luxury-bouquets'},
  // Roses
  {flower: 'roses', color: 'red', experience: 'classic', placement: 'card', arrangement: 'box', arrangementSlug: 'wholesale-box', collection: 'wholesale-roses'},
  {flower: 'roses', color: 'ivory', experience: 'classic', placement: 'card', arrangement: 'box', arrangementSlug: 'wholesale-box', collection: 'wholesale-roses'},
  {flower: 'roses', color: 'red', experience: 'deluxe', placement: 'card', arrangement: 'signature bouquet', arrangementSlug: 'signature-bouquet', collection: 'roses'},
  {flower: 'roses', color: 'red', experience: 'deluxe', placement: 'hero', arrangement: 'signature arrangement', arrangementSlug: 'signature', collection: 'roses'},
  // Orchids
  {flower: 'orchids', color: 'white', experience: 'classic', placement: 'card', arrangement: 'stems', arrangementSlug: 'wholesale-stems', collection: 'bulk-flowers'},
  {flower: 'orchids', color: 'purple', experience: 'classic', placement: 'card', arrangement: 'stems', arrangementSlug: 'wholesale-stems', collection: 'bulk-flowers'},
  {flower: 'orchids', color: 'white', experience: 'deluxe', placement: 'card', arrangement: 'luxury gift', arrangementSlug: 'luxury-gift', collection: 'orchids'},
  {flower: 'orchids', color: 'white', experience: 'deluxe', placement: 'hero', arrangement: 'luxury arrangement', arrangementSlug: 'luxury', collection: 'orchids'},
];

const FLOWER_LABEL = {alstroemeria: 'alstroemeria', roses: 'roses', orchids: 'orchids'};

/** Alstroemeria has approved source images per colour; use them for realism only. */
function sourceReference(c) {
  if (c.flower === 'alstroemeria') {
    return `source-images/flowers/alstroemeria/${c.color}.png`;
  }
  return ''; // no approved source reference yet (roses/orchids)
}

/** Fully-resolved pilot concept rows (with filenames, prompts, sizes). */
export function pilotConcepts() {
  return RAW_PILOT.map((c) => {
    const flowerLabel = FLOWER_LABEL[c.flower];
    const enriched = {...c, flowerLabel};
    const fmt = FORMATS[c.placement];
    const {positive, negative} = buildPrompts(enriched);
    return {
      asset_id: assetId(enriched),
      experience: c.experience,
      flower_type: c.flower,
      color: c.color,
      arrangement_type: c.arrangement,
      product_handle: '', // collection-level pilot art; not bound to a product yet
      collection_handle: c.collection,
      placement: c.placement,
      aspect_ratio: fmt.ratio,
      target_width: fmt.width,
      target_height: fmt.height,
      filename: buildFilename(enriched),
      prompt: positive,
      negative_prompt: negative,
      source_reference: sourceReference(c),
      generation_status: 'pending',
      review_status: 'pending',
      approved: 'false',
      notes: c.flower === 'alstroemeria' ? 'source ref for realism only; do not copy composition' : 'no approved source reference yet',
    };
  });
}

// --- CSV ---------------------------------------------------------------------
export const MATRIX_COLUMNS = [
  'asset_id', 'experience', 'flower_type', 'color', 'arrangement_type',
  'product_handle', 'collection_handle', 'placement', 'aspect_ratio',
  'target_width', 'target_height', 'filename', 'prompt', 'negative_prompt',
  'source_reference', 'generation_status', 'review_status', 'approved', 'notes',
];

export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows) {
  const head = MATRIX_COLUMNS.join(',');
  const body = rows.map((r) => MATRIX_COLUMNS.map((k) => csvEscape(r[k])).join(','));
  return [head, ...body].join('\n') + '\n';
}

/** Minimal RFC-4180 CSV parser → array of row objects. */
export function parseCsv(text) {
  const rows = [];
  let field = '', record = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') rows.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
