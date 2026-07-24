# Attach `shop.thenewgreenhouseja.com` to the Oxygen Production storefront

**Goal:** serve the live Hydrogen storefront on `shop.thenewgreenhouseja.com`
instead of the long Oxygen URL
(`new-greenhouse-luxury-storefront-af867b2f0550402dbcd2.o2.myshopify.dev`).

**What this touches:** ONE new DNS record (`shop` subdomain) + one setting in the
Shopify admin. It does **not** touch the apex domain `thenewgreenhouseja.com`, your
website, or your email (`info@thenewgreenhouseja.com`) — those MX/other records stay
exactly as they are.

**Who does this:** you (merchant). It requires the Shopify admin and your DNS
registrar login — neither of which the assistant can access.

**Time:** ~10 minutes of clicks, then 15 min–48 h for DNS + SSL to go live.

---

## Step 1 — Add the domain in the Shopify admin

1. Shopify admin → **Hydrogen** (under Sales channels / Apps) → open the
   **New Greenhouse Luxury Storefront** storefront.
2. Open **Storefront settings** → **Domains** (may read "Custom domains" /
   "Connect domain").
3. Choose **Connect existing domain** and enter:
   ```
   shop.thenewgreenhouseja.com
   ```
4. Assign it to the **Production** environment (handle: `production`, branch: `main`)
   — not Preview.
5. Shopify now shows a **DNS target value** to point the subdomain at (a hostname,
   typically ending in `.shopifycloud.com` / `.myshopify.dev`, or a set of records).
   **Copy that exact value** — do not guess it; it is generated per storefront.

> Keep this browser tab open — you'll come back to it in Step 3 to verify.

---

## Step 2 — Add the DNS record at your registrar

Log in to wherever the DNS for `thenewgreenhouseja.com` is managed (your domain
registrar or DNS host — e.g. Namecheap, GoDaddy, Cloudflare, Google Domains).

Add **one CNAME record**:

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| Type             | `CNAME`                                                      |
| Host / Name      | `shop`  (some panels want the full `shop.thenewgreenhouseja.com`) |
| Value / Target   | **the exact target Shopify showed in Step 1**               |
| TTL              | Automatic / default (or 300–3600 s)                         |
| Proxy (Cloudflare only) | **DNS only** — turn the orange cloud **OFF**          |

Notes:
- Because `shop` is a **subdomain**, this is a **CNAME** (not an A record). Don't add
  an A record for it.
- If your panel refuses a CNAME on `shop` because one already exists, edit the
  existing `shop` record instead of adding a duplicate.
- **Cloudflare users:** the record must be **DNS only** (grey cloud). Leaving Cloudflare
  proxy on ("orange cloud") breaks Shopify's SSL provisioning.
- Leave every other record alone — especially `MX`, `TXT` (SPF/DKIM), and the apex
  `@` / `www` records. Email and the main website are unaffected.

Save the record.

---

## Step 3 — Verify & wait for SSL

1. Back in the Shopify Hydrogen **Domains** screen, use **Verify connection** /
   **Check status** (or just refresh). It moves through *Pending → Verified*, then
   provisions an SSL certificate automatically (the padlock).
2. DNS can take 15 minutes to 48 hours to propagate; SSL usually completes within
   an hour of DNS resolving. No further action needed while it provisions.

You can watch progress yourself from any terminal:

```powershell
# Does the CNAME resolve to Shopify's target yet?
nslookup shop.thenewgreenhouseja.com

# Once live, this should return HTTP 200 and serve the storefront:
curl -sI https://shop.thenewgreenhouseja.com/ | Select-String "HTTP"

# Confirm the turbo-stream fix is live on the real domain too:
curl -s -o NUL -w "%{http_code}`n" https://shop.thenewgreenhouseja.com/classic/supplies.data
```

Expected once fully live: the `curl` calls return **200**, and the browser shows the
padlock with no certificate warning.

---

## Step 4 — Set it as the primary domain (optional but recommended)

In the Hydrogen **Domains** screen, mark `shop.thenewgreenhouseja.com` as the
**primary / default** domain so:
- shoppers are redirected to it from the raw `*.o2.myshopify.dev` URL, and
- canonical SEO tags and links use the branded domain (no duplicate-content split).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Domain not verified" after hours | CNAME target typo, or record not saved | Re-copy the exact target from Step 1; confirm with `nslookup` |
| SSL / certificate error in browser | Cloudflare proxy left ON | Set the `shop` record to **DNS only** (grey cloud) |
| `nslookup` shows old/no value | DNS still propagating, or TTL too high | Wait; lower TTL to 300 s and re-check |
| Email stopped working | An MX/TXT record was changed by mistake | Restore the original mail records; only the `shop` CNAME should have changed |
| Loads the Oxygen URL but not the domain | Domain not assigned to **Production** | In Step 1, ensure it's on the `production` environment, not Preview |

---

## Quick reference

- **Domain to connect:** `shop.thenewgreenhouseja.com`
- **Environment:** Production (`production`, branch `main`)
- **Record type:** `CNAME`  ·  **Host:** `shop`  ·  **Target:** *(from Shopify, Step 1)*
- **Current Oxygen URL (fallback):**
  `https://new-greenhouse-luxury-storefront-af867b2f0550402dbcd2.o2.myshopify.dev`
- **Untouched:** apex domain, `www`, MX/email, existing website.
