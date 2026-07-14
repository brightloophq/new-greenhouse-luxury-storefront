// scripts/images/deluxe-demo.mjs — generate 4:5 luxury product photos for the
// 18 Deluxe demo products that shipped imageless. Same aesthetic as the luxury
// arrangements (premium wrap, plain blank ribbon, warm-ivory studio) so the
// whole Deluxe catalogue reads as one photoshoot.
//
// DRY-RUN by default (env). --force overwrites. --only=handle,handle restricts.
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'deluxe-demo');
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = !env.dryRun;
  let list = JSON.parse(readFileSync(join(ROOT, 'config', 'deluxe-demo-products.json'), 'utf8')).products;
  if (ONLY) {
    const want = new Set(ONLY.split(',').map((s) => s.trim()));
    list = list.filter((p) => want.has(p.handle));
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  DELUXE DEMO PRODUCTS (4:5) — ${live ? 'LIVE' : 'DRY-RUN'}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview} · ${list.length} image(s)`);
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
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err}  → source-images/deluxe-demo/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
