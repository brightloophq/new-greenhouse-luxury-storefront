// scripts/images/collection-heroes.mjs — generate WIDE 16:9 editorial hero
// banners for the Deluxe collection pages.
//
// Distinct from the 4:5 luxury arrangement product photos: these are wide
// styled scenes so the arrangement reads well in a full-width hero band (a
// portrait product photo crops badly there). Same cohesive warm-neutral,
// soft-lit look so the whole Deluxe set feels like one photoshoot.
//
// DRY-RUN by default (env). Never overwrites unless --force. Auto-retries.
// Writes source-images/collection-heroes/<handle>.png. --only=handle,handle
// restricts the set.
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'collection-heroes');
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BG =
  'a soft, evenly-lit warm ivory-to-pale-taupe seamless studio surface with a ' +
  'gentle natural grounding shadow — no black, no hard shadows, no gradient banding';

function prompt(subject) {
  return (
    `Wide luxury editorial photograph for a florist collection banner: ${subject}. ` +
    `Soft luxury studio lighting, balanced exposure, gentle highlights, shot on ${BG}. ` +
    `Photorealistic, high-end editorial quality; botanically accurate with natural ` +
    `petals, realistic leaves and true-to-life colours; wide cinematic composition ` +
    `with generous negative space so headline text can sit alongside the flowers. ` +
    `Horizontal 16:9 crop. No AI artifacts, no malformed or duplicated petals, no ` +
    `unrealistic colours, no vase logos, no people, no hands, no text, no lettering, ` +
    `no words, no watermark, no logo.`
  );
}
const NEGATIVE =
  'text, lettering, words, watermark, logo, gibberish, malformed petals, ' +
  'duplicated petals, extra limbs, unrealistic colours, oversaturated, plastic, CGI, ' +
  '3d render, painterly, blurry, noise, hands, people, black background, ' +
  'dark border, frame, vignette';

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = !env.dryRun;
  let list = JSON.parse(readFileSync(join(ROOT, 'config', 'collection-heroes.json'), 'utf8')).heroes;
  if (ONLY) {
    const want = new Set(ONLY.split(',').map((s) => s.trim()));
    list = list.filter((h) => want.has(h.handle));
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  COLLECTION HEROES (16:9) — ${live ? 'LIVE' : 'DRY-RUN'}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview} · ${list.length} hero(es)`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const item of list) {
    const out = join(OUT, `${item.handle}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip  ${item.handle}.png (exists)`); continue; }
    if (!live) { console.log(`   • plan  ${item.handle}.png`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(item.subject), negativePrompt: NEGATIVE, aspectRatio: '16:9'});
      if (res.ok && res.bytesBase64) {
        writeFileSync(out, Buffer.from(res.bytesBase64, 'base64')); saved = true; gen++;
        console.log(`   ✓ gen   ${item.handle}.png  (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`);
      } else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ fail  ${item.handle}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err}  → source-images/collection-heroes/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
