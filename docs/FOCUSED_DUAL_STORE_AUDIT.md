# Focused Dual-Store Audit — Classic + Deluxe Restructure

**Deliverable of the "First Action — Controlled Audit" step. Read-only pass; no
Shopify data written.** This document scopes the refocus of the existing
Hydrogen storefront into two tightly-scoped shopping experiences — **Classic**
(wholesale flowers + florist supplies) and **Deluxe** (luxury gifting) — on one
Shopify store, one cart, one checkout, one codebase.

The storefront already contains a working dual-experience foundation (built in a
prior effort, Phases 1–8). This audit does **not** rebuild it; it identifies what
to **keep, hide, simplify, and add** to bring the project inside the agreed scope.

---

## 0. Headline findings

1. **The experience engine already exists and is healthy — keep it.**
   `app/lib/experience.ts` + `ExperienceProvider` give a cookie-first,
   SSR-safe `ExperienceMode = 'classic' | 'deluxe'` state (`<html data-experience>`
   on first paint, no hydration flash, cart never touched on switch). One toggle,
   one provider, one persistence method. **No duplicate state to remove.** This
   satisfies the brief's Experience Model section as-is.
2. **The Classic green design system is already extracted from the main-website
   ZIP** — see `docs/CLASSIC_SOURCE_OF_TRUTH.md` and the `[data-experience='classic']`
   token block in `app/styles/experience.css` (forest `#0F3D26`, cream `#F4FBF6`,
   leaf-green accent `#3FAE63`). Deluxe keeps the established black/champagne
   system. **No re-extraction needed.**
3. **Scope is too wide — the real work is subtraction, not construction.** The
   current navigation and homepage carry **Weddings** and **Corporate** as primary
   departments in *both* experiences. The brief removes these from the active
   journey (Classic = wholesale/supplies only; Deluxe = gifting only). Files stay;
   they leave the customer journey and are logged in `docs/FUTURE_EXPANSION.md`.
4. **Two scope gaps require Shopify Admin writes (approval-gated, not blockers):**
   - The canonical `custom.experience` (`classic|deluxe|both`) metafield **does not
     exist yet** — only `custom.channel` (`retail|wholesale|both`). Classification
     falls back to `channel` + collection membership until the metafield is added.
   - Several **Deluxe collections referenced in nav do not exist** (`luxury-bouquets`,
     `premium-roses` as distinct, `plants`, `gift-baskets`, `tropical-flowers`,
     `wedding-flowers`). Links currently resolve to live collections or graceful
     catalog filters; net-new Deluxe collections are documented for creation.

**Conclusion: no critical commerce/data blocker. Proceed with implementation.**

---

## 1. Current state map

### 1.1 Experience foundation (KEEP — no change)
| Piece | File | Verdict |
|---|---|---|
| Experience type, cookie read/write, default | `app/lib/experience.ts` | ✅ Keep. Default = `classic`. Cookie `ng_experience`, 1-year, `SameSite=Lax`. |
| Provider + `useExperience` + `ExperienceLink`/`ExperienceLayout` | `app/components/ExperienceProvider.tsx` | ✅ Keep. Flash-free re-theme, cart-safe. |
| Segmented toggle (sliding pill) | `app/components/ExperienceToggle.tsx` | ✅ Keep. Labels exactly Classic/Deluxe. |
| SSR wiring (`<html data-experience>`) | `app/root.tsx` | ✅ Keep. |
| Classic green tokens / Deluxe tokens | `app/styles/experience.css` | ✅ Keep. |
| Unit tests | `app/lib/experience.test.ts` | ✅ Keep. |

### 1.2 Navigation (SIMPLIFY — remove Weddings/Corporate, refocus IA)
`app/lib/navigation.ts` — `CLASSIC_NAV` / `DELUXE_NAV`, rendered by one Header +
mobile accordion + Footer (`navFor`).

**Current Classic primary:** Shop · Wholesale · Supplies · **Weddings** · **Corporate**
→ **Target:** Wholesale Flowers · Floral Supplies · About · Delivery · Contact (+ Deluxe link).

**Current Deluxe primary:** Shop · **Weddings** · Our Story · Concierge
→ **Target:** Signature Bouquets · Luxury Gifts · Premium Flowers · Occasions · Our Story · Contact (+ Classic link).

