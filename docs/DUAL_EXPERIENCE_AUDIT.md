# Dual Experience Audit & Architecture Proposal — The New Greenhouse

**Phase 1 deliverable · read-only · no code changed.**
Scope: audit the existing Hydrogen storefront and propose the architecture for a **Classic** (wholesale/botanical) and **Deluxe** (luxury gifting) dual experience on one Shopify store. Nothing below is implemented yet — this document is for approval before Phase 2.

---

## 0. Headline findings

1. **No dual-experience/theme system exists today — this is greenfield.** Grep for `experience` / `useTheme` / `ThemeProvider` / `data-theme` / `classic` / `deluxe` / `dark-mode` across `app/` returns **zero** real matches (only unrelated words: a `CartToggle` button, "delivery experience" copy). The "Standard/Deluxe" from earlier work were **product variant option values**, never a theme. There is **no toggle, no ExperienceMode, no localStorage/cookie theme persistence** to refactor or de-duplicate. Clean slate → low regression risk, but everything must be built.
2. **The current storefront *is* the Deluxe experience.** The canonical `--ng-*` tokens resolve to **#090909 black, #111 surface, #C8A96A gold, #FAF8F4 ivory, #222 charcoal, #4D6A50 botanical accent** — an exact match to the requested Deluxe palette. So Deluxe ≈ "keep current look"; **Classic (green-led, cream/warm-white) is the net-new visual identity.**
3. **One commerce engine is already in place and healthy** — single cart, checkout, search, customer accounts, Storefront/Admin APIs, Oxygen deploy, session cookie infra. None of it needs forking; it must simply *inherit* the active experience visually.

---

## 1. What can be RETAINED (no change or light change)

| Area | State | Note |
|---|---|---|
| Cart / checkout / customer accounts | ✅ solid | One shared cart — reuse as-is; only visual inheritance. |
| Storefront API queries, pagination, analytics, SEO, canonical, localization | ✅ solid | Preserve; experience is presentation-only. |
| **Session/cookie infra** (`app/lib/session.ts`, `createCookieSessionStorage`) | ✅ present | Server-aware persistence path already exists → ideal for the experience cookie (SSR-safe, no hydration risk). |
| Responsive system (320–1920, 1100px nav breakpoint, box-sizing reset) | ✅ solid | Built and QA'd this session. Both experiences inherit it. |
| Header / mega-menu / mobile accordion (`Header.tsx`, `PageLayout.tsx`) | ✅ single canonical | Data-driven (`MEGA_COLUMNS`, `PRIMARY_NAV`) — make the **data** experience-aware; the components stay. |
| Catalog components (`FlowerCategoryGrid`, `CatalogResults`, filters, `FlowerCard`) | ✅ reusable | Shared primitives for both experiences. |
| Flower data + image pipeline (`app/data/flowers.ts`, optimizers) | ✅ | Reused across experiences. |
| Editorial page template (`EditorialPage`) | ✅ | Reusable for both experiences' story/service pages. |

## 2. What must be REFACTORED

| Area | Problem | Direction |
|---|---|---|
| **Token system** | Values are hard-committed to the Deluxe (black/gold) palette. No experience switch. | Introduce an experience-scoped value layer (see §7) — **keep the `--ng-*` semantic names** (1299 usages), swap only their *primitive values* per experience via a root `data-experience` attribute. No mass rename. |
| **Legacy `greenhouse-*` CSS** (homepage, PDP, cart) | These use the **`--color-*`** namespace (153 usages), *not* `--ng-*`. They will **not theme** under the experience system until migrated. | Migrate homepage/PDP/cart `--color-*` references onto the `--ng-*` semantic tokens (the highest-effort refactor; see Risky Files). |
| **Navigation data** | One nav (`MEGA_COLUMNS`/`PRIMARY_NAV`) reflecting a blended catalog. | Split into `CLASSIC_NAV` / `DELUXE_NAV` data; the same components render whichever the active experience selects. |
| **Homepage** | One `_index.tsx` merchandising structure. | Two merchandising structures (not a recolor) selected by experience — reuse shared section primitives. |

