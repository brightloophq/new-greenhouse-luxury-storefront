// Narrow the bulk-flowers smart-collection rule so it excludes Floral Supply
// products (keeps all wholesale flowers). DRY-RUN default; --commit to apply.
// Rollback manifest captures the prior ruleSet.
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const COMMIT = process.argv.includes('--commit');
const HANDLE = 'bulk-flowers';
const ue = (o) => (o?.userErrors || []).map((e) => e.message).join('; ');

const COL = `#graphql
  query($h:String!){ collectionByHandle(handle:$h){ id handle title productsCount{count}
    ruleSet{ appliedDisjunctively rules{ column relation condition } } } }`;
const UPDATE = `#graphql
  mutation($input:CollectionInput!){ collectionUpdate(input:$input){ collection{ id productsCount{count} } userErrors{ field message } } }`;

const NEW_RULESET = {
  appliedDisjunctively: false,
  rules: [
    {column: 'TAG', relation: 'EQUALS', condition: 'channel:wholesale'},
    {column: 'TYPE', relation: 'NOT_EQUALS', condition: 'Floral Supply'},
  ],
};

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  NARROW bulk-flowers RULE — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'}`);
  console.log('════════════════════════════════════════════════════════════');
  const c = (await adminGraphQL(COL, {h: HANDLE})).collectionByHandle;
  if (!c) throw new Error('bulk-flowers not found');
  // Known Floral Supply products (all carry channel:wholesale → currently in bulk-flowers).
  const supplies = ['wet-floral-foam-bricks','glass-cylinder-vase','bud-vase-set','satin-ribbon','organza-ribbon','kraft-cellophane-wrap','woven-arrangement-basket','floral-stem-tape','florist-shears-snips','bouquet-presentation-boxes'];

  console.log(`\n  collection: ${c.title} (${c.productsCount.count} products) · ${c.ruleSet.appliedDisjunctively ? 'ANY' : 'ALL'}`);
  console.log('  CURRENT rules:');
  c.ruleSet.rules.forEach((r) => console.log(`    - ${r.column} ${r.relation} "${r.condition}"`));
  console.log(`  Floral Supply products currently leaking in: ${supplies.length}${supplies.length ? ' → ' + supplies.join(', ') : ''}`);
  console.log('\n  PROPOSED rules (ALL must match):');
  NEW_RULESET.rules.forEach((r) => console.log(`    - ${r.column} ${r.relation} "${r.condition}"`));
  console.log(`  Effect: wholesale flowers unchanged; ~${supplies.length} Floral Supply products removed.`);

  mkdirSync(join(CM, 'rollback'), {recursive: true});
  const rb = join(CM, 'rollback', 'ruleset-narrow-bulk-flowers.json');
  writeFileSync(rb, JSON.stringify({id: c.id, handle: c.handle, priorRuleSet: c.ruleSet, priorCount: c.productsCount.count, suppliesRemoved: supplies}, null, 2));
  console.log(`\n  rollback → ${rb}`);

  if (!COMMIT) { console.log('\n  DRY-RUN — no writes. Re-run with --commit.'); return; }

  const r = await adminGraphQL(UPDATE, {input: {id: c.id, ruleSet: NEW_RULESET}});
  if (ue(r.collectionUpdate)) throw new Error(ue(r.collectionUpdate));
  console.log(`\n  ✓ applied. new product count: ${r.collectionUpdate.collection.productsCount.count} (was ${c.productsCount.count})`);
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
