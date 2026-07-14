# The New Greenhouse — Redesign Implementation Roadmap

**Target:** A premium wholesale florist commerce experience — the editorial polish of Venus ET Fleur / McQueens crossed with the wholesale/bulk ordering model of BloomsByTheBox — built on Shopify Hydrogen. **Not** a standard Shopify storefront.

**Status:** Planning only. No code to be written until Milestone 1 is approved.
**Baseline:** branch `redesign-v1`, Hydrogen 2026.4.4, React Router 7.16, Tailwind v4, Oxygen.
**Governing spec:** `CLAUDE.md` (repo root) + `docs/LUXURY_PRINCIPLES.md` (design law).

---

## Part 0 — Luxury Design Law (global acceptance overlay)

`docs/LUXURY_PRINCIPLES.md` applies to **every** milestone. A surface is not "done" until it passes all 8, regardless of functional correctness. Each milestone's design review explicitly checks them:

1. Never two buttons side by side unless necessary · 2. Every section breathes · 3. Typography creates hierarchy · 4. Images are the product · 5. White space is content · 6. One focal point per viewport · 7. ≤3 primary actions per screen · 8. Remove more than you add.

**Current violations already identified (become fix targets in their milestones):**
| Principle | Current violation | Fixed in |
|---|---|---|
| #1 two buttons | Homepage hero renders **two side-by-side buttons** ("Shop Arrangements" + "Request Custom Design", `_index.tsx` `greenhouse-hero-actions`); repeated pattern risk on PDP | M9 (home), M2 (button/stack primitives) |
| #4 images are the product | PDP gallery + product cards reuse **3 static banner JPGs**, not real product media | M5, M10 |
| #6 one focal point | Hero stacks image + eyebrow + H1 + paragraph + 2 CTAs + slogan competing in one viewport | M9 |
| #7 ≤3 primary actions | Header exposes menu + account + search + cart + mega-panel links simultaneously | M3 |
| #8 remove > add | Placeholder/fake sections (decorative filters, dead gift boxes, no-op newsletter, "Recently viewed" stub) add clutter without function | M4, M5, M6, M9 |
| #2 sections breathe / #5 white space | Achievable via existing `clamp()` spacing tokens, but unfinished surfaces (account) ignore them | M1, M7 |
| #3 typography hierarchy | Undermined by **duplicate heading systems** (`reset.css` element rules vs. `.ng-h*`) rendering different sizes | M1, M2 |

**Design-law gate:** every milestone's acceptance now implicitly includes "passes all 8 luxury principles on the surfaces it touches."

---

## Part A — Audit: Current State vs. Vision

| Dimension | Vision (CLAUDE.md + BloomsByTheBox model) | Current state | Gap |
|---|---|---|---|
| **UX** | Boutique-grade journeys; wholesale bulk ordering; frictionless discovery | Home is strong; account is bare skeleton; filters are fake; gift notes don't save | **Large** |
| **UI** | Reusable atomic components, never duplicate UI | 18-primitive `ui/` layer is dead code; 1,772-line hand CSS; 3 button systems | **Large** |
| **Branding** | Exact palette (Gold `#C8A96A`, Ivory `#FAF8F4`, Charcoal `#222`, Green `#4D6A50`) | Tokens diverge from brief on 4 of 5 colors; 3 competing token namespaces | **Medium** |
| **Content** | No placeholder/unfinished sections; portfolio quality | Placeholder gift boxes, decorative filters, "UI preview only" labels, mock products | **Medium** |
| **Imagery** | Cinematic floral photography; regenerate/upscale poor images | 3 static editorial JPGs reused everywhere; PDP gallery hardcodes banners, not product media | **Large** |
| **Performance** | Lazy-load, Hydrogen Image, optimize LCP, minimal JS | Good Hydrogen hygiene; but double optimistic-cart compute, no font preload, unused Tailwind, huge global CSS | **Small–Medium** |
| **Shopify impl.** | Never break cart/checkout/account/collections/search/variants; wholesale catalog | Core flows functional; **but store not linked** — running on mocks; no wholesale/bulk model | **Large (data)** |
| **Accessibility** | Keyboard, semantic HTML, heading order, alt text, contrast | Partial: good ARIA on asides/home; account uses inline styles, weak semantics; contrast unverified vs new palette | **Medium** |
| **SEO** | Luxury florist + wholesale keywords; preserve Hydrogen SEO | Meta/sitemap/robots intact; titles inconsistent (`Hydrogen | Products`); no structured data | **Medium** |