## 3. Duplicate / conflicting implementations found

- **Theme state:** none (greenfield) — nothing to de-duplicate.
- **Token namespaces:** **two** (`--ng-*` canonical + `--color-*` legacy). This is the one real duplication. The experience system will standardize on `--ng-*`; `--color-*` should be reduced to a compatibility shim or migrated out.

## 4. Risky files (touch carefully)

| File | Risk |
|---|---|
| `app/styles/app.css` (1.7k lines, `greenhouse-*` + `--color-*`) | Homepage/PDP/cart styling; must be brought under experience tokens without visual regression to current (Deluxe) look. Largest surface. |
| `app/routes/($locale)._index.tsx` | Homepage — needs two merchandising layouts; currently `--color-*`. |
| `app/routes/($locale).products.$handle.tsx`, `app/components/CartMain.tsx` | PDP + cart on `--color-*`; must theme + gain experience-specific emphasis without breaking add-to-cart/checkout. |
| `app/lib/i18n.ts` + the `($locale)` optional segment | Routing collision risk for `/classic`/`/deluxe` (see §8). |
| Anything calling the Admin API (`commerce-manager/`) | Deluxe collections / `custom.experience` metafield are **live-store writes** — approval-gated, dry-run first. |

## 5. Broken / inconsistent theme behavior

- No theme behavior exists to be broken. **Inconsistency risk is the token split**: shell/collections (`--ng-*`) vs homepage/PDP/cart (`--color-*`). Under a naïve experience toggle, the shell would re-theme but the homepage/PDP/cart would not — a partial, broken-looking switch. Migrating the legacy surfaces is a **prerequisite** for a coherent toggle.

---

## 6. Proposed Experience State Architecture (single source of truth)

```
ExperienceMode = 'classic' | 'deluxe'
```

- **Cookie is the source of truth** (`ng_experience`, httpOnly:false so client can read, SameSite=Lax, 1-year). Read **server-side** in the root loader → `getExperienceFromRequest(request)`. Never touch `window`/`localStorage` during SSR.
- Root renders `<html data-experience={experience}>` from the loader value → **the correct palette is present on first paint; no hydration mismatch, no flash.**
- `ExperienceProvider` seeds React context from the loader value; `useExperience()` exposes `{experience, setExperience}`.
- `setExperience()` writes the cookie (via a tiny resource route `action` or `document.cookie` + a fetcher) and updates the attribute; **cart is never touched.**
- Helpers to build: `ExperienceProvider`, `useExperience()`, `getExperienceFromRequest()`, `setExperienceCookie()`, `ExperienceToggle`, `ExperienceLink`, `ExperienceLayout`.
- localStorage: optional **secondary** mirror only (analytics/UX), never authoritative.

**Why cookie-first:** the existing `createCookieSessionStorage` proves the pattern is already in the stack; it is the only approach that is correct under Oxygen SSR without a flash-of-wrong-theme.

## 7. Proposed Canonical Token System

Keep the **semantic** `--ng-*` names; define **experience-scoped primitive values**:

```css
:root, [data-experience="deluxe"] {        /* current look = Deluxe (default) */
  --exp-bg-page: #FAF8F4;  --exp-bg-inverse: #090909;
  --exp-gold: #C8A96A; --exp-text: #222; --exp-accent: #4D6A50; /* … */
}
[data-experience="classic"] {              /* new green-led Classic */
  --exp-bg-page: #FCFBF7; --exp-bg-inverse: #173F35;
  --exp-gold: #4D6A50; /* accent shifts botanical */ --exp-text: #26312D; /* … */
}
/* semantic layer (unchanged names, now experience-driven): */
:root { --ng-bg-page: var(--exp-bg-page); --ng-text-primary: var(--exp-text); /* … */ }
```

