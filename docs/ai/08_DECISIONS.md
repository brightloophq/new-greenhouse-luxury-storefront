# 08 — Decisions Log

Chronological record of notable decisions + rationale. Newest at top.

## Generated Customer-Account types committed stale (2026-08-26) — engineering note
`customer-accountapi.generated.d.ts` is checked in **out-of-sync with source**: it still declares the old `WholesaleApproval` query against the retired `wholesale_approved` key, while the source query (`app/graphql/customer-account/WholesaleApprovalQuery.ts`) now selects `WholesaleStatus` / `custom.wholesale_status`. The canonical build/codegen (`npm run build`, `--codegen`) **regenerates it correctly**, so it appears as a modified file after every build. This is harmless at runtime (the file is derived and regenerated on build; `npm run typecheck` runs its own typegen) but the committed artifact lags source. Fix is a one-line regeneration commit — deferred; not done during the docs-only reconciliation pass. Do not hand-edit the generated file.

## Automated wholesale verification REMOVED — simple manual review instead (2026-07)
The automated wholesale-verification programme was **abandoned** in favour of a simple manual process that matches the client's actual business workflow. **New flow:** application submitted → team notified → manual review + manual CRA/TRN check → approve/reject and grant access **by hand in Shopify admin**. No AI, no automation, no automated Shopify writes.

> **[Verified 2026-08-26] Correction to the original decision record.** The removal was only *partially* executed in the repo:
> - **Actually deleted:** the TRN/business verification providers, the payload recorder, and all n8n workflow JSON (`n8n/` — confirmed absent).
> - **Still present (dormant):** the Sprint A1 domain state machine + A2 orchestration + in-memory sandbox under `app/lib/wholesale/`, and the docs `13`/`14`/`15`. This code is imported by no route or component — it is **not** on the active route-level authorization path (that path is `app/lib/wholesale.ts`) — but it still ships in the tree and its own unit tests still run. Do **not** delete it as part of unrelated work; its removal (or intentional retention) is a separate owner decision.
> - **Application entry point:** there is **no** `/wholesale/apply` route. The application is the authenticated wholesale **business profile** at `app/routes/($locale).account.wholesale-profile.tsx` (logic in `app/lib/wholesaleProfile.ts`). The auth gate is `app/lib/wholesale.ts`.

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
