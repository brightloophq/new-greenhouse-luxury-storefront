# Shopify Content SEO Audit

> **Phase:** audit + planning only. **No Shopify data was read live, and none was
> modified.** Baseline: `redesign-v1 @ a956a83` (SEO Sprints 1–3 integrated).

## Executive Summary

- **Live Shopify catalogue could NOT be read from this environment.** The network
  egress proxy blocks all external hosts (a request to `shop.thenewgreenhouseja.com`
  returns `000`/blocked), and no Shopify Storefront/Admin credentials are present
  locally (no `.env`). So the **current live catalogue state cannot be verified**
  from here.
- What *is* available is the merchant's **catalogue build/source dataset** in the
  repo (`catalog/`, `commerce-manager/`). This describes the **intended** catalogue
  used to create products/collections — it is **not** a live export and may differ
  from what is currently published. Every statistic below is **[SOURCE — live state
  unverified]** unless stated otherwise.
- **Headline findings (from source data):**
  - 80 products / 208 variants / 37 planned collections.
  - Source SEO coverage looks **strong**: 80/80 products carry `seoTitle`,
    `seoDescription`, and a real `descriptionHtml` (median ~741 chars); **zero**
    duplicate titles / SEO titles / meta descriptions.
  - **59/80 products are flagged `confirmationRequired`** in the source data itself
    → **OWNER INPUT REQUIRED** before those can be finalised.
  - **Images: `missingImages: 80`** in the build stats — image *assets* are not yet
    generated/uploaded (a planned alt-text manifest exists, but with a templated
    location suffix that needs review).
  - **Collection SEO copy is a gap:** the collection plan carries handles + smart
    match rules + counts but **no SEO title / meta description / body copy**.
  - **Governance conflict:** 8 `weddings`-category products exist in source, but the
    storefront explicitly **does not offer weddings/events** (routes 301 to
    `/collections`, footer hides wedding links). Owner must resolve.

## Access

- **Live Shopify read access:** **NONE from this environment.** Egress blocked;
  no credentials.
- **Method attempted:** direct HTTPS to the storefront (blocked); no Storefront API
  public token or Admin credentials available locally to query either API.
- **Repository catalogue source data:** available and used for this planning audit,
  clearly labelled as source (not live).
- **Writes performed:** **NO.** No Shopify mutations, no product/collection changes,
  no deploy, no `production`.

