// scripts/test-connection.js — READ-ONLY connection test.
// Exchanges credentials for a temporary token, then reads shop name, primary domain,
// currency, and installed app access scopes. Creates/updates/deletes NOTHING.
// Dry-run is the default (and this script is read-only regardless).
import {safeSummary, redact} from '../src/config.js';
import {getAccessToken} from '../src/auth.js';
import {adminGraphQL} from '../src/shopify-admin.js';

const DRY_RUN = process.env.DRY_RUN !== 'false'; // default true

const QUERY = `#graphql
  query ConnectionTest {
    shop {
      name
      currencyCode
      primaryDomain { url host }
    }
    currentAppInstallation {
      accessScopes { handle }
    }
  }
`;

async function main() {
  const s = safeSummary();
  console.log('─────────────────────────────────────────────');
  console.log('  TNG Commerce Manager — connection test');
  console.log(`  mode:        ${DRY_RUN ? 'DRY-RUN (read-only, no writes)' : 'read-only'}`);
  console.log(`  store:       ${s.store}`);
  console.log(`  client id:   ${s.clientId}`);
  console.log(`  secret:      ${s.clientSecret}`);
  console.log(`  api version: ${s.apiVersion}`);
  console.log('─────────────────────────────────────────────');

  console.log('\n▸ Requesting temporary token (client-credentials grant)…');
  let auth;
  try {
    auth = await getAccessToken();
  } catch (e) {
    console.error('  ✗ ' + redact(e.message));
    console.error('\n  Ensure the "TNG Commerce Manager" app is installed on this shop and');
    console.error('  permits the client-credentials grant, and that commerce-manager/.env is correct.');
    process.exit(1);
  }
  console.log('  ✓ token acquired (in memory only, never printed)');
  if (auth.expiresIn) console.log(`    expires in ~${auth.expiresIn}s (auto-refreshes)`);

  console.log('\n▸ Querying shop + granted scopes (read-only)…');
  let data;
  try {
    data = await adminGraphQL(QUERY);
  } catch (e) {
    console.error('  ✗ ' + redact(e.message));
    process.exit(1);
  }

  const shop = data.shop || {};
  const scopes = (data.currentAppInstallation?.accessScopes || []).map((x) => x.handle).sort();

  console.log('\n──────────── Connection OK ────────────');
  console.log(`  Shop name:      ${shop.name}`);
  console.log(`  Primary domain: ${shop.primaryDomain?.url} (${shop.primaryDomain?.host})`);
  console.log(`  Currency:       ${shop.currencyCode}`);
  console.log(`  Access scopes:  ${scopes.length ? scopes.join(', ') : '(none reported)'}`);
  console.log('\n✓ Read-only test complete. No data was created, updated, or deleted.');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exit(1);
});
