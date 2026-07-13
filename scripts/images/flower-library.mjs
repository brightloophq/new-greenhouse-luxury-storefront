// scripts/images/flower-library.mjs — generate the standardized flower catalog
// library to match the APPROVED Alstroemeria gold standard:
//   pure white seamless background · thin natural jute twine tie · centered,
//   full bouquet with visible stems · soft studio light + soft grounding shadow ·
//   square 1:1 · photoreal commercial product photography. No vase/props/people/
//   ribbon/text.
//
// Writes originals to source-images/flowers/<handle>/<colourFile>.png. Run
// `npm run flowers:optimize` afterwards to emit the responsive WebP the
// storefront already consumes (public/images/flowers/<handle>/<file>-<w>.webp).
//
// DRY-RUN by default (env IMAGE_GENERATION_DRY_RUN). Never overwrites an existing
// file unless --force. Auto-retries a failed generation up to the env retry
// bound. Stops a run once errors exceed the env error threshold.
//
// Usage:
//   node scripts/images/flower-library.mjs --only=carnations        (proof)
//   node scripts/images/flower-library.mjs                          (all remaining)
//   node scripts/images/flower-library.mjs --force --only=carnations
import {existsSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..'); // repo root
const SRC_FLOWERS = join(ROOT, 'source-images', 'flowers');

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const only = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const ONLY = only ? new Set(only.split(',')) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Common commercial colourways per category (Alstroemeria already shipped).
// Greenery/filler types are single "colour" (the material itself).
const LIBRARY = [
  ['asters', 'Asters', [['White','white'],['Pink','pink'],['Purple','purple'],['Lavender','lavender']]],
  ['babys-breath', "Baby's Breath", [['White','white']]],
  ['calla-lilies', 'Calla Lilies', [['White','white'],['Yellow','yellow'],['Pink','pink'],['Purple','purple'],['Orange','orange']]],
  // --- Researched variety expansion (real commercial types/colours) ---------
  ['eucalyptus', 'Eucalyptus', [
    ['Silver Dollar','silver-dollar'],
    ['Seeded','seeded','seeded eucalyptus with textured green seed pods'],
    ['Baby Blue','baby-blue','Baby Blue eucalyptus with round dusty-blue-green leaves'],
    ['Willow','willow','willow eucalyptus with long slender leaves'],
    ['Parvifolia','parvifolia','parvifolia small-leaf eucalyptus'],
  ]],
  ['greenery', 'Greenery', [
    ['Mixed','mixed'],
    ['Italian Ruscus','ruscus','Italian ruscus foliage with glossy pointed green leaves'],
    ['Salal','salal','salal lemon-leaf foliage with broad glossy green leaves'],
    ['Leatherleaf Fern','leatherleaf-fern','leatherleaf fern fronds'],
    ['Pittosporum','pittosporum','green pittosporum foliage'],
    ['Bear Grass','bear-grass','wispy green bear grass'],
  ]],
  ['tropicals', 'Tropical Flowers', [
    ['Mixed','mixed'],
    ['Bird of Paradise','bird-of-paradise','orange and blue bird of paradise flowers'],
    ['Anthurium Red','anthurium-red','glossy heart-shaped red anthurium'],
    ['Anthurium Pink','anthurium-pink','glossy heart-shaped pink anthurium'],
    ['Ginger','ginger','red torch ginger flowers'],
    ['Heliconia','heliconia','red and yellow heliconia lobster-claw flowers'],
    ['Protea','protea','pink king protea'],
  ]],
  ['fillers', 'Fillers', [
    ['White','white'],
    ['Green','green'],
    ['Wax Flower','wax-flower-pink','delicate pink waxflower filler'],
    ['Statice','statice-purple','purple statice filler flowers'],
    ['Solidago','solidago','golden yellow solidago filler'],
    ['Limonium','limonium','airy lavender limonium filler'],
  ]],
  ['hypericum', 'Hypericum Berries', [
    ['Red','red'],['Green','green'],['Peach','peach'],
    ['Pink','pink'],['Ivory','ivory'],['Burgundy','burgundy'],
  ]],
  ['orchids', 'Orchids', [
    ['White','white'],['Purple','purple'],['Pink','pink'],
    ['Green','green'],['Yellow','yellow'],
  ]],
  ['novelties', 'Novelty Blooms', [
    ['Mixed','mixed'],
    ['Billy Balls','billy-balls','yellow craspedia billy balls'],
    ['Celosia','celosia','pink brain celosia'],
    ['Scabiosa Pods','scabiosa-pods','round scabiosa seed pods'],
  ]],
  ['gift-bouquets', 'Gift Bouquets', [
    ['Mixed','mixed'],
    ['Pastel Mixed','pastel','a mixed pastel gift bouquet of soft pink, cream and lavender flowers'],
    ['Bright Mixed','bright','a mixed bright gift bouquet of vivid pink, orange and yellow flowers'],
  ]],
  ['carnations', 'Carnations', [['White','white'],['Pink','pink'],['Red','red'],['Burgundy','burgundy'],['Peach','peach'],['Yellow','yellow'],['Lavender','lavender']]],
  ['chrysanthemums', 'Chrysanthemums', [['White','white'],['Yellow','yellow'],['Purple','purple'],['Pink','pink'],['Red','red'],['Bronze','bronze']]],
  ['delphinium', 'Delphinium', [['Blue','blue'],['White','white'],['Purple','purple'],['Pink','pink']]],
  ['gerbera-daisies', 'Gerbera Daisies', [['White','white'],['Pink','pink'],['Red','red'],['Yellow','yellow'],['Orange','orange']]],
  ['hydrangea', 'Hydrangea', [['White','white'],['Blue','blue'],['Pink','pink'],['Green','green'],['Purple','purple']]],
  ['lilies', 'Lilies', [['White','white'],['Pink','pink'],['Orange','orange'],['Yellow','yellow']]],
  ['lisianthus', 'Lisianthus', [['White','white'],['Pink','pink'],['Purple','purple'],['Lavender','lavender']]],
  ['ranunculus', 'Ranunculus', [['White','white'],['Pink','pink'],['Red','red'],['Yellow','yellow'],['Orange','orange']]],
  ['roses-in-stock', 'Roses', [['Red','red'],['White','white'],['Pink','pink'],['Yellow','yellow'],['Orange','orange'],['Lavender','lavender'],['Peach','peach']]],
  ['snapdragon', 'Snapdragon', [['White','white'],['Pink','pink'],['Yellow','yellow'],['Red','red'],['Purple','purple']]],
  ['spray-roses', 'Spray Roses', [['White','white'],['Pink','pink'],['Red','red'],['Yellow','yellow'],['Peach','peach']]],
  ['stock', 'Stock', [['White','white'],['Pink','pink'],['Purple','purple'],['Lavender','lavender']]],
  ['tulips', 'Tulips', [['White','white'],['Pink','pink'],['Yellow','yellow'],['Purple','purple'],['Orange','orange'],['Red','red']]],
];

function buildPrompt(name, colorLabel, override) {
  // `override` (optional 3rd tuple element) is an explicit subject phrase for
  // TYPE-based varieties (e.g. "seeded eucalyptus", "Italian ruscus foliage",
  // "orange bird of paradise") where the label is not a colour.
  const single = ['Mixed', 'Silver Dollar'].includes(colorLabel);
  const subject = override
    ? `a hand-tied bunch of fresh ${override}`
    : single
      ? `a hand-tied bunch of fresh ${name}`
      : `a hand-tied bunch of fresh ${colorLabel} ${name}, true ${colorLabel.toLowerCase()} colour`;
  return (
    `Professional florist product catalog photograph of ${subject}, photographed ` +
    `on a pure white seamless studio background that fills the entire square frame ` +
    `edge to edge — absolutely no black, no dark border, no frame, no vignette, no ` +
    `dark edges or corners. The bunch is centred and shown ` +
    `in full including the green stems, tied near the base with thin natural jute ` +
    `twine, with roughly 10% even margin around it. Soft luxury commercial studio ` +
    `lighting, balanced exposure, natural highlights, and only a soft natural ` +
    `grounding shadow beneath the stems — no other shadows, no gradient, no ` +
    `texture, no props, no vase, no table, no people, no ribbon. Botanically ` +
    `accurate ${name} with correct petal shape, bloom structure, foliage and stem ` +
    `thickness and natural variation; natural imperfections only. Square 1:1 ` +
    `composition, ultra sharp, high detail, natural colours, professional white ` +
    `balance, no noise, no blur, no artifacts, no duplicated or malformed flowers. ` +
    `Photorealistic commercial product photography — not CGI, not painterly, not ` +
    `over-saturated. No text, no logo, no watermark.`
  );
}

const NEGATIVE =
  'black background, dark background, black border, dark border, frame, ' +
  'vignette, dark edges, dark corners, matte, vase, jar, container, glass, ' +
  'table, surface, hands, people, ribbon, wrapping paper, cellophane, text, ' +
  'letters, watermark, logo, gradient background, coloured background, props, ' +
  'decorations, CGI, 3d render, painterly, illustration, oversaturated, blurry, ' +
  'noise, duplicated petals, malformed flowers';

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = !env.dryRun;
  const cats = LIBRARY.filter(([h]) => !ONLY || ONLY.has(h));

  console.log('════════════════════════════════════════════════════════════');
  console.log(`  FLOWER LIBRARY — ${live ? 'LIVE GENERATION' : 'DRY-RUN'}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview}`);
  console.log(`  categories: ${cats.length}${ONLY ? ` (only ${[...ONLY].join(', ')})` : ' (all remaining)'} · force=${FORCE}`);
  console.log('  gold standard: white seamless bg · jute twine · square · no props');
  console.log('════════════════════════════════════════════════════════════');

  const reportPath = join(ROOT, 'reports', 'FLOWER_LIBRARY_PROGRESS.md');
  mkdirSync(join(ROOT, 'reports'), {recursive: true});
  if (!existsSync(reportPath)) writeFileSync(reportPath, `# Flower Library — Generation Progress\n\nGold standard: Alstroemeria (white seamless bg, jute twine, square).\n`, 'utf8');

  let totalGen = 0, totalSkip = 0, totalErr = 0;
  for (const [handle, name, colors] of cats) {
    const dir = join(SRC_FLOWERS, handle);
    mkdirSync(dir, {recursive: true});
    let gen = 0, skip = 0, err = 0;
    console.log(`\n▸ ${name} (${handle}) — ${colors.length} colour(s)`);

    for (const [colorLabel, file, override] of colors) {
      const out = join(dir, `${file}.png`);
      if (existsSync(out) && !FORCE) { skip++; totalSkip++; console.log(`   • skip  ${handle}/${file}.png (exists)`); continue; }

      if (!live) { console.log(`   • plan  ${handle}/${file}.png  [${colorLabel} ${name}]`); continue; }

      let saved = false;
      for (let attempt = 0; attempt <= env.maxRetries && !saved; attempt++) {
        const res = await generateImage({prompt: buildPrompt(name, colorLabel, override), negativePrompt: NEGATIVE, aspectRatio: '1:1'});
        if (res.ok && res.bytesBase64) {
          const buf = Buffer.from(res.bytesBase64, 'base64');
          writeFileSync(out, buf); // never save API failures; only successful bytes
          saved = true; gen++; totalGen++;
          console.log(`   ✓ gen   ${handle}/${file}.png  (${kb(buf.length)})${attempt ? ` [retry ${attempt}]` : ''}`);
        } else if (attempt < env.maxRetries) {
          await sleep(1000 * (attempt + 1));
        } else {
          err++; totalErr++;
          console.error(`   ✗ fail  ${handle}/${file}.png: ${redact(res.error || 'no image')}`);
        }
      }
      if (totalErr >= env.errorThreshold) {
        console.error(`\n  ✗ error threshold (${env.errorThreshold}) reached — stopping run.`);
        appendFileSync(reportPath, `\n## ${name} — STOPPED (error threshold)\n- generated ${gen}, skipped ${skip}, errors ${err}\n`, 'utf8');
        return summary(totalGen, totalSkip, totalErr);
      }
      if (live) await sleep(env.rateLimitMs);
    }
    appendFileSync(reportPath, `\n## ${name} (${handle})\n- generated ${gen} · skipped ${skip} · errors ${err} · colours: ${colors.map((c) => c[0]).join(', ')}\n`, 'utf8');
    console.log(`   → ${name}: generated ${gen}, skipped ${skip}, errors ${err}`);
  }
  summary(totalGen, totalSkip, totalErr);
  console.log(`\n  Next: npm run flowers:optimize  → responsive WebP for the storefront.`);
}

function summary(g, s, e) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  DONE — generated ${g} · skipped ${s} · errors ${e}`);
  console.log('  Progress report: reports/FLOWER_LIBRARY_PROGRESS.md');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