- **One canonical namespace** (`--ng-*`). `--color-*` becomes a shim that points at `--ng-*` (or is migrated out).
- Deluxe values = today's values (zero visual change to the current site). Classic values = the green palette.
- **Classic palette source:** the approved green tokens could **not** be extracted — the main-website source is not available locally, and the repo contains no green-led palette (only the `#4D6A50` accent). **Client confirmation of the exact Classic greens is required**, else we use the brief's documented fallback (`--classic-forest #173F35`, etc.). *(Open question for you.)*

## 8. Proposed URL / deep-link strategy (needs your pick)

`getLocaleFromRequest` only treats **locale-shaped** first segments (`en-us`) as prefixes, but the flat-route `($locale)` optional param would still *capture* `/classic` as `locale="classic"`. So a decision is required:

| Option | How | SEO | Risk | Recommendation |
|---|---|---|---|---|
| **A. Entry routes + cookie (recommended)** | Static `classic.tsx` + `classic.$.tsx` splat (and `deluxe.*`) — **outrank `($locale)`** — set the cookie and 302 to the canonical unprefixed URL (`/classic/collections/x` → cookie=classic → `/collections/x`). | ✅ canonical = clean unprefixed URLs, no dup content | 🟢 low — no loader duplication, no route fork | **Yes** — stable marketing deep-links + persistent cookie, one set of Shopify loaders. |
| B. Persistent path prefix | A real `($experience)` segment wrapping all routes. | ⚠️ needs strict canonical tags | 🔴 higher — interacts with `($locale)`, doubles matching | Only if you require the prefix to *stay* in the address bar. |
| C. Query param | `?experience=classic` sets cookie. | ✅ | 🟢 low | Documented fallback, less pretty for marketing. |

**Recommended:** **A** (path entry-points that set the cookie), with **C** as the documented fallback — matches the brief's "prefer stable path-based entry pages… fallback `?experience=`."

## 9. Catalog data requirements

- **New metafield `custom.experience`** = `list.single_line_text_field` → `classic | deluxe | both` (**canonical classification**; does not exist yet — needs an Admin definition + values). Tag fallback `experience:classic|deluxe|both` for smart collections.
- **`custom.customer_type`**: the existing **`custom.channel`** (`retail|wholesale|both`) already covers most of this; extend allowed values or add `custom.customer_type` per brief. Confirm which you want as canonical.
- Existing tags in use: `channel:{retail,wholesale}`, `flower:{…}`, `color:{…}`, `occasion:{…}` — reused for experience-aware merchandising and search ranking.
- **No product duplication** — one product can be `both`; classification drives which experience surfaces it. (The 7 Alstroemeria bunches are `channel:wholesale` → Classic; would be tagged `experience:classic` or `both`.)

## 10. Collection requirements

- **Classic collections mostly EXIST** (Bulk Flowers, Wholesale Roses, Wholesale Greenery, Florist Essentials, Floral Supplies, Vases and Containers, Ribbon, Wrapping and Packaging, Tools and Accessories, Greenery and Fillers, Plants). ✅
- **Deluxe collections mostly DO NOT exist** — Signature Bouquets, Luxury Arrangements, Premium Roses, Premium Orchids, Luxury Gift Boxes, Preserved Floral Gifts, Romance, Anniversary, Deluxe Weddings, Premium Corporate Gifts, Seasonal Luxury, Deluxe Add-ons. **These need creating** (Admin write, approval-gated, via commerce-manager) — likely **smart collections** keyed on `experience:deluxe` + type tags.
- **Shared collections** (Roses, Orchids, Wedding Flowers, Corporate, Seasonal, Gift Baskets, Plants): one product set, experience-specific hero/copy/order/recommendations — **no duplication**.
- Where a marketing link targets a not-yet-created collection, resolve to the filtered catalog + graceful empty state (the pattern already shipped for flower varieties).

## 11. Navigation requirements