Mega menus and footer service lists also carry Weddings/Corporate links → strip
from active nav; keep the two page files.

### 1.3 Homepage (SIMPLIFY — de-scope Classic; keep experience-keyed data model)
`app/routes/($locale)._index.tsx` renders one component tree from
`app/lib/homeContent.ts` (`HOME_CONTENT[mode]`). Good pattern — **keep the data-driven
model.** But the tree hard-renders a `wedding` and a `corporate` `Editorial`
section for **both** experiences. Classic must not present wedding/corporate
sections; the Classic homepage should follow the wholesale-first section list in
the brief. **Action (Phase 2):** make the homepage section list experience-aware
(Classic swaps wedding/corporate editorials for "How wholesale ordering works" +
"Delivery & pickup" + "Why buy from us / 40+ years"); Deluxe keeps gifting editorials.

### 1.4 Routes present
- Commerce (KEEP): `collections.$handle`, `collections.all`, `collections._index`,
  `products.$handle`, `cart`, `search`, `account.*`, `policies.*`, `blogs.*`,
  sitemap/robots.
- Catalog (KEEP): `flowers._index`, `flowers.$family`, `flowers`, `($locale).$` (splat 404).
- Pages (KEEP files, HIDE from active nav): `pages.wedding-events`, `pages.corporate-flowers`.
- Pages (KEEP): `pages.about-us`, `pages.$handle`.
- Dev-only (HIDE from customers): `design-system.tsx` — internal reference, not linked in nav (verify no customer link).
- **MISSING (ADD):** `/classic`, `/deluxe` entry routes; `/classic/wholesale`,
  `/classic/supplies` landing pages (Phase 2).

### 1.5 Live Shopify collections (33, from `commerce-manager/reports/private/collections-manifest.json`)
- **Flowers:** all-flowers, roses, orchids, lilies, greenery-and-fillers
- **Colour:** white-and-ivory, red, pink, yellow-and-orange, purple, green-flowers, mixed-color
- **Occasion:** birthday, anniversary, love-and-romance, sympathy-and-funeral, congratulations, new-baby, get-well, corporate-gifting
- **Wedding:** bridal-bouquets, centerpieces
- **Classic / wholesale:** bulk-flowers, wholesale-roses, wholesale-greenery, florist-essentials
- **Supplies:** floral-supplies, vases-and-containers, ribbon, wrapping-and-packaging, tools-and-accessories
- **Deluxe:** add-ons, corporate-gifts

**Referenced in nav but NOT live:** `luxury-bouquets`, `tropical-flowers`,
`wedding-flowers`, `plants`, `gift-baskets`. These must be re-pointed to live
collections / catalog filters, or created (approval-gated). Tracked in §5.

### 1.6 Product classification data
- Live metafield: `custom.channel` (`retail|wholesale|both`) + tag taxonomy
  (`channel:`, `flower:`, `color:`, `occasion:`). No `custom.experience` yet.
- The 25 wholesale flower categories are defined in `app/lib/flowerCategories.ts`
  (source of truth) and resolve via `/collections/all-flowers?flower=<handle>`.

---

## 2. Keep / Hide / Simplify / Add

| Action | Items |
|---|---|
| **KEEP (as-is)** | Experience foundation (§1.1), cart, checkout, search, predictive search, customer accounts, Storefront API loaders, collection/product routes, flower catalog, responsive shell, Classic + Deluxe tokens. |
| **SIMPLIFY** | `navigation.ts` (refocus both IAs, drop Weddings/Corporate); homepage section list (experience-aware, de-scope Classic); footer service lists. |
| **HIDE from active journey** | Weddings (`pages/wedding-events`), Corporate (`pages/corporate-flowers`), any experimental/demo route (`design-system`), overloaded blended Shop links. Files retained; logged in `FUTURE_EXPANSION.md`. |
| **ADD** | Entry routes `/classic`, `/deluxe` (set cookie → redirect, Option A); `/classic/wholesale` + `/classic/supplies` landing pages (Phase 2); experience-aware Classic homepage sections; Deluxe merchandising sections. |
| **DEFER (Admin, approval-gated)** | `custom.experience` metafield definition + values; net-new Deluxe collections; product (re)classification into classic/deluxe/both. |

