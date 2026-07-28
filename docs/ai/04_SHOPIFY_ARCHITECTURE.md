# 04 — Shopify / Commerce Architecture

## Golden rule

**Never break commerce.** Presentation may change; logic may not. Do not touch: cart mutations, checkout URL/handoff, cart/product/collection queries, analytics, discounts, gift cards, inventory, quantity/remove logic, variants, search/predictive-search logic, customer account/auth, filters, sorting, pagination.

Restyle shared commerce components via scoped CSS + minimal presentational markup only.

## Catalogue system — the real shopping surface

**`app/components/catalogue/CatalogueView.tsx`** renders **all 8 primary shopping routes**:

| Component | Routes |
|---|---|
| `CatalogueView` + `CatalogueCard` | `retail.flowers`, `retail.supplies`, `wholesale.flowers`, `wholesale.supplies`, `supplies.$category`, `arrangements.mixed`, `arrangements.occasion.$occasion`, `arrangements.premium-deluxe.$category` |
| `ProductGrid` + `CatalogProductCard` | PDP "You may also like" (capped at **4** via `.slice(0,4)`), search-related |

⚠️ `ProductGrid` is **NOT** a catalogue — it is the PDP recommendation strip. Do not add catalogue features to it.

- `CatalogueView` receives a `context: FilterContext` prop and already branches on it (`retail*` / `supplies*` / `arrangements*` / `premium`) for styling. Premium is `context === 'premium'` and keeps its own dark register.
- Products arrive **pre-filtered and pre-sorted** from the loader. Filter/sort/search live entirely in the **URL**; pagination is cursor-based (`cursor`/`direction`) outside the render loop.
- Grid: `repeat(auto-fit, minmax(min(100%, 14.5rem), 1fr))` (retail/supplies), `16rem` (arrangements). Measured columns: **5 / 4 / 3 / 2 / 1** at 1920 / 1440 / 1200 / 768 / ≤567.

## Content sources (single sources of truth)

- `app/lib/catalogues.ts` — `OCCASIONS`, `SUPPLY_CATEGORIES`, `PREMIUM_CATEGORIES` (handles, slugs, labels). Derive routes from here; never invent handles.
- `app/lib/flowerCategories.ts` — `FLOWER_CATEGORIES` / `FLOWER_VARIETIES`.
- `app/lib/companyContent.ts` — `COMPANY`, `CONTACT`, `DELIVERY_CUTOFF`.
- `app/lib/homeContent.ts` — homepage reviews + `HOMEPAGE_REVIEW_RATING`.

## PDP

- `app/routes/($locale).products.$handle.tsx` branches: classic → `EditorialProductDetail`; deluxe → existing `.product commerce-product` markup (untouched). Preserves `useOptimisticVariant`, `getProductOptions`, `PRODUCT_QUERY`, `PRODUCT_RECOMMENDATIONS_QUERY`, ld+json, `Analytics.ProductView`.

## Cart

- `CartMain` / `CartLineItem` / `CartSummary` restyled under `.ng-cart`; all `CartForm` actions (`LinesUpdate`, `LinesRemove`, `DiscountCodesUpdate`, gift cards) preserved. Drawer is the flex-column `.ng-drawer`; summary is a sticky footer (the old absolute-positioned magic-number summary was removed as the root-cause fix).

## Auth

- `/account/login` = server 302 → Shopify Customer Account OAuth. No storefront credential form exists.

## Known live issues (see ROADMAP)

- **[Assumption]** `/arrangements/occasion/birthday` renders the **`failed`** (query-threw) state — observed at runtime this session; depends on live Shopify data, not provable from source. Re-confirm before acting.
- **[Assumption]** All three `premium-deluxe` collections are **missing** in Shopify (intentional empty state until created) — observed at runtime; verify in Shopify admin.
