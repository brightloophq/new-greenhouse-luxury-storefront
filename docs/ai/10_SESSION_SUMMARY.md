# 10 — Session Summary

> Rolling log of what recent AI sessions actually did. Append; don't rewrite history.

## Session — 2026-07 (editorial migration + mobile hardening)

**Branch:** `redesign-v1` (and `feat/mockup-ui-migration`). Baseline held at 329 tests / typecheck / lint / build green throughout.

### Shipped & verified
- **Search overlay** elevated (`8a39958`) — editorial field, champagne focus-underline, glaze seam, unified submit button.
- **Glasshouse loading language** (`72eca4f`) — `.ng-loading-glaze` on cart + search.
- **Homepage fixes** (`6859b12`) — reviews heading centered; hero video mount fixed (stable `video?.src` dependency).
- **Mobile header** — leaf mark on mobile, wordmark wrap-safety, symmetric masthead grid; leaf **viewport-centered** (`acc9c3c`, offset 0 @390; wordmark centered @800).
- **Design-system unification** — soft radii (removed classic zero-override), one button family, unified image-hover amplitude + reduced-motion guard.

### Investigated / corrected
- **Catalogue pause reverted** (`add42f9`) — had targeted `ProductGrid` (PDP recs, capped 4) instead of `CatalogueView`. Followed by a data-backed audit → Option B recommendation (awaiting approval).
- **Private preview gate** — built, then fully **removed** on request. Post-login 500 shown to be unreproducible externally (Shopify OAuth wall) and environment-specific, not gate code.

### Not done (handed off — see ROADMAP)
- Review-carousel real-browser verification; About desktop hover; full mobile-spacing sweep of every route; catalogue Option B build; authentication experience; hero video generation (blocked on tooling/credentials).

### Hard-won facts (don't re-derive)
- **[Assumption]** Oxygen previews are behind Shopify OAuth → no external `curl` verification (observed).
- **[Assumption]** Deploys are manual (`shopify hydrogen deploy`); no Oxygen GitHub integration (only Netlify/Supabase/Vercel check-suites appear) — observed.
- **[Assumption]** In-app preview pane applies mobile CSS correctly but scales absolute pixel rects — use ratio/offset/computed-style measurements.
- **[Verified]** `ProductGrid` ≠ catalogue (it's PDP recs, capped 4). Wholesale has no pending-approval state (test-enforced). `/account/login` route initiates Shopify Customer Account login.

---

_When you finish a session, add a dated entry above with: branch, what shipped (with commit hashes), what was investigated, what was handed off, and any new hard-won facts._