## 3. Duplicate components / state
- **Experience/theme state:** none duplicated — single provider/cookie. ✅
- **Token namespaces:** the prior audit flagged a `--ng-*` (canonical) vs
  `--color-*` (legacy `greenhouse-*` homepage/PDP/cart) split. This remains the one
  real duplication; both are driven under `data-experience`, so it does not block
  the refocus, but Classic homepage styling must be verified to re-theme (Phase 2 QA).
- **Nav systems:** one canonical Header/accordion/Footer — no second nav. ✅

## 4. Broken / at-risk responsive & journey behaviour
- Nav currently overflows conceptually with 5 Classic primary items + toggle + actions
  at mid-widths; trimming to wholesale/supplies/about/delivery/contact reduces
  pressure. Verify at 320–1920 after refocus (Phase 5).
- Mobile accordion renders `nav.mega` — after IA refocus the accordion inherits the
  new, shorter column set automatically (no component change).
- Dead/empty collection links (§1.5) risk empty states mid-journey — re-point in Phase 2/5.

## 5. Collections: current experience vs target
| Nav label (target) | Experience | Live handle | Status |
|---|---|---|---|
| Wholesale Flowers | Classic | `bulk-flowers` | ✅ live |
| Wholesale Roses | Classic | `wholesale-roses` | ✅ live |
| Wholesale Greenery | Classic | `wholesale-greenery` | ✅ live |
| Florist Essentials | Classic | `florist-essentials` | ✅ live |
| Floral Supplies | Classic | `floral-supplies` | ✅ live |
| Vases & Containers | Classic | `vases-and-containers` | ✅ live |
| Ribbon / Wrapping / Tools | Classic | `ribbon`, `wrapping-and-packaging`, `tools-and-accessories` | ✅ live |
| 25 flower varieties | Classic | `all-flowers?flower=<handle>` | ✅ graceful filter |
| Signature Bouquets | Deluxe | `luxury-bouquets` | ❌ not live → re-point to `all-flowers` filter or create |
| Premium Roses / Orchids | Deluxe | `roses` / `orchids` | ✅ live (shared) |
| Luxury Gifts / Add-ons | Deluxe | `gift-baskets`❌ / `add-ons`✅ | mixed → re-point gifts |
| Romance / Anniversary / Birthday | Deluxe | `love-and-romance`, `anniversary`, `birthday` | ✅ live (shared occasions) |
| Corporate Gifts | Deluxe (Occasions only, not a dept) | `corporate-gifts` / `corporate-gifting` | ✅ live |

**Products in the wrong experience:** classification is data-driven, not hardcoded.
Until `custom.experience` exists, Classic surfaces `channel:wholesale`/supply
collections and Deluxe surfaces gifting/premium collections — no product is
duplicated; a `both` product simply appears in both contexts.

## 6. Implementation plan (maps to brief phases)

- **Phase 1 (this step + next commit) — Scope reduction & foundation:** write this
  audit + `FUTURE_EXPANSION.md`; refocus `navigation.ts` (drop Weddings/Corporate,
  new Classic + Deluxe IA); add `/classic` + `/deluxe` entry routes (cookie +
  redirect). Verify experience foundation & Classic tokens already satisfy the brief.
- **Phase 2 — Classic:** experience-aware homepage section list; `/classic/wholesale`
  landing (25 categories, shop-by-colour, greenery/fillers, ordering/delivery);
  `/classic/supplies` landing; Classic collection + product presentation (pack/stem/
  stock fields, honest availability).
- **Phase 3 — Deluxe:** Deluxe homepage merchandising (signature, gifts, premium
  roses/orchids, occasions, romance/anniversary, add-ons, seasonal, heritage);
  editorial collection + gifting product presentation.
- **Phase 4 — Shared systems:** cart/checkout/search/toggle persistence,
  empty/error states, verify switch-never-clears-cart.
- **Phase 5 — QA:** responsive 320–1920, a11y, SEO (per-experience meta + canonical),
  performance, production build, Oxygen preview.

**After every phase:** typecheck → lint → build → list changed files → Git checkpoint.

## 7. Shopify safety
No product deletes, price/inventory writes, or collection creation happen in code
changes. `custom.experience`, Deluxe collections, and reclassification are
**Admin, approval-gated, dry-run-first** via `commerce-manager/` and are deferred,
not performed in this restructure.

---

*End of audit. Proceeding to Phase 1 implementation.*
</content>
</invoke>
