// Optimize homepage-redesign originals → responsive WebP.
//   hero.png    → /images/homepage/hero-{768,1280,1920}.webp   (16:9)
//   <card>.png  → /images/homepage/<card>-{400,600,800}.webp   (4:5)
import sharp from 'sharp';
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import {join, basename} from 'node:path';

const ROOT = 'C:/Users/ibnor/Desktop/new-greenhouse-luxury-storefront';
const SRC = join(ROOT, 'source-images', 'homepage');
const OUT = join(ROOT, 'public', 'images', 'homepage');
const QUALITY = 82;
const HERO = {widths: [768, 1280, 1920], w: 16, h: 9};
const CARD = {widths: [400, 600, 800], w: 4, h: 5};

async function main() {
  if (!existsSync(SRC)) { console.error('  ✗ no source-images/homepage'); process.exitCode = 1; return; }
  mkdirSync(OUT, {recursive: true});
  let derivatives = 0, bytes = 0;
  for (const png of readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
    const slug = basename(png, '.png');
    const src = join(SRC, png);
    const fmt = slug === 'hero' ? HERO : CARD;
    const meta = await sharp(src).metadata();
    for (const w of fmt.widths) {
      if (meta.width && w > meta.width) continue;
      const h = Math.round((w * fmt.h) / fmt.w);
      const buf = await sharp(src)
        .resize(w, h, {fit: 'cover', position: 'attention'})
        .webp({quality: QUALITY})
        .toBuffer();
      writeFileSync(join(OUT, `${slug}-${w}.webp`), buf);
      derivatives++; bytes += buf.length;
    }
    console.log(`   ✓ ${slug} → ${fmt.widths.join('/')} (${fmt.w}:${fmt.h})`);
  }
  console.log(`\n  DONE — ${derivatives} webp (${Math.round(bytes / 1024)} KB) → public/images/homepage/`);
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
