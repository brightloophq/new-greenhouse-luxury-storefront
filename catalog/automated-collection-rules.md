# Automated Collection Rules

37 **smart (automated)** collections driven by the controlled tags/types. The product CSV does not create collections — build these in **Products → Collections → Create → Automated**. Because they're tag-driven, new products self-file as the catalog grows.

**Setup per collection:** Create automated collection → set the condition below → title/handle as listed → paste copy from `collection-descriptions.md`. Counts below reflect the current 80-product draft (they will grow).

> Shopify smart-collection conditions: use **"Product tag is equal to …"** for `tag =` rules (add multiple as **any** condition where an OR is shown), **"Product type is equal to …"** for type rules, and **"Product title contains …"** for title rules.

| Group | Collection | Handle | Condition | Now |
|---|---|---|---|---|
| Shop Flowers | All Flowers | `all-flowers` | Type = Fresh Cut Flowers / Greenery / Floral Filler / Floral Arrangement (any) | 48 |
| Shop Flowers | Roses | `roses` | Tag any of `flower:rose`,`flower:spray-rose`,`flower:garden-rose` | 13 |
| Shop Flowers | Orchids | `orchids` | Tag = `flower:orchid` | 4 |
| Shop Flowers | Lilies | `lilies` | Tag any of `flower:lily`,`flower:calla-lily` | 6 |
| Shop Flowers | Tropical Flowers | `tropical-flowers` | Tag any of `flower:anthurium/heliconia/ginger/bird-of-paradise/tropical-mixed` | 4 |
| Shop Flowers | Greenery and Fillers | `greenery-and-fillers` | Type = Greenery OR Floral Filler | 8 |
| Shop by Color | White and Ivory | `white-and-ivory` | Tag = `color:white-ivory` | 31 |
| Shop by Color | Red | `red` | Tag = `color:red` | 7 |
| Shop by Color | Pink | `pink` | Tag = `color:pink` | 14 |
| Shop by Color | Yellow and Orange | `yellow-and-orange` | Tag = `color:yellow-orange` | 9 |
| Shop by Color | Purple | `purple` | Tag = `color:purple` | 3 |
| Shop by Color | Green | `green-flowers` | Tag = `color:green` | 20 |
| Shop by Color | Mixed Color | `mixed-color` | Tag = `color:mixed` | 24 |
| Shop by Occasion | Birthday | `birthday` | Tag = `occasion:birthday` | 13 |
| Shop by Occasion | Anniversary | `anniversary` | Tag = `occasion:anniversary` | 12 |
| Shop by Occasion | Love and Romance | `love-and-romance` | Tag = `occasion:romance` | 8 |
| Shop by Occasion | Sympathy and Funeral | `sympathy-and-funeral` | Tag = `occasion:sympathy` | 25 |
| Shop by Occasion | Congratulations | `congratulations` | Tag = `occasion:congratulations` | 18 |
| Shop by Occasion | New Baby | `new-baby` | Tag = `occasion:new-baby` | 7 |
| Shop by Occasion | Get Well | `get-well` | Tag = `occasion:get-well` | 6 |
| Shop by Occasion | Corporate Gifting | `corporate-gifting` | Tag = `occasion:corporate` | 33 |
| Weddings & Events | Wedding Flowers | `wedding-flowers` | Type = Wedding Flowers | 8 |
| Weddings & Events | Bridal Bouquets | `bridal-bouquets` | Type = Wedding Flowers AND `format:bouquet` (bridal) | 2 |
| Weddings & Events | Centerpieces | `centerpieces` | Tag = `format:centerpiece` | 2 |
| Wholesale | Bulk Flowers | `bulk-flowers` | Tag = `channel:wholesale` | 62 |
| Wholesale | Wholesale Roses | `wholesale-roses` | Tag = `channel:wholesale` AND `flower:rose`/`spray-rose` | 7 |
| Wholesale | Wholesale Greenery | `wholesale-greenery` | Tag = `channel:wholesale` AND Type Greenery/Filler | 8 |
| Wholesale | Florist Essentials | `florist-essentials` | Tag = `customer:florist` | 42 |
| Floral Supplies | Floral Supplies | `floral-supplies` | Type = Floral Supply | 10 |
| Floral Supplies | Vases and Containers | `vases-and-containers` | Type = Floral Supply AND title vase/container/basket | 3 |
| Floral Supplies | Ribbon | `ribbon` | Title contains "ribbon" | 2 |
| Floral Supplies | Wrapping and Packaging | `wrapping-and-packaging` | Title contains wrap/packaging/box/cellophane | 3 |
| Floral Supplies | Tools and Accessories | `tools-and-accessories` | Title contains shear/snip/tape/tool/wire/pick | 2 |
| Plants & Gifts | Plants | `plants` | Type = Plant | 3 |
| Plants & Gifts | Gift Baskets | `gift-baskets` | Type = Gift Basket | 1 |
| Plants & Gifts | Add-ons | `add-ons` | Type = Gift Add-on | 2 |
| Plants & Gifts | Corporate Gifts | `corporate-gifts` | Tag = `occasion:corporate` AND Type Plant/Basket/Add-on | 4 |

Notes:
- Some Shopify plans support only **AND** or only **OR** within one smart collection. Where a rule combines both (e.g. Wholesale Roses = wholesale AND rose), on plans without mixed logic, either upgrade or add a dedicated tag (e.g. `collection:wholesale-roses`) in `generate.mjs` and match on that single tag.
- The existing store already has some collection handles (e.g. `wedding-flowers`, `plants`, `birthday-flowers`). Reconcile: reuse the existing collection and update its rule, or rename — avoid duplicate handles.
- Featured/curated ordering and collection images: see `collection-descriptions.md` and `docs/ASSET_MANIFEST.md`.
