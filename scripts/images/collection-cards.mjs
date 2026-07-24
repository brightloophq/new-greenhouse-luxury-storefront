// Generate unique premium COLLECTION-CARD images (Part 2 refinement). Each card
// gets its own photorealistic image that matches its title — no reused bouquet
// across cards. Classic cards read as wholesale (buckets/bunches); Deluxe cards
// read as finished luxury arrangements. Square 1:1 (cards use object-fit cover).
// DRY-RUN unless IMAGE_GENERATION_DRY_RUN=false. Writes source-images/collections/<file>.png
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const ROOT = join(PATHS.generated, '..', '..', '..');
const OUT = join(ROOT, 'source-images', 'collections');
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// exp: 'classic' | 'deluxe' drives the house style. file = output slug.
const ITEMS = [
  // ── Classic (wholesale): market-fresh bunches & buckets, NOT arrangements ──
  {file: 'wholesale-flowers', exp: 'classic', subject: 'an abundant wholesale florist display of fresh-cut flowers standing in tall galvanised buckets — generous bunches of roses, lilies, chrysanthemums and seasonal blooms in mixed colours, market-fresh and plentiful, a professional wholesale flower supply setting'},
  {file: 'greenery-fillers', exp: 'classic', subject: 'full wholesale bunches of fresh eucalyptus, ruscus, leatherleaf and mixed foliage greenery gathered in buckets, verdant lush and abundant, a professional florist greenery supply'},
  // ── Deluxe (luxury): finished, gift-ready arrangements & bouquets ──
  {file: 'signature-collection', exp: 'deluxe', subject: 'an opulent signature luxury bouquet of ivory, blush and champagne-toned roses with white orchids and fine seasonal foliage, hand-tied and gift-ready, the house signature style'},
  {file: 'best-sellers', exp: 'deluxe', subject: 'a lavish, abundant best-selling luxury arrangement in rich romantic tones of red, blush and cream, full and generous, in a refined footed vase'},
  {file: 'all-flowers', exp: 'deluxe', subject: 'an elegant editorial arrangement showcasing premium single-variety luxury stems together — long-stem roses, phalaenopsis orchids and lilies — beautifully composed'},
  {file: 'luxury-bouquets', exp: 'deluxe', subject: 'a grand hand-tied luxury bouquet of garden roses, ranunculus and peonies in blush, peach and cream, wrapped in ivory tissue with a satin ribbon'},
  {file: 'roses', exp: 'deluxe', subject: 'a luxurious arrangement of two dozen premium long-stem roses in deep red and soft blush, classic and romantic, in an elegant vase'},
  {file: 'orchids', exp: 'deluxe', subject: 'a refined sculptural arrangement of pristine white phalaenopsis orchids with architectural stems in a modern ceramic vessel, minimal and elegant'},
  {file: 'seasonal-deluxe', exp: 'deluxe', subject: 'a bold sophisticated seasonal luxury arrangement of tropical premium blooms — anthurium, protea, orchids and monstera accents — striking and contemporary'},
  {file: 'add-ons', exp: 'deluxe', subject: 'a refined luxury gift set styled together — a petite blush flower posy of roses and ranunculus beside a plain unlabelled scented candle in an amber glass and a plain unlabelled cream gift box tied with a thin satin ribbon; every item is completely plain with absolutely no printed labels, no branding and no writing of any kind'},
];

const CLASSIC_STYLE =
  'Professional wholesale florist photograph. Fresh, plentiful and market-real — generous bunches and buckets, not a single gift arrangement. Photographed slightly above eye-level, subject centred with a little breathing room, on a clean neutral pale-grey to soft-white studio-market background — bright, fresh and airy, no black background, no clutter. Natural bright daylight, true-to-life colour, crisp and vivid but not oversaturated. Square 1:1 composition. Photorealistic high-end catalogue quality; botanically accurate flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly. No text, no logo, no watermark, no people, no hands, no faces, no price tags, no malformed or duplicated petals, no impossible stems, no floating objects.';

const DELUXE_STYLE =
  'Finished, gift-ready premium florist arrangement, professionally hand-arranged with refined density. Photographed eye-level and straight-on, subject centred with generous negative space and about a 10% margin, on a soft warm ivory-to-pale-taupe seamless luxury studio background with a gentle grounding shadow — no black background, no hard shadows, no props, no table. Soft directional luxury studio lighting, balanced exposure, restrained warm gold accents where natural. Warm, natural, true-to-life colour, premium editorial finish. Square 1:1 composition. Photorealistic high-end florist catalogue quality; botanically accurate flowers with correct petal shape; ultra sharp, high detail; not CGI, not painterly, not oversaturated. No text, no logo, no watermark, no people, no hands, no faces, no malformed or duplicated petals, no impossible stems, no floating accessories.';

const NEGATIVE = 'people, hands, faces, text, printed words, logo, watermark, price tag, black background, dark background, harsh shadow, clutter, extra props, CGI, painterly, oversaturated, malformed petals, duplicated flowers, impossible stems, floating objects';
const prompt = (it) =>
  it.exp === 'classic'
    ? `Wholesale florist photograph of ${it.subject}. ${CLASSIC_STYLE}`
    : `Luxury florist photograph of ${it.subject}. ${DELUXE_STYLE}`;

async function main() {
  const env = loadImageEnv();
  const live = !env.dryRun;
  const items = ONLY ? ITEMS.filter((i) => ONLY.split(',').includes(i.file)) : ITEMS;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  COLLECTION CARD IMAGES — ${live ? 'LIVE' : 'DRY-RUN'}  (${envSummary().model})`);
  console.log(`  items: ${items.length}${ONLY ? ` (--only=${ONLY})` : ''}`);
  console.log('════════════════════════════════════════════════════════════');
  mkdirSync(OUT, {recursive: true});
  let gen = 0, skip = 0, err = 0;
  for (const it of items) {
    const out = join(OUT, `${it.file}.png`);
    if (existsSync(out) && !FORCE) { skip++; console.log(`   • skip ${it.file}.png`); continue; }
    if (!live) { console.log(`   • plan ${it.file}.png  [${it.exp}]`); continue; }
    let saved = false;
    for (let a = 0; a <= env.maxRetries && !saved; a++) {
      const res = await generateImage({prompt: prompt(it), negativePrompt: NEGATIVE, aspectRatio: '1:1'});
      if (res.ok && res.bytesBase64) {
        writeFileSync(out, Buffer.from(res.bytesBase64, 'base64'));
        saved = true; gen++;
        console.log(`   ✓ ${it.file}.png (${kb(Buffer.from(res.bytesBase64, 'base64').length)})${a ? ` [retry ${a}]` : ''}`);
      } else if (a < env.maxRetries) await sleep(1000 * (a + 1));
      else { err++; console.error(`   ✗ ${it.file}.png: ${redact(res.error || 'no image')}`); }
    }
    if (live) await sleep(env.rateLimitMs);
  }
  console.log(`\n  DONE — generated ${gen} · skipped ${skip} · errors ${err} → source-images/collections/`);
}
main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
