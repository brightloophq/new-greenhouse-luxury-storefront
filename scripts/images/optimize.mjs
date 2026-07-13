// scripts/images/optimize.mjs — derive responsive web assets from generated
// originals. Reads source-images/generated-originals/<stem>.png, emits WebP
// (+ AVIF) derivatives into public/images/generated/<experience>/ at the widths
// defined for each placement. Never enlarges past the source; strips metadata.
// Originals are never served directly. Graceful when nothing has been generated.
import sharp from 'sharp';
import {existsSync, mkdirSync, writeFileSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, parseCsv, FORMATS, kb} from './lib.mjs';

const QUALITY_WEBP = 82;
const QUALITY_AVIF = 50;

async function main() {
  if (!existsSync(PATHS.matrixCsv)) {
    console.error('  ✗ No matrix. Run npm run images:matrix.');
    process.exitCode = 1;
    return;
  }
  const rows = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));
  let originals = 0, derivatives = 0, totalOut = 0, skipped = 0;

  for (const row of rows) {
    const stem = row.filename.replace(/\.webp$/, '');
    const src = join(PATHS.originals, `${stem}.png`);
    if (!existsSync(src)) { skipped++; continue; }
    originals++;
    const fmt = FORMATS[row.placement] || FORMATS.card;
    const outDir = join(PATHS.generated, row.experience);
    mkdirSync(outDir, {recursive: true});

    const meta = await sharp(src).metadata();
    for (const w of fmt.widths) {
      if (meta.width && w > meta.width) continue; // never enlarge
      const h = Math.round((w * fmt.height) / fmt.width);
      for (const [ext, opts] of [['webp', {quality: QUALITY_WEBP}], ['avif', {quality: QUALITY_AVIF}]]) {
        const out = join(outDir, `${stem}-${w}.${ext}`);
        const buf = await sharp(src)
          .resize(w, h, {fit: 'cover', position: 'attention'}) // intelligent crop
          .toFormat(ext, opts)
          .toBuffer();
        writeFileSync(out, buf); // sharp already drops metadata by default
        derivatives++; totalOut += buf.length;
      }
    }
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('  IMAGE OPTIMIZE');
  console.log(`  originals processed: ${originals} · derivatives written: ${derivatives} (${kb(totalOut)})`);
  console.log(`  rows without an original yet: ${skipped}`);
  if (originals === 0) console.log('  Nothing to optimize yet (no generated originals). No-op.');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
