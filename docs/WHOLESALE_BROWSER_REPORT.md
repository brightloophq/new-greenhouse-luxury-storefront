# Wholesale Flowers — Category Browsing Experience

**Date:** 2026-07-12 · **Route:** `/collections/bulk-flowers` (and `/collections/all-flowers`)
Turned the filter-style collection page into a premium visual category browser, Shopify-compatible and fast.

---

## What changed

**Default landing = "All Flowers" category browser.** Visiting `/collections/bulk-flowers` now shows a premium grid of **25 flower-variety cards** (image + name + hover) instead of a raw product list. Heading, title, and breadcrumb read **"All Flowers"**. No product images are loaded on this view.

**Two synchronized ways to browse.** A category **card click** and the **sidebar** radio both write `?flower=<handle>` — the URL is the single source of truth, so they can never disagree. Selecting a variety switches from cards to that variety's products. Everything stays in lockstep:

| Signal | On selecting "Hydrangea" |
|---|---|
| URL | `?flower=hydrangea` |
| Page title | "Hydrangea \| The New Greenhouse" |
| Collection heading (H1) | "Hydrangea" |
| Breadcrumb | Home / Collections / **All Flowers** (back-link) / Hydrangea |
| Sidebar radio | Hydrangea checked |
| Card active state | Hydrangea card gold-ringed |

A "← All flowers" link returns to the card browser.

**Real Shopify filtering (fixed a silent bug).** The Storefront `collection.products(filters:)` tag argument was being **ignored** — every variety returned the same unfiltered products — because tag filters aren't enabled on the collection in Shopify's Search & Discovery. The reliable path is the **top-level `products(query:"tag:'flower:X'")` search**, so the hub's per-variety view now uses that:

- **Hydrangea → only Hydrangea products** (Antique Blue / Pink / White Hydrangeas). ✓
- **Alstroemeria → 0 products → elegant empty placeholder** ("No blooms match your filters…"), navigation still functional. ✓

---

## Files

| File | Change |
|---|---|
| `app/components/catalog/FlowerCategoryGrid.tsx` **(new)** | Premium category cards + grid; each card links to `?flower=<handle>` preserving other facets; active state; lazy images (first 8 eager); CLS-safe. |
| `app/styles/catalog/categories.css` **(new)** | Card styling — portrait tiles, GPU lift + shadow + image zoom 1.03 (220–300ms), gold active ring, monogram placeholder, responsive 2→3→4 cols, reduced-motion. |
| `app/routes/($locale).collections.$handle.tsx` | Hub detection; category browser as default; heading/breadcrumb/title sync; **top-level tag-search query** for the flower product view; empty-state via existing `CatalogResults`. |
| `app/data/flowers.ts` | `categoryImageBase()` — representative card image (reuses the flower pipeline; a family lights up automatically when its colourways are added). |
| `app/styles/catalog.css` | `@import` the new stylesheet. |

---

## Requirements checklist

- **Default → All Flowers** ✓
- **Category cards for all 25 varieties** ✓ (image where available, elegant monogram placeholder otherwise)
- **Card click == sidebar click** ✓ (both set `?flower`, URL-synced)
- **Synced active state** (sidebar / cards / breadcrumb / URL / title / heading) ✓ — no conflicting states
- **Empty collection → elegant placeholder, nav still works** ✓
- **Shopify-connected, no hardcoded products** ✓
- **Performance:** category browser loads **0 product images**; category images lazy (first row eager); reserved aspect-ratio (no CLS); product grid only loads when a variety is chosen ✓
- **Responsive:** desktop 4-col, tablet 3-col (≥640), mobile 2-col + sidebar→drawer ✓
- **Animation:** lift, soft shadow, fade-in cue, image zoom 1.03, 200–300ms, GPU-only ✓
- **Category image architecture (drop-in):** representative image resolves from `categoryImageBase()`; add a family's colourways → its card image appears, no UI changes ✓

---

## Quality gates

`npm run typecheck` ✅0 · `npm run lint` ✅0 · `npm test` ✅8/8 · `npm run build` ✅0.
Verified live at 1280 (4-col browser, 0 product images) and 375 (2-col, drawer); card-click and direct URL produce identical synced results; no horizontal scroll.

---

## Requires external Shopify data / follow-ups

1. **Product tags.** Only varieties whose approved handle equals an existing product tag populate today (e.g. `hydrangea`, `eucalyptus`, `babys-breath`). Products tagged with the old singular slugs (`flower:rose`, `flower:orchid`, `flower:lily`) need re-tagging to the approved handles (`roses-in-stock`, `orchids`, `lilies`) for those cards to show products; until then they show the elegant empty placeholder. (Alternatively, enable tag filters on the collection in **Search & Discovery** to also make the in-collection filter arg work.)
2. **Category imagery.** Only Alstroemeria has a representative image; the other 24 use the monogram placeholder. Drop colourways into `public/images/flowers/<family>/` (via `npm run flowers:optimize`) and add data entries — the cards upgrade automatically.
3. **Buying Option / Occasion / Colour** remain accessible, synced filters in the sidebar. They can be given the same pill/chip "browser" styling as a follow-up; the flower **variety** — the primary browse axis — is the one rebuilt as cards here.
