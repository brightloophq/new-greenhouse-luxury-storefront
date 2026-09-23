// scripts/images/products.mjs — generate the product catalog images defined in
// catalog/product-image-manifest.csv (80 products), consistent with the pilot
// pipeline. DRY-RUN by default.
//
//   npm run images:products             (dry run — plan only, no network/files)
//   npm run images:products:generate    (requires --generate AND IMAGE_GENERATION_DRY_RUN=false)
//
// On a successful generate it writes the master image to public/images/<Filename>
// and fills that product's Image Src in catalog/shopify-products-image-update-template.csv
// with the canonical storefront URL, ready to import into Shopify AFTER the images
// deploy. Never overwrites an existing image unless --force. Secrets never printed.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {ROOT, kb} from './lib.mjs';
import {loadImageEnv, envSummary, redact} from './env.mjs';
import {generateImage} from './gemini-client.mjs';
import {
  parseManifest,
  selectRows,
  targetPath,
  publicImageUrl,
} from './productManifest.mjs';

const MANIFEST = join(ROOT, 'catalog', 'product-image-manifest.csv');
const TEMPLATE = join(ROOT, 'catalog', 'shopify-products-image-update-template.csv');

const argv = process.argv.slice(2);
const WANT_GENERATE = argv.includes('--generate');
const FORCE = argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Set one handle's Image Src in the update template, preserving every other line. */
function setImageSrc(csvText, handle, url) {
  const lines = csvText.split('\n');
  return lines
    .map((line, i) => {
      if (i === 0 || !line.trim()) return line;
      const cols = line.split(',');
      if (cols[0] !== handle) return line;
      cols[1] = url; // Image Src column
      return cols.join(',');
    })
    .join('\n');
}

async function main() {
  const env = loadImageEnv();
  const sum = envSummary();
  const live = WANT_GENERATE && !env.dryRun;

  console.log('════════════════════════════════════════════════════════════');
  console.log(`  PRODUCT IMAGES — ${live ? 'LIVE GENERATION' : 'DRY-RUN (no network, no files)'}`);
  console.log(`  model: ${sum.model} · key: ${sum.keyPreview}`);
  console.log('════════════════════════════════════════════════════════════');

  if (!existsSync(MANIFEST)) {
    console.error(`  ✗ Missing ${MANIFEST}`);
    process.exitCode = 1;
    return;
  }

  const rows = parseManifest(readFileSync(MANIFEST, 'utf8'));
  const exists = (filename) => existsSync(join(ROOT, targetPath(filename)));
  const todo = selectRows(rows, {force: FORCE, exists});

  console.log(`  manifest: ${rows.length} products · to generate: ${todo.length} · already present: ${rows.length - todo.length}\n`);

  if (WANT_GENERATE && env.dryRun) {
    console.log('  ⚠ --generate requested but IMAGE_GENERATION_DRY_RUN is not false.');
    console.log('    Set IMAGE_GENERATION_DRY_RUN=false in .env.images to generate for real.\n');
  }

  let generated = 0;
  let errors = 0;
  let template = existsSync(TEMPLATE) ? readFileSync(TEMPLATE, 'utf8') : '';

  for (const row of todo) {
    const label = row.Handle;
    if (!live) {
      console.log(`   • plan   ${row.Filename}  [${row['Aspect Ratio'] || '4:5'}]`);
      continue;
    }
    const res = await generateImage({
      prompt: row['Generation Prompt'],
      aspectRatio: row['Aspect Ratio'] || '4:5',
    });
    if (!res.ok) {
      errors++;
      console.error(`   ✗ error  ${label}: ${redact(res.error || 'unknown')}`);
      if (errors >= env.errorThreshold) {
        console.error(`\n  ✗ error threshold (${env.errorThreshold}) reached — stopping.`);
        break;
      }
      continue;
    }
    const out = join(ROOT, targetPath(row.Filename));
    mkdirSync(dirname(out), {recursive: true});
    const buf = Buffer.from(res.bytesBase64, 'base64');
    writeFileSync(out, buf);
    if (template) template = setImageSrc(template, row.Handle, publicImageUrl(row.Filename));
    generated++;
    console.log(`   ✓ gen    ${row.Filename}  (${kb(buf.length)})`);
    await sleep(env.rateLimitMs);
  }

  if (live && template) writeFileSync(TEMPLATE, template);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  ${live ? 'GENERATION' : 'DRY-RUN'} COMPLETE — generated:${generated} errors:${errors} / ${todo.length}`);
  if (live && generated) {
    console.log('\n  Next: commit public/images/products + the update template, deploy,');
    console.log('  then import the template into Shopify (Products → Import) so each');
    console.log('  Image Src URL is fetched onto its product.\n');
  }
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
