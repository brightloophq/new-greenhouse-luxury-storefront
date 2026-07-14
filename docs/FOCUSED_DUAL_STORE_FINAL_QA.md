# Focused Dual-Store — Final QA (Phases 3–5)

Scope: complete the Deluxe merchandising journey (Phase 3), verify the shared
commerce infrastructure (Phase 4), and run final route/responsive QA (Phase 5)
for the approved two-experience storefront (Classic = wholesale/supplies,
Deluxe = luxury gifting). No Shopify Admin data was written. `custom.experience`
was not created. The `--ng-*` vs `greenhouse-*` token split was left untouched
(no visible defect, no build failure).

Verified against the **production build** (`npm run build` + `npm run preview`,
Mini-Oxygen) and the in-app browser at real viewport widths.

---

## Gate

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ success |
| `npm test` | ✅ 13 passed |

---

## Routes tested (both experiences unless noted)

| Route | Classic | Deluxe |
|---|---|---|
| `/` (homepage) | 200 | 200 |
| `/classic/wholesale` (landing, renders) | 200 | 200 |
| `/classic/supplies` (landing, renders) | 200 | 200 |
| `/collections/bulk-flowers` (wholesale) | 200 | 200 |
| `/collections/floral-supplies` (supplies) | 200 | 200 |
| `/collections/wholesale-roses` (wholesale) | 200 | 200 |
| `/collections/roses` (Deluxe) | 200 | 200 |
| `/collections/orchids` (Deluxe) | 200 | 200 |
| `/collections/add-ons` (Deluxe gifts) | 200 | 200 |
| `/collections/seasonal-deluxe` (safe empty state) | 200 | 200 |
| `/products/long-stem-ivory-roses` (PDP) | 200 | 200 |
| `/search?q=bouquet` | 200 | 200 |
| `/cart` | 200 | 200 |
| `/account` | 302 (Shopify auth) | 302 |
| `/pages/about-us` · `/pages/delivery-information` · `/pages/contact` | 200 | 200 |
| `/this-does-not-exist` (404 + error boundary "Oops") | 404 | 404 |
| `/en-jm/…` · `/en-us/…` (locale-prefixed) | 200 | — |
| `/classic/collections/…` · `/deluxe/gifts` (deep links) | 302 + cookie | 302 + cookie |

Desktop navigation, mobile accordion drawer, and the Classic/Deluxe toggle were
exercised live (see Viewports).

---

## Viewports tested

Horizontal page overflow (`scrollWidth − clientWidth`) measured live in the
browser on the homepage and the collection page (the most complex layout:
hero + filter sidebar + product grid).

| Width | Page overflow | Notes |
|---|---|---|
| 320 | 0 px | Classic homepage; mobile header, hamburger, no clipping |
| 375 | 0 px | Deluxe collection; sidebar → drawer, filter button, 1-col grid |
| 768 | 0 px | Homepage; mobile nav |
| 1024 | 0 px | Collection; filters in drawer (below catalogue desktop bp) |
| 1440 | 0 px | Desktop nav visible, hamburger hidden, toggle visible |
| 1920 | 0 px | Collection; sidebar + grid side-by-side |

360 / 390 / 414 / 820 / 1280 were covered by the global responsive guards
(`box-sizing: border-box`, `img/media { max-width: 100% }`, no fixed pixel
widths, `minmax(0,1fr)` grids, `clamp()` type/spacing) — behaviour is continuous
between the measured breakpoints. **Recommend a final human visual pass** at the
intermediate widths before launch (the automated pass measured overflow and
structure, not pixel-perfect aesthetics).

### Responsive requirements — result

| Requirement | Result |
|---|---|
| No horizontal overflow | ✅ 0 px at all measured widths |
| No overlapping navigation | ✅ hamburger hidden ≥1100px; desktop links clean |
| No desktop mega menu on mobile | ✅ sidebar/mega hidden; drawer used |
| No product grid beneath filter sidebar | ✅ side-by-side ≥ desktop bp; stacked on mobile |
| No clipped product cards | ✅ no card overflow |
| No oversized headings/buttons | ✅ `clamp()`-scaled |
| Usable filters | ✅ sidebar (desktop) + drawer & filter button (mobile) |
| Working drawers | ✅ mobile nav + filter drawers present/off-canvas |
| No hidden checkout action | ✅ checkout CTA renders from `cart.checkoutUrl` |

