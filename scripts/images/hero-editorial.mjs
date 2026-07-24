// Editorial hero candidates — a lush, bright arrangement on a SEAMLESS warm-cream
// ground so it blends into the cream hero section (Blossom&Bone / Buton style).
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
    file: 'hero-bloom-a',
    ratio: '3:2',
    subject:
      'a lush, abundant, romantic fresh floral arrangement — garden roses, dahlias, ranunculus, lisianthus, hydrangea and trailing eucalyptus in soft blush, cream, coral, peach and fresh green — in a low elegant footed ceramic vessel, photographed straight-on and centred',
  },
  {
    file: 'hero-bloom-b',
    ratio: '3:2',
    subject:
      'an elegant, airy fresh floral arrangement — pale garden roses, white hydrangea, snapdragons, ranunculus and eucalyptus in a soft palette of ivory, blush, butter-yellow and green — loosely arranged in a fluted cream vase, photographed straight-on and centred, a little taller than wide',
  },
  {
    file: 'hero-bloom-c',
    ratio: '3:2',
    subject:
      'a generous, colourful yet refined fresh floral arrangement — roses, dahlias, lisianthus, stock and eucalyptus in warm blush, coral, soft pink, cream and green — in a low elegant vessel, photographed straight-on and centred, full and welcoming',
  },
];

const STYLE =
  'Bright, calm, editorial florist photography on a soft, SEAMLESS warm-cream (#faf8f4) to pale-blush studio background — no visible horizon, no table edge, no wall line, just a soft continuous cream backdrop with a gentle grounding shadow. Generous soft negative space around the arrangement. Soft diffused natural daylight, true-to-life colour, airy and premium, warm and welcoming. Photorealistic high-end florist catalogue quality; botanically accurate real flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly, not oversaturated, not a fantasy flower. Absolutely no black or dark background, no moody lighting, no gold, no people, no hands, no text, no logo, no watermark, no malformed or duplicated petals.';
const NEGATIVE =
  'black background, dark background, moody lighting, gold, jewelry, people, hands, faces, text, printed words, logo, watermark, table edge, wall line, horizon line, clutter, extra props, CGI, painterly, oversaturated, fantasy flowers, malformed petals, duplicated flowers, impossible stems';
const prompt = (s) => `Editorial florist photograph of ${s}. ${STYLE}`;

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  const items = ONLY ? ITEMS.filter((i) => ONLY.split(',').includes(i.file)) : ITEMS;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  EDITORIAL HERO CANDIDATES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
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
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err}`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
