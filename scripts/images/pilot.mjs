// scripts/images/pilot.mjs — pilot generation (DRY-RUN by default).
//
// Reads config/image-generation-matrix.csv and processes the pilot concepts.
//   • Dry-run (default): prints the plan and writes metadata; NO network call,
//     NO image files written.
//   • Live: requires BOTH `--generate` AND IMAGE_GENERATION_DRY_RUN=false.
//   • Never regenerates an approved asset that already exists unless `--force`.
//   • Stops the batch once errors reach IMAGE_ERROR_THRESHOLD.
//   • Saves per-asset metadata WITHOUT secrets.
import {mkdirSync, writeFileSync, existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {PATHS, parseCsv, FORMATS, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';

const argv = process.argv.slice(2);
const WANT_GENERATE = argv.includes('--generate');
const FORCE = argv.includes('--force');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function originalPath(row) {
  // Originals keep their deterministic stem as PNG (pre-optimization).
  return join(PATHS.originals, row.filename.replace(/\.webp$/, '.png'));
}

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = WANT_GENERATE && !env.dryRun;

  console.log('════════════════════════════════════════════════════════════');
  console.log(`  IMAGE PILOT — ${live ? 'LIVE GENERATION' : 'DRY-RUN (no network, no files)'}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview}`);
  console.log(`  dryRunEnv=${env.dryRun} generateFlag=${WANT_GENERATE} force=${FORCE}`);
  console.log('════════════════════════════════════════════════════════════');

  if (!existsSync(PATHS.matrixCsv)) {
    console.error('  ✗ Missing config/image-generation-matrix.csv — run  npm run images:matrix  first.');
    process.exitCode = 1;
    return;
  }
  const rows = parseCsv(readFileSync(PATHS.matrixCsv, 'utf8'));
  if (WANT_GENERATE && env.dryRun) {
    console.log('\n  ⚠ --generate requested but IMAGE_GENERATION_DRY_RUN is not false.');
    console.log('    Staying in DRY-RUN. To generate for real: set IMAGE_GENERATION_DRY_RUN=false in .env.images');
    console.log('    and re-run  npm run images:pilot:generate.\n');
  }

  const results = [];
  let errors = 0;
  let generated = 0, skipped = 0, planned = 0;

  for (const row of rows) {
    const fmt = FORMATS[row.placement];
    const already = existsSync(originalPath(row));
    const isApproved = String(row.approved).toLowerCase() === 'true';

    // Never regenerate an approved, existing asset without --force.
    if (isApproved && already && !FORCE) {
      skipped++;
      results.push({asset_id: row.asset_id, action: 'skip', reason: 'approved + exists (use --force to override)'});
      console.log(`   • skip   ${row.filename}  (approved, exists)`);
      continue;
    }

    if (!live) {
      planned++;
      results.push({asset_id: row.asset_id, action: 'plan', placement: row.placement, ratio: fmt.ratio, size: `${fmt.width}x${fmt.height}`});
      console.log(`   • plan   ${row.filename}  [${row.experience}/${row.placement} ${fmt.ratio} ${fmt.width}x${fmt.height}]`);
      continue;
    }

    // ---- LIVE ----
    const res = await generateImage({prompt: row.prompt, negativePrompt: row.negative_prompt, aspectRatio: row.aspect_ratio});
    if (!res.ok) {
      errors++;
      results.push({asset_id: row.asset_id, action: 'error', error: res.error});
      console.error(`   ✗ error  ${row.filename}: ${redact(res.error || 'unknown')}`);
      if (errors >= env.errorThreshold) {
        console.error(`\n  ✗ error threshold (${env.errorThreshold}) reached — stopping batch.`);
        break;
      }
      continue;
    }
    mkdirSync(PATHS.originals, {recursive: true});
    const buf = Buffer.from(res.bytesBase64, 'base64');
    writeFileSync(originalPath(row), buf);
    generated++;
    results.push({asset_id: row.asset_id, action: 'generated', bytes: buf.length, meta: res.meta});
    console.log(`   ✓ gen    ${row.filename}  (${kb(buf.length)})`);
    await sleep(env.rateLimitMs);
  }

  // metadata WITHOUT secrets
  mkdirSync(PATHS.reportsPrivate, {recursive: true});
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const metaPath = join(PATHS.reportsPrivate, `image-pilot-${live ? 'live' : 'dryrun'}-${ts}.json`);
  writeFileSync(metaPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: live ? 'live' : 'dry-run',
    model: sum.model,
    counts: {planned, generated, skipped, errors, total: rows.length},
    results,
  }, null, 2), 'utf8');

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  PILOT ${live ? 'GENERATION' : 'DRY-RUN'} COMPLETE`);
  console.log(`  planned:${planned} generated:${generated} skipped:${skipped} errors:${errors} / ${rows.length}`);
  console.log(`  metadata (no secrets): reports/private/${metaPath.split(/[\\/]/).pop()}`);
  if (!live) console.log('  No network call, no image files written. Nothing approved changed.');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error('  ✗ ' + redact(e?.message || String(e))); process.exitCode = 1; });