**Bottom line:** The foundation (routing, data flow, Hydrogen wiring) is solid and idiomatic. The redesign is *half-applied* — a polished home/shell over an unfinished commerce core, styled through a duplicated CSS system while a proper component library sits unused. The roadmap's spine is: **establish one design foundation → adopt the component system → finish each commerce surface to reference quality → layer in the wholesale model → harden.**

---

## Part B — Weak-Area Inventory (every issue, by domain)

### Branding & Design System
- B1. Brand palette in code ≠ `CLAUDE.md` (gold, ivory, charcoal, green all differ).
- B2. Three token namespaces for one palette (`--ng-*`, Tailwind `--color-greenhouse-*`, legacy `--color-*`).
- B3. Conflicting legacy token values across `app.css` / `design-system.css` / `reset.css`; stale `var(…, #hex)` fallbacks.
- B4. Three button styling paths with different hovers/heights; headings styled by both element rules and utility classes (`<h2>` ≠ `<Heading size="h2">`).
- B5. Tailwind v4 configured but unused (ships preflight + theme for no consumer).
- B6. No `@font-face`/preload for display/body fonts → FOUT risk.

### Component Architecture
- B7. `components/ui/` (18 primitives) is dead code — violates "never duplicate UI / atomic design."
- B8. Duplicated GraphQL fragments (`CartLine`/`CartLineComponent`; product-card fragments across two collection routes).
- B9. `cx()` is naive (no conflict resolution) — fine, but note for scaling.

### UX / Content (placeholder & non-functional UI)
- B10. Collection filter/sort bar is decorative (not wired; query lacks `sortKey`/`filters`).
- B11. Gift-message textareas (PDP + Cart) never persist to `cart.note`/attributes.
- B12. Newsletter form is a no-op `<button type="button">`.
- B13. PDP "Perfect pairings" / "Recently viewed" are hardcoded links, not real recommendations.
- B14. Account section is unstyled skeleton (inline styles, `<br/>` spacers, `&nbsp;|&nbsp;`).
- B15. Skeleton leftovers: `Hydrogen | Products` / `Hydrogen | Cart` titles, unused imports, `acccount-orders` typo, `guides/` docs.

