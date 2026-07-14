# Metafield Definitions

Production-ready product metafields under the **`custom`** namespace. Create these in **Settings → Custom data → Products** (or via Admin API) **before** loading values. Values are generated in `catalog/build/metafields-payload.jsonl` and mirrored in `product-master-data.json`.

| Key (`custom.*`) | Name | Shopify type | Notes / example |
|---|---|---|---|
| `channel` | Channel | `single_line_text_field` | retail \| wholesale \| both |
| `flower_type` | Flower Type | `single_line_text_field` | rose, orchid, … (empty for supplies) |
| `color_family` | Colour Family | `list.single_line_text_field` | ["white-ivory","green"] |
| `stem_count` | Stem Count | `number_integer` | *optional; not auto-populated — set if known* |
| `stem_length` | Stem Length | `single_line_text_field` | "50–70cm" |
| `pack_size` | Pack Size | `list.single_line_text_field` | ["25 Stems","50 Stems","100 Stems"] |
| `bloom_size` | Bloom Size | `single_line_text_field` | "Large head, 5–6cm" |
| `vase_life` | Vase Life | `single_line_text_field` | "7–12 days conditioned" |
| `season` | Season | `single_line_text_field` | year-round \| seasonal |
| `country_of_origin` | Country of Origin | `single_line_text_field` | **[CLIENT CONFIRMATION REQUIRED]** by default |
| `care_level` | Care Level | `single_line_text_field` | easy \| moderate \| advanced \| n/a |
| `care_instructions` | Care Instructions | `multi_line_text_field` | conditioning / plant care |
| `ideal_for` | Ideal For | `list.single_line_text_field` | ["wedding","corporate"] (occasions) |
| `minimum_order_quantity` | Minimum Order Qty | `single_line_text_field` | "1 box (100 stems)" |
| `unit_type` | Unit Type | `single_line_text_field` | stem \| bunch \| box \| each \| arrangement |
| `bloom / vase / etc.` | — | — | *(above)* |
| `price_status` | Price Status | `single_line_text_field` | REPLACE_BEFORE_PUBLISHING |
| `image_status` | Image Status | `single_line_text_field` | REQUIRED |
| `delivery_note` | Delivery Note | `multi_line_text_field` | conditional delivery copy |
| `wholesale_note` | Wholesale Note | `multi_line_text_field` | trade note |
| `confirmation_required` | Confirmation Required | `list.single_line_text_field` | internal review flags |

## Conventions
- Namespace `custom`; keys are snake_case; types above match Shopify's metafield type IDs exactly.
- `list.*` values are stored as JSON arrays (as emitted in the JSONL).
- **Storefront exposure:** decide per field whether to expose to the Storefront API (needed for PDP specs / filters). At minimum expose: `flower_type`, `color_family`, `stem_length`, `vase_life`, `care_instructions`, `pack_size`, `minimum_order_quantity`, `channel`, `ideal_for`. Keep ops flags (`price_status`, `image_status`, `confirmation_required`) **internal** (not exposed).
- `country_of_origin` must stay `[CLIENT CONFIRMATION REQUIRED]` until the owner confirms — do **not** display it publicly before then.

See `metafield-import-plan.md` for loading values.
