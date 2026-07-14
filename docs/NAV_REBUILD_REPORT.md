# Shop Navigation Rebuild + Flower Category Consolidation — Report

**Date:** 2026-07-12 · **Branch:** `rescue-after-global-audit`
**Method:** reproduced the breakage in a real browser first, fixed root causes, then re-verified visually (screenshots) and by DOM measurement across 320–1920px.

---

## 1. Precise root cause of the broken Shop menu

Two independent defects, both visible on `/collections/bulk-flowers` when Shop was opened:

1. **Mega-menu column collapse (the character-wrapping bug).**
   `.ng-mega-inner` used `grid-template-columns: 1fr auto`. The `auto` track held a **feature panel with a 1600px source image** (`.ng-mega-feature-media img`). In an `auto` grid track the image resolves to its intrinsic width, so the feature ballooned to ~890px and starved the `1fr` category area down to **~80px**. Three category columns crammed into 80px → headings and single-word flower names ("Alstroemeria", "Chrysanthemums") wrapped one character per line. Measured live: `grid-template-columns: 80.0156px 890.047px`.

2. **Header/nav breakpoint too low + centered-logo collision.**
   The desktop nav appeared at `64rem` (1024px). Between ~1024–1100px the 5-item primary nav, centered wordmark, and action icons could not fit the symmetric `1fr auto 1fr` grid, so the last nav item ("About") overlapped the logo.

The mega was **not** rendering "on mobile" — below 1024px `.ng-mega` and `.ng-shell-primary` were already `display:none`. The mobile drawer was a real accordion; its only defect (from an earlier pass) was inline sub-links, already corrected.

---

## 2. Components changed

| File | Change |
|---|---|
| `app/components/Header.tsx` | `MEGA_COLUMNS` restructured into 4 sections (Occasions / Flower Varieties / Featured Shopping / Services); Flower Varieties built from the central approved list via `flowerCategoryPath`; **feature-image panel removed** (root cause of the collapse); flowers column tagged `variant:'flowers'` → `.ng-mega-column--flowers`. |
| `app/components/PageLayout.tsx` | No code change — the mobile drawer already renders `MEGA_COLUMNS` as an `Accordion`, so it inherited the new 4 sections automatically. |
| `app/components/Footer.tsx` | Footer "Roses" link → "Roses - In Stock" (`?flower=roses-in-stock`); dead `/collections/bridal-bouquets` → `/pages/wedding-events`. |
| `app/routes/($locale)._index.tsx` | Home `ShopByFlower` now lists approved varieties (Roses - In Stock, Orchids, Lilies, Hydrangea, Tulips, Greenery) linking through the safe filter path. |

## 3. Stylesheets changed

| File | Change |
|---|---|
| `app/styles/shell.css` | **Mega rebuilt**: `.ng-mega-inner` is now a plain wrapper; `.ng-mega-columns` is a stable 4-track grid `minmax(150px,.85fr) minmax(300px,1.7fr) minmax(150px,.85fr) minmax(150px,.85fr)`; Flower Varieties list flows in `repeat(2, minmax(140px,1fr))`; `.ng-mega-column{min-width:0}`; safe wrapping (`white-space:normal; word-break:normal; overflow-wrap:normal; writing-mode:horizontal-tb`) on titles + links. **Breakpoint moved to 1100px** (`max-width:1099px` hides desktop nav; `min-width:1100px` hides burger). Added `1100–1279px` block that tightens nav spacing/size so the nav clears the centered logo. Mobile sub-links → `display:flex; min-height:2.75rem` (~44px touch targets) + safe wrapping. |
| `app/styles/catalog.css` | (earlier) collection sidebar 300px at ≥1280 with `min-inline-size:0; max-inline-size:100%` so it never overlaps the grid. |
| `app/styles/catalog/filters.css` | (earlier) Filters button + drawer available below 1280; toolbar controls wrap on small screens. |
| `app/styles/reset.css`, `app/styles/app.css` | (earlier responsive sprint) global `box-sizing`, media caps, PDP grid fix. |

## 4. Category / data / config files changed

| File | Change |
|---|---|
| `app/lib/flowerCategories.ts` **(new)** | Single source of truth: `FLOWER_CATEGORIES` (25), `FLOWER_VARIETIES` (24, excludes Gift Bouquets), `flowerCategoryPath()`. |
| `app/lib/catalog.ts` | `FACETS.flower.options` now derived from `FLOWER_CATEGORIES` (25 approved) instead of the old 13. |
| `app/lib/flowerCategories.test.ts` **(new)** | Vitest invariants (see §14). |
| `vitest.config.ts` **(new)**, `package.json` | Added Vitest + `npm test`. |
| `eslint.config.js` | Pinned `jest.version` for the test-file override (we use Vitest). |

## 5. Conflicting rules removed

- `.ng-mega-inner { grid-template-columns: 1fr auto }` (the collapse).
- The entire `.ng-mega-feature*` block (image panel) + its `hidden`-on-mobile `@media (max-width:48rem)` rule.
- `.ng-mega-columns { grid-template-columns: repeat(3, minmax(0,1fr)) }`.
- Old `64rem` / `64.001rem` nav breakpoints (replaced by 1100/1099).
- Removed the `megaFeatureImage` import + JSX.

## 6. Final breakpoint behaviour

