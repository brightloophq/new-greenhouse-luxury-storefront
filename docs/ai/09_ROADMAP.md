# 09 — Roadmap / Open Work

Priority order is a suggestion; the owner sets direction.

## P0 — live customer-facing breakage
- [ ] **[Assumption]** **`/arrangements/occasion/birthday` returns the `failed` state** — observed at runtime; a Storefront query throws on a real route. Re-confirm, then investigate the loader/handle in `catalogues.ts`.
- [ ] **[Assumption]** **Premium-deluxe collections missing in Shopify** (`premium-handcrafted`, `premium-vase`, `premium-heart-box`) — observed at runtime. Merchant action: create the collections, or intentionally keep the empty state.

## P1 — unfinished homepage sprint
- [ ] **Review carousel** — verify in a genuinely visible browser (`document.hidden === false`). Evidence suggests it may not be broken (it advanced before probing); the reported freeze is a hidden-document + rAF artifact. Independent real flaw to fix regardless: `onFocusCapture`/`onBlurCapture` lacks a `relatedTarget` check (focus moving between internal controls can leave `paused` stuck true).
- [ ] **About desktop hover/dropdown** — un-investigated. Likely a hover gap firing `pointerleave` before the pointer reaches the panel.
- [ ] Responsive QA sweep of the locked homepage fixes at 1920/1200/768/390 (1440 already verified).

## P2 — approved-but-unbuilt
- [ ] **Catalogue editorial pacing (Option B)** — presentation-only pause in `CatalogueView`, CSS row placement, ≥12 products, page-one, grounded/visual-only content, premium + wholesale excluded, supplies never get flower copy. Needs the 22-item test suite + live verification across flower/supplies/arrangements at 5 widths.
- [ ] **Authentication experience** — branded shared auth modal (contexts: account/wholesale/checkout/protected), account surfaces, session/logout polish. Underlying Shopify OAuth already works; this is presentation + wiring. `/account/login` stays a 302 to Shopify.

## P3 — award-grade polish (net-new creative)
- [ ] Art-directed photography (the real ceiling; not solvable in code).
- [ ] Page transitions between "rooms" (View Transitions).
- [ ] Cinematic hero video (blocked on Veo credential + `@google/genai` SDK + FFmpeg; see Phase-0 gate rules).

## Housekeeping
- [ ] Confirm the intended baseline commit whenever the repo has been reset/rescued (branches `backup-before-step16`, `rescue-after-global-audit` exist).
