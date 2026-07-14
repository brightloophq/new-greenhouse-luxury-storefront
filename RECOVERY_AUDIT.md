# RECOVERY AUDIT — route-level HTTP 500

**Branch:** `rescue-after-global-audit` · **HEAD:** `9c4e50b` "snapshot broken global audit changes" · **Last known-good:** `2d66d73` "complete global shell and navigation"
**Method:** read-only. Git diff analysis + `tsc` + `react-router build` + live reproduction on **both** `shopify hydrogen preview` (prod build) and `shopify hydrogen dev` (Vite SSR). No files were modified except this report.

---

## 0. Headline

**HEAD does not currently produce a route-level 500.** The build is clean and every storefront route renders (see §7 matrix). The reported 500 is **not reproducible from the committed code** — its cause is **environmental / a stale dev process**, not a code defect introduced by the changes. The suspects you listed (a "Standard/Deluxe theme toggle", duplicate Shop nav) **do not exist in the tree** and can be ruled out.

---

## 1. Terminal stack trace → first failing file/line

I could not read your terminal trace (not provided), so I reproduced instead. On HEAD, **no route throws** — dev + preview both return 200/302/303/404, no route renders the root `ErrorBoundary`, and the dev log contains **zero** error markers.

The single code path that produces a **route-level 500 on *every* route** is the environment guard, and it is the most probable source of the trace you saw:

```
app/lib/context.ts:40   throw new Error('SESSION_SECRET environment variable is not set')
        ↑ called from
server.ts:15            const hydrogenContext = await createHydrogenRouterContext(...)
        → server.ts:54  catch → return new Response('An unexpected error occurred', {status: 500})
```

This fires when the dev worker runs **without env vars loaded** (e.g. a `shopify hydrogen dev` process started before `.env` was populated). It 500s uniformly on all routes — matching "route-level HTTP 500." `.env` is now populated (7 keys incl. `SESSION_SECRET`), so a freshly-started server no longer hits this (confirmed: dev logged *"SESSION_SECRET … from local .env"* and served 200).

> If a 500 persists for you after a restart, paste the **exact** stack trace + the route — that will pinpoint any case this reproduction missed.

---

## 2. git diff vs last known-good (`2d66d73..HEAD`, app/ only)

21 files, +2891/−352. Entirely the **M4 catalog experience + the navigation-link fixes** — no unexplained code:

- **New:** `app/lib/catalog.ts`, `app/components/catalog/*` (CatalogProductCard, CatalogResults, CatalogToolbar, CollectionHero, Filters, ProductGrid, QuickView, types), `app/styles/catalog.css` + `app/styles/catalog/{hero,filters,grid}.css`.
- **Rewritten:** `collections.$handle.tsx`, `collections._index.tsx`, `collections.all.tsx` (filter/sort/pagination).
- **Small edits:** `Header.tsx`, `Footer.tsx`, `_index.tsx` (nav-link targets → populated collections), `ProductItem.tsx` (type only), `root.tsx` (+2 lines: `catalog.css` link).

No changes to `server.ts`, `app/lib/context.ts`, `app/routes.ts`, or `app/routes/($locale).tsx`.

---

## 3. Change classification

| Class | Items |
|---|---|
| **Required** | `lib/catalog.ts`, catalog components, collection-route rewrites, `catalog.css` + root link, nav-link fixes (Header/Footer/_index), ProductItem type fix. All build + SSR clean. |
| **Harmless** | Catalog CSS files; the +2-line root.tsx stylesheet link. |
| **Visually inconsistent** (cosmetic, non-breaking) | Homepage, PDP, and cart drawer still use legacy `greenhouse-*` CSS while shell/collections use `ng-*` — a look mismatch, **not** a crash. Flagged previously. |
| **Commerce-breaking** | **None found.** Cart/checkout/product/collection loaders intact; routes render. |
| **Server-render-breaking** | **None found in HEAD.** dev + preview SSR all routes without throwing. |
| **Unrelated scope expansion** | `commerce-manager/` and `catalog/` packages (outside `app/`), the dev-only `/design-system` showcase route. None affect storefront routing. |

---

## 4. Duplicate / conflicting implementations — searched, NONE found

