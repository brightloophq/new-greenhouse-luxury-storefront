#!/usr/bin/env node
// TNG Commerce Manager — secure Shopify Admin GraphQL catalog manager.
// DRY-RUN is the default. Mutations require --commit + a typed confirmation.
// Publishing requires --commit --approve-publish + a typed confirmation.
import {scrub, plain, err} from './src/log.mjs';

const COMMANDS = {
  plan: () => import('./src/commands/plan.mjs'),
  'test-connection': () => import('./src/commands/testConnection.mjs'),
  test: () => import('./src/commands/testConnection.mjs'),
  validate: () => import('./src/commands/validate.mjs'),
  metafields: () => import('./src/commands/createMetafields.mjs'),
  collections: () => import('./src/commands/createCollections.mjs'),
  products: () => import('./src/commands/createProducts.mjs'),
  'metafield-values': () => import('./src/commands/setMetafieldValues.mjs'),
  pages: () => import('./src/commands/createPages.mjs'),
  navigation: () => import('./src/commands/createNavigation.mjs'),
  'assign-publications': () => import('./src/commands/assignPublications.mjs'),
};

function parseArgs(argv) {
  const ctx = {dryRun: true, commit: false, yes: false, approvePublish: false};
  let command = null;
  for (const a of argv) {
    if (!a.startsWith('--')) {
      if (!command) command = a;
      continue;
    }
    if (a === '--commit') ctx.commit = true;
    else if (a === '--dry-run') ctx.commit = false;
    else if (a === '--yes') ctx.yes = true;
    else if (a === '--approve-publish') ctx.approvePublish = true;
    else if (a.startsWith('--limit=')) ctx.limit = Number(a.split('=')[1]) || undefined;
    else if (a.startsWith('--publication=')) ctx.publication = a.split('=').slice(1).join('=');
  }
  ctx.dryRun = !ctx.commit;
  return {command, ctx};
}

function help() {
  plain(`
TNG Commerce Manager — secure Shopify Admin catalog manager

Usage:  node index.mjs <command> [flags]

Read-only (safe):
  plan                 Print the execution plan (no network)
  test-connection      Auth + query shop name & granted scopes (READ-ONLY)
  validate             Validate the catalog package (no network)

Prepared writes (DRY-RUN by default; add --commit to apply):
  metafields           Create custom.* product metafield definitions
  collections          Create automated (smart) collections
  products             Create DRAFT products (never published)
  metafield-values     Set per-product metafield values
  pages                Create missing pages
  navigation           Create menus only if absent

Approval-gated:
  assign-publications  Assign products to a sales channel
                       (needs --commit --approve-publish --publication="Online Store")

Flags:
  --commit             Actually perform writes (default is dry-run)
  --yes                Skip the interactive confirmation (use with care in scripts)
  --limit=N            products: only process the first N
  --publication=NAME   assign-publications: target channel
  --approve-publish    assign-publications: required extra approval

Safety: secrets are never printed; products are created DRAFT; existing data is
never updated/deleted without confirmation; nothing is published automatically.
`);
}

async function main() {
  const {command, ctx} = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || command === '--help') return help();
  const loader = COMMANDS[command];
  if (!loader) {
    err(`Unknown command: ${command}`);
    help();
    process.exitCode = 1;
    return;
  }
  try {
    const mod = await loader();
    await mod.run(ctx);
  } catch (e) {
    err(scrub(e?.message || String(e)));
    process.exitCode = 1;
  }
}

main();
