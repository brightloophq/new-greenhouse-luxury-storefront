// Sets per-product metafield VALUES from build/metafields-payload.jsonl.
// Only writes the custom.* keys in the payload (never touches other metafields).
import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {loadMetafieldValues} from '../catalog.mjs';
import {step, ok, skip, info, err, plain} from '../log.mjs';

const BY_HANDLE = `#graphql
  query P($handle: String!) { productByHandle(handle: $handle) { id } }
`;
const SET = `#graphql
  mutation SetMF($mf: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $mf) { userErrors { field message } }
  }
`;

export async function run(ctx) {
  const rows = loadMetafieldValues();
  step(`Metafield values for ${rows.length} products — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);
  info('Requires metafield definitions to exist first (run `metafields`).');

  if (!ctx.commit) {
    const sample = rows[0];
    info(`example: ${sample.handle} → ${sample.metafields.length} custom.* values`);
    return plain(`\nDRY-RUN: would set values for ${rows.length} products. Re-run with --commit.`);
  }

  const proceed = await confirmMutation(ctx, {action: `set metafield values on ${rows.length} products`, phrase: 'SET METAFIELD VALUES'});
  if (!proceed) return plain('Cancelled.');

  for (const row of rows) {
    let id;
    try {
      const data = await adminGraphql(BY_HANDLE, {handle: row.handle});
      id = data.productByHandle?.id;
    } catch (e) {
      err(`lookup ${row.handle}: ${e.message}`);
      continue;
    }
    if (!id) {
      skip(`not found (create products first): ${row.handle}`);
      continue;
    }
    const mf = row.metafields.map((m) => ({ownerId: id, namespace: m.namespace, key: m.key, type: m.type, value: m.value}));
    try {
      const data = await adminGraphql(SET, {mf});
      const errs = userErrorMessages(data.metafieldsSet);
      if (errs.length) err(`${row.handle}: ${errs.join('; ')}`);
      else ok(`set ${mf.length} values: ${row.handle}`);
    } catch (e) {
      err(`${row.handle}: ${e.message}`);
    }
  }
}
