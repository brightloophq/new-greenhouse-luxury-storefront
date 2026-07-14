/**
 * Flower image pipeline — converts staged source images into responsive WebP.
 *
 *   source-images/flowers/<family>/<color>.{png,jpg,jpeg,webp}
 *        →  public/images/flowers/<family>/<color>-{200,300,400,800}.webp
 *
 * Scalable by design: to add a family, drop its source images into a new
 * source-images/flowers/<family>/ folder and run `npm run flowers:optimize`.
 * No UI or component changes are required — only flowers.ts data entries.
 *
 * - WebP quality 82 (within the 80–85 band), alpha preserved for cutouts.
 * - Never enlarges beyond the source; never crops (aspect ratio kept).
 */
import sharp from 'sharp';
import {readdirSync, mkdirSync, existsSync, statSync} from 'node:fs';
import {join, extname, basename, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ROOT = join(ROOT, 'source-images', 'flowers');
const OUT_ROOT = join(ROOT, 'public', 'images', 'flowers');
const WIDTHS = [200, 300, 400, 800];
const QUALITY = 82;
const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

async function run() {
  if (!existsSync(SRC_ROOT)) {
    console.error(`No source folder: ${SRC_ROOT}`);
    process.exitCode = 1;
    return;
  }
  const families = readdirSync(SRC_ROOT).filter((f) =>
    statSync(join(SRC_ROOT, f)).isDirectory(),
  );
  let files = 0;
  let generated = 0;
  let totalOut = 0;

  for (const family of families) {
    const srcDir = join(SRC_ROOT, family);
    const outDir = join(OUT_ROOT, family);
    mkdirSync(outDir, {recursive: true});
    const sources = readdirSync(srcDir).filter((f) =>
      SOURCE_EXT.has(extname(f).toLowerCase()),
    );

    for (const file of sources) {
      files += 1;
      const color = basename(file, extname(file));
      const input = join(srcDir, file);
      const meta = await sharp(input).metadata();
      const widths = WIDTHS.filter((w) => w <= (meta.width ?? Infinity));
      // Always emit at least the source width so tiny sources still resolve.
      if (widths.length === 0) widths.push(meta.width);

      for (const w of widths) {
        const out = join(outDir, `${color}-${w}.webp`);
        await sharp(input)
          .resize({width: w, withoutEnlargement: true})
          .webp({quality: QUALITY, effort: 5})
          .toFile(out);
        const size = statSync(out).size;
        totalOut += size;
        generated += 1;
        console.log(`  ${family}/${color}-${w}.webp  ${kb(size)}`);
      }
    }
  }

  console.log(
    `\nDone: ${generated} WebP files from ${files} sources (${families.length} families), ${kb(totalOut)} total.`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