| Concern | Finding |
|---|---|
| **Shop navigation** | **Single source.** `MEGA_COLUMNS` + `PRIMARY_NAV` defined once in `Header.tsx`, exported and consumed by the mobile drawer in `PageLayout.tsx`. No duplicate. |
| **Shop dropdown (mega)** | One implementation: `DesktopNav`/`MegaPanel` in `Header.tsx`. |
| **Mobile Shop accordion** | One: `PageLayout.tsx` mobile drawer (M2 `Accordion`) consuming the same exported nav data. |
| **Standard/Deluxe theme toggle** | **Does not exist.** grep for `theme.?toggle` / `useTheme` / `data-theme` / `standard.?deluxe` = **0 hits**. "Standard/Deluxe" are **product variant option values** in the catalog data (e.g. sympathy sizes, stem length) — not a UI toggle. This suspect is a red herring. |
| **Navigation / header state** | One `useState` (`openLabel`) in `DesktopNav` + the `Aside` context for drawers. No competing state managers. |

---

## 5. 500 cause determination

| Candidate | Verdict |
|---|---|
| GraphQL schema/query mismatch | ❌ codegen validated; queries execute; routes 200. |
| **Missing environment variable** | ✅ **Most probable original cause** — `SESSION_SECRET` (context.ts:40). Resolved now that `.env` is populated. |
| Null Shopify data | ❌ Renders with real, empty, and 404 data without throwing. |
| Invalid loader response | ❌ Loaders return valid shapes; routes render. |
| Server/client-only API usage | ❌ `useScrolled` etc. SSR-safe; SSR emits clean HTML. |
| Import/export mismatch | ❌ `tsc` + build clean. |
| Route conflict | ❌ `routes.ts` unchanged; no collisions. |
| Component exception | ❌ No route triggers the root `ErrorBoundary`. |

---

## 6. Recovery

### Exact root cause
The committed code is **not** the fault. The reported 500 is an **environmental/stale-process condition** — a dev worker running without `SESSION_SECRET` (→ `context.ts:40` throw → `server.ts:54` 500 on every route), a state that existed transiently before `.env` was populated and is now cleared.

### Affected files
None require repair. The throw site (`app/lib/context.ts:40`) and handler (`server.ts:54`) are **unchanged, correct** framework code — they merely surface a missing env var.

### Recommended rollback targets
**Do not roll back.** HEAD is functional. Reverting to `2d66d73` would **discard the entire working M4 catalog, the nav-link corrections, and the alignment with the now-published Shopify catalog** — that would be the real regression. No rollback is warranted.

### Minimal repair plan (pending your approval)
1. **Restart the dev server** (`shopify hydrogen dev`) so it loads the populated `.env` and current build. (Expected to fully resolve the 500.)
2. If a 500 persists, **capture the exact stack trace + route** and confirm `SESSION_SECRET` + `PUBLIC_STORE*`/`PUBLIC_STOREFRONT_API_TOKEN` are present in the running process env.
3. *(Separate, optional, pre-existing — not this audit):* `/account/*` returns **400** on localhost — a Customer Account API redirect-URI/config issue, unrelated to the changes. Address only if you need the account section on localhost.
4. *(Optional cosmetic follow-up):* migrate homepage/PDP/cart from `greenhouse-*` to the `ng-*` design system (milestone work, not a fix).

### Regression risks
- Restart: **none.**
- Rollback to `2d66d73`: **high** — loses M4 + nav + catalog alignment; storefront links would revert to empty-collection handles.

### Test plan
Re-run the route matrix after restart and confirm all green:

| Route | Expected |
|---|---|
| `/` | 200 |
| `/collections` | 200 |
| `/collections/bulk-flowers` (+ `?channel=wholesale&sort=price-asc`) | 200 |
| `/collections/all` (+ `?sort=newest&minp=10&maxp=100`) | 200 |
| `/collections/roses`, `/collections/birthday` | 200 |
| `/products/long-stem-red-roses` (+ variant params) | 200 |
| `/search`, `/pages/about-us`, `/blogs/news`, `/policies/*` | 200 |
| `/en-us/collections/bulk-flowers` | 200 |
| `/this-does-not-exist` | 404 |
| `/account` | 302 (OAuth); `/account/orders` currently 400 — see §6.3 |

All of the above were **verified green on HEAD** in this audit (dev + preview).

---

*Read-only audit. No source files, no Shopify data, and no commerce-manager files were modified. Awaiting approval before any repair.*
