# Future Expansion — Deferred Features

Features intentionally **removed from the active customer journey** during the
Focused Classic + Deluxe restructure (see `docs/FOCUSED_DUAL_STORE_AUDIT.md`).
Nothing here is deleted — code, routes, pages and Shopify content are retained so
any item can be re-activated later without rebuilding.

## Removed from active navigation (code retained)

| Feature | Where it still lives | Why deferred | To re-activate |
|---|---|---|---|
| **Weddings** | `app/routes/($locale).pages.wedding-events.tsx` (route + page live) | Out of the agreed launch scope for both Classic (wholesale) and Deluxe (gifting). | Add a nav entry in `app/lib/navigation.ts` and/or a Deluxe "Occasions → Weddings" link; optionally create a `deluxe-weddings` collection. |
| **Corporate services** | `app/routes/($locale).pages.corporate-flowers.tsx`; `corporate-gifting` / `corporate-gifts` collections (live) | Out of scope as a primary department. `corporate-gifting` remains reachable via search and as a gifting occasion, but is not a nav department. | Re-add to nav; consider a distinct `premium-corporate-gifts` Deluxe collection. |
| **Blended "Shop" mega columns** | Prior `CLASSIC_NAV`/`DELUXE_NAV` in git history (commit before this restructure) | Overloaded, mixed wholesale + luxury links. Replaced by focused per-experience menus. | N/A — superseded by the focused menus. |
| **Design-system demo route** | `app/routes/($locale).design-system.tsx` | Internal reference, not a customer page. | Keep unlinked; use for component QA only. |

## Deferred Shopify Admin work (approval-gated, dry-run first via `commerce-manager/`)

These are **data/merchandising** tasks, not code. They are required for full
fidelity but are not blockers — the storefront degrades gracefully without them.

| Task | Detail | Current fallback |
|---|---|---|
| **`custom.experience` metafield** | Definition `classic \| deluxe \| both` + per-product values. Canonical classifier the brief calls for. | `custom.channel` (`retail\|wholesale\|both`) + collection membership drive Classic vs Deluxe surfacing. |
| **Net-new Deluxe collections** | `signature-bouquets` (aka `luxury-bouquets`), `luxury-gifts`, `premium-roses`, `premium-orchids`, `seasonal-deluxe`. | Nav re-points to nearest live collections: Signature → `all-flowers`, Premium → `roses`/`orchids`, Gifts → `add-ons`. |
| **Product (re)classification** | Assign each product an experience so Deluxe hides wholesale/supply SKUs and Classic hides pure-gift SKUs. | No product is duplicated; a `both` product appears in both contexts today. |
| **Missing supply collection: Baskets** | `baskets` collection referenced in the supplies IA does not exist. | Omitted from Classic supplies mega until created. |
| **`delivery-information` page** | Linked from nav/footer; confirm the Shopify page exists (else create). | `pages.$handle` renders it if present; 404s if not. |

## Notes
- Re-activation should follow the same phase discipline: change nav data →
  typecheck/lint/build → checkpoint.
- Do **not** create Shopify collections or metafields silently. Every Admin write
  goes through `commerce-manager/` dry-run + approval.
