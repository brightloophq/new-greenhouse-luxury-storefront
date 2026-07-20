# Merchant actions required in Shopify admin

Everything below is work that must happen **inside Shopify** — the storefront code
is complete and will start using each item the moment it exists. Nothing here
requires a code change or a redeploy.

Verified against the live store `ax41k1-k5.myshopify.com` on 2026-07-20.

---

## 1. Missing collections (blocks the Premium / Deluxe catalogue)

The Premium pathway maps to three **dedicated** collections. None of them exist
yet, so all three pages currently render the intentional empty state
*"This collection is being set up."* — verified live at
`/arrangements/premium-deluxe/handcrafted`.

No substitute products are shown. This is deliberate: the alternative would be
putting unrelated stock behind a premium price frame.

| Handle needed | Powers the route | Status |
|---|---|---|
| `premium-handcrafted` | `/arrangements/premium-deluxe/handcrafted` | **Missing — create** |
| `premium-vase` | `/arrangements/premium-deluxe/vase` | **Missing — create** |
| `premium-heart-box` | `/arrangements/premium-deluxe/heart-box` | **Missing — create** |

**To do:** create each collection (Products → Collections → Create), give it the
exact handle above, and add the premium products. The pages populate immediately
— no deploy needed.

### Collections already in place (no action)

`bulk-flowers`, `floral-supplies`, `all-flowers`, `best-sellers`, `birthday`,
`love-and-romance`, `sympathy-and-funeral`, `thank-you`, `get-well`, `new-baby`,
and the five supply categories (`vases-and-containers`, `ribbon`,
`wrapping-and-packaging`, `tools-and-accessories`, `florist-essentials`).

---

## 2. Product tagging (a small gap, not a missing taxonomy)

**Correction to an earlier version of this document.** It claimed no products
carried `color:` or `flower:` tags. That was wrong — it generalised from a
five-product sample. A full scan of all 206 products shows the taxonomy is
largely in place:

| Facet | Tagged | Untagged | Status |
|---|---|---|---|
| `occasion:` | 188 | 18 | ✅ Working |
| `color:` | 177 | 29 | Mostly working |
| `flower:` | 176 | 30 | Mostly working |

The untagged products are concentrated in the **luxury Floral Arrangements**,
which is exactly the group that populates `/retail/flowers` — so the gap was far
more visible than its size suggests.

Run `npm run shopify:tags` (§6) for the current plan. As of the last scan it
would add **13 colour tags**, each one stated outright in the product's own
title (e.g. *Grand Red Rose Arrangement* → `color:red`). It never guesses.

**24 products need your judgement** because the title does not state the answer
— e.g. *Thank You Bouquet*, *Corporate Elegance Arrangement*, and the ribbons
and vases whose colour varies by variant. The script lists them rather than
inventing a value; a wrong colour tag is worse than a missing one, because it
makes the filter lie to the shopper.

### Optional: enable storefront filters (performance)

Shopify only applies a `tag` filter server-side when that filter is **enabled**
in **Search & Discovery → Filters**. It is not enabled for these tags today, so
Shopify returns the unfiltered collection and the storefront enforces the tags
itself on the loaded page.

This is correct and shoppers see accurate results either way — but enabling
`color` and `flower` (and `occasion`) as storefront filters in Search &
Discovery lets Shopify do the narrowing, which is faster and removes the 48-item
page ceiling on heavily-filtered views. Recommended, not required.

---

## 3. Customer metafield definitions (blocks the wholesale profile)

The wholesale business profile writes **nine individual typed metafields** — not
one JSON blob — so each value is readable, filterable and segmentable in admin.

Create each under **Settings → Custom data → Customers → Add definition**, in the
`custom` namespace, and grant **Customer Account API: read and write** access on
every one.

| Namespace + key | Type | Required of the buyer |
|---|---|---|
| `custom.business_name` | Single line text | Yes |
| `custom.business_type` | Single line text | Yes |
| `custom.business_phone` | Single line text | Yes |
| `custom.business_address` | Multi-line text | Yes |
| `custom.city_parish` | Single line text | Yes |
| `custom.delivery_area` | Single line text | Yes |
| `custom.website_social` | Single line text | No |
| `custom.purchase_frequency` | Single line text | No |
| `custom.business_notes` | Multi-line text | No |

**Behaviour before these exist:** a signed-in trade buyer is *not* locked out.
If the metafield lookup fails, the storefront logs a warning and lets them shop —
a misconfigured metafield must never look like a closed door. Once the
definitions exist, buyers with an incomplete profile are routed to the form and
returned to where they were heading.

**Note:** the previous single `custom.wholesale_profile` (type `json`) metafield
is no longer read or written. If any customer records carry it, the data can be
migrated into the nine fields above, or the definition deleted.

---

## 4. Shopify-managed menus

The footer menu is pulled from Shopify. Any item pointing at wedding or event
services is **hidden by the storefront** because those services are not offered.

**To do:** delete those items from **Content → Menus → Footer** so the CMS
matches what is actually shown.

---

## 5. Automating §1–§3 (recommended)

Sections 1–3 are scripted. They need an **Admin API token**, which this project
does not have — the storefront only ever gets read-only Storefront tokens, by
design. Creating the token is the one step only you can do.

### One-time setup (about a minute)

1. Shopify admin → **Settings → Apps and sales channels → Develop apps →
   Create an app**. Name it e.g. *Storefront Setup*.
2. **Configure Admin API scopes** — tick exactly these four:
   - `read_products`, `write_products` — collections and product tags
   - `read_customers`, `write_customers` — customer metafield definitions
3. **Install app**, then reveal the **Admin API access token** (`shpat_…`).
4. Add it to `.env` (already gitignored — it is never committed):

   ```
   SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxx
   ```

Keep the token in the file. Don't paste it into chat or a commit.

### Then run

Every command is **dry run by default** — it prints exactly what it would do and
writes nothing. Add `--apply` only when the plan looks right.

```bash
npm run shopify:collections          # §1 — preview
npm run shopify:collections -- --apply

npm run shopify:metafields           # §3 — preview
npm run shopify:metafields -- --apply

npm run shopify:tags                 # §2 — preview (also lists the 24 unresolved)
npm run shopify:tags -- --apply

npm run shopify:setup                # all three, dry run
```

All three are **idempotent and additive**. Existing collections, definitions and
tags are reported and left untouched — nothing is overwritten or deleted, so
re-running is always safe.

---

## 6. Not done — needs your decision

- **The flower library at `/flowers`** (25 categories, generated imagery) is
  intact and reachable but is **not linked from the approved navigation**. It was
  left untouched under the "do not modify the completed flower catalog"
  constraint. Tell me whether to link it, fold it into Retail, or retire it.
- **No Shopify products or collections were deleted** anywhere in this batch,
  including for the landing pages that now redirect.
