# Production Replacement Workflow

How to swap in real prices, images, inventory, pack sizes, and SKUs **without erasing** descriptions, tags, SEO, or each other. The golden rule: **update files contain only the columns being changed** — Shopify only overwrites columns present in the CSV, so unrelated data is safe.

## 1. Replace prices
- File: `shopify-products-price-update-template.csv` — columns: `Handle, Variant SKU, Variant Price, Variant Compare At Price` only.
- Fill real prices per SKU (match on **Variant SKU** — stable). Leave Compare-at blank unless a genuine sale.
- Import with **"Overwrite existing products"** ON. Only price columns change. Descriptions/tags/SEO/images untouched.
- Source of provisional values: `provisional-price-report.md`.

## 2. Replace images
- Upload approved images (per `product-image-manifest.csv`, portrait 4:5, 1200×1500) to Shopify Files or a CDN → get HTTPS URLs.
- File: `shopify-products-image-update-template.csv` — `Handle, Image Src, Image Position, Image Alt Text`.
- Paste the HTTPS URL into `Image Src`; alt text is pre-filled. Import with Overwrite ON. For multiple images per product, add extra rows with the same Handle and incrementing `Image Position`.

## 3. Replace inventory
- Do inventory **in the admin** (Products → variant → Inventory) or via an inventory-only CSV (`Handle, Variant SKU, Variant Inventory Qty`). Keep it separate from price/image files.
- Current placeholder: tracked, qty 0, policy `deny`.

## 4. Correct exact pack sizes
- Pack sizes are variant **option values** (e.g. "25 Stems"). Changing option structure can regenerate variant IDs — so decide pack sizes **before** publishing.
- Preferred: edit `catalog/data/wholesale.json` (or the relevant category) → re-run `node catalog/build/generate.mjs` → re-import the fresh draft CSV **before** the products have live orders. After go-live, change variants in the admin carefully.

## 5. Correct SKUs
- SKUs follow `TNG-<CAT>-<seq>-<variantcode>`. To change: edit in the admin, or adjust the generator's code map and re-generate pre-publish. Keep SKUs stable once inventory/orders exist.

## 6. Add final alt text
- Alt text is generated per product in the image template + manifest. Refine there, then apply via the image update file (step 2).

## 7. Review each product
- Work through `catalog-review-checklist.md` per product. Resolve every `CONFIRMATION_REQUIRED` (see `product-master-data.csv`).

## 8. Publish approved products
- Per product (or bulk-select): set **Status → Active**. Only after price + image + review are done.

## 9. Publish to the Hydrogen sales channel
- Product → **Sales channels → Manage** → enable **Hydrogen / the storefront**. (Until this, the Hydrogen storefront won't show them even if Active.)

## 10. Verify the storefront
- Run the Hydrogen app; confirm products render on collection/product pages, prices/images correct, variants selectable, add-to-cart works. See `post-import-checklist.md`.

### Safety
- Never import a full master/draft CSV over live products for a small change — use the scoped templates above.
- Match on **Variant SKU** (stable) rather than row order.
- Keep one change type per import (prices OR images OR inventory), verify, then the next.
