# Shopify Structure & Tagging Strategy — Deluxe

How the Deluxe catalogue is modelled in Shopify: product types, vendor, tags, metafields, and the filters they power. Designed to stay clean and scalable to hundreds of SKUs.

---

## 1. Product types (controlled vocabulary)

Use **only** these `productType` values — they drive templates, JSON-LD, and analytics:

| productType | Used for |
|---|---|
| `Luxury Bouquet` | Hand-tied wrapped bouquets |
| `Floral Arrangement` | Vase / box / basket arrangements |
| `Sympathy Tribute` | Standing sprays, wreaths, casket sprays, sympathy vases |
| `Wedding Flowers` | Bridal / bridesmaid / ceremony pieces |
| `Centerpiece` | Reception & event centerpieces |
| `Gift Add-on` | Chocolates, teddy, card, balloon, vase upgrade |

## 2. Vendor

Single vendor for the whole house: **`The New Greenhouse`**.

## 3. Tag taxonomy (namespaced)

All tags are **lowercase**, **namespaced with `:`**, and machine-parseable. Every product carries: `experience:deluxe`, `channel:retail`, one `occasion:*`, one `tier:*`, ≥1 `flower:*`, ≥1 `palette:*`, one `format:*`.

| Namespace | Values | Purpose |
|---|---|---|
| `experience:` | `deluxe` | Routes to the luxury storefront (mirrors Classic `experience:classic`) |
| `channel:` | `retail` | Retail (vs wholesale) channel scoping |
| `occasion:` | `anniversary` `birthday` `romance` `sympathy` `congratulations` `thank-you` `get-well` `new-baby` `corporate` `wedding` `seasonal` `everyday` `mothers-day` | Primary + secondary browse |
| `collection:` | `best-seller` `signature` `luxury-bouquet` `seasonal` | Curated editorial membership |
| `flower:` | `rose` `orchid` `lily` `calla-lily` `hydrangea` `peony` `ranunculus` `tulip` `gerbera` `sunflower` `chrysanthemum` `carnation` `anthurium` `mixed` | Species filter (primary flower) |
| `palette:` | `red` `blush` `white` `ivory` `pastel` `jewel` `gold` `bright` `blue` `pink` `green` `mixed` | Colour filter |
| `style:` | `hand-tied` `arrangement` `bouquet` `posy` `wreath` `standing-spray` `casket-spray` `centerpiece` `basket` | Form filter |
| `format:` | `bouquet` `vase` `box` `basket` `stand` | Presentation vessel |
| `tier:` | `standard` `premium` `luxury` `signature` | Price-tier filter |
| `recipient:` | `her` `him` `couple` `family` `new-parent` `colleague` `client` | Concierge / gifting filter |
| `delivery:` | `same-day` | Same-day eligibility |
| _flag_ | `addon` | Gift add-on (checkout upsell only) |

**Rule:** the storefront filter UI reads namespaces `flower:`, `palette:`, `tier:`, `format:`, `recipient:`. Everything else is routing/merchandising and is hidden from the customer-facing facet list.

## 4. Metafields

Structured data the storefront and concierge read. Namespace **`custom`** (existing project convention; do not remove Hydrogen SEO/`custom.experience`).

| Key | Type | Example |
|---|---|---|
| `custom.flowers_primary` | list.single_line_text | `Red Roses` |
| `custom.flowers_secondary` | list.single_line_text | `Baby's Breath` |
| `custom.greenery` | list.single_line_text | `Italian Ruscus \| Eucalyptus` |
| `custom.palette` | single_line_text | `Red` |
| `custom.arrangement_style` | single_line_text | `Hand-tied` |
| `custom.vessel` | single_line_text | `Kraft & ivory wrap` |
| `custom.size_options` | list.single_line_text | `Classic \| Grand \| Opulent` |
| `custom.care_instructions` | multi_line_text | Trim stems, change water… |
| `custom.delivery_notes` | multi_line_text | Same-day Kingston before 1pm… |
| `custom.concierge_tags` | single_line_text | `romance\|her\|romantic\|luxury\|red\|same-day\|partner\|classic` |
| `custom.occasion` | single_line_text | `romance` |
| `custom.tier` | single_line_text | `luxury` |

> These duplicate some tag data intentionally: tags drive fast collection/filter queries; metafields drive rich PDP content and the concierge without tag-string parsing.

## 5. Variants & pricing

- Size options map to **variants** (`Classic / Grand / Opulent`), each with its own price inside the product's tier band.
- Add-ons are single-variant, low price, `addon` tag, **never** an occasion collection.
- Availability strategy mirrors the approved wholesale pattern where stock isn't counted: **inventory untracked + policy CONTINUE** (available to order, no invented counts, never shows "Sold Out"). Made-to-order weddings use the same untracked approach with lead-time delivery notes.

## 6. Search filters (storefront)

Expose exactly these facets on Deluxe collection + search pages:

1. **Occasion** (when browsing "all") — from `occasion:`
2. **Flower** — from `flower:`
3. **Colour** — from `palette:`
4. **Price** — from `tier:` (Standard → Signature)
5. **Format** — from `format:`
6. **Recipient** (concierge assist) — from `recipient:`

Note: the Storefront `search` connection ignores `productFilters` when a text query is present — Deluxe search must **post-filter by `experience:deluxe` / `channel:retail` tags** server-side (already the established pattern; keep it).

## 7. Naming in Shopify

- Product **title** = the catalogue Product Name (see [`03-naming-standards.md`](03-naming-standards.md)).
- **Handle** = the catalogue URL handle (immutable once live; set redirects if ever changed).
- SEO title/description live in the product's SEO fields (see [`05-seo-strategy.md`](05-seo-strategy.md)).

## 8. Governance checklist (per product, before publish)

- [ ] `productType` from the controlled list
- [ ] vendor = The New Greenhouse
- [ ] `experience:deluxe` + `channel:retail`
- [ ] exactly one `occasion:` primary (+ ≤1 secondary)
- [ ] one `tier:`, ≥1 `flower:`, ≥1 `palette:`, one `format:`
- [ ] all `custom.*` metafields populated
- [ ] image attached + alt text
- [ ] SEO title + description + keywords
- [ ] variants priced within tier band
