import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {loadCollectionPlan} from '../catalog.mjs';
import {ruleSetFor} from '../spec.mjs';
import {step, ok, skip, info, warn, err, plain} from '../log.mjs';

const BY_HANDLE = `#graphql
  query CollByHandle($handle: String!) {
    collectionByHandle(handle: $handle) { id }
  }
`;
const CREATE = `#graphql
  mutation CreateCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle }
      userErrors { field message }
    }
  }
`;

export async function run(ctx) {
  const plan = loadCollectionPlan();
  step(`Automated collections (${plan.length}) — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);

  const toCreate = [];
  for (const c of plan) {
    let exists = false;
    try {
      const data = await adminGraphql(BY_HANDLE, {handle: c.handle});
      exists = Boolean(data.collectionByHandle);
    } catch (e) {
      err(`lookup ${c.handle}: ${e.message}`);
      continue;
    }
    const rs = ruleSetFor(c.handle);
    if (exists) {
      skip(`exists: ${c.handle} (not modified)`);
    } else if (!rs) {
      warn(`no rule mapping for ${c.handle} — skipping (add to spec.mjs)`);
    } else {
      info(`would create smart collection: ${c.handle}  [${rs.appliedDisjunctively ? 'OR' : 'AND'}] ${rs.rules.map((r) => `${r.column}:${r.condition}`).join(', ')}`);
      if (rs.review) warn(`  review: ${c.handle} — ${rs.review}`);
      toCreate.push({c, rs});
    }
  }

  if (!toCreate.length) return ok('All collections present (or no new ones) — nothing to do.');
  if (!ctx.commit) return plain(`\nDRY-RUN: ${toCreate.length} collection(s) would be created. Re-run with --commit to apply.`);

  const proceed = await confirmMutation(ctx, {action: `create ${toCreate.length} smart collections`, phrase: 'CREATE COLLECTIONS'});
  if (!proceed) return plain('Cancelled — nothing created.');

  for (const {c, rs} of toCreate) {
    const input = {
      title: c.title,
      handle: c.handle,
      ruleSet: {appliedDisjunctively: rs.appliedDisjunctively, rules: rs.rules},
    };
    try {
      const data = await adminGraphql(CREATE, {input});
      const errs = userErrorMessages(data.collectionCreate);
      if (errs.length) err(`${c.handle}: ${errs.join('; ')}`);
      else ok(`created: ${c.handle}`);
    } catch (e) {
      err(`${c.handle}: ${e.message}`);
    }
  }
}
