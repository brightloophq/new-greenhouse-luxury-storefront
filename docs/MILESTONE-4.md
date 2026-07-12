# Milestone 4 — Collections & Catalog Experience ✅ COMPLETE (2026-07-11)

**Goal:** Premium wholesale-florist catalog (BloomsByTheBox usability) on the collection routes, consuming M2 components + M3 nav + the Catalog Sprint architecture. Preserve ALL Hydrogen commerce logic. No cart/checkout changes. No publishing.

## Scope (files)
- Rewrite: `collections.$handle.tsx`, `collections._index.tsx`, `collections.all.tsx`.
- New lib: `app/lib/catalog.ts` (facets, URL parsing, ProductFilter + sort mapping).
- New components: `CollectionHero`, `CatalogToolbar`, `FilterPanel`/`FilterGroup`/`FilterDrawer`, `ActiveFilterChips`, `ProductGrid`, `CatalogProductCard` (hover image + quick view), `QuickView`, `CatalogEmptyState`, `ProductGridSkeleton`.
- Enhance `PaginatedResourceSection` (skeleton-aware) or wrap.
- New CSS: `app/styles/catalog.css` (namespace `ng-catalog-*`), linked in root.

## Filtering model (Storefront `ProductFilter`, URL-driven)
Categorical facets **single-select** (1 tag filter each → correct AND across facets):
- Flower Type → `tag: flower:<v>` · Color → `tag: color:<v>` · Occasion → `tag: occasion:<v>` · Wholesale/Retail → `tag: channel:<v>`
- Availability → `available: true` (toggle) · Price → `price: {min,max}` (range)
Sort → `sortKey`/`reverse` (featured/newest/price-asc/price-desc/title). All state in URL search params (shareable, back-safe). Multi-select is a future enhancement via Shopify dynamic filter `input`s.

## Guardrails
- Cart/checkout untouched. Products stay draft/unpublished. Commerce logic (loaders, fragments, Pagination, i18n, analytics) preserved.
- Catalog currently empty → empty states + skeletons are first-class and testable.

## Delivered
- **Reusable templates:** `collections.$handle` (single) + `collections.all` (full catalog) share one experience (CollectionHero → sidebar FilterPanel + CatalogToolbar + ActiveFilterChips → CatalogResults); `collections._index` rebuilt as a CollectionCard grid.
- **Components (new, `app/components/catalog/`):** CollectionHero + MerchandisingBlock, CatalogToolbar, FilterPanel/FilterDrawer/ActiveFilterChips, CatalogProductCard (hover image cross-fade + quick-view + sold-out badge), ProductGrid + ProductGridSkeleton + CatalogEmptyState, QuickView (read-only modal), CatalogResults (Hydrogen Pagination wrapper). All consume M2.
- **Filtering (URL-driven, Storefront-native):** Flower Type · Color · Occasion · Wholesale/Retail (single-select tags) · Availability (toggle) · Price (range). `collection.products(filters:)` for collections; `products(query:)` search string for the all route. Pagination reset on every change.
- **Sorting:** Featured/Newest/Price↑/Price↓/Alphabetical → sortKey/reverse.
- Breadcrumbs, collection SEO (title+description from `collection.seo`), empty states, loading skeletons, cursor pagination, mobile-first (sidebar → drawer). Hero images, quick view.
- **Lib:** `app/lib/catalog.ts` (facets, parse/serialize, ProductFilter + query-string + sort mapping, `CATALOG_PRODUCT_FRAGMENT`). CSS: `app/styles/catalog.css` (+ `catalog/{hero,filters,grid}.css`), linked in root.

## Verification
- **`react-router typegen` + Shopify `codegen` ✓** — every new query validated against the **real Storefront schema** (filters, `sortKey` enums, `query`, `description(truncateAt)`, `compareAtPriceRange`, `collection.image/seo` all accepted).
- **typecheck ✓ · lint ✓ (0/0) · build ✓** (catalog.css 16.3 kB compiled, 220 modules).
- ⚠ **Live runtime render NOT verified** — `shopify hydrogen dev` blocks on Shopify's interactive device-code auth in this non-interactive session (the same CLI auth wall hit during discovery); the worker never finishes booting, so pages hang. Not a code defect. A local (gitignored) `.env` was populated from the earlier `env pull`, but the CLI still gates dev startup on interactive login. Owner can verify by completing `shopify hydrogen dev` login once.

## Guardrails honoured
Cart, checkout, and product-detail layouts untouched (verified via git). Products remain draft/unpublished. Hydrogen commerce logic (loaders, Pagination, i18n `@inContext`, Analytics.CollectionView, localized-handle redirect) preserved.

## Progress log
- 2026-07-11: M3 complete. M4 started; 3 parallel component builders + route/lib/CSS wiring; codegen+typecheck+lint+build green. **M4 complete** (live render pending owner Shopify login).