### Imagery
- B16. Only 3 editorial JPGs, reused across home + PDP + fallbacks (looks templated).
- B17. PDP gallery hardcodes banner assets instead of `product.images`/`media` (query doesn't fetch them).
- B18. No art direction / responsive crops; no cinematic per-product photography pipeline.

### Commerce / Shopify
- B19. **Store not linked** — running on mocks; no real catalog to design against.
- B20. No wholesale model: bulk/case quantities, tiered/volume pricing, MOQ, per-stem pricing, wedding packages, bulk cart UX (the BloomsByTheBox core).
- B21. Account queries over/under-fetch (unwritable email/phone; unused `discountAllocations`; deprecated `fulfillmentStatus`).
- B22. Order IDs use non-URL-safe `btoa`/`atob`.
- B23. `AddToCartButton` weak typing (`analytics?: unknown`; `"undefined"` serialized).

### Performance / A11y / SEO
- B24. `useOptimisticCart` computed twice (CartMain + Header badge).
- B25. Account layout `no-store` + `shouldRevalidate:true` re-fetches full customer every nav.
- B26. 1,772-line un-tree-shakeable global CSS.
- B27. Contrast of new palette not validated (gold on ivory, charcoal on ivory).
- B28. No JSON-LD structured data (Product, Breadcrumb, Organization) for luxury/wholesale SEO.
- B29. Heading order and landmark semantics unverified on unfinished routes.

---

## Part C — Reusable Components to Establish BEFORE Building
(Requirement 7: recommend reusable components before building anything.)

The `components/ui/` layer already defines most of these — the work is to **make them canonical, complete the gaps, and enforce their use.** Atomic-design grouping:

**Atoms (mostly exist — align to brand tokens):** `Button`/`ButtonLink`/`IconButton`, `Heading`, `Text`, `Label`, `Price`, `Badge`, `Divider`, `LuxuryLink`, `IconFrame`, `ImageFrame`.
**Atoms to ADD:** `Icon` (single SVG sprite system — currently text labels like "Cart"/"Search"/"Menu"), `Input`/`Textarea`/`Select`/`Checkbox` (design-system.css has `.ng-*` field styles but no React wrappers), `Spinner`/`Skeleton`, `VisuallyHidden`.
**Molecules to ADD/formalize:** `ProductCard` (replace ad-hoc `ProductItem`), `CollectionCard`, `QuantityStepper` (extract from CartLineItem; reused by wholesale bulk), `PriceBlock` (price + compare-at + % off), `FormField` (label+control+error), `FilterControl`, `Pagination` wrapper (formalize `PaginatedResourceSection`), `SearchField`, `Accordion` (PDP details), `SwatchGroup`.
**Organisms to ADD/formalize:** `SiteHeader`/`MegaMenu`, `SiteFooter`, `CartDrawer`, `ProductGallery` (real media + zoom), `ProductForm` (exists; refactor onto atoms), `CollectionToolbar` (functional filters/sort), `SectionHeading` (kicker+title+link, currently repeated raw), `EditorialBlock`, `Newsletter` (functional).
**Layout primitives (exist — adopt):** `Container`, `Section`, `Stack`, `Cluster`, `Grid`.

**Rule going forward:** no new page markup may introduce raw `.greenhouse-*` classes for anything a primitive covers. New one-offs get a primitive first.

---

## Part D — Milestones

Each milestone is independently completable, testable, and committable. Complexity: **S** (≤~0.5 day), **M** (~1–2 days), **L** (~3–5 days), **XL** (>1 week / needs data decisions).

---

### M0 — Store Link & Data Foundation *(prerequisite gate)*
**Goal:** Get off mocks and understand the real catalog + wholesale data model before designing against it.
**Scope (features/config):** Run `npx shopify hydrogen link` / `env pull`; document real collections, product option structure, metafields, and whether wholesale (B2B/markets/catalogs, case packs, per-stem) exists in the Shopify catalog or must be modeled. No component changes.
**Modifies:** `.env` (local), documentation only.
**Dependencies:** None (blocks realistic validation of M4/M5/M8).
**Risks:** Store may not have wholesale catalog structured yet → M8 scope depends on this. Credentials handling stays with the owner.
**Acceptance:** Dev server renders **real** products/collections; `MockShopNotice` no longer shows; a written catalog/data-model note exists; wholesale approach decided (native B2B vs. metafield-driven vs. deferred).
**Complexity:** S–M (mostly discovery; owner must supply store access).

---

### M1 — Design Foundation: Tokens, Type, Theming *(foundational)* — ✅ COMPLETE (2026-07-11, see `docs/MILESTONE-1.md`)
**Goal:** One source of truth for the brand, matching `CLAUDE.md` exactly.
**Scope:** Collapse three token namespaces into one; set brand palette to spec (Gold `#C8A96A`, Ivory `#FAF8F4`, Charcoal `#222222`, Green `#4D6A50`, Black `#090909`); decide Tailwind's role (recommend: keep Tailwind theme as the token source *or* keep `--ng-*` and drop the Tailwind palette — not both); load & preload display + body fonts; remove stale fallbacks; reconcile `reset.css` element rules vs. utility classes.
**Modifies:** `app/styles/tailwind.css`, `design-system.css`, `app.css` (token block), `reset.css`, `root.tsx` (font `links`), `app/assets/` (font files if self-hosted).
**Dependencies:** None. **Blocks all visual milestones** (M2–M10 should build on final tokens).
**Risks:** Palette change ripples through every hardcoded fallback; contrast regressions (validate WCAG AA for gold/charcoal on ivory). Font licensing (Canela/Neue Haas are commercial — confirm rights or use Cormorant/Inter).
**Acceptance:** Exactly one canonical token set; brief palette rendered site-wide; fonts preloaded with no FOUT; AA contrast validated for text pairings; no duplicate/conflicting color vars; visual diff of home reviewed.
**Complexity:** M.

---

### M2 — Component System Adoption *(foundational)* — ✅ COMPLETE (2026-07-11, see `docs/MILESTONE-2.md`)
**Goal:** Make the atomic library real and enforce "never duplicate UI."
**Scope:** Complete missing atoms/molecules from Part C; refactor **Header, Footer, Aside/CartDrawer, ProductForm, ProductItem→ProductCard** onto primitives; extract `SectionHeading`, `QuantityStepper`, `PriceBlock`; add Storybook-style usage doc or a `/design-system` internal preview route (optional). Delete or migrate dead code paths.
**Modifies:** `components/ui/*` (extend), `Header.tsx`, `Footer.tsx`, `Aside.tsx`, `CartLineItem.tsx`, `ProductForm.tsx`, `ProductItem.tsx`, new `ProductCard.tsx`, plus `index.ts`.
**Dependencies:** M1 (tokens). Enables faster, consistent M3–M10.
**Risks:** Broad refactor touching the shell — regression surface for cart badge, nav, drawers. Mitigate with per-surface commits and manual flow tests.
**Acceptance:** Zero dead primitives (every export rendered or removed); shell + product card render via primitives; no new raw `.greenhouse-*` for covered patterns; cart/search/mobile drawers + badge still function; lint/typecheck clean.
**Complexity:** L.

---

### M3 — Global Shell Polish (Header / Nav / Footer / Announcement) — ✅ COMPLETE (2026-07-11, see `docs/MILESTONE-3.md`)
**Goal:** Boutique-grade, sticky, accessible global chrome with real iconography.
**Scope:** Icon system (replace text "Cart/Search/Menu"); refined mega-menu driven by real menu data (not hardcoded panels); sticky header behavior; announcement bar; footer IA (columns, newsletter, contact, social, trust); mobile menu polish.
**Modifies:** `Header.tsx`, `Footer.tsx`, `PageLayout.tsx`, `Aside.tsx` (mobile), new `Icon` atom, header/footer CSS → primitives.
**Dependencies:** M1, M2. M0 for real menu handles.
**Risks:** Mega-menu content currently hardcoded → needs real menu structure (Shopify navigation). Keyboard/focus-trap correctness in drawers.
**Acceptance:** Header/footer match reference quality; icons accessible (labelled); mega-menu reflects real menus; keyboard nav + focus trap verified; mobile drawer polished; no layout shift on scroll.
**Complexity:** M.

---

### M4 — Collection & Catalog Experience — ✅ COMPLETE (2026-07-11, see `docs/MILESTONE-4.md`)
**Goal:** Real, functional discovery — the wholesale browsing backbone.
**Scope:** Wire **functional filters + sort** (extend `COLLECTION_QUERY` with `filters`/`sortKey`, drive via `useSearchParams` like the orders form); collection hero/header; refined product grid (`ProductCard`); load-more/pagination polish; empty/loading states; correct meta titles; larger sensible `pageBy`. Consolidate duplicated collection fragments.
**Modifies:** `collections._index.tsx`, `collections.$handle.tsx`, `collections.all.tsx`, `PaginatedResourceSection.tsx`, `ProductCard`, shared collection fragment module, `CollectionToolbar`/`FilterControl` molecules.
**Dependencies:** M1, M2, M0 (real filter facets from catalog).
**Risks:** Available Storefront filter facets depend on catalog config; URL/state sync complexity; SSR + filter caching.
**Acceptance:** Filters and sort actually change results and are URL-shareable/back-button safe; grid responsive & polished; no decorative controls; titles branded; fragments de-duplicated; a11y for controls verified.
**Complexity:** L.

---

### M5 — Product Detail Page (PDP)
**Goal:** Portfolio-quality PDP with real media and (if applicable) wholesale purchasing.
**Scope:** Real `ProductGallery` (fetch `product.images`/`media`; thumbnails, zoom, art direction) replacing hardcoded banners; refined variant/swatch UI via `SwatchGroup`; `QuantityStepper`; functional gifting (persist to line attributes/`cart.note`); PDP info architecture (story, care, delivery, trust) on `Accordion`; real "pairings"/recommendations (or remove); structured data (Product JSON-LD).
**Modifies:** `products.$handle.tsx` (+ `PRODUCT_QUERY` for media), `ProductImage.tsx`→`ProductGallery`, `ProductForm.tsx`, `ProductPrice.tsx`→`PriceBlock`, `AddToCartButton.tsx` (typing), new `Accordion`, `QuantityStepper`.
**Dependencies:** M1, M2, M0 (real media/variants). M8 if wholesale qty/pricing applies here.
**Risks:** Product media/variant structure unknown until M0; combined-listing variants; gifting persistence must not break checkout.
**Acceptance:** Gallery shows real product media with zoom; variants/swatches correct incl. combined listings; quantity + add-to-cart robust; gift note persists through to cart/checkout; Product JSON-LD valid; add-to-cart typed; a11y verified.
**Complexity:** L (XL if wholesale purchasing lands here).

---

### M6 — Cart & Checkout Handoff
**Goal:** Elegant, trustworthy cart with working gifting and clear wholesale totals.
**Scope:** Cart drawer + page polish via primitives; persist gift message; discount/gift-card UX states; checkout button loading/disabled state; single shared optimistic-cart source (remove double compute); bulk/line editing UX (ties to `QuantityStepper`); order-summary clarity (subtotal, savings, duties).
**Modifies:** `CartMain.tsx`, `CartLineItem.tsx`, `CartSummary.tsx`, `AddToCartButton.tsx`, `cart.tsx` (note/attributes handling), `Header.tsx` (shared optimistic source).
**Dependencies:** M1, M2, M5 (gifting/qty patterns).
**Risks:** Cart is business-critical — every change needs flow testing; note/attribute wiring must reach checkout; optimistic reconciliation edge cases.
**Acceptance:** Add/update/remove/discount/gift-card all work; gift note visible in cart and carried to checkout; checkout button gives feedback; badge/drawer consistent; optimistic cart computed once; no checkout regressions.
**Complexity:** M.

---

### M7 — Customer Account Redesign
**Goal:** Bring the skeleton account section to storefront quality.
**Scope:** Restyle layout/nav (remove inline styles) via primitives; orders list + filters + single order; profile & addresses forms on `FormField`; loading/empty/error states; fix `btoa/atob`→URL-safe; trim account GraphQL over-fetch; fix `acccount-orders` typo; revisit `no-store`/revalidate cost.
**Modifies:** `account.tsx`, `account._index/.orders._index/.orders.$id/.profile/.addresses.tsx`, `graphql/customer-account/*`, `FormField`/form atoms.
**Dependencies:** M1, M2, M0 (real customer/order data to test OAuth).
**Risks:** Customer Account API OAuth needs a linked store + test customer; address CRUD error handling; must not break auth flow.
**Acceptance:** Account visually matches storefront; all CRUD (profile, addresses) works with proper error/empty states; URL-safe order links; auth/login/logout intact; no unused query fields; a11y verified.
**Complexity:** M.

---

### M8 — Wholesale / Bulk Commerce Model *(the BloomsByTheBox differentiator)*
**Goal:** The wholesale ordering experience — bulk/case quantities, volume pricing, wedding packages.
**Scope (data-dependent):** Case/bundle purchasing; quantity-tier/volume pricing display; MOQ enforcement; per-stem vs. per-bunch UX; "build your own box" / recipe bundles; wedding/event package flows; possibly B2B (customer-specific catalogs/pricing via Customer Account + markets). Reuses `QuantityStepper`, `PriceBlock`, `ProductForm`, cart.
**Modifies:** `products.$handle.tsx`, `ProductForm`, cart components, new bundle/package routes/components, product & cart fragments; possibly `context.ts` (B2B buyer identity).
**Dependencies:** **M0 (hard)** — entirely shaped by how wholesale is modeled in Shopify; M2, M5, M6.
**Risks:** **Highest.** Wholesale may require Shopify Plus/B2B, markets, or metafield modeling not yet in the store; pricing rules can't be faked client-side without breaking checkout integrity. Scope must be pinned after M0.
**Acceptance:** Defined after M0. Minimally: bulk quantities and any tiered pricing add to cart and checkout at correct prices; MOQ respected; packages purchasable; no checkout price mismatches.
**Complexity:** XL (and partly gated on business/data decisions).

---

### M9 — Content, Editorial & Static Pages
**Goal:** Finish every non-commerce surface to portfolio quality.
**Scope:** Homepage refinement to reference standard (real featured collections/products, functional newsletter, remove placeholders); `pages.$handle` (About, services); blog/journal index + article; policies; 404/error pages; consistent `SectionHeading`/`EditorialBlock`.
**Modifies:** `_index.tsx`, `pages.$handle.tsx`, `blogs.*`, `policies.*`, `$.tsx`, `root.tsx` `ErrorBoundary`, editorial components.
**Dependencies:** M1, M2, M3; M10 for imagery.
**Risks:** CMS/page content availability (needs M0); newsletter needs a provider/endpoint decision.
**Acceptance:** No placeholder/"UI preview only" copy anywhere; newsletter submits to a real endpoint (or is removed); blog/pages/policies styled; branded 404; homepage matches reference quality.
**Complexity:** M.

---

### M10 — Imagery Pipeline & Art Direction — ◐ SCAFFOLDED (2026-07-11, see `docs/ASSET_MANIFEST.md`)
*Pipeline + manifest + folder scaffold complete; 46 assets await generation (no image-gen tool available) + owner approval.*
**Goal:** Cinematic, non-stock floral imagery with correct crops/formats.
**Scope:** Audit current assets; regenerate/upscale/re-crop weak images; per-surface art direction (hero vs. card vs. gallery ratios already tokenized); ensure all imagery flows through Hydrogen `Image` with correct `sizes`/`aspectRatio`; alt-text pass; consider CDN transforms.
**Modifies:** `app/assets/*`, image usages across home/PDP/collections, `ProductGallery`, `ProductCard`.
**Dependencies:** M1 (ratios/tokens); interacts with M3/M5/M9.
**Risks:** Source photography availability; generated imagery must look authentic (brief: "avoid stock-photo appearance"); file-size vs. quality balance.
**Acceptance:** No reused-placeholder look; every image has meaningful alt text; correct responsive crops per surface; Lighthouse image diagnostics clean; LCP image optimized.
**Complexity:** M.

---

### M11 — Performance, Accessibility & SEO Hardening *(final pass)*
**Goal:** Lock in the non-functional quality bars.
**Scope:** LCP/CLS/JS-weight audit; font/display tuning; tree-shake/split CSS (retire dead `app.css`); single optimistic-cart source verified; a11y audit (keyboard, focus, heading order, landmarks, contrast, reduced-motion); SEO (branded titles/descriptions, canonicals, Organization/Breadcrumb/Product JSON-LD, sitemap coverage, wholesale/luxury keywords); analytics/consent verification.
**Modifies:** cross-cutting — styles, `root.tsx`, route `meta`, structured-data helpers, `entry.server.tsx` (CSP/nonce) if needed.
**Dependencies:** All prior milestones (audits what they built).
**Risks:** Regressions from optimization; CSP interactions with fonts/structured data.
**Acceptance:** Lighthouse (Perf/A11y/SEO/Best-Practices) ≥ agreed thresholds on home/PDP/collection; WCAG AA verified; JSON-LD validates; no dead CSS shipped; core flows still pass.
**Complexity:** M.

---

## Part E — Dependency Graph

```
M0 (store link/data) ──┬──────────────► M4 (collections)
                       ├──────────────► M5 (PDP)
                       ├──────────────► M7 (account)
                       └──────────────► M8 (wholesale)  ◄── hard dependency

M1 (tokens/type) ──► M2 (components) ──┬─► M3 (shell)
                                       ├─► M4 (collections)
                                       ├─► M5 (PDP) ──► M6 (cart) ──┐
                                       ├─► M7 (account)             │
                                       └─► M9 (content)             │
                                                                    ▼
M5 + M6 + M2 ─────────────────────────────────► M8 (wholesale)

M1 ──► M10 (imagery) ──► (feeds M3, M5, M9)

ALL ─────────────────────────────────────────► M11 (hardening, final)
```

**Critical path:** `M1 → M2 → M5 → M6 → M8 → M11`.
**Parallelizable after M2:** M3, M4, M7, M9, M10 can proceed in parallel (resource permitting).
**M0** should start immediately (owner-dependent) since M4/M5/M7/M8 can't be *validated* without it, even though M1/M2/M3 can proceed on mocks.

---

## Part F — Risks Identified Before Implementation

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Store not linked** (`.env` empty) — designing on mocks | Blocks realistic M4/M5/M7/M8 validation | Run M0 first; owner provides store access |
| R2 | **Wholesale model undefined** in Shopify (B2B? markets? metafields?) | M8 scope/feasibility unknown | Pin down in M0 before scoping M8; may need Shopify Plus/B2B |
| R3 | **Font licensing** (Canela, Neue Haas Grotesk are commercial) | Legal / can't self-host | Confirm licenses in M1 or fall back to Cormorant + Inter |
| R4 | **Palette change contrast regressions** (gold/charcoal on ivory) | A11y failures | WCAG AA validation gate in M1 |
| R5 | **Cart/checkout regressions** during refactor | Revenue-critical breakage | Per-surface commits; manual flow test each; never change action + UI in one untested commit |
| R6 | **Broad shell refactor (M2)** touches header/drawers/badge | Wide regression surface | Incremental migration, one organism per commit |
| R7 | **Filter facets depend on catalog config** | M4 filters may be limited | Confirm available Storefront filters in M0 |
| R8 | **OAuth account testing needs linked store + test customer** | M7 hard to verify | Depends on M0; request test credentials |
| R9 | **Scope creep** (luxury polish is unbounded) | Timeline risk | Acceptance criteria per milestone; "portfolio quality" defined by reference parity, reviewed per surface |
| R10 | Design-system migration leaves **two systems mid-flight** | Temporary inconsistency | Enforce "no new `.greenhouse-*` for covered patterns"; track migration per surface |

---

## Part G — Suggested Sequencing & Complexity Summary

| Milestone | Complexity | Gated by |
|---|---|---|
| M0 Store link & data | S–M | owner store access |
| M1 Design foundation | M | — |
| M2 Component system | L | M1 |
| M3 Shell polish | M | M1, M2 |
| M4 Collections | L | M1, M2, M0 |
| M5 PDP | L (XL w/ wholesale) | M1, M2, M0 |
| M6 Cart | M | M2, M5 |
| M7 Account | M | M2, M0 |
| M8 Wholesale | XL | **M0**, M2, M5, M6 |
| M9 Content/editorial | M | M2, M3, M10 |
| M10 Imagery | M | M1 |
| M11 Hardening | M | all |

**Recommended first execution:** **M1 (Design Foundation)** — it unblocks everything visual, directly resolves the brand-palette conflict, and is low-risk/high-leverage. Run **M0 in parallel** (owner-dependent). Approve M1 to begin.

---

*Planning document. No code written. Awaiting approval to implement Milestone 1.*