| Range | Navigation | Collection layout |
|---|---|---|
| **< 1100px** | Desktop nav + mega fully hidden; burger → left drawer; Shop = vertical accordion (4 sections) | ≥1280 n/a; drawer + 2-col (<768) / 3-col (768–1279) |
| **≥ 1100px** | Desktop primary nav + mega (below header, full width); burger hidden | sidebar appears at ≥1280 (300px) + 4-col grid; 1100–1279 = drawer + 3-col |
| **1100–1279px** | nav spacing/size tightened so nav clears the centered logo | — |

Only one system is visible at any width (verified: at 1099 desktop nav+mega `display:none`, burger shown; at 1100 reverse).

## 7. Final desktop mega grid structure

`.ng-mega-columns`: 4 tracks — `minmax(150px,.85fr) | minmax(300px,1.7fr) | minmax(150px,.85fr) | minmax(150px,.85fr)`, `gap: clamp(1.5rem,3vw,3.5rem)`, `align-items:start`. Flower Varieties (24 links) flows in 2 sub-columns `repeat(2, minmax(140px,1fr))`. Measured column widths @1280: Occasions 215 · Flower Varieties 429 · Featured 215 · Services 215. Tallest flower link height = 22px (one line) at 1100/1280/1366/1440/1920.

## 8. Final mobile accordion structure

`MobileNavAside` → `.ng-mobilenav`: primary links (Home + non-mega items) then `Accordion` of the 4 `MEGA_COLUMNS` sections. Each `AccordionItem` = a `<button>` trigger with `aria-expanded`; panels stack `.ng-mobilenav-sublink` rows full-width (`display:flex; min-height:2.75rem`). Escape + overlay-click close (existing `Aside`), body scroll locked while open. Verified vertical stacking of all 24 flowers at 320/375 with no character wrapping.

## 9. How the approved flower list was centralised

`app/lib/flowerCategories.ts` is the only place the 25 varieties are defined. `catalog.ts` (filter), `Header.tsx` (mega + mobile accordion, via the shared data), `Footer.tsx`, and the home page all consume it (directly or through `flowerCategoryPath`). The Vitest suite asserts the filter facet is derived from it.

## 10. Obsolete categories removed

From the flower taxonomy/filter: **Anthurium, Heliconia, Bird of Paradise** (old filter values), and the old nav varieties **Greenery & Fillers, Wholesale Roses, Florist Essentials, Corporate Gifting** as flower entries. None of the legacy list (Anemone, Dahlias, Peonies, Iris, Freesia, Gladiolus, Succulents, etc.) was present in nav/filters; a test guards against their reintroduction. Non-flower business categories (Weddings, Corporate, Wholesale, About, Occasions + all 6 occasion links, Shop All, Bulk Flowers, Gift Bouquets) were preserved.

## 11. Shopify collection handles requiring creation / confirmation (external)

Flower-variety links resolve to `/collections/all-flowers?flower=<handle>` — a **valid route** that filters by the Storefront tag `flower:<handle>` and degrades to the catalog empty-state, so **nothing 404s today**. However, catalog **products are currently tagged with the old flower slugs** (e.g. `flower:rose`, `flower:orchid`). For each approved variety's filter/link to actually populate, products must be tagged with the approved handles:
`alstroemeria, asters, babys-breath, calla-lilies, carnations, chrysanthemums, delphinium, eucalyptus, fillers, gerbera-daisies, gift-bouquets, greenery, hydrangea, hypericum, lilies, lisianthus, novelties, orchids, ranunculus, roses-in-stock, snapdragon, spray-roses, stock, tropicals, tulips`.
Optionally, dedicated collections could be created under these same handles. **This is the one item that needs Shopify Admin data (re-tagging / collection creation) and cannot be completed from the storefront code alone.**

## 12–15. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 |
| `npm test` (Vitest) | ✅ 8/8 passed |
| `npm run build` | ✅ exit 0 (only pre-existing Rolldown bundle-analyzer notices) |

Test file `app/lib/flowerCategories.test.ts` verifies: exactly 25 approved entries; exact names; unique kebab handles; obsolete varieties absent; 24 mega varieties (Gift Bouquets excluded); `flowerCategoryPath` builds the non-404 filter URL; `FACETS.flower` has 25 options derived from the list; removed filter values (anthurium/heliconia/bird-of-paradise) gone.

## 16. Visual results (measured + screenshots)

`✓` = readable, no overlap, no character-wrap, no horizontal scroll.

| Width | Nav mode | Result |
|---|---|---|
| 320 | mobile accordion | ✓ 24 flowers stack vertically, full-width (screenshot) |
| 375 / 390 / 414 | mobile accordion | ✓ 2-col grid, no overflow |
| 768 / 820 | tablet — burger + filter drawer | ✓ 3-col grid, no overflow |
| 1024 / 1099 | mobile (desktop nav hidden) | ✓ burger shown, mega `display:none` |
| **1100** | desktop mega appears | ✓ 4 readable sections; header nav clears logo (screenshot) |
| 1280 | desktop mega | ✓ cols 215/429/215/215; header clear 71px (screenshot) |
| 1366 / 1440 / 1920 | desktop mega | ✓ header clear 112/149/269px; links one line; mega centered to container-xl |

Collection sidebar (≥1280): 300px track, 32px gap to the grid, **no overlap** at 1280 and 1440.

## 17. Remaining issue requiring external Shopify data

Only one: **product re-tagging (and/or per-flower collection creation) under the approved handles** (§11). Until then, flower-variety filters/links for varieties with no matching-tagged products show the graceful empty-state rather than products. This is data, not a code defect.
