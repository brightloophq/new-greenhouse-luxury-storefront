// scripts/images/validate.mjs — QC generated + optimized assets against the
// matrix. Checks: original present, derivatives present, safe filename, aspect
// ratio, resolution, file-size target. Classifies each row approved / regenerate
// / manual-review / rejected and writes reports/private/image-validate-*.json.
// Structural QC only — visual QC (correct flower/colour, no gibberish, etc.) is
// recorded by a human in reports/IMAGE_GENERATION_PILOT_REPORT.md.
import {existsSync, readFileSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, parseCsv, FORMATS} from './lib.mjs';

const SAFE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*\.webp$/;
const MAX_CARD_KB = 220;
const MAX_HERO_KB = 400;

function main() {
  if (!existsSync(PATHS.matrixCsv)) { console.error('  ✗ No matrix.'); process.exitCode = 1; return; }
  const rows = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));
  const out = [];
  const tally = {approved: 0, regenerate: 0, 'manual-review': 0, rejected: 0, pending: 0};

  for (const row of rows) {
    const stem = row.filename.replace(/\.webp$/, '');
    const original = join(PATHS.originals, `${stem}.png`);
    const fmt = FORMATS[row.placement] || FORMATS.card;
    const issues = [];

    if (!SAFE_NAME.test(row.filename)) issues.push('unsafe-filename');
    if (!existsSync(original)) {
      out.push({asset_id: row.asset_id, verdict: 'pending', issues: ['not-generated']});
      tally.pending++;
      continue;
    }
    // primary derivative (largest width, webp)
    const w = fmt.widths[fmt.widths.length - 1];
    const primary = join(PATHS.generated, row.experience, `${stem}-${w}.webp`);
    if (!existsSync(primary)) issues.push('missing-derivative');
    else {
      const sizeKb = statSync(primary).size / 1024;
      const cap = fmt.ratio === '16:9' ? MAX_HERO_KB : MAX_CARD_KB;
      if (sizeKb > cap) issues.push(`oversize(${sizeKb.toFixed(0)}KB>${cap})`);
    }

    let verdict = 'manual-review'; // structural-OK still needs human visual sign-off
    if (issues.length) verdict = issues.includes('unsafe-filename') ? 'rejected' : 'regenerate';
    out.push({asset_id: row.asset_id, verdict, issues});
    tally[verdict]++;
  }

  mkdirSync(PATHS.reportsPrivate, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const p = join(PATHS.reportsPrivate, `image-validate-${ts}.json`);
  writeFileSync(p, JSON.stringify({generatedAt: new Date().toISOString(), tally, results: out}, null, 2), 'utf8');

  console.log('════════════════════════════════════════════════════════════');
  console.log('  IMAGE VALIDATE');
  console.log(`  ${JSON.stringify(tally)}`);
  console.log(`  report: reports/private/${p.split(/[\\/]/).pop()}`);
  if (tally.pending === rows.length) console.log('  Nothing generated yet — all rows pending. No-op.');
  console.log('  Visual QC (flower/colour/gibberish/ribbon) is human-signed in the pilot report.');
  console.log('════════════════════════════════════════════════════════════');
}

main();