### Env var names referenced by the app (values NOT read/exposed)
Admin-side (server-only, injected at runtime): `SHOPIFY_ADMIN_API_TOKEN`,
`SHOPIFY_ADMIN_STORE_HANDLE`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`. Standard
Hydrogen Storefront public vars (`PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`,
`PUBLIC_STOREFRONT_ID`) are Oxygen-injected and **not** present in this local tree.

## Catalogue Statistics `[SOURCE — live state unverified]`

- **Products:** 80 (`catalog/product-master-data.json`) · **Variants:** 208
- **Collections (planned):** 37 (`catalog/collection-plan.csv`)
- **By category:** wholesale 32 · retail 16 · sympathy 8 · weddings 8 · supplies 10 · plants 6
- **By channel:** both 40 · wholesale 22 · retail 18
- **Top planned collections (by product membership):** Bulk Flowers 62 · All Flowers 48 ·
  Florist Essentials 42 · Corporate Gifting 33 · White and Ivory 31 ·
  Sympathy and Funeral 25 · Mixed Color 24 · Green 20 · Congratulations 18 ·
  Pink 14 · Roses 13 · Birthday 13

## Product Findings `[SOURCE]`

| Field | Coverage (source) | Assessment |
|---|---|---|
| `title` | 80/80 | Descriptive, human-readable; **0 duplicates / 0 near-dup collisions detected** |
| `seoTitle` | 80/80 | Present; **0 duplicates**; verify length ≤ ~60 chars live |
| `seoDescription` | 80/80 | Present; **0 duplicates**; verify ~120–160 chars live |
| `descriptionHtml` | 80/80 (478–863 chars, median 741) | Not thin; product-specific |
| `handle` | 80/80 | Readable slugs (e.g., `long-stem-red-roses`) |
| `image` (field) | 80/80 (filename refs) | But **assets missing** (`missingImages: 80`) |
| `confirmationRequired` | **59/80 flagged** | **OWNER INPUT REQUIRED** on those |

**Interpretation:** if the live catalogue mirrors this source, product-level SEO is in
good shape and should **not** be blindly rewritten — the priority is (a) confirming the
59 flagged products with the owner, (b) generating/uploading images + finalising alt
text, and (c) verifying live values match source. **This must be re-checked against the
live catalogue**, since live values may have drifted from source.

## Collection Findings `[SOURCE]`

- All 37 collections have a **handle, type (smart/manual), match rule, and product
  count** — good structural hygiene.
- **No collection `seoTitle` / `metaDescription` / body description exists in the plan**
  → this is the single biggest catalogue-SEO gap. High-intent collections (below) need
  bespoke SEO copy.
- Priority commercial collections all exist in the plan: **Corporate Gifting (33)**,
  **Sympathy and Funeral (25)**, **Bulk Flowers (62, wholesale)**, plus retail flowers,
  supplies (Florist Essentials 42), arrangements, occasion (Birthday/Congratulations),
  colour (White & Ivory/Pink/Green/Mixed) and flower-family (Roses/Orchids) collections.

## Duplicate Content Findings

- **Product level (source):** none — 0 duplicate titles, SEO titles, or meta
  descriptions.
- **Collection-intent overlaps to verify live (not necessarily harmful):**
  - `All Flowers` vs `Bulk Flowers` vs channel-split retail/wholesale views of the same
    products — confirm these serve distinct intent and don't compete for one query.
  - Colour collections (White & Ivory, Pink, Green, Mixed) are legitimate facets, not
    duplication.
- **Variants vs duplication:** the 208 variants across 80 products are legitimate
  size/stem/price variants, not duplicate products.

## Image Alt Coverage `[SOURCE]`

- A planned alt manifest (`catalog/product-image-manifest.csv`) covers **80/80**
  products with alt text — **but** every alt follows the template
  `"{Product} — The New Greenhouse, Kingston Jamaica"`. Product-first and factual, but
  the fixed brand+location suffix on *every* image leans templated. **Recommendation:**
  keep the product description; drop or vary the location suffix so alt text describes
  the *actual image* rather than repeating a location string site-wide (P3).
- **Image assets themselves are missing** (`missingImages: 80`) — alt text is moot until
  images exist. **Collection image alt:** not present in the collection plan → gap.
- **Live alt coverage is unknown** and must be measured against the live catalogue.

## High-Priority Pages — provisional A–E `[pending live verification]`

Classification uses source data + code; must be re-confirmed live.

| Collection | Class | Basis |
|---|---|---|
| **Retail Flowers** | **B** | Products exist; needs collection-level SEO copy (none in plan) |
| **Arrangements** | **B / D** | Needs collection SEO copy; verify products populated live (Sprint-1 noted premium-deluxe collections possibly empty) |
| **Supplies** (Florist Essentials, 42) | **B** | Well-populated; needs collection SEO copy |
| **Wholesale** (Bulk Flowers, 62) | **B** | Well-populated; trade-gated; needs collection SEO copy (trade tone) |
| **Corporate Gifting** (33) | **C** | Real target (`/collections/corporate-gifting`); needs substantive SEO body + metadata |
| **Sympathy / Funeral** (25) | **C** | High-intent, sensitive; needs careful bespoke copy + live population check |

None are provisionally **A** (already strong) because **no collection SEO copy exists in
source**; none are **E** except pending the live checks above.

## Owner Input Required

1. **59 `confirmationRequired` products** — the source flags these as needing owner sign-off
   (pricing, availability, or factual details). Cannot finalise SEO/description without it.
2. **Collection SEO copy** — bespoke SEO title + meta description + body for the priority
   collections (owner voice/positioning, especially Sympathy and Corporate).
3. **Wedding/event decision** — 8 wedding products in source conflict with the storefront's
   "weddings not offered" stance. Publish weddings (and restore routes) **or** unpublish/
   exclude those products. Owner must decide.
4. **Delivery facts** (for `/contact`, since `/pages/delivery-information` 301s there):
   confirm any additional verified delivery specifics beyond what `companyContent.ts`
   already states (areas: Kingston & St. Andrew; same-day cutoff 12:00 PM). Do **not**
   invent fees/windows/guarantees.
5. **Opening hours, ratings/reviews, awards, certifications, freshness/origin claims** —
   none exist in verified data; supply only if genuinely verifiable.

## Proposed Metadata

Because live values could not be read, this audit does **not** hand-write replacement
metadata blind. Where the live catalogue mirrors the (already-populated) source SEO
fields, **preserve the good existing content** — do not rewrite. The proposal is:

- **Products:** verify live `seoTitle`/`seoDescription` against source; only rewrite the
  minority that are missing/weak/over-length once measured. Template (only where weak):
  - SEO title: `{Product} | The New Greenhouse` (≤ ~60 chars)
  - Meta: one factual sentence — what it is + Kingston/Jamaica context, no invented
    delivery/price/availability claims.
- **Collections (net-new, the real gap):** author bespoke SEO title + meta + short body
  per priority collection, in the owner's voice, source-backed. Example *direction* for
  Corporate Gifting (to be owner-approved, not published here): position around corporate
  flower gifting in Kingston/Jamaica, referencing only real capabilities.

Any product needing factual detail that is unavailable → **OWNER INPUT REQUIRED** (do not
manufacture descriptions).

## Recommended Execution Order

1. **Confirm access + live baseline** — obtain read access; export the live catalogue;
   diff live vs this source dataset to find real drift.
2. **Resolve owner inputs** — the 59 flagged products + wedding decision + collection copy.
3. **Collection SEO copy** (highest leverage; the biggest gap).
4. **Product metadata** — only the weak/missing/over-length minority.
5. **Images + alt** — generate/upload assets, then finalise non-templated alt.

## Execution Plan (proposed — DO NOT execute)

All writes below require **Shopify Admin API** access and explicit authorization; none are
performed now. Every batch is backed by a pre-write export (see Automation Feasibility).

| Batch | Scope | ~Records | Fields | Risk | Rollback |
|---|---|---|---|---|---|
| **1** | High-value collections | ~6 | collection `seo.title`, `seo.description`, `body_html` | Low–Med (customer-visible copy) | Restore from pre-write collection export |
| **2** | Highest-value products (priority collections, non-flagged) | ~20–40 | product `seo.title`, `seo.description` | Low | Restore from per-field product export |
| **3** | Remaining product metadata | balance of 80 | product `seo.title`, `seo.description` | Low | Same as Batch 2 |
| **4** | Image alt text | up to 80+ media | media `alt` | Low | Restore prior alt from export |
| **5** | Content enrichment needing owner input | 59 flagged + collection body | descriptions/body | Med (factual accuracy) | Gated on owner sign-off; export before write |

## Automation Feasibility

- **Claude can safely automate (once access is granted):** reading the live catalogue,
  computing coverage/duplication/alt statistics, diffing live vs source, and drafting
  proposed metadata for review — all read-only.
- **Requires Shopify Admin API access (writes):** every catalogue mutation
  (`productUpdate`, `collectionUpdate`, media `alt`). Not available here; requires the
  owner to provision Admin credentials/scopes and explicit authorization.
- **Requires owner confirmation:** the 59 flagged products, all bespoke collection copy,
  the wedding decision, and any delivery facts.
- **Backup before mutation:** for every batch, first export the exact current live values
  of the fields to be changed (per-record JSON) into `catalog/backups/<batch>-<timestamp>/`
  so any write is reversible field-by-field; never mutate without that snapshot.

## Deployment / Data Safety

Oxygen: not triggered · production: untouched · Shopify: not modified · GTM/GA4: not
started · no runtime storefront code changed to produce this report.
