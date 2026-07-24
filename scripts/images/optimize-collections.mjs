// Optimize the generated collection-card originals into responsive WebP.
// Reads source-images/collections/<slug>.png → public/images/collections/<slug>-{400,600,800}.webp
// Square 1:1 (cards use object-fit: cover). Matches the occasion-card convention
// that the homepage localSrcSet() consumes (-800.webp → 400/600/800 srcset).
import sharp from 'sharp';
import {existsSync, mkdirSync, readdirSync, writeFileSync, statSync} from 'node:fs';
import {join, basename} from 'node:path';

const ROOT = 'C:/Users/ibnor/Desktop/new-greenhouse-luxury-storefront';
const SRC = join(ROOT, 'source-images', 'collections');
const OUT = join(ROOT, 'public', 'images', 'collections');
const WIDTHS = [400, 600, 800];
const QUALITY = 82;

async function main() {
  if (!existsSync(SRC)) {
    console.error('  ✗ no source-images/collections');
    process.exitCode = 1;
    return;
  }
  mkdirSync(OUT, {recursive: true});
  const pngs = readdirSync(SRC).filter((f) => f.endsWith('.png'));
  let derivatives = 0;
  let bytes = 0;
  for (const png of pngs) {
    const slug = basename(png, '.png');
    const src = join(SRC, png);
    const meta = await sharp(src).metadata();
    for (const w of WIDTHS) {
      if (meta.width && w > meta.width) continue; // never enlarge
      const buf = await sharp(src)
        .resize(w, w, {fit: 'cover', position: 'attention'}) // square, smart crop
        .webp({quality: QUALITY})
        .toBuffer();
      const out = join(OUT, `${slug}-${w}.webp`);
      writeFileSync(out, buf);
      derivatives++;
      bytes += buf.length;
    }
    console.log(`   ✓ ${slug} → ${WIDTHS.join('/')}`);
  }
  console.log(`\n  DONE — ${pngs.length} originals → ${derivatives} webp derivatives (${Math.round(bytes / 1024)} KB) → public/images/collections/`);
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