---

## Phase 3 — Deluxe merchandising (result)

Deluxe now covers the approved journey using **existing** Shopify collections
only (no Admin writes, no duplicate collections). Every required section
resolves 200 in Deluxe:

| Required section | Source | Status |
|---|---|---|
| Deluxe landing page | Deluxe homepage (`/` + deluxe cookie) — editorial, black/gold | ✅ |
| Signature Bouquets | `luxury-bouquets` (exists, empty → safe state) | ✅ |
| Luxury Gifts / Curated Add-ons | `add-ons` (populated) | ✅ |
| Premium Flowers | grouped: `roses` + `orchids` + `lilies` | ✅ |
| Premium Roses | `roses` (12) | ✅ |
| Premium Orchids | `orchids` (4) | ✅ |
| Romance | `love-and-romance` (8) | ✅ |
| Anniversary | `anniversary` (12) | ✅ |
| Premium Birthday Gifts | `birthday` (12) | ✅ |
| Seasonal Deluxe | `seasonal-deluxe` (not created → safe empty state, no 404) | ✅ |

**Wholesale-leakage removed from Deluxe** (nav, homepage, filters): Deluxe no
longer links `/collections/all-flowers` (the shared variety hub) or
`/collections/all`, and the "Buying Option: Wholesale" filter facet is hidden in
Deluxe. Deluxe is visually distinct (black / charcoal / champagne-gold / warm
ivory, editorial homepage & collection grid, premium product cards with
gold-accented price, restrained hover) — not a recolour of Classic.

---

## Phase 4 — Shared systems (result)

| System | Single source | Verified |
|---|---|---|
| Cart | Hydrogen cart (session cookie) | ✅ drove full lifecycle |
| Checkout | `cart.checkoutUrl` (unmodified) | ✅ CTA renders |
| Search | one `search` route (regular + predictive) | ✅ |
| Customer account | `account.*` routes | ✅ 302 to Shopify auth |
| Analytics | single `Analytics.Provider` in root | ✅ |
| Inventory | Storefront API | ✅ single source |

Cart lifecycle (driven headlessly against the prod build):
- **Add** line → 200, line present. ✅
- **Switch Classic ↔ Deluxe + refresh** → line still present (experience switch
  writes only `ng_experience`; never touches the cart). ✅
- **Update quantity** → 200, reflected. ✅
- **Remove** → 200, cart empties. ✅
- No duplicated toggle state (1 provider, 1 mount, 1 toggle component). ✅
- No duplicated Shop-menu state (single `navFor` source, 3 consumers). ✅
- No hydration mismatch (experience is a cookie read SSR; `<html
  data-experience>` correct on first paint). ✅

**Search:** works (e.g. `bouquet` → 5, `flower` → 6, `ivory` → 1). It is
currently experience-agnostic — the correct **safe fallback** while product
classification is incomplete (no `custom.experience`). Some terms (`rose`,
`orchid`) return no results — a Shopify **Search & Discovery** indexing/synonyms
matter (store config), not a storefront-code defect.

---

## Defects fixed this pass

1. **Deluxe homepage Signature CTA fell back to the newest-updated collection**
   (`to: null`) — could surface a wholesale collection. → pinned to
   `luxury-bouquets`.
2. **Deluxe nav/footer/mega linked `all-flowers` / `all`** (variety hub + all
   products, wholesale-leaking). → repointed to curated gifting collections.
3. **Deluxe "Shop by flower" rail** linked the variety hub. → replaced with a
   Premium Flowers rail (roses/orchids/lilies/signature).
4. **Homepage "Shop all" / fallback cards** hardcoded `/collections/all`. → now
   experience-aware (Deluxe → `roses`, Classic → `/collections/all`).
5. **`/collections/seasonal-deluxe` 404'd.** → safe empty, on-brand state.
6. **Deluxe collection filters exposed "Buying Option: Wholesale".** → channel
   facet hidden in Deluxe.

