import {plain, step, info} from '../log.mjs';
import {envSummary} from '../env.mjs';
import {loadProducts, loadCollectionPlan, catalogExists, CATALOG_DIR} from '../catalog.mjs';
import {METAFIELD_DEFINITIONS, PAGES, MENUS} from '../spec.mjs';

export async function run() {
  const env = envSummary();
  plain('════════════════════════════════════════════════════════════');
  plain('  TNG Commerce Manager — Execution Plan (read-only preview)');
  plain('════════════════════════════════════════════════════════════');
  info(`Store:        ${env.store}`);
  info(`Client ID:    ${env.clientId}`);
  info(`Client secret: ${env.clientSecret}`);
  info(`API version:  ${env.apiVersion}`);
  info(`Catalog dir:  ${CATALOG_DIR}`);

  if (!catalogExists()) {
    plain('\n⚠ Catalog package not found — validation will fail until it exists.');
    return;
  }
  const products = loadProducts();
  const variants = products.reduce((a, p) => a + (p.variants?.length || 0), 0);
  const collections = loadCollectionPlan();

  step('Authentication');
  info('Client-credentials grant → temporary Admin API token (in-memory, never logged).');

  step('Ordered, idempotent steps (all DRY-RUN by default)');
  plain('  1. validate        — check catalog files, unique handles/SKUs, HTML, drafts');
  plain('  2. test-connection — READ-ONLY: shop name + granted scopes');
  plain(`  3. metafields      — create ${METAFIELD_DEFINITIONS.length} custom.* product definitions (skip existing)`);
  plain(`  4. collections     — create ${collections.length} automated (smart) collections (skip existing)`);
  plain(`  5. products        — create ${products.length} DRAFT products / ${variants} variants (skip existing by handle)`);
  plain('  6. metafield-values— set per-product metafield values from build/metafields-payload.jsonl');
  plain(`  7. pages           — create ${PAGES.length} missing page(s); skip existing`);
  plain(`  8. navigation      — create ${MENUS.length} menu(s) only if absent; never overwrite existing`);
  plain('  9. assign-publications — publish to sales channels ONLY after explicit approval');

  step('Safety posture');
  info('• DRY-RUN is the default. Nothing is written without --commit AND a typed confirmation.');
  info('• Products are created as DRAFT. Publishing is a separate, explicitly-approved step.');
  info('• Existing Shopify data is never updated or deleted without confirmation.');
  info('• Secrets/tokens are never printed.');

  step('Recommended order');
  info('validate → test-connection → (review) → metafields → collections → products → metafield-values → pages → navigation → assign-publications');
  plain('\nRun `node index.mjs test-connection` next (read-only).');
}
