// scripts/images/luxury-arrangements.mjs — generate finished LUXURY ARRANGEMENT
// product photography for the Deluxe experience.
//
// Distinct from the wholesale flower library (white-bg loose bunches): these are
// complete, gift-ready arrangements with premium wrapping + a plain (blank)
// champagne-gold/black ribbon, soft luxury lighting, on a cohesive warm-neutral
// editorial background so the whole set reads as one high-end photoshoot.
//
// DRY-RUN by default (env). Never overwrites unless --force. Auto-retries.
// Writes source-images/luxury/<handle>.png. Use --proof for the 3 style-lock
// arrangements; otherwise reads the full list below.
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'luxury');
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const PROOF = argv.includes('--proof');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Consistent "same photoshoot" background + lighting for the whole Deluxe set.
const BG =
  'a soft, evenly-lit warm ivory-to-pale-taupe seamless studio background with a ' +
  'gentle natural grounding shadow — no black, no hard shadows, no gradient banding';

function prompt(subject) {
  return (
    `Luxury florist product photograph of a finished, gift-ready premium floral ` +
    `arrangement: ${subject}. Professionally hand-arranged with refined density and ` +
    `elegant premium wrapping (kraft and ivory tissue), finished with a plain ` +
    `champagne-gold and black satin ribbon that is smooth and completely blank — ` +
    `absolutely no text, lettering, words or writing on the ribbon. Soft luxury ` +
    `studio lighting, balanced exposure, gentle highlights, on ${BG}. Photorealistic, ` +
    `high-end florist catalogue quality; botanically accurate with natural petals, ` +
    `realistic leaves and true-to-life colours; balanced editorial composition with ` +
    `generous negative space, centred subject. Vertical 4:5 crop. No AI artifacts, no ` +
    `malformed or duplicated petals, no unrealistic colours, no vase, no people, no ` +
    `hands, no text, no logo, no watermark.`
  );
}
const NEGATIVE =
  'text, lettering, words on ribbon, watermark, logo, gibberish, malformed petals, ' +
  'duplicated petals, extra limbs, unrealistic colours, oversaturated, plastic, CGI, ' +
  '3d render, painterly, blurry, noise, vase, jar, glass, hands, people, black background, ' +
  'dark border, frame, vignette';

const PROOF_SET = [
  {handle: 'grand-red-rose-arrangement', subject: 'a grand, opulent arrangement of two dozen deep red roses'},
  {handle: 'white-orchid-elegance', subject: 'an elegant tall arrangement of pure white phalaenopsis orchids'},
  {handle: 'blush-romance-bouquet', subject: 'a romantic hand-tied bouquet of blush-pink and ivory roses with soft white accents'},
];

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = !env.dryRun;
  const full = JSON.parse(readFileSync(join(ROOT, 'config', 'luxury-arrangements.json'), 'utf8')).arrangements;
  const list = PROOF ? PROOF_SET : full;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  LUXURY ARRANGEMENTS — ${live ? 'LIVE' : 'DRY-RUN'}${PROOF ? ' · STYLE-LOCK PROOF' : ''}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview} · ${list.length} concept(s)`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const item of list) {
    const out = join(OUT, `${item.handle}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip  ${item.handle}.png (exists)`); continue; }
    if (!live) { console.log(`   • plan  ${item.handle}.png`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(item.subject), negativePrompt: NEGATIVE, aspectRatio: '4:5'});
      if (res.ok && res.bytesBase64) {
        writeFileSync(out, Buffer.from(res.bytesBase64, 'base64')); saved = true; gen++;
        console.log(`   ✓ gen   ${item.handle}.png  (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`);
      } else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ fail  ${item.handle}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err}  → source-images/luxury/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
