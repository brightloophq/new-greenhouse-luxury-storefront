// Generate 6 variety-specific wholesale catalogue images (Phase 2A completions)
// in the approved pure-white-seamless / jute-twine style. DRY-RUN unless env
// IMAGE_GENERATION_DRY_RUN=false. Writes source-images/flowers/_phase2a/<file>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'flowers', '_phase2a');
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ITEMS = [
  {file: 'football-disbud', name: 'football disbud chrysanthemums',
   subject: 'a hand-tied bunch of fresh large round football chrysanthemums (disbud mums), each stem a single big round dense bloom in white and soft yellow'},
  {file: 'spider', name: 'spider chrysanthemums',
   subject: 'a hand-tied bunch of fresh spider chrysanthemums with long, thin, tubular curling spider-like petals radiating outward, in white and yellow'},
  {file: 'button-pompon', name: 'button pompon chrysanthemums',
   subject: 'a hand-tied bunch of fresh small round button pompon chrysanthemums, many tiny tight dense round blooms in assorted white, yellow and bronze'},
  {file: 'israeli-ruscus', name: 'Israeli ruscus foliage',
   subject: 'a hand-tied bunch of fresh Israeli ruscus greenery, upright green stems lined with broad, flat, pointed oval green leaves along the whole stem'},
  {file: 'anthurium-assorted', name: 'assorted anthurium',
   subject: 'a hand-tied bunch of fresh assorted anthurium stems, glossy heart-shaped waxy spathes in a natural mix of red, pink and white, each with an upright central spadix'},
  {file: 'torch-ginger', name: 'torch ginger flowers',
   subject: 'a hand-tied bunch of fresh torch ginger flowers (Etlingera elatior), tall straight stems each topped with one large waxy cone-shaped pink-and-red torch bloom'},
];

const prompt = (s, name) =>
  `Professional florist product catalog photograph of ${s}, photographed on a pure white seamless studio background that fills the entire square frame edge to edge — absolutely no black, no dark border, no frame, no vignette. The bunch is centred and shown in full including the green stems, tied near the base with thin natural jute twine, with roughly 10% even margin around it. Soft luxury commercial studio lighting, balanced exposure, natural highlights, and only a soft natural grounding shadow beneath the stems — no other shadows, no gradient, no props, no vase, no table, no people, no ribbon. Botanically accurate ${name} with correct petal/bract shape, bloom structure, foliage and stem thickness and natural variation. Square 1:1 composition, ultra sharp, high detail, natural colours, professional white balance, no artifacts, no duplicated or malformed flowers. Photorealistic commercial product photography — not CGI, not painterly, not over-saturated. No text, no logo, no watermark.`;
const NEGATIVE = 'black background, dark background, black border, dark border, frame, vignette, vase, table, props, ribbon, people, hands, text, logo, watermark, CGI, painterly, oversaturated, blurry, noise, malformed petals, duplicated flowers, wrong species';

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  PHASE 2A VARIETY IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
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
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err} → source-images/flowers/_phase2a/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
