// scripts/images/integrate.mjs — build the generated-image manifest that the
// storefront's image-resolution layer reads. Emits config/generated-image-manifest.json
// from APPROVED, optimized rows only. Does NOT edit routes or components, and
// never touches Shopify. Approved live products should still prefer Shopify
// media; this manifest feeds collection/editorial surfaces + experience fallbacks.
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, parseCsv, FORMATS} from './lib.mjs';

const MANIFEST = join(PATHS.generated, '..', '..', '..', 'config', 'generated-image-manifest.json');

function main() {
  if (!existsSync(PATHS.matrixCsv)) { console.error('  ✗ No matrix.'); process.exitCode = 1; return; }
  const rows = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));

  const assets = [];
  for (const row of rows) {
    if (String(row.approved).toLowerCase() !== 'true') continue;
    const stem = row.filename.replace(/\.webp$/, '');
    const fmt = FORMATS[row.placement] || FORMATS.card;
    const w = fmt.widths[fmt.widths.length - 1];
    const primary = join(PATHS.generated, row.experience, `${stem}-${w}.webp`);
    if (!existsSync(primary)) continue; // only ship approved AND built
    assets.push({
      asset_id: row.asset_id,
      experience: row.experience,
      flower_type: row.flower_type,
      color: row.color,
      collection_handle: row.collection_handle,
      product_handle: row.product_handle || null,
      placement: row.placement,
      aspect_ratio: row.aspect_ratio,
      base: `/images/generated/${row.experience}/${stem}`,
      widths: fmt.widths,
      formats: ['avif', 'webp'],
      alt: `${row.color} ${row.flower_type} — ${row.experience === 'deluxe' ? 'The New Greenhouse luxury gifting' : 'The New Greenhouse wholesale'}`,
    });
  }

  const manifest = {generatedAt: new Date().toISOString(), count: assets.length, assets};
  mkdirSync(join(PATHS.generated, '..', '..', '..', 'config'), {recursive: true});
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('════════════════════════════════════════════════════════════');
  console.log('  IMAGE INTEGRATE (manifest only — no route/component edits)');
  console.log(`  approved + built assets: ${assets.length} → config/generated-image-manifest.json`);
  if (assets.length === 0) console.log('  Nothing approved+built yet. Empty manifest written. No-op.');
  console.log('════════════════════════════════════════════════════════════');
}

main();
