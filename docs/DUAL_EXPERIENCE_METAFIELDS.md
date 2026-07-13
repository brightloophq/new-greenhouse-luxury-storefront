# `custom.experience` — Product & Collection Classification (Plan)

Classifies every product and collection as belonging to the **Classic**
(wholesale/professional) experience, the **Deluxe** (luxury gifting) experience,
or **both**. This is the single source of truth for "which experience should
surface this item".

> **Status: PLAN / NOT YET WRITTEN LIVE.**
> The storefront today routes each experience by **collection handle + nav**
> (see `app/lib/navigation.ts`), not by reading this metafield. No storefront
> query depends on `custom.experience` yet, so creating it is **non-breaking**
> and reversible. The live Admin write is **approval-gated** — do a dry run and
> get an explicit go-ahead before mutating the store.

---

## 1. Definition

| Field | Value |
|---|---|
| Namespace | `custom` |
| Key | `experience` |
| Type | `single_line_text_field` |
| Applies to | Products **and** Collections (two definitions, same namespace/key) |
| Allowed values | `classic` \| `deluxe` \| `both` |
| Default (unset) | Treated as `both` by any future consumer (fail-open, never hides an item) |

Validation: add a "list of allowed values" rule (`classic`, `deluxe`, `both`) in
the metafield definition so Admin editors can't fat-finger a value.

---

## 2. Value semantics

- **`classic`** — only surfaces in the Classic experience (wholesale flowers,
  greenery, floral supplies, vases, ribbon, tools, packaging).
- **`deluxe`** — only surfaces in the Deluxe experience (signature bouquets,
  premium roses/orchids, luxury gift boxes, romance/anniversary).
- **`both`** — surfaces in either experience (core flowers, seasonal blooms,
  occasion collections that read to gift buyers *and* the trade).

**Fail-open rule:** an unset or unrecognised value is treated as `both`. A
misclassification must never make a product un-buyable — the cart/checkout are
shared and every product stays reachable via `/products/<handle>` and search
regardless of this field.

---

## 3. Proposed collection classification

Derived from `docs/MAIN_WEBSITE_COMMERCE_LINKS.md` (handles verified to exist).

| Collection handle | `custom.experience` | Rationale |
|---|---|---|
| `bulk-flowers` | `classic` | Wholesale by the box |
| `wholesale-roses` | `classic` | Trade roses |
| `wholesale-greenery` | `classic` | Trade greenery |
| `greenery-and-fillers` | `classic` | Build materials |
| `floral-supplies` | `classic` | Studio supplies |
| `florist-essentials` | `classic` | Studio supplies |
| `vases-and-containers` | `classic` | Hard goods |
| `ribbon` | `classic` | Hard goods |
| `wrapping-and-packaging` | `classic` | Hard goods |
| `tools-and-accessories` | `classic` | Tools |
| `luxury-bouquets` | `deluxe` | Signature gifting |
| `roses` | `deluxe` | Premium roses |
| `orchids` | `deluxe` | Premium orchids |
| `gift-baskets` | `deluxe` | Luxury gift boxes |
| `love-and-romance` | `deluxe` | Romance gifting |
| `anniversary` | `deluxe` | Gifting occasion |
| `corporate-gifting` | `both` | Trade standing orders *and* premium corporate gifts |
| `all-flowers` | `both` | Core catalogue for both audiences |
| `birthday` | `both` | Universal occasion |
| `congratulations` | `both` | Universal occasion |
| `sympathy-and-funeral` | `both` | Universal occasion |
| `all` | `both` | Catch-all |

**Product-level:** default every product to its primary collection's value; only
override for individual products that clearly belong elsewhere (e.g. a single
premium orchid stem inside `bulk-flowers` → `both`). Product classification is a
manual merchandising pass in Admin, not a bulk script, to avoid mislabelling.

---

## 4. How the storefront *would* consume it (future, opt-in)

Only relevant if/when we want a **shared** collection (e.g. `all-flowers`) to
show a different subset per experience. Two non-breaking options:

1. **Query-time filter** — add `metafield(namespace:"custom", key:"experience")`
   to `CATALOG_PRODUCT_FRAGMENT`, then in the loader keep products whose value is
   the active experience **or** `both`. Fail-open on null.
2. **Merchandising only** — leave the storefront as-is and use the metafield
   purely in Admin (Search & Discovery boosts, collection conditions). Zero code.

Recommended: **option 2 first** (no code, no risk); adopt option 1 only if a real
need for per-experience filtering of a shared collection appears in QA.

---

## 5. Live-write runbook (execute only after explicit approval)

1. **Dry run** — list target collections + intended values (this table); confirm
   each handle resolves in Admin.
2. Create the two metafield definitions (Products, Collections) with the allowed
   value list, via Admin UI or Admin API `metafieldDefinitionCreate`.
3. Set collection values per the table (Admin API `metafieldsSet`, batched).
4. Spot-check 3–5 collections in Admin.
5. **No storefront deploy required** — the field is inert until a consumer is
   built (§4).

Credentials: any Admin API token stays in the gitignored `.env` (never committed,
never printed). This repo currently has **no** Admin API client — one would be
added under `scripts/` only when step 2 is approved.
