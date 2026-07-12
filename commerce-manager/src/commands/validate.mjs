// Read-only validation of the catalog package. No API calls.
import {existsSync} from 'node:fs';
import {plain, step, ok, err, info} from '../log.mjs';
import {REQUIRED_FILES, catalogPath, catalogExists, loadProducts} from '../catalog.mjs';

export async function run() {
  step('Validating catalog package (read-only)…');
  let failures = 0;
  const fail = (m) => (failures++, err(m));

  if (!catalogExists()) {
    fail('Catalog directory not found.');
    process.exitCode = 1;
    return;
  }

  for (const f of REQUIRED_FILES) {
    if (existsSync(catalogPath(f))) ok(`present: ${f}`);
    else fail(`missing: ${f}`);
  }
  if (failures) {
    process.exitCode = 1;
    return;
  }

  const products = loadProducts();
  ok(`products: ${products.length}`);

  const handles = products.map((p) => p.handle);
  const skus = products.flatMap((p) => (p.variants || []).map((v) => v.sku));
  if (new Set(handles).size !== handles.length) fail('duplicate handles found');
  else ok('handles unique');
  if (new Set(skus).size !== skus.length) fail('duplicate SKUs found');
  else ok(`SKUs unique (${skus.length})`);

  const notDraft = products.filter((p) => p.Status && p.Status !== 'draft');
  if (notDraft.length) fail(`${notDraft.length} product(s) not marked draft`);
  else ok('all products marked draft');

  const badHtml = products.find((p) => !/^\s*<(p|ul)/i.test(p.descriptionHtml || ''));
  if (badHtml) info(`note: review description HTML for ${badHtml.handle}`);

  plain(failures ? `\n✗ ${failures} problem(s).` : '\n✓ Catalog package valid and import-ready (as DRAFT).');
  if (failures) process.exitCode = 1;
}
