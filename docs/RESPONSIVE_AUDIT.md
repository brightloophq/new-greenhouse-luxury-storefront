# RESPONSIVE AUDIT — The New Greenhouse

**Date:** 2026-07-12 · **Branch:** `rescue-after-global-audit`
**Method:** static CSS audit + live measurement in a headless Chromium at 320–1920px (measuring `document.scrollWidth` vs `clientWidth` and locating the DOM element that *introduces* each overflow, not just its victims).
**Scope constraint:** preserve the black/gold/ivory identity; no new CSS framework; no architecture change; fix root causes, not symptoms (`overflow-x: hidden` used only where it is the correct clip boundary, never as a page-level mask).

---

## 1. Architecture found

Two coexisting style layers, both **mobile-first** with real breakpoints:

- Legacy `greenhouse-*` / `.product-*` (homepage, PDP, cart) in `app.css`.
- Newer `ng-*` design system (shell, collections, catalog) in `design-system.css`, `shell.css`, `catalog/*`.

The shell (header, mega menu, mobile drawer, cart drawer) was already well-built responsively: full-width absolute mega panel, `min(28rem, 100vw)` drawers, burger/desktop swap at 64rem. The defects were **systemic (one missing global rule)** plus **four localized overflow sources**.

---

## 2. Responsive issue matrix

| # | File | Component | Viewport(s) | Symptom | Root cause | Fix |
|---|------|-----------|-------------|---------|------------|-----|
| **R1** | `reset.css` | **Global (all pages)** | every width | Horizontal page scroll everywhere; `main` and inputs exceeded viewport | **No `box-sizing: border-box` anywhere in the codebase** — `main { width:100%; padding:… }` computed as 100% **+** padding; no global `img/svg` cap either | Added `*,*::before,*::after{box-sizing:border-box}`, `img/picture/video/canvas/svg{max-width:100%}`, `img,video{height:auto}`, `body{overflow-wrap:break-word}`, `html{text-size-adjust:100%}` |
| **R2** | `shell.css` | Header nav row (`.ng-shell-nav-inner`) | ≤~360px | Nav content 335px in a 320px viewport → page scroll; centered logo **overlapped the search icon** | `1fr auto 1fr` grid + `white-space:nowrap` logo + burger + **3** action icons could not fit; centering pushed the logo's right edge into the right column | ≤30rem: tightened `gap`/`padding-inline`, `min-width:0` on columns, reduced logo font floor, **hid the redundant account icon** (still in the menu drawer), zeroed action gap → logo clears icons by 11px @320, 36px @375 |
| **R3** | `catalog/filters.css` | Collection toolbar (`.ng-catalog-toolbar-controls`) | ≤~480px | Collection pages scrolled horizontally (~344px controls in ~256px column) | Sort `<select>` has `min-inline-size: 11rem` and the controls row did not wrap | ≤40rem: `flex-wrap:wrap` the controls, `flex:1 1 12rem` the sort group, and `min-inline-size:0; flex:1 1 auto` the select so it shrinks |
| **R4** | `app.css` | Product page grid (`.product`) | ≤~480px | PDP scrolled ~16px; purchase panel forced to 320px inside a 288px track | **Grid min-content blowout** — at mobile `.product` had *no* column template, so the implicit auto-column sized to a child's max-content instead of the container | Explicit `grid-template-columns: minmax(0,1fr)` (mobile) / `minmax(0,1fr) minmax(0,1fr)` (≥45em) + `.product > * { min-width:0; max-width:100% }` |
| **R5** | `shell.css` | Cart/menu drawer overlay (`.ng-drawer-overlay`) | all widths (defensive) | Off-canvas (closed) drawer parked at `translateX(100%)` could extend document scroll width | Fixed, viewport-sized overlay did not clip its off-canvas child | Added `overflow: hidden` to the overlay — clips only the parked/closed panel; the open drawer sits at `translateX(0)` inside the viewport, so the visible state is unaffected |

