// Generate per-PRODUCT supply images for the 10 published-but-imageless Floral
// Supply products. Isolated product photography, no flowers/text/logos. DRY-RUN
// unless IMAGE_GENERATION_DRY_RUN=false. Writes source-images/supplies/<file>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'supplies');
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Only the 7 NOT already covered by the category images (foam, vases, wrapping).
const ITEMS = [
  {file: 'bud-vase-set', name: 'bud vase set',
   subject: 'a matching set of four small clear glass bud vases grouped together, all empty, no flowers'},
  {file: 'satin-ribbon', name: 'satin ribbon',
   subject: 'two rolls of smooth satin florist ribbon with a soft sheen, in ivory and blush, no flowers'},
  {file: 'organza-ribbon', name: 'organza ribbon',
   subject: 'two rolls of sheer translucent organza florist ribbon in soft neutral tones, showing the fine mesh texture, no flowers'},
  {file: 'woven-basket', name: 'woven arrangement basket',
   subject: 'a single empty round woven natural wicker arrangement basket with a handle, no flowers inside'},
  {file: 'stem-tape', name: 'floral stem tape',
   subject: 'three rolls of florist stem tape (green and brown floral tape) stacked together, no flowers'},
  {file: 'shears', name: 'florist shears',
   subject: 'a single pair of stainless-steel florist shears (snips) with green handles, shown on its own'},
  {file: 'presentation-boxes', name: 'bouquet presentation boxes',
   subject: 'two empty rigid bouquet presentation gift boxes in kraft and ivory with their lids beside them, no flowers inside'},
];

const prompt = (s, name) =>
  `Professional commercial product photograph of ${s}. The product is isolated and centred on a clean white-to-pale-neutral seamless studio background that fills the frame — no dark background, no border, no vignette. Soft, even professional studio lighting with a gentle natural grounding shadow, accurate scale and true-to-life form and colour. Roughly 10% even margin around the product. Square 1:1 composition, ultra sharp, high detail. This is a real photograph of a floral-supply product (${name}) — not CGI, not painterly, not oversaturated. Absolutely no people, no hands, no text, no printed words, no brand names, no logos, no fake labels, no certification marks, no printed measurements, and no decorative flower bouquet as the main subject.`;
const NEGATIVE = 'flower bouquet as main subject, flowers as the subject, people, hands, text, printed words, logo, brand name, label, certification mark, watermark, measurements, ruler, dark background, black background, border, vignette, clutter, props, CGI, painterly, oversaturated, blurry, noise';

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  SUPPLY PRODUCT IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const it of ITEMS) {
    const out = join(OUT, `${it.file}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip ${it.file}.png`); continue; }
    if (!live) { console.log(`   • plan ${it.file}.png`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(it.subject, it.name), negativePrompt: NEGATIVE, aspectRatio: '1:1'});
      if (res.ok && res.bytesBase64) { writeFileSync(out, Buffer.from(res.bytesBase64, 'base64')); saved = true; gen++; console.log(`   ✓ ${it.file}.png (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`); }
      else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ ${it.file}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err} → source-images/supplies/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