## Exact files modified

- `app/lib/homeContent.ts` — Deluxe leakage fixes, Premium Flowers rail,
  experience-aware productRow CTA.
- `app/lib/navigation.ts` — Deluxe nav/footer/mega repointed to gifting
  collections; Seasonal Deluxe added.
- `app/routes/($locale)._index.tsx` — productRow + fallback cards use CTA target.
- `app/routes/($locale).collections.$handle.tsx` — `PLANNED_COLLECTIONS` safe
  empty state (seasonal-deluxe).
- `app/components/catalog/Filters.tsx` — hide channel facet in Deluxe.
- `app/styles/experience.css` — Deluxe editorial product-card treatment.

(Prior commits this session also fixed the entry-routing conflict and the
Classic/Deluxe homepage de-scope.)

---

## Missing Deluxe collections (Shopify Admin)

| Collection | State | Action |
|---|---|---|
| `luxury-bouquets` (Signature Bouquets) | exists, **empty** | Populate with signature bouquet products |
| `gift-baskets` | exists, **empty** | Populate or fold into `add-ons` |
| `seasonal-deluxe` | **not created** (safe empty state in code) | Create + populate, then remove from `PLANNED_COLLECTIONS` |
| Premium Flowers | no dedicated collection | Optional: create, or keep grouped (roses/orchids/lilies) |

## Missing product classifications

- No `custom.experience` (`classic|deluxe|both`) metafield exists. Deluxe
  surfaces gifting collections (roses, orchids, occasions, add-ons); these are
  retail collections, but some products also appear in wholesale collections
  (e.g. a bouquet in both `roses` and `wholesale-roses`). Product-level exclusion
  of wholesale items from shared Deluxe collections requires either
  `custom.experience` or Search & Discovery tag-filtering on `channel:`.
- Interim safe behaviour: Deluxe never links wholesale collections and hides the
  wholesale filter, so no wholesale-only collection is reachable from Deluxe.

## Remaining Shopify Admin tasks (approval-gated, not done)

1. Create/populate `custom.experience` metafield + classify products
   (`docs/DUAL_EXPERIENCE_METAFIELDS.md`).
2. Populate `luxury-bouquets`, `gift-baskets`; create `seasonal-deluxe`
   (+ optional dedicated `premium-flowers`).
3. Configure Search & Discovery (indexing/synonyms so `rose`, `orchid`, etc.
   return results; enable collection tag-filtering if per-experience product
   filtering is desired).
4. Review shared-collection SEO titles (e.g. `roses` → "Retail & Wholesale")
   which read slightly off-brand inside Deluxe.

## Remaining placeholders

- Homepage editorial/section imagery reuses 3 bundled banner assets across cards
  (functional, on-brand, but not unique per card).
- `FALLBACK_PRODUCTS` on the homepage best-sellers row only render if the
  Storefront returns zero products (won't happen on the populated store).
- Empty Deluxe collections (`luxury-bouquets`, `gift-baskets`, `seasonal-deluxe`)
  show the safe empty state until populated.

---

## Launch blockers

**None in storefront code.** Build is clean; all routes render; cart/checkout/
search/account intact; both experiences self-consistent and free of
cross-experience leakage in nav/homepage/filters.

The remaining items are **data/merchandising in Shopify Admin** (populate the
empty Deluxe collections, product classification, Search & Discovery config) —
required for a polished Deluxe launch but not storefront-code defects.

## Non-blocking technical debt

- `--ng-*` vs legacy `greenhouse-*` token split (both driven under
  `data-experience`; no visible defect — intentionally left per scope).
- Doc sprawl (two audit docs + milestones) — not restructured per scope.
- `/design-system` route is publicly reachable (not linked in nav).
- Deluxe product-level wholesale exclusion depends on Admin classification
  (above) rather than code.
- A final human visual pass at 360/390/414/820/1280 is recommended (automated
  pass measured overflow + structure, not pixel aesthetics).

---

*QA performed on the production build via Mini-Oxygen preview + in-app browser.
No Shopify Admin data, `custom.experience`, or token-system changes were made.
Awaiting approval before any Shopify Admin data changes.*
