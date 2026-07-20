// Bright botanical homepage imagery (2026 redesign). Fresh, welcoming, natural —
// NOT dark luxury. One wide hero + entry-card photos for "Choose Your Shopping
// Experience". DRY-RUN unless IMAGE_GENERATION_DRY_RUN=false.
// Writes source-images/homepage/<file>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'homepage');
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ITEMS = [
  {
    file: 'hero',
    ratio: '16:9',
    subject:
      'a welcoming modern florist scene — an abundant, beautifully styled display of fresh premium flower arrangements and lush green foliage on a light pale-wood and cream counter inside a bright, light-filled botanical studio; colourful yet elegant real flowers (garden roses, hydrangeas, lilies, ranunculus) with plenty of fresh eucalyptus and greenery, soft natural window daylight streaming in',
  },
  {
    file: 'retail',
    ratio: '4:5',
    subject:
      'a single beautiful hand-tied retail bouquet of fresh seasonal flowers in soft blush, white and green, loosely wrapped in cream paper, standing on a bright warm-white surface — a ready-to-gift florist bouquet',
  },
  {
    file: 'arrangements',
    ratio: '4:5',
    subject:
      'an elegant premium floral arrangement in a footed ceramic vase — refined and a touch more luxe: blush and cream garden roses with white orchids and soft foliage, the smallest restrained warm-gold accent, on a soft light cream background — the premium collection, still bright and fresh',
  },
  {
    file: 'supplies',
    ratio: '4:5',
    subject:
      'a bright, tidy flat-lay of florist supplies neatly arranged on a warm-white surface — clear glass vases, rolls of satin ribbon, kraft wrapping paper, twine and clean floristry tools, fresh and organised',
  },
];

const STYLE =
  'Bright, fresh, natural commercial florist photography. Light-filled and airy, warm-white and soft cream tones with plenty of fresh green — happy, welcoming and premium. Soft natural daylight, gentle shadows, true-to-life colour, clean modern editing. Photorealistic high-end florist catalogue quality; botanically accurate real flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly, not oversaturated, not a fantasy flower. Absolutely no black or dark background, no moody lighting, no gold-heavy styling, no fashion aesthetic. No text, no logo, no watermark, no people, no hands, no faces, no malformed or duplicated petals, no impossible stems.';
const NEGATIVE =
  'black background, dark background, moody lighting, gold-heavy, luxury fashion aesthetic, jewelry, people, hands, faces, text, printed words, logo, watermark, clutter, CGI, painterly, oversaturated, fantasy flowers, unrealistic bouquet, malformed petals, duplicated flowers, impossible stems, floating objects';
const prompt = (s) => `Fresh botanical florist photograph of ${s}. ${STYLE}`;

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  const items = ONLY ? ITEMS.filter((i) => ONLY.split(',').includes(i.file)) : ITEMS;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  HOMEPAGE REDESIGN IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
  console.log(`  items: ${items.length}${ONLY ? ` (--only=${ONLY})` : ''}`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const it of items) {
    const out = join(OUT, `${it.file}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip ${it.file}.png`); continue; }
    if (!live) { console.log(`   • plan ${it.file}.png  [${it.ratio}]`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(it.subject), negativePrompt: NEGATIVE, aspectRatio: it.ratio});
      if (res.ok && res.bytesBase64) {
        writeFileSync(out, Buffer.from(res.bytesBase64, 'base64'));
        saved = true; gen++;
        console.log(`   ✓ ${it.file}.png (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`);
      } else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ ${it.file}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err} → source-images/homepage/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
