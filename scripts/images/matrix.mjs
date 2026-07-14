// scripts/images/matrix.mjs — build/refresh config/image-generation-matrix.csv.
//
// Emits the deterministic PILOT rows (12 concepts). Idempotent: if the CSV
// already exists, per-row review_status / approved / notes edits are PRESERVED
// (so re-running never discards a human review). No images are generated.
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {PATHS, pilotConcepts, rowsToCsv, parseCsv} from './lib.mjs';

function main() {
  const rows = pilotConcepts();

  if (existsSync(PATHS.matrixCsv)) {
    const prev = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));
    const byId = new Map(prev.map((r) => [r.asset_id, r]));
    for (const r of rows) {
      const old = byId.get(r.asset_id);
      if (old) {
        // Preserve human review state + any status the pipeline advanced.
        r.review_status = old.review_status || r.review_status;
        r.approved = old.approved || r.approved;
        r.generation_status = old.generation_status || r.generation_status;
        if (old.notes) r.notes = old.notes;
      }
    }
  }

  mkdirSync(dirname(PATHS.matrixCsv), {recursive: true});
  writeFileSync(PATHS.matrixCsv, rowsToCsv(rows), 'utf8');

  const byExp = rows.reduce((m, r) => ((m[r.experience] = (m[r.experience] || 0) + 1), m), {});
  const byPlacement = rows.reduce((m, r) => ((m[r.placement] = (m[r.placement] || 0) + 1), m), {});
  console.log('════════════════════════════════════════════════════════════');
  console.log('  IMAGE MATRIX — pilot');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  wrote ${rows.length} concept rows → config/image-generation-matrix.csv`);
  console.log(`  by experience: ${JSON.stringify(byExp)}`);
  console.log(`  by placement:  ${JSON.stringify(byPlacement)}`);
  console.log('  approved=false on every row (awaiting review). No images generated.');
}

main();