- Two nav datasets (`CLASSIC_NAV`, `DELUXE_NAV`) matching the brief's IA (Classic: Shop Flowers / Wholesale / Floral Supplies / Shop By / Weddings / Corporate / Resources; Deluxe: Signature / Flowers / Gifts / Weddings / Our Story / Concierge). Rendered by the existing single canonical Header + mobile accordion — **no second nav system.**
- Toggle lives in the header (desktop segmented control; mobile top-of-drawer), labels **Classic / Deluxe** only, ≥44px targets, no header overflow (constraints already solved by the responsive work).

---

## 12. Migration plan (maps to the brief's phases)

1. **Phase 1 (this doc)** — audit + architecture → **await approval.**
2. **Phase 2 — Foundation:** canonical experience tokens (Deluxe = current; add Classic), `ExperienceProvider`/cookie/helpers, toggle, tests. **Prerequisite:** migrate legacy `greenhouse-*` `--color-*` → `--ng-*` so the whole page themes.
3. **Phase 3 — Global shell:** Classic vs Deluxe header/nav/footer data, mobile menus, cart/search visual inheritance.
4. **Phase 4 — Entry pages:** `/classic`, `/deluxe` (+ deep-link splats), SEO metadata, `docs/MAIN_WEBSITE_COMMERCE_LINKS.md`.
5. **Phase 5 — Collections:** Classic (dense/functional) vs Deluxe (editorial) templates over shared loaders; create Deluxe collections (Admin, approval-gated).
6. **Phase 6 — Products:** Classic vs Deluxe PDP presentation, shared variant/cart logic.
7. **Phase 7 — Content/imagery:** copy + `custom.experience` values + image manifests (no image generation available here — manifests + client-supplied assets).
8. **Phase 8 — QA/deploy:** typecheck/lint/build, route + mobile + SSR/hydration + SEO + a11y matrix, production-preview, report.

**After every phase:** typecheck → lint → build → fix → list changed files → Git checkpoint → **stop for approval.**

## 13. Testing plan

- **SSR/hydration:** `data-experience` present on first byte; no console hydration warnings; no theme flash (view-source shows the attribute).
- **Persistence:** cookie survives navigation, collection/product/cart/search, and refresh; toggling updates theme + nav + homepage.
- **Cart-sharing:** add in Classic → switch to Deluxe → cart intact; switching never clears cart; checkout price == Shopify.
- **Routing:** `/classic`, `/deluxe`, deep links, `?experience=` fallback, `($locale)` still works, 404s intact, canonical tags correct.
- **Responsive:** both experiences at 320–1920 (no overflow, no toggle overlap, mobile accordion, filter drawer).
- **SEO:** distinct Classic/Deluxe entry metadata; canonical dedup; Product/Collection structured data preserved.
- **A11y:** toggle labelled + keyboard operable + visible focus; reduced-motion respected; contrast AA in **both** palettes.
- **Analytics:** `experience` dimension on view/toggle/add-to-cart/checkout without extra PII.

---

## 14. Open questions for you (blockers to resolve before/within Phase 2)

1. **Classic green palette:** confirm the exact approved values, or approve the brief's fallback (`--classic-forest #173F35`…). *(Main-site source not available locally to extract them.)*
2. **URL strategy:** approve **Option A** (entry routes + cookie) — or prefer a persistent prefix / query param.
3. **Classification field:** `custom.experience` as canonical (recommended) + keep `custom.channel` for customer type — confirm, and approve creating the metafield definition (Admin write).
4. **Deluxe collections:** approve creating them in Shopify (Admin write, dry-run first) and confirm smart-collection rules (by `experience:deluxe` tag).
5. **Default experience** when no cookie/entry: which mode does a bare visit to `shop.thenewgreenhouseja.com` land in — Classic, Deluxe, or a neutral chooser?

---

*Read-only audit — no source files or Shopify data were modified. Phase 2 will not begin until this architecture is approved.*
