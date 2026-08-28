# 10 — Session Summary

> Rolling log of what recent AI sessions actually did. Append; don't rewrite history.

## Session — 2026-08-26 (new-machine reconnaissance + baseline verification + docs reconciliation)

**Branch:** `claude/greenhouse-repo-reconnaissance-qreugy` (HEAD identical to `redesign-v1` @ `abb19f4`). No application code changed; no commit/push/deploy.

### Verified baseline (fresh clone, Node 22)
- `npm ci` clean (861 packages; `package.json`/lock unchanged). `npm run typecheck` green. `npx vitest run` → **553 tests / 37 files, 0 failures**. `npm run build` green. New canonical baseline: `abb19f4` (was `acc9c3c` @ 329).
- Bare `npx tsc --noEmit` fails on a fresh tree (missing generated route types) — must use `npm run typecheck`. Documented in `01`/`07`.

### Docs corrected (this pass, docs-only)
- **Deploy model** (`00`, `07`, `10`): manual-only assumption was wrong — GitHub Actions auto-deploys to Oxygen on push. High-risk; verify before pushing.
- **Wholesale gate** (`05`): now enforces `approved` (commit `72b18e5`); "authentication-only, deferred" note removed.
- **Dormant orchestration** (`05`, `08`): `app/lib/wholesale/` + docs `13`/`14`/`15` still exist (unwired); the "deleted" claim was only partially true. Not deleted.
- **Application route** (`08`): no `/wholesale/apply`; it's `($locale).account.wholesale-profile.tsx`.
- **Generated-type drift** (`07`, `08`): `customer-accountapi.generated.d.ts` committed stale vs the `wholesale_status` query; build regenerates it. Not fixed here (docs-only).

### Handed off
- Regenerate + commit `customer-accountapi.generated.d.ts`; decide fate of dormant `app/lib/wholesale/` code; Oxygen deploy-workflow hardening (proposal delivered, workflow unchanged).

---

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
- ~~**[Assumption]** Deploys are manual; no Oxygen GitHub integration — observed.~~ **Corrected 2026-08-26 → [Verified]:** `.github/workflows/oxygen-deployment-1000155967.yml` auto-deploys to Oxygen via `npx shopify hydrogen deploy` on `on: [push]` (every push, any branch). **Pushing may trigger a deployment — verify before pushing.** Manual `shopify hydrogen deploy` also works.
- **[Assumption]** In-app preview pane applies mobile CSS correctly but scales absolute pixel rects — use ratio/offset/computed-style measurements.
- **[Verified]** `ProductGrid` ≠ catalogue (it's PDP recs, capped 4). Wholesale access is gated on the owner-set `custom.wholesale_status` metafield (single source of truth in `app/lib/wholesale.ts`; only `approved` opens the catalogue). `/account/login` route initiates Shopify Customer Account login.

---

_When you finish a session, add a dated entry above with: branch, what shipped (with commit hashes), what was investigated, what was handed off, and any new hard-won facts._
