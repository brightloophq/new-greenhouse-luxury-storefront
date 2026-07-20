// New unified-brand hero image (2026): vibrant, colourful, lush GREENERY-forward
// botanical — bright and inviting, for the split hero's right column (portrait).
// DRY-RUN unless IMAGE_GENERATION_DRY_RUN=false. → source-images/homepage/<file>.png
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
    file: 'hero-split-a',
    ratio: '4:5',
    subject:
      'a vibrant, lush botanical florist arrangement overflowing with fresh colourful flowers and abundant green foliage — garden roses, dahlias, ranunculus and hydrangea in bright coral, pink, butter-yellow and white, with plenty of eucalyptus, ferns and trailing greenery — full, generous and inviting, photographed in bright natural daylight',
  },
  {
    file: 'hero-split-b',
    ratio: '4:5',
    subject:
      'a bright modern florist studio corner — a large lush arrangement of vivid seasonal flowers and abundant fresh greenery in a ceramic vase on a pale wood surface, with leafy potted plants and eucalyptus around it, sunlight and greenery everywhere, fresh and welcoming',
  },
];

const STYLE =
  'Bright, fresh, vibrant commercial florist photography — light-filled and airy with lots of healthy green foliage, colourful yet natural, happy and welcoming. Soft natural daylight, gentle shadows, true-to-life saturated-but-realistic colour, clean modern editing. Photorealistic high-end florist catalogue quality; botanically accurate real flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly, not a fantasy flower. Absolutely no black or dark background, no moody or luxury-fashion lighting, no gold-heavy styling. Soft light neutral or gentle green-tinged background. No text, no logo, no watermark, no people, no hands, no faces, no malformed or duplicated petals.';
const NEGATIVE =
  'black background, dark background, moody lighting, luxury fashion aesthetic, gold-heavy, jewelry, people, hands, faces, text, printed words, logo, watermark, clutter, CGI, painterly, oversaturated, fantasy flowers, unrealistic bouquet, malformed petals, duplicated flowers, impossible stems';
const prompt = (s) => `Fresh botanical florist photograph of ${s}. ${STYLE}`;

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  const items = ONLY ? ITEMS.filter((i) => ONLY.split(',').includes(i.file)) : ITEMS;
  console.log(`  NEW HERO (split) — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
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
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err}`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
