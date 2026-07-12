/**
 * Page / editorial hero image pipeline.
 *   source-images/pages/<name>.{png,jpg,jpeg,webp}
 *        →  public/images/pages/<name>-{640,1024,1600}.webp
 *
 * Add an image + run `npm run pages:optimize`. Aspect ratio is preserved
 * (never cropped); WebP quality 82; never enlarged past the source.
 */
import sharp from 'sharp';
import {readdirSync, mkdirSync, existsSync, statSync} from 'node:fs';
import {join, extname, basename, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'source-images', 'pages');
const OUT = join(ROOT, 'public', 'images', 'pages');
const WIDTHS = [640, 1024, 1600];
const QUALITY = 82;
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

async function run() {
  if (!existsSync(SRC)) {
    console.error(`No source folder: ${SRC}`);
    process.exitCode = 1;
    return;
  }
  mkdirSync(OUT, {recursive: true});
  let count = 0;
  let total = 0;
  for (const file of readdirSync(SRC)) {
    if (!EXT.has(extname(file).toLowerCase())) continue;
    const name = basename(file, extname(file));
    const meta = await sharp(join(SRC, file)).metadata();
    const widths = WIDTHS.filter((w) => w <= (meta.width ?? Infinity));
    if (widths.length === 0) widths.push(meta.width);
    for (const w of widths) {
      const out = join(OUT, `${name}-${w}.webp`);
      await sharp(join(SRC, file))
        .resize({width: w, withoutEnlargement: true})
        .webp({quality: QUALITY, effort: 5})
        .toFile(out);
      const size = statSync(out).size;
      total += size;
      count += 1;
      console.log(`  pages/${name}-${w}.webp  ${kb(size)}`);
    }
  }
  console.log(`\nDone: ${count} WebP, ${kb(total)} total.`);
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
