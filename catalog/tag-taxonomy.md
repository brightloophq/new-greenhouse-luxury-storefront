# Tag Taxonomy

Structured, predictable, `namespace:value` tags. **Only** these namespaces are used (validator check #11 enforces it). Tags drive the smart collections and storefront filters, so they must stay controlled — avoid uncontrolled synonyms.

Every product automatically carries: `price-status:placeholder`, `image-status:required`, `content-status:reviewed`.

| Namespace | Meaning | Allowed values |
|---|---|---|
| `channel:` | Sales channel | `retail`, `wholesale` (both applied when a product serves both) |
| `flower:` | Primary flower/botanical | `rose`, `spray-rose`, `garden-rose`, `orchid`, `lily`, `calla-lily`, `hydrangea`, `chrysanthemum`, `carnation`, `anthurium`, `heliconia`, `ginger`, `bird-of-paradise`, `tropical-mixed`, `eucalyptus`, `ruscus`, `palm`, `greenery-mixed`, `babys-breath`, `wax-flower`, `statice`, `solidago`, `filler-mixed`, `mixed` |
| `color:` | Colour family (repeatable) | `white-ivory`, `red`, `pink`, `yellow-orange`, `purple`, `green`, `blue`, `mixed` |
| `occasion:` | Occasion (repeatable) | `birthday`, `anniversary`, `romance`, `sympathy`, `congratulations`, `new-baby`, `graduation`, `get-well`, `corporate`, `wedding`, `everyday` |
| `customer:` | Buyer type (repeatable) | `retail-shopper`, `florist`, `event-planner`, `corporate`, `hotel` |
| `format:` | Product format | `bulk-box`, `bunch`, `bouquet`, `arrangement`, `centerpiece`, `standing-spray`, `wreath`, `casket-spray`, `supply`, `plant`, `gift-basket`, `addon` |
| `supply:` | Supply subtype (supplies only) | slug of the item (e.g. `floral-foam`, `vases`, `ribbon`) |
| `season:` | Availability window | `year-round`, `seasonal` |
| `type:` | Product type slug | `fresh-cut-flowers`, `greenery`, `floral-filler`, `floral-arrangement`, `sympathy-arrangement`, `wedding-flowers`, `floral-supply`, `plant`, `gift-basket`, `gift-add-on` |
| `price-status:` | Ops flag | `placeholder` |
| `image-status:` | Ops flag | `required` |
| `content-status:` | Ops flag | `reviewed` |

## Rules
- Lowercase, kebab-case values. One namespace per prefix.
- Add new values by editing `catalog/build/generate.mjs` vocabularies + the authors' source JSON, then regenerate — never hand-add ad-hoc tags in the admin (breaks smart collections/filters).
- The ops-flag tags (`price-status`, `image-status`) can be **removed in bulk** after prices/images are finalised, or kept for reporting.
