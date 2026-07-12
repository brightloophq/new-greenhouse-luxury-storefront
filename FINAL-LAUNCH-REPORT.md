# FINAL LAUNCH REPORT — The New Greenhouse

**Date:** 2026-07-12 · **Branch:** `rescue-after-global-audit`
**Validation:** `typecheck` ✅ exit 0 · `lint` ✅ exit 0 · `build` ✅ exit 0 · preview route matrix ✅ all green

This sprint was a **stabilize-and-polish** pass on an already-working storefront, executed under the stated constraints: no architecture redesign, no new frameworks, no Shopify Admin data changes, no broad repository rewrites. No commits or pushes were made — all changes are in the working tree for your review.

---

## 1. Runtime status — no errors

The previously-reported route-level HTTP 500 was **environmental** (a dev worker started before `.env` held `SESSION_SECRET`), not a code defect — see [RECOVERY_AUDIT.md](RECOVERY_AUDIT.md). With `.env` populated, a freshly-built server serves every route. Re-verified this sprint:

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 (only React Router v8 future-flag warnings) |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (bundle-analyzer Rolldown notices are cosmetic, ignored) |

### Live route matrix (`npm run preview`, http://localhost:3000)

| Route | Status |
|---|---|
| `/` | 200 |
| `/collections` | 200 |
| `/collections/all` · `/collections/all?sort=newest&minp=10&maxp=100` | 200 |
| `/collections/all-flowers` · `/roses` · `/bulk-flowers` · `/birthday` | 200 |
| `/products/organza-ribbon` (sample real product) | 200 |
| `/search?q=rose` | 200 |
| `/cart` | 200 |
| `/pages/about-us` · `/policies/privacy-policy` | 200 |
| `/en-us/collections/roses` (locale prefix) | 200 |
| `/this-does-not-exist` | 404 (correct) |

> `/account/*` returns 400 on localhost — a Customer Account API redirect-URI config item (unrelated to code), noted under Known Limitations.

---

## 2. Pages completed / verified

- **Homepage** (`app/routes/($locale)._index.tsx`) — hero, featured collections, **new Shop-by-flower section**, shop-by-occasion, best-sellers (real Storefront products with graceful fallback grid), wedding editorial, corporate services, heritage, testimonials, newsletter. Renders real published collections/products; the `MockShopNotice` dev banner is correctly hidden when the shop is linked (verified: 0 occurrences in rendered HTML).
- **Collections** (`collections.$handle`, `collections.all`, `collections._index`) — M4 experience: hero, filter panel/drawer (channel/flower/color/occasion), sort, price range, pagination, QuickView. Verified against real published collections.
- **Product page** (`products.$handle`) — gallery, price, variant selector (**this is the real "Standard/Deluxe" control** — see §5), add-to-cart, delivery note, gift-message guidance, care/story/delivery accordions. Removed a dead gift-message input (see §4).
- **Cart** (`cart.tsx`, `CartMain`) — line items, quantities, subtotal, checkout link. 200 + brand title.
- **Search** (`search.tsx`) — regular + predictive search. 200 + brand title.

---

## 3. Bugs fixed this sprint

| # | Issue | Fix |
|---|---|---|
| 1 | PDP showed developer text **"UI preview only. Final gifting notes are confirmed at checkout"** to customers, attached to a gift-message textarea that **saved nothing** (a UX trap). | Replaced with a truthful, no-op-free note directing customers to add the gift message at checkout; removed the dead input. |
| 2 | Seven routes emitted scaffold SEO titles **"Hydrogen \| …"** (cart, search, blogs ×3, pages, policies). | Rebranded to `… \| The New Greenhouse`. |
| 3 | Homepage lacked a **shop-by-flower-type** entry point (explicitly requested). | Added `ShopByFlower` section (Roses, Orchids, Lilies, Greenery & Fillers + All flowers) reusing the existing occasion-grid styling; all four link to **populated** collections. |

---

## 4. Files changed (working tree, uncommitted)

```
app/routes/($locale)._index.tsx ................ + Shop-by-flower section (31 lines)
app/routes/($locale).products.$handle.tsx ...... gift-message: remove dev wording + dead input
app/routes/($locale).cart.tsx .................. SEO title
app/routes/($locale).search.tsx ................ SEO title
app/routes/($locale).blogs._index.tsx .......... SEO title
app/routes/($locale).blogs.$blogHandle._index.tsx ......... SEO title
app/routes/($locale).blogs.$blogHandle.$articleHandle.tsx . SEO title
app/routes/($locale).pages.$handle.tsx ......... SEO title
app/routes/($locale).policies.$handle.tsx ...... SEO title
```
9 files, +43 / −15. No CSS, component-system, loader, cart, or routing files were touched.

---

## 5. "Standard / Deluxe toggle" — audit result

**There is no theme/palette toggle in this codebase, and none was built** (building one would be a new feature, explicitly out of scope). This is the audited, definitive finding:

