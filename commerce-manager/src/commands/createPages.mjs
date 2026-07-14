import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {PAGES} from '../spec.mjs';
import {step, ok, skip, info, err, plain} from '../log.mjs';

const EXISTING = `#graphql
  query Pages { pages(first: 250) { nodes { handle } } }
`;
const CREATE = `#graphql
  mutation CreatePage($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page { id handle }
      userErrors { field message }
    }
  }
`;

export async function run(ctx) {
  step(`Pages (${PAGES.length} planned) — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);
  const existing = new Set();
  try {
    const data = await adminGraphql(EXISTING);
    data.pages.nodes.forEach((n) => existing.add(n.handle));
  } catch (e) {
    err(`could not read pages: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const toCreate = PAGES.filter((p) => !existing.has(p.handle));
  PAGES.filter((p) => existing.has(p.handle)).forEach((p) => skip(`exists: /pages/${p.handle} (not modified)`));
  toCreate.forEach((p) => info(`would create: /pages/${p.handle} — "${p.title}"`));

  if (!toCreate.length) return ok('No new pages to create.');
  if (!ctx.commit) return plain(`\nDRY-RUN: ${toCreate.length} page(s) would be created.`);

  const proceed = await confirmMutation(ctx, {action: `create ${toCreate.length} pages`, phrase: 'CREATE PAGES'});
  if (!proceed) return plain('Cancelled — nothing created.');

  for (const p of toCreate) {
    try {
      const data = await adminGraphql(CREATE, {page: {title: p.title, handle: p.handle, body: p.bodyHtml}});
      const errs = userErrorMessages(data.pageCreate);
      if (errs.length) err(`${p.handle}: ${errs.join('; ')}`);
      else ok(`created: /pages/${p.handle}`);
    } catch (e) {
      err(`${p.handle}: ${e.message}`);
    }
  }
}
