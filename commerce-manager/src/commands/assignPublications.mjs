// Assign products to sales-channel publications. This is the ONLY step that can make
// products visible on a channel, so it is triple-gated:
//   --commit  AND  --approve-publish  AND  typed confirmation phrase.
// It never runs in dry-run and never sets product status to ACTIVE.
import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {loadProducts} from '../catalog.mjs';
import {step, ok, skip, info, warn, err, plain} from '../log.mjs';

const PUBLICATIONS = `#graphql
  query Pubs { publications(first: 25) { nodes { id name } } }
`;
const BY_HANDLE = `#graphql
  query P($handle: String!) { productByHandle(handle: $handle) { id status } }
`;
const PUBLISH = `#graphql
  mutation Pub($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

export async function run(ctx) {
  step(`Assign products to publications — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);

  let pubs = [];
  try {
    const data = await adminGraphql(PUBLICATIONS);
    pubs = data.publications.nodes;
  } catch (e) {
    err(`could not read publications: ${e.message}`);
    process.exitCode = 1;
    return;
  }
  plain('Available publications (sales channels):');
  pubs.forEach((p) => info(`• ${p.name}  (${p.id})`));

  const targetName = ctx.publication;
  if (!targetName) {
    plain('\nSpecify a channel with --publication="Online Store" (or another channel name).');
    plain('DRY-RUN by default. Nothing was published.');
    return;
  }
  const target = pubs.find((p) => p.name.toLowerCase() === targetName.toLowerCase());
  if (!target) {
    err(`Publication "${targetName}" not found.`);
    process.exitCode = 1;
    return;
  }

  const products = loadProducts();
  info(`Would assign ${products.length} product(s) to "${target.name}".`);

  // Triple gate.
  if (!ctx.commit || !ctx.approvePublish) {
    plain('\n⛔ Not assigning. This step requires BOTH --commit AND --approve-publish,');
    plain('   plus a typed confirmation. (Publishing also still needs each product set to Active separately.)');
    return;
  }
  const proceed = await confirmMutation(ctx, {
    action: `assign ${products.length} products to "${target.name}"`,
    phrase: 'PUBLISH TO SALES CHANNELS',
  });
  if (!proceed) return plain('Cancelled — nothing published.');

  for (const p of products) {
    let id;
    try {
      const data = await adminGraphql(BY_HANDLE, {handle: p.handle});
      id = data.productByHandle?.id;
    } catch (e) {
      err(`lookup ${p.handle}: ${e.message}`);
      continue;
    }
    if (!id) {
      skip(`not found: ${p.handle}`);
      continue;
    }
    try {
      const data = await adminGraphql(PUBLISH, {id, input: [{publicationId: target.id}]});
      const errs = userErrorMessages(data.publishablePublish);
      if (errs.length) err(`${p.handle}: ${errs.join('; ')}`);
      else ok(`assigned: ${p.handle} → ${target.name}`);
    } catch (e) {
      err(`${p.handle}: ${e.message}`);
    }
  }
  warn('Products remain DRAFT until you set each to Active in the admin. Assignment ≠ live.');
}
