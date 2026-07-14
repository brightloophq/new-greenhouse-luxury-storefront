# Catalog Review Checklist

Work through this **per product** before publishing. Source of truth: `product-master-data.csv` (has `CONFIRMATION_REQUIRED`, `PRICE_STATUS`, `IMAGE_STATUS`, collections, tags per handle). 120 confirmation flags exist across the catalog.

## Per product
- [ ] **Title & description** accurate and on-brand; no fabricated claims.
- [ ] **Price** replaced with a real value (remove `price-status:placeholder`). See `provisional-price-report.md`.
- [ ] **Compare-at** only if a genuine sale.
- [ ] **Image** added (approved, 4:5) and alt text final; remove `image-status:required`.
- [ ] **Variants / pack sizes** confirmed correct (esp. wholesale 25/50/100; resolve `CONFIRMATION_REQUIRED: exact pack size`).
- [ ] **SKU** final (`TNG-…`) and matches inventory system.
- [ ] **Inventory** set; policy correct.
- [ ] **Country of origin** confirmed — replace `[CLIENT CONFIRMATION REQUIRED]`; only display if truthful (no unverified "Jamaican-grown").
- [ ] **Tags** correct & from taxonomy; smart-collection membership looks right.
- [ ] **SEO** title/description read naturally; unique.
- [ ] **Care / delivery / availability** notes accurate; delivery stays conditional.
- [ ] **Status** flipped to Active only when all above pass; Hydrogen channel enabled.

## Category spot-checks
- [ ] **Wholesale (32):** stem lengths, pack economics, trade tone; premium pricing where flagged.
- [ ] **Retail (16):** occasion tags match; gift-ready framing.
- [ ] **Sympathy (8):** respectful tone throughout; no upsell/celebration language.
- [ ] **Weddings (8):** consultative framing; seasonal-substitution note present.
- [ ] **Supplies (10):** dimensions/materials/quantities accurate; not mistaken for flowers.
- [ ] **Plants & Gifts (6):** real plant care; add-ons framed as complements.

## Catalog-wide
- [ ] `node catalog/build/validate.mjs` passes (17/17).
- [ ] No duplicate handles/SKUs vs existing store products.
- [ ] Collections created & populated; navigation + filters configured.
- [ ] Metafield definitions created; values loaded.
- [ ] No copyrighted text/images used; all content original.
- [ ] No storefront code changed by this sprint.
