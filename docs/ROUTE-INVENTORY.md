# Route inventory

Every status code below was observed against a production build served on
`localhost:3000` — not inferred from the route table.

## Approved routes (all 200)

| Route | Theme | Catalogue source |
|---|---|---|
| `/` | green | — (hero + pathway chooser) |
| `/retail` | green | — (pathway selector) |
| `/retail/flowers` | green | `all-flowers` |
| `/retail/supplies` | green | `floral-supplies` |
| `/wholesale` | green | — (auth gate) |
| `/wholesale/flowers` | green | `bulk-flowers` · auth + profile required |
| `/wholesale/supplies` | green | `floral-supplies` · auth + profile required |
| `/arrangements` | green | — (pathway selector) |
| `/arrangements/mixed` | green | `best-sellers` |
| `/arrangements/occasion` | green | — (occasion selector) |
| `/arrangements/occasion/:occasion` | green | 6 approved occasion collections |
| `/arrangements/premium-deluxe` | **deluxe** | — (category selector) |
| `/arrangements/premium-deluxe/:category` | **deluxe** | `premium-*` (see MERCHANT-ACTIONS §1) |
| `/supplies` | green | — (category selector) |
| `/supplies/:category` | green | 5 supply collections |
| `/about` | green | — |
| `/contact` | green | — |
| `/reviews` | green | — |

`data-experience` was read from the rendered HTML on each of these: green
everywhere, `deluxe` only under `/arrangements/premium-deluxe`.

## Redirects (observed)

| From | Code | To | Why |
|---|---|---|---|
| `/pages/about-us` | 301 | `/about` | Legacy Shopify page path |
| `/pages/contact` | 301 | `/contact` | Legacy Shopify page path |
| `/pages/delivery-information` | 301 | `/contact` | Delivery terms consolidated onto Contact |
| `/collections` | 301 | `/retail` | Ungoverned index exposed wholesale collections |
| `/classic/wholesale` | 301 | `/wholesale` | Pre-unification path |
| `/classic/supplies` | 301 | `/supplies` | Pre-unification path |
| `/deluxe` | 302 | `/arrangements/premium-deluxe` | Premium is a destination, not an experience |
| `/wholesale/flowers` (guest) | 302 | `/wholesale` | Auth required |
| `/wholesale/supplies` (guest) | 302 | `/wholesale` | Auth required |

`/collections/:handle` and `/products/:handle` are untouched — individual
collections and products still resolve. No Shopify data was deleted.

## Unlinked but intact

| Route | Note |
|---|---|
| `/flowers`, `/flowers/:family` | Completed flower catalog. Not in the approved nav; left in place pending owner decision (MERCHANT-ACTIONS §5). |
| `/design-system` | Internal component gallery. |

## 404

`/nope-404` → **404** with the designed green page (title, one line of
orientation, four routes back into the store). Verified: status code and
rendered `ng-404-title` both correct. The root `ErrorBoundary` no longer prints
a stack trace to shoppers; the message goes to the console in dev only.
