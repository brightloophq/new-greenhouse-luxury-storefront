// Generate 6 Classic Floral-Supplies CATEGORY images (landing-page cards) as
// clean, isolated product photography — NOT flower bouquets. DRY-RUN unless
// IMAGE_GENERATION_DRY_RUN=false. Writes source-images/supplies/<file>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'supplies');
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ITEMS = [
  {file: 'foam', name: 'florist foam blocks',
   subject: 'a small neat stack of plain rectangular florist wet-foam bricks (green floral foam blocks), the foam itself as the product'},
  {file: 'vases', name: 'glass florist vase',
   subject: 'a single empty clear glass cylinder florist vase, clean and elegant, with no flowers in it'},
  {file: 'ribbon', name: 'florist ribbon rolls',
   subject: 'a few neatly arranged rolls of satin and organza florist ribbon in soft ivory, blush and sage tones, showing the ribbon texture, no flowers'},
  {file: 'wrapping', name: 'floral wrapping material',
   subject: 'rolls of natural kraft paper and clear cellophane floral wrapping material with a few folded sheets of tissue, neatly arranged, no flowers'},
  {file: 'tools', name: 'florist tools',
   subject: 'a pair of stainless-steel florist shears (snips) beside a roll of green stem tape and a small spool of florist wire, arranged as a clean set, no flowers'},
  {file: 'essentials', name: 'florist studio essentials',
   subject: 'a tidy flat-lay set of florist studio essentials — a roll of ribbon, a roll of stem tape, a small empty glass vase and a pair of snips — arranged neatly, no flowers as the subject'},
];

const prompt = (s, name) =>
  `Professional commercial product photograph of ${s}. The product is isolated and centred on a clean white-to-pale-neutral seamless studio background that fills the frame — no dark background, no border, no vignette. Soft, even professional studio lighting with a gentle natural grounding shadow, accurate scale and true-to-life form and colour. Roughly 10% even margin around the product. Square 1:1 composition, ultra sharp, high detail. This is a real photograph of a floral-supply product (${name}) — not CGI, not painterly, not oversaturated. Absolutely no people, no hands, no text, no printed words, no brand names, no logos, no fake labels, no certification marks, no printed measurements, and no decorative flower bouquet as the main subject.`;
const NEGATIVE = 'flower bouquet as main subject, flowers as the subject, people, hands, text, printed words, logo, brand name, label, certification mark, watermark, measurements, ruler, dark background, black background, border, vignette, clutter, props, CGI, painterly, oversaturated, blurry, noise';

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  SUPPLY CATEGORY IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
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
