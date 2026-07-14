// scripts/images/audit.mjs — machine-readable image inventory summary.
// Read-only. The full human audit lives in docs/IMAGE_PIPELINE_AUDIT.md.
import {existsSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, parseCsv, kb} from './lib.mjs';
import {readFileSync} from 'node:fs';

function countFiles(dir) {
  if (!existsSync(dir)) return {files: 0, bytes: 0};
  let files = 0, bytes = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, {withFileTypes: true})) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { files++; bytes += statSync(p).size; }
    }
  };
  walk(dir);
  return {files, bytes};
}

const flowers = join(PATHS.generated, '..', 'flowers');
const gen = countFiles(PATHS.generated);
const orig = countFiles(PATHS.originals);
const flowerImgs = countFiles(flowers);

console.log('════════════════════════════════════════════════════════════');
console.log('  IMAGE AUDIT (machine summary) — see docs/IMAGE_PIPELINE_AUDIT.md');
console.log('════════════════════════════════════════════════════════════');
console.log(`  repo flower images ......... ${flowerImgs.files} files (${kb(flowerImgs.bytes)})`);
console.log(`  generated derivatives ...... ${gen.files} files (${kb(gen.bytes)})`);
console.log(`  generated originals ........ ${orig.files} files (${kb(orig.bytes)})`);

if (existsSync(PATHS.matrixCsv)) {
  const rows = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));
  const approved = rows.filter((r) => String(r.approved).toLowerCase() === 'true').length;
  const byStatus = rows.reduce((m, r) => ((m[r.generation_status] = (m[r.generation_status] || 0) + 1), m), {});
  console.log(`  matrix rows ................ ${rows.length} (approved: ${approved})`);
  console.log(`  generation_status .......... ${JSON.stringify(byStatus)}`);
} else {
  console.log('  matrix ..................... (not built — run npm run images:matrix)');
}
console.log('\n  Read-only. Nothing generated or changed.');
