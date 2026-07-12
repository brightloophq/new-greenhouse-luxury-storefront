# The New Greenhouse — Catalog Production Package

A production-ready, **DRAFT** Shopify catalog for The New Greenhouse (Kingston, Jamaica). Import now as drafts; replace images, prices, inventory, and confirm pack sizes/SKUs later, then review and publish — without rebuilding.

**Nothing here was imported, published, or pushed to Shopify. No live data was changed.**

## What's in the box
| File | Purpose | Source |
|---|---|---|
| `shopify-products-draft.csv` | **The import file** — 80 products / 208 variants, standard Shopify columns only, all `draft` / `Published=FALSE`, image blank | generated |
| `product-master-data.csv` / `.json` | Full internal record incl. `PRICE_STATUS`, `IMAGE_STATUS`, `CONFIRMATION_REQUIRED`, collections, planned images | generated |
| `shopify-products-price-update-template.csv` | Safe price-replacement file (Handle · SKU · Price · Compare-at only) | generated |
| `shopify-products-image-update-template.csv` | Safe image-replacement file (Handle · Image Src · Position · Alt) | generated |
| `product-image-manifest.csv` | Per-product image spec + generation prompt | generated |
| `product-image-prompts.md` | Photography system + prompt template | doc |
| `collection-plan.csv` | 37 smart collections + match rules + counts | generated |
| `collection-descriptions.md` | Collection copy + SEO | doc |
| `automated-collection-rules.md` | Exact tag conditions for each smart collection | doc |
| `tag-taxonomy.md` | The controlled tag vocabulary | doc |
| `metafield-definitions.md` / `metafield-import-plan.md` | Metafield schema + how to load values | doc |
| `navigation-plan.md` / `filter-plan.md` | Menu + storefront filter design | doc |
| `provisional-price-report.md` | Every provisional price listed | generated |
| `import-instructions.md` | Step-by-step import (draft-safe) | doc |
| `post-import-checklist.md` | Verify after import | doc |
| `replacement-workflow.md` | Replace prices/images/inventory safely | doc |
| `catalog-review-checklist.md` | Per-product review before publishing | doc |
| `build/` | `generate.mjs` (builder), `validate.mjs` (QC), `metafields-payload.jsonl`, `stats.json` | scripts |
| `data/` | Author source JSON per category (regenerate from these) | source |

## Regenerate / re-validate
```
node catalog/build/generate.mjs   # rebuild all outputs from catalog/data/*.json
node catalog/build/validate.mjs   # 17-point QC (exit 0 = clean)
```

## Catalog at a glance
- **80 products**, **208 variants**, **37 smart collections**.
- Split: Wholesale 32 · Retail 16 · Sympathy 8 · Weddings 8 · Supplies 10 · Plants & Gifts 6.
- **208 provisional prices** (USD, `REPLACE_BEFORE_PUBLISHING`).
- **80 product images required** (none embedded; URLs blank).
- **120 confirmation-required flags** (internal only).

## Safety guarantees (built in & validated)
Every product `Status=draft` + `Published=FALSE`; `Image Src` blank; prices flagged provisional; no fabricated awards/testimonials/guarantees; no "Jamaican-grown" claims (`country_of_origin = [CLIENT CONFIRMATION REQUIRED]`); internal flags never appear in customer-facing copy; original content only. Start with `import-instructions.md`.
