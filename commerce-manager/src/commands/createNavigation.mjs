// Creates navigation menus only if ABSENT. Existing menus are never overwritten
// (that would require an explicit, separate update flow).
import {adminGraphql, userErrorMessages} from '../graphql.mjs';
import {confirmMutation} from '../confirm.mjs';
import {MENUS} from '../spec.mjs';
import {step, ok, skip, info, warn, err, plain} from '../log.mjs';

const EXISTING = `#graphql
  query Menus { menus(first: 50) { nodes { handle } } }
`;
const CREATE = `#graphql
  mutation CreateMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { id handle }
      userErrors { field message }
    }
  }
`;

export async function run(ctx) {
  step(`Navigation menus (${MENUS.length}) — ${ctx.commit ? 'COMMIT' : 'DRY-RUN'}`);
  const existing = new Set();
  try {
    const data = await adminGraphql(EXISTING);
    data.menus.nodes.forEach((n) => existing.add(n.handle));
  } catch (e) {
    err(`could not read menus: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const toCreate = MENUS.filter((m) => !existing.has(m.handle));
  MENUS.filter((m) => existing.has(m.handle)).forEach((m) =>
    warn(`exists: "${m.handle}" — NOT modified (update existing menus manually to avoid clobbering).`),
  );
  toCreate.forEach((m) => info(`would create menu: "${m.handle}" with ${m.items.length} items`));

  if (!toCreate.length) return ok('No new menus to create (existing menus left untouched).');
  if (!ctx.commit) return plain(`\nDRY-RUN: ${toCreate.length} menu(s) would be created.`);

  const proceed = await confirmMutation(ctx, {action: `create ${toCreate.length} menus`, phrase: 'CREATE MENUS'});
  if (!proceed) return plain('Cancelled — nothing created.');

  for (const m of toCreate) {
    const items = m.items.map((it) => ({title: it.title, type: it.type, url: it.url}));
    try {
      const data = await adminGraphql(CREATE, {title: m.title, handle: m.handle, items});
      const errs = userErrorMessages(data.menuCreate);
      if (errs.length) err(`${m.handle}: ${errs.join('; ')}`);
      else ok(`created menu: ${m.handle}`);
    } catch (e) {
      err(`${m.handle}: ${e.message}`);
    }
  }
}
