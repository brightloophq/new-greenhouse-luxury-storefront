// Generate bespoke Deluxe OCCASION-CARD images (homepage). Luxury house style,
// square 1:1, gift-ready arrangements. No weddings. DRY-RUN unless
// IMAGE_GENERATION_DRY_RUN=false. Writes source-images/occasions/<handle>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'occasions');
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// keyed by the collection handle used on the homepage occasion cards
const ITEMS = [
  {file: 'birthday', subject: 'a vibrant yet refined premium birthday arrangement of mixed seasonal blooms in cheerful pinks, corals and gold tones, gift-wrapped in kraft and ivory tissue with a plain champagne-gold ribbon — celebratory but elegant, no balloons'},
  {file: 'anniversary', subject: 'a romantic, mature luxury arrangement of red, blush and burgundy roses with cream accents in an elegant gift presentation with a plain satin ribbon'},
  {file: 'love-and-romance', subject: 'an intimate luxury bouquet of deep red garden roses, hand-tied and gift-ready, styled against a soft dark-ivory studio setting — romantic and restrained, no hearts'},
  {file: 'sympathy-and-funeral', subject: 'a restrained, respectful sympathy arrangement of white and ivory lilies and roses with soft green foliage, calm and elegant, in a simple vase — no venue, no people'},
  {file: 'congratulations', subject: 'an energetic but sophisticated congratulations arrangement in a bright premium palette of white, gold and warm brights, gift-ready with a plain ribbon'},
  {file: 'thank-you', subject: 'a graceful thank-you bouquet of peach and soft-pink roses with delicate fillers, warm and appreciative in mood, wrapped as a gift'},
  {file: 'get-well', subject: 'a fresh, uplifting get-well arrangement in gentle bright yellows, whites and greens, softly presented in a vase — cheerful and calm, no medical props'},
  {file: 'new-baby', subject: 'a soft pastel new-baby arrangement in gender-neutral tones of blush, cream, mint and pale yellow, tastefully gift-wrapped'},
  {file: 'corporate-gifting', subject: 'a polished, architectural corporate arrangement of white and green flowers with restrained form in a modern vase, suitable for an executive desk or reception'},
];

const STYLE =
  'Finished, gift-ready premium florist arrangement, professionally hand-arranged with refined density. Photographed eye-level and straight-on, subject centred with generous negative space and about a 10% margin, on a soft warm ivory-to-pale-taupe seamless luxury studio background with a gentle grounding shadow — no black background, no hard shadows, no props, no table. Soft directional luxury studio lighting, balanced exposure, gentle highlights, restrained warm gold accents where natural. Warm, natural, true-to-life colour, premium editorial finish. Square 1:1 composition. Photorealistic high-end florist catalogue quality; botanically accurate flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly, not oversaturated. No text, no logo, no watermark, no people, no hands, no faces, no malformed or duplicated petals, no impossible stems, no floating accessories.';
const prompt = (s) => `Luxury florist occasion photograph of ${s}. ${STYLE}`;
const NEGATIVE = 'people, hands, faces, text, printed words, logo, watermark, hearts, balloons, medical props, black background, dark background, harsh shadow, clutter, extra props, CGI, painterly, oversaturated, malformed petals, duplicated flowers, impossible stems, floating objects';

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  OCCASION CARD IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const it of ITEMS) {
    const out = join(OUT, `${it.file}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip ${it.file}.png`); continue; }
    if (!live) { console.log(`   • plan ${it.file}.png`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(it.subject), negativePrompt: NEGATIVE, aspectRatio: '1:1'});
      if (res.ok && res.bytesBase64) { writeFileSync(out, Buffer.from(res.bytesBase64, 'base64')); saved = true; gen++; console.log(`   ✓ ${it.file}.png (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`); }
      else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ ${it.file}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err} → source-images/occasions/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
