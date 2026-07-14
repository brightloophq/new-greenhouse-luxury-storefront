// READ-ONLY connection test: exchanges credentials for a token, then queries the
// shop name and granted API scopes. No data is modified. No secrets are printed.
import {adminGraphql} from '../graphql.mjs';
import {getAccessToken} from '../auth.mjs';
import {plain, step, ok, info, err} from '../log.mjs';

const QUERY = `#graphql
  query ConnectionTest {
    shop {
      name
      myshopifyDomain
      primaryDomain { url }
      plan { displayName }
    }
    currentAppInstallation {
      accessScopes { handle }
    }
  }
`;

export async function run() {
  step('Authenticating (client-credentials grant)…');
  let auth;
  try {
    auth = await getAccessToken();
  } catch (e) {
    err(e.message);
    plain('\nCheck that the custom app "TNG Commerce Manager" permits the client-credentials grant and that the credentials in commerce-manager/.env are correct.');
    process.exitCode = 1;
    return;
  }
  ok('Access token acquired (held in memory, never printed).');
  if (auth.expiresIn) info(`Token expires in ~${auth.expiresIn}s.`);

  step('Querying shop + granted scopes (read-only)…');
  let data;
  try {
    data = await adminGraphql(QUERY);
  } catch (e) {
    err(e.message);
    process.exitCode = 1;
    return;
  }

  const shop = data.shop;
  const scopes = (data.currentAppInstallation?.accessScopes || []).map((s) => s.handle).sort();

  plain('\n──────────── Connection OK ────────────');
  ok(`Shop:   ${shop?.name}`);
  info(`Domain: ${shop?.myshopifyDomain}`);
  if (shop?.primaryDomain?.url) info(`URL:    ${shop.primaryDomain.url}`);
  if (shop?.plan?.displayName) info(`Plan:   ${shop.plan.displayName}`);
  plain(`\nGranted scopes (${scopes.length}):`);
  if (scopes.length) scopes.forEach((s) => info(`• ${s}`));
  else info('(none reported — check app configuration / grant)');

  // Advisory: scopes needed for the later write commands.
  const needed = ['write_products', 'write_publications', 'write_content', 'write_online_store_navigation'];
  const missing = needed.filter((n) => !scopes.includes(n));
  if (missing.length) {
    plain('\nℹ For later (write) steps you will also need: ' + missing.join(', '));
  }
  plain('\nRead-only test complete. No data was changed.');
}
