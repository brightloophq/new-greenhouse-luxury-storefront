# Import Instructions (DRAFT-safe)

**Goal:** import 80 products as **drafts** without touching live data. ~10 minutes.

## Before you start
- These products are DRAFT (`Status=draft`, `Published=FALSE`). They will **not** appear on the storefront until you publish them later.
- The import file is `catalog/shopify-products-draft.csv` — standard Shopify columns only, UTF-8, validated.
- Back up first: **Shopify admin → Products → Export → All products** (so you have a restore point).

## Step 1 — Import products
1. Shopify admin → **Products → Import**.
2. Upload `shopify-products-draft.csv`.
3. **Do NOT** tick "Publish new products to all sales channels" / "Overwrite existing products." Leave both **off**.
4. Preview → confirm it reads **80 products**. Click **Import products**.
5. Shopify creates them as **drafts** (the CSV's `Status=draft` enforces this).

## Step 2 — Confirm drafts
- Products list → filter **Status: Draft** → confirm 80 new products, none Active.
- Spot-check one multi-variant product (e.g. *Long-Stem Red Roses*): variants = Pack Size × Stem Length, SKUs like `TNG-WHL-001-P25-STD`, provisional prices present, no image.

## Step 3 — Create metafield definitions (before loading metafield values)
Follow `metafield-definitions.md` to create the 20 `custom.*` definitions in **Settings → Custom data → Products**. Do this **before** Step 4.

## Step 4 — Load metafield values (optional now, recommended before publish)
CSV metafield import is unreliable, so values ship as `catalog/build/metafields-payload.jsonl`. Load them via the Admin API / a bulk-operation script (see `metafield-import-plan.md`). Product attributes (flower type, colour, care, etc.) also live in `product-master-data.json` as the source of truth.

## Step 5 — Create collections
The product CSV does **not** create collections. Build the 37 smart collections from `automated-collection-rules.md` (each is a tag/type condition) and paste copy from `collection-descriptions.md`. See also `collection-plan.csv`.

## Step 6 — Set up navigation & filters (optional now)
Use `navigation-plan.md` (menus) and `filter-plan.md` (storefront filtering) when you're ready to wire the storefront.

## What NOT to do yet
- ❌ Don't publish products (they're intentionally draft).
- ❌ Don't publish to the Hydrogen sales channel yet.
- ❌ Don't run the price/image templates until you have real prices/images (see `replacement-workflow.md`).

➡ Next: `post-import-checklist.md`.
