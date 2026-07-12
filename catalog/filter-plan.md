# Storefront Filter Plan

BloomsByTheBox-style faceted filtering on collection pages, powered by the controlled tags + metafields. Two implementation paths depending on how the storefront reads facets.

## Facets to expose (collection + search pages)
| Filter | Source | Values |
|---|---|---|
| **Channel** | tag `channel:` / metafield `custom.channel` | Retail, Wholesale |
| **Flower Type** | tag `flower:` / metafield `custom.flower_type` | Rose, Orchid, Lily, Hydrangea, Chrysanthemum, Carnation, Tropical, Greenery, Filler |
| **Colour** | tag `color:` / metafield `custom.color_family` | White & Ivory, Red, Pink, Yellow/Orange, Purple, Green, Mixed |
| **Occasion** | tag `occasion:` / metafield `custom.ideal_for` | Birthday, Anniversary, Romance, Sympathy, Congratulations, New Baby, Get Well, Corporate, Wedding, Everyday |
| **Pack Size** (wholesale) | variant option / metafield `custom.pack_size` | 25 / 50 / 100 Stems |
| **Product Type** | Shopify Type | Fresh Cut Flowers, Arrangement, Wedding, Supply, Plant, Gift Basket, Add-on |
| **Price** | variant price | range slider (after real prices) |
| **Customer Type** (wholesale UX) | tag `customer:` | Florist, Event Planner, Corporate, Hotel |

## Implementation
**A. Shopify Search & Discovery app (recommended, no code).** Install it → **Filters** → add filters based on **product tags** and **metafields** (`custom.flower_type`, `custom.color_family`, `custom.ideal_for`, `custom.pack_size`, `custom.channel`). Storefront filtering then works via the Storefront API `filters` argument on `collection.products` / `search`.

**B. Storefront-native (Hydrogen).** The current collection route does not yet pass `filters`/`sortKey` (flagged in `docs/SEO_STATUS.md` / roadmap M4). When M4 wires functional filters, read the same tags/metafields. Metafields used for filtering must be **exposed to the Storefront API** (see `metafield-definitions.md`).

## Sort options
Featured (manual/curated) · Price low→high · Price high→low · Newest · Best selling (after sales data).

## Notes
- Keep facet **values controlled** (that's why tags are namespaced) — uncontrolled synonyms fragment filters.
- Wholesale collections should surface **Pack Size** and **Customer Type** prominently; retail collections surface **Occasion** and **Colour**.
- Price filter only meaningful **after** provisional prices are replaced.
