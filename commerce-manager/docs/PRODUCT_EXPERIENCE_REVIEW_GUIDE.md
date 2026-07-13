# Product → Experience Classification — Review Guide

How to review and approve the proposed `custom.experience` values **before** any
live write. Nothing is written to Shopify until you approve and explicitly run
the gated apply step.

## The pipeline

```
npm run experience:audit     # Step 1 — read-only inventory + provisional classify
npm run experience:dry-run   # Steps 2-4 + 6 — def check, counts, CSV, collection gaps
#   ↳ you review + edit the CSV here
npm run experience:apply     # Step 5 — LIVE (needs --commit + typed "APPLY EXPERIENCE")
```

`audit` and `dry-run` make **zero** changes. `apply` is the only script that can
write, and only with `--commit` and a typed confirmation.

## What each classification means

| Value | Meaning |
|---|---|
| `classic` | Wholesale flowers, greenery, fillers, florist supplies — the trade catalogue. The imported flower catalogue defaults here. |
| `deluxe` | Finished premium bouquets, luxury gifts, premium flowers — retail gifting. |
| `both` | The *same* product is genuinely suitable for wholesale/professional **and** premium retail. Used sparingly. |
| `needs-review` | Ambiguous, conflicting, incomplete, or out-of-scope (Weddings/Corporate). **Not** applied until you resolve it. |

Price is never used as a signal. A high price alone does not make a product Deluxe.

## The file to review

`commerce-manager/config/product-experience-map.csv`

| Column | Meaning |
|---|---|
| `shopify_product_id` | Product GID (used by the apply step). Do not edit. |
| `handle`, `title` | Identify the product. |
| `current_experience` | Existing `custom.experience` value (empty = unset). |
| `proposed_experience` | The script's suggestion (`classic`/`deluxe`/`both`/`needs-review`). |
| `classification_reason` | Why it was proposed. |
| `confidence` | `high` / `medium` / `low`. |
| `approved` | **You set this.** `false` by default. |
| `notes` | Flags (e.g. `wedding-scope-excluded`, `in-corporate-collection`, `no-image`, `placeholder-price`). |

## How to review

1. Open the CSV in a spreadsheet.
2. Sort by `confidence` (review `low`/`medium` first) and by `proposed_experience`.
3. For each row you accept: set `approved` to `true`.
4. To override a suggestion: change `proposed_experience` to the value you want
   (`classic`/`deluxe`/`both`), then set `approved` to `true`.
5. For `needs-review` rows: decide the correct value **and** change
   `proposed_experience` off `needs-review` before setting `approved=true`.
   Rows left as `needs-review` are **skipped** by the apply step even if approved.
6. Leave `approved=false` on anything you are unsure about — it will be skipped.

### Focus areas this run

- **8 `needs-review` = Wedding products** (`Wedding Flowers` type). Weddings are
  excluded from the active scope. Recommended: leave `approved=false` (do not
  classify) until the Weddings decision is made.
- **9 `both`** are finished gifts/sympathy pieces tagged `channel:both`. Confirm
  each is genuinely wholesale-suitable; otherwise change to `deluxe`.
- **33 corporate-associated** products keep their nature-based value (mostly
  `classic` bulk stems that merely sit in a corporate collection). Corporate is
  excluded from active nav, but these are not corporate-only products.
- **80 products have placeholder pricing / no image** — a catalogue-wide data
  gap tracked separately; it does **not** block experience classification.

## Applying (after approval)

```
npm run experience:apply                 # PREVIEW — shows what would be set
npm run experience:apply -- --commit     # LIVE — prompts for "APPLY EXPERIENCE"
```

The apply step will:

- create the `custom.experience` definition **only if missing** (with a
  `choices` validation restricting values to classic/deluxe/both);
- write only `approved=true` rows whose value is classic/deluxe/both, in batches
  of ≤ 25;
- write a **rollback manifest** of previous values to
  `reports/private/experience-apply-rollback-<timestamp>.json` before any write;
- never touch titles, descriptions, variants, prices, inventory, images, product
  status, or publication state, and never delete an existing metafield;
- stop immediately on unexpected Shopify user errors.

To roll back, set the previous values from the rollback manifest (nulls mean the
metafield was absent and can be cleared).
