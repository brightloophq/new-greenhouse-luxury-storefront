# TNG Commerce Manager — secure Admin GraphQL connection

A minimal, secure Node.js connection to the Shopify **Admin GraphQL API** for the merchant-owned internal automation app **TNG Commerce Manager**. Authenticates with the **client-credentials grant** (short-lived token) — not `shopify app dev`, not a permanent `shpat_` token, and not the Storefront API.

- **Zero npm dependencies** (Node 20+ built-in `fetch`).
- **Secrets never printed / committed / persisted.** The client secret and access token are redacted from all output; the token lives in memory only and auto-refreshes.
- **Read-only + dry-run by default.** This step creates/updates/deletes nothing.

## Files
```
commerce-manager/
├── .env.example            # the 4 required vars (gitignored via .env.*)
├── .env                    # your local credentials (gitignored)
├── package.json            # "test:connection" script, type: module
├── src/
│   ├── config.js           # loads/validates env, secret redaction
│   ├── auth.js             # client-credentials → in-memory token (auto-refresh)
│   └── shopify-admin.js    # Admin GraphQL client (401 → refresh + retry)
└── scripts/
    └── test-connection.js  # READ-ONLY: shop name, primary domain, currency, scopes
```

## 1. Where to place credentials
Put them in **`commerce-manager/.env`** (already created, **gitignored**). It contains:
```
SHOPIFY_STORE_DOMAIN=ax41k1-k5.myshopify.com
SHOPIFY_CLIENT_ID=c7c6798ec945ca557cbb38e2969fbaf2
SHOPIFY_CLIENT_SECRET=shpss_****************************   # keep secret
SHOPIFY_ADMIN_API_VERSION=2026-07
```
`.env.example` holds the same keys as a reference and is **also gitignored** (everything matching `.env*` is ignored). If `.env` is absent, the app falls back to `.env.example`.

## 2. Safe test command
```bash
cd commerce-manager
npm run test:connection
```
This exchanges the credentials for a temporary token (never printed) and reads shop name, primary domain, currency, and the app's granted access scopes. It changes nothing.

## 3. What success looks like
```
▸ Requesting temporary token (client-credentials grant)…
  ✓ token acquired (in memory only, never printed)
▸ Querying shop + granted scopes (read-only)…

──────────── Connection OK ────────────
  Shop name:      The New Greenhouse
  Primary domain: https://ax41k1-k5.myshopify.com (ax41k1-k5.myshopify.com)
  Currency:       USD
  Access scopes:  read_products, write_products, …
✓ Read-only test complete. No data was created, updated, or deleted.
```

## 4. Security model
1. `.gitignore` updated **before** any credential was written; `.env`, `.env.*`, `*.log`, `reports/private/` are all ignored (verified).
2. Client-credentials grant → **temporary** token, in memory, auto-refreshed, never logged.
3. Secret + token redacted from every log and error.
4. Read-only connection test; **dry-run is the default**.
5. No create/update/publish/delete happens here.

## Notes
- The Admin API version is `2026-07` (override via `SHOPIFY_ADMIN_API_VERSION`).
- Requires the app to be **installed on the shop** (it is) with the needed scopes (`read_products`; plus `write_products`, `write_publications`, `write_content`, `write_online_store_navigation` for later steps).
- The catalog **import** is intentionally NOT built or run here. The prepared, dry-run import toolkit and the catalog data package live alongside (`index.mjs`, `../catalog/`) for a later, explicitly-approved step.
