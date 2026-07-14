import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {METAFIELD_DEFINITIONS} from '../spec.mjs';
import {step, ok, skip, info, err, plain} from '../log.mjs';

const EXISTING = `#graphql
  query ExistingDefs {
    metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: "custom") {
      nodes { key }
    }
  }
`;
const CREATE = `#graphql
  mutation CreateDef($def: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $def) {
      createdDefinition { id key }
      userErrors { field message }
    }
  }
`;

export async function run(ctx) {
  step(`Metafield definitions (${METAFIELD_DEFINITIONS.length}) — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);

  const existing = new Set();
  try {
    const data = await adminGraphql(EXISTING);
    data.metafieldDefinitions.nodes.forEach((n) => existing.add(n.key));
  } catch (e) {
    err(`Could not read existing definitions: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const toCreate = METAFIELD_DEFINITIONS.filter((d) => !existing.has(d.key));
  METAFIELD_DEFINITIONS.filter((d) => existing.has(d.key)).forEach((d) => skip(`exists: custom.${d.key}`));
  toCreate.forEach((d) => info(`would create: custom.${d.key} (${d.type})`));

  if (!toCreate.length) return ok('All definitions already present — nothing to do.');
  if (!ctx.commit) return plain(`\nDRY-RUN: ${toCreate.length} definition(s) would be created. Re-run with --commit to apply.`);

  const proceed = await confirmMutation(ctx, {action: `create ${toCreate.length} metafield definitions`, phrase: 'CREATE METAFIELDS'});
  if (!proceed) return plain('Cancelled — nothing created.');

  for (const d of toCreate) {
    try {
      const data = await adminGraphql(CREATE, {def: {name: d.name, namespace: d.namespace, key: d.key, type: d.type, ownerType: d.ownerType}});
      const errs = userErrorMessages(data.metafieldDefinitionCreate);
      if (errs.length) err(`custom.${d.key}: ${errs.join('; ')}`);
      else ok(`created: custom.${d.key}`);
    } catch (e) {
      err(`custom.${d.key}: ${e.message}`);
    }
  }
}