- `grep -rniE "theme.?toggle|useTheme|data-theme|palette.?toggle|standard.?deluxe"` across `app/**` → **0 hits.**
- The string **"Deluxe" does not appear anywhere in the frontend code.** "Standard / Deluxe / Premium" exist only as **Shopify product variant option values** (e.g. arrangement size). They are rendered by the **PDP variant selector** in `ProductForm` — the working add-to-cart control — not by any UI theme switch.

**Conclusion:** the canonical "Standard/Deluxe" implementation is the PDP variant selector, and it works. There is no duplicate/conflicting toggle to remove. If a light/dark or Standard/Deluxe **presentation** switcher is genuinely desired, that is a **new feature** to scope separately — flagged, not invented.

---

## 6. Shop menu — audit result

**Single canonical source.** `MEGA_COLUMNS` and `PRIMARY_NAV` are defined once in `app/components/Header.tsx` and consumed by both the desktop mega-panel (Header) and the mobile Shop accordion (`PageLayout.tsx`). No duplicate nav implementation exists.

- **Desktop:** `DesktopNav` → `MegaPanel`, single `openLabel` state, opens on hover/focus, closes on blur/escape/route change.
- **Mobile:** shared nav data feeds the drawer accordion.
- **Dead links:** none. Every Shop/Occasion/Wholesale/Footer link was repointed (prior sprint) to **populated** collections and verified 200 (Occasions → birthday/anniversary/…; Flowers → roses/orchids/lilies/greenery-and-fillers/all-flowers; Wholesale → bulk-flowers/wholesale-roses/…).

---

## 7. Palette & UI conformance

Black `#090909` / champagne gold `#C8A96A` / warm ivory `#FAF8F4` / charcoal `#222222` maintained. No oversized typography, giant buttons, side-by-side primary CTAs, or excessive whitespace were introduced. The new Shop-by-flower section reuses existing spacing/typography tokens for visual consistency.

---

## 8. Known limitations (non-blocking, documented — not defects)

1. **Design-system split (cosmetic):** homepage, PDP, and cart drawer still use the legacy `greenhouse-*` CSS while the shell/collections use the newer `ng-*` design system. Look mismatch only — not a crash. Migrating them is milestone polish, deliberately **not** done here to honor "no broad rewrites."
2. **Newsletter is not wired to a provider** (homepage + footer). Forms are inert placeholders with no fake success — an email provider (M9) is required before they capture real signups.
3. **Social links** in the footer point to `#` — real Instagram/Facebook/WhatsApp URLs needed.
4. **Contact phone** is a placeholder `+1 (876) 000-0000` in the footer — replace with the real number.
5. **Imagery:** hero/editorial sections use a small set of bundled `greenhouse-*` art-direction images reused across cards. Real cinematic product/collection photography (per `docs/ASSET_MANIFEST.md` / `IMAGE_SHOTLIST.md`) is still to be produced — no image-generation tool is available in this environment, so only prompts/specs exist.
6. **Prices:** product prices are the **demo catalog** values imported to Shopify (JMD). They are real Storefront values, not fabricated in the frontend, but should be reviewed against true merchant pricing before launch.
7. **Testimonials** on the homepage use representative names — replace with real customer quotes or remove before launch if strict authenticity is required.
8. **`/account/*` returns 400 on localhost** — Customer Account API redirect-URI/config; works on the deployed Oxygen domain once configured. Not a code defect.

---

## 9. Deployment steps

1. **Review & commit** the 9 working-tree changes (nothing is committed yet):
   `git add -A && git commit -m "Final launch sprint: SEO titles, PDP gift-note copy, homepage shop-by-flower"`
2. **Merge** `rescue-after-global-audit` → `main` (open a PR for review).
3. Ensure the Oxygen deployment environment has all `.env` keys set (especially `SESSION_SECRET`, `PUBLIC_STOREFRONT_API_TOKEN`, `PUBLIC_STORE_DOMAIN`, Customer Account API vars). **Do not commit `.env`.**
4. Deploy: `npx shopify hydrogen deploy` (or push to the linked Oxygen branch).
5. In Shopify Admin → **Customer Account API**, add the deployed domain to the allowed redirect URIs so `/account/*` resolves in production.
6. Post-deploy smoke test the §1 route matrix on the live domain, plus one full **add-to-cart → checkout** pass.
7. Before public launch, close the Known Limitations that matter to you (newsletter provider, social/phone, final imagery, price review).

---

## 10. Catalog / commerce state (unchanged this sprint)

80 products **ACTIVE + published** and 33 collections published to the **New Greenhouse Luxury Storefront** Hydrogen publication (`gid://shopify/Publication/188378349747`). Rollback manifest: `commerce-manager/reports/private/publish-rollback-manifest.json`. **No Admin data was altered in this sprint** — no prices, descriptions, variants, inventory, or publication state changes.