*Verification note:* R5 was proven **not** to be the homepage culprit (hiding the drawer left `scrollWidth` unchanged) — the real homepage source was R2. R5 is retained as a correct, defensive clip at the true boundary (it matters for the off-canvas state and prevents regressions), not as a page-level `overflow-x:hidden` mask.

---

## 3. Areas audited and found already-correct (no change)

- **Announcement bar** — collapses on scroll; `overflow:hidden`, fluid padding. OK.
- **Mega menu** — `position:absolute; left:0; right:0` full-width within viewport; single column + feature hidden ≤48rem; only shown ≥64rem (burger below). OK.
- **Mobile nav** — single canonical accordion consuming the same exported nav data; fits 320px. OK.
- **Product/collection card grids** — `repeat(auto-fit, minmax(min(100%, …), 1fr))` and `repeat(2/3/4…)` with explicit 768/1280 breakpoints; collapse 4→3→2 cleanly. OK.
- **Cart drawer width** — `min(28rem, 100vw)`; open drawer measured 0→320 at 320px. OK.
- **Predictive search / search route** — no overflow at 320px. OK.
- **Footer** — grid columns already collapse via `shell/footer.css` breakpoints. OK.
- **"Standard/Deluxe" control** — this is the PDP **variant option** buttons (`.product-options-grid { display:flex; flex-wrap:wrap }`), which already wrap on mobile; there is no theme toggle. No layout-shift/hydration concern (server-rendered, no client-only width). See FINAL-LAUNCH-REPORT §5.

---

## 4. Reusable responsive primitives (baseline hardened)

Rather than add a new framework, the audit hardened the **existing** primitives so every component inherits safe behavior:

- **Global border-box + media cap** (`reset.css`) — the foundational container/media wrapper behavior for the whole app.
- **Fluid type** — headings already use `clamp()` (`--ng-font-size-*`, hero/banner `clamp()`); logo floor now fluid on small phones.
- **Container** — `main { max-width: var(--page-max-width); width:100%; padding-inline }` now safe under border-box.
- **Grid/Stack/Cluster** — M2 `ui` primitives (`Grid`, `Stack`, `Cluster`, `Container`) unchanged; the `.product` grid now uses the `minmax(0,1fr)` blowout-safe idiom, matching the catalog grids.

See `docs/RESPONSIVE_QA_REPORT.md` for the measured results.

---

## 5. Addendum — overlap defects (found after the scroll-only pass)

The first pass measured `document.scrollWidth` only. **Overlap (z-index stacking) does not create horizontal scroll**, so two real bugs slipped through. Found by measuring element rectangles for intersection, not just page width.

| # | File | Component | Viewport | Symptom | Root cause | Fix |
|---|------|-----------|----------|---------|------------|-----|
| **R6** | `catalog.css` | Collection filter sidebar | ≥1024px (desktop) | **Filter sidebar rendered on top of the product grid** (sidebar box 420px inside its 256px track → right edge 497 over the grid at 365) | A `position: sticky` grid item with default `min-width:auto` expands to its content's width and **overflows its fixed track**, painting over the next column | Cap the item to its track: `min-inline-size:0; max-inline-size:100%`. Also aligned to spec: **300px** sidebar at **≥1280px** only; 1024–1279px now uses the drawer (breakpoint moved 64rem→80rem in `catalog.css` + `filters.css`) |
| **R7** | `shell.css` | Mobile Shop menu sub-links | ≤1023px (mobile/tablet) | Accordion sub-links (Birthday, Roses, …) ran **horizontally as an inline text run**, reading like squished desktop columns | `.ng-mobilenav-sublink` had no `display` and sat directly in a block panel → inline `<a>` flow | `display:block; padding:0.25rem 0` → links stack vertically with tap-sized rows |

**Note on the "mega on mobile" report:** in the production build the desktop `.ng-mega` is `display:none`/`visibility:hidden` (measured w0 h0) below 1024px and the trigger row `.ng-shell-primary` is `display:none` — the mega does **not** render on mobile. The mobile menu is a separate accordion; its only defect was the inline sub-links (R7), which produced the columns-like appearance. The desktop mega (3 columns, opens on Shop) was verified **unchanged** after the fix.
