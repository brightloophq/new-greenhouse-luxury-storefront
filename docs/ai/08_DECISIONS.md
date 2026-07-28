# 08 — Decisions Log

Chronological record of notable decisions + rationale. Newest at top.

## Wholesale verification — current model stays in production until replaced **[Planned]**
The current wholesale implementation (immediate access on auth, no approval — see `05`) **remains unchanged in production** until a new verification architecture has been **researched → validated → implemented → tested → approved**. No behavioural change occurs before that point. The proposed replacement is `13_WHOLESALE_VERIFICATION_ARCHITECTURE.md`. Evidence from the validation phase (2026-07): B2B *is* available on Shopify **Basic** (≤3 active catalogs) but **direct per-company catalog assignment is Plus-only**, and headless (Hydrogen) B2B pricing on Basic is **unverified** — both are gating risks captured in `13`.

## Soft corners are the identity
The classic experience previously **zeroed** the radius tokens; the flagship editorial rooms all hard-coded `3–4px`. Resolved in favour of **soft** (removed the zero override) so all token-driven corners match. Reversible in a few lines if the owner ever wants the sharp main-site look back.

## One button system
Unified `.ng-button*` + `--ng-btn-*` tokens; converged bespoke filled CTAs and the search submit (which was a leftover forest/Raleway/800 button duplicated in `catalog.css`). Editorial-link tier (text + rule) kept as a deliberate variant. Hover is colour-only (no lift).

## Image-hover amplitude unified
Shared `.ng-image-frame` hover zoom raised `1.025 → 1.04` to match the homepage cards (one motion language) + added the missing reduced-motion guard.

## Glasshouse loading language
Introduced `.ng-loading-glaze` (indeterminate champagne light on a 1px bar) as the one waiting state; applied to cart drawer + predictive search. Never fakes progress.

## Search overlay elevated
Editorial field with champagne focus-underline, `GlasshouseDivider` seam, editorial result eyebrows. Presentation only; predictive logic untouched.

## Catalogue "breathing room" — reverted, then re-scoped **[Planned]**
First attempt inserted an editorial pause into `ProductGrid` — wrong component (it's the PDP recommendations strip, capped at 4). **Reverted (`add42f9`) [Verified].** The correct target is `CatalogueView`; a data-backed audit (real product counts, measured 5/4/3/2/1 columns, LCM 60 → no fixed index is row-safe → prefer CSS row placement) produced an **Option B** recommendation (visual-only pause, page-one, ≥12 products, premium/wholesale excluded) — **[Planned] — awaiting approval, not yet built**.

## Private preview gate — built then fully removed
A password/`PREVIEW_MODE` launch gate was implemented, then **removed** at owner request (restore normal public storefront). A post-login 500 on the gated Oxygen deploy was traced to being **unreproducible externally** (Shopify OAuth wall) — root cause was environment/homepage-data specific, not the gate code.

## Mobile header
Wordmark overflowed narrow viewports (nowrap + `1fr` min-content pinned the header wider than the screen → mobile zoom-out). Fixed with wrap-safety + a compact centered **leaf mark** on mobile; masthead columns made symmetric (`1fr auto 1fr`) so the brand is viewport-centered. Verified offset 0 at 390, centered wordmark at 800.

## Homepage interaction fixes
Reviews heading centered (`.ng-reviews-title` `margin-inline:0 → auto`; it carries a max-width). Hero video mount fixed (`HeroMedia` depended on an unstable inline `video` object identity that cleared the poster-first timer → now depends on `video?.src`). **Not yet done:** review-carousel real-browser verification, About desktop hover.
