# Metafield Import Plan

Ordinary Shopify **product CSV import does not reliably create or populate custom metafields**, so we keep the import CSV clean (standard columns) and load metafields separately.

## Order of operations
1. **Create definitions first** (`metafield-definitions.md`) — Settings → Custom data → Products. Values won't stick without definitions.
2. **Load values** from `catalog/build/metafields-payload.jsonl` after products exist (metafields attach by product `handle`).

## Source of values
- `catalog/build/metafields-payload.jsonl` — one JSON object per product:
  ```json
  {"handle":"long-stem-red-roses","metafields":[
    {"namespace":"custom","key":"flower_type","type":"single_line_text_field","value":"rose"},
    {"namespace":"custom","key":"color_family","type":"list.single_line_text_field","value":"[\"red\"]"}
  ]}
  ```
- `product-master-data.json` is the human-readable source of truth for every attribute.

## Loading options
**A. Admin API (recommended) — `metafieldsSet` via GraphQL.** For each line, resolve the product GID by handle, then call `metafieldsSet` (max 25 metafields/call). Pseudocode:
```
for each line in metafields-payload.jsonl:
  productId = query products(first:1, query:"handle:<handle>") → id
  metafieldsSet(metafields: line.metafields.map(m => ({...m, ownerId: productId})))
```
Requires a custom/private app with `write_products` + `write_metafields`. **List types** (`list.*`) take a JSON-encoded array string (already encoded in the JSONL).

**B. Bulk operation** — for 80 products, sequential `metafieldsSet` calls are fine; use `bulkOperationRunMutation` only if scaling to hundreds/thousands.

**C. Third-party app** (e.g. Matrixify) — can import metafields from a CSV; if you prefer CSV, convert the JSONL to that app's metafield-column format. Native Shopify CSV metafield columns (`Metafield: custom.key [type]`) exist but are inconsistently supported across importer versions — test on 1–2 products first.

## Guardrails
- Do **not** overwrite live metafields on other products — the payload targets only these 80 handles.
- Never publish `country_of_origin` publicly until confirmed.
- Re-run `node catalog/build/generate.mjs` to refresh the JSONL if source data changes.
- Keep credentials out of the repo (no `.env`/tokens committed).
