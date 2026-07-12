# Post-Import Checklist

Run immediately after importing `shopify-products-draft.csv`.

## Draft & safety
- [ ] 80 new products created, **all Status = Draft** (filter Products by Draft).
- [ ] None published to Online Store or Hydrogen channel.
- [ ] Vendor = "The New Greenhouse" on all.

## Data integrity
- [ ] Multi-variant products show correct options (e.g. wholesale = Pack Size ± Stem Length; retail = Size; plants = Pot Size).
- [ ] Variant SKUs present & unique (`TNG-…`), prices provisional but non-zero.
- [ ] Tags imported and match `tag-taxonomy.md` (spot-check `channel:`, `flower:`, `occasion:`).
- [ ] Descriptions render (HTML lists/paragraphs), no raw tags, no `[CLIENT CONFIRMATION REQUIRED]`/"placeholder" visible.
- [ ] SEO title/description populated on the product row.
- [ ] No images (expected — blank until replacement).

## Structure
- [ ] Metafield definitions created (20 `custom.*`) — `metafield-definitions.md`.
- [ ] Metafield values loaded from `build/metafields-payload.jsonl` (or scheduled).
- [ ] 37 smart collections created per `automated-collection-rules.md`; product counts roughly match `collection-plan.csv`.
- [ ] Collection descriptions + SEO added from `collection-descriptions.md`.

## Before any publishing
- [ ] Real prices applied (`replacement-workflow.md` §1).
- [ ] Approved images applied (§2).
- [ ] Inventory set (§3).
- [ ] Every `CONFIRMATION_REQUIRED` resolved (pack sizes, country of origin, contents).
- [ ] Per-product review complete (`catalog-review-checklist.md`).

## Publish (only when the above are done)
- [ ] Set approved products Active.
- [ ] Enable Hydrogen sales channel per product.
- [ ] Storefront verified: collections populate, PDPs render, variants + add-to-cart work, prices/images correct.
