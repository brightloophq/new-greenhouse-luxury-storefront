# 01 — Architecture

## Runtime

- **Oxygen** (Cloudflare Workers). Entry: `server.ts` → creates the Hydrogen router context, then delegates to the request handler.
- `server.ts` runs a small amount of pre-routing logic (experience-entry handling). Keep it minimal; it runs on every request.
- SSR-first. GSAP and other client niceties are **dynamically imported** so they never enter the server bundle or the critical path.

## Routing

- React Router 7 file routes in `app/routes/`.
- Locale-prefixed routes use the `($locale)` segment (e.g. `($locale)._index.tsx`, `($locale).products.$handle.tsx`, `($locale).cart.tsx`).
- Product/collection routes may 302 for locale normalisation.

## Root document

- `app/root.tsx` — `Layout` renders `<html data-experience>` + the ordered `<link rel="stylesheet">` chain; `App` composes `ExperienceProvider → Analytics.Provider → PageLayout → <Outlet>`.
- **Stylesheet order matters** (cascade). New isolated stylesheets are appended last and imported `?url`. **`app/root.tsx` is the authoritative order** — read it rather than trusting a copy here. As of `acc9c3c` it ends: …`wholesale`, `product`, `cart` (later sheets win on equal specificity — e.g. `catalog.css` overriding `shell.css` for `.ng-search-submit`).

## Shell

- `app/components/PageLayout.tsx` — composes the masthead (`Header`), the three `Aside` drawers (cart / search / mobile-nav), `<main>`, and `Footer`.
- `app/components/Aside.tsx` — the shared slide-in drawer: scrim, focus trap, Escape, body-scroll lock (`.ng-scroll-locked`). Cart/search/mobile all use it.
- Masthead is `.ng-masthead` (two rows: brand row + centered nav row). Below 1100px the nav row hides and a burger opens the mobile drawer. Mobile brand row is `grid-template-columns: 1fr auto 1fr` (symmetric → centered brand).

## Styling architecture

- Global tokens live in `app/styles/design-system.css` (`--ng-*`). Legacy `--color-*` names in `app.css` reference the same canonical chain.
- **Isolation pattern:** each migration step gets its own scoped stylesheet using `.ng-*` classes only — no bare element selectors, no premium tokens outside deluxe. Enforced by `app/lib/cssArchitecture.test.ts` (fails on bare global element layout selectors in component stylesheets).
- Restyle-not-reimplement: shared commerce components are restyled via scoped descendant selectors under a wrapper class; component **logic is never touched**.

## Motion

- Single vocabulary in `app/lib/motion.ts` (`MOTION`, `DURATION`, `EASE`, `DISTANCE`, `STAGGER`, `prefersReducedMotion()`).
- `app/lib/useReveal.ts` — the one scroll-reveal hook (dynamic GSAP + ScrollTrigger, `fromTo` + `immediateRender:false` so content ships visible, `ctx.revert()` cleanup). Components declare `data-reveal-heading` / `data-reveal-item`; they never choose timing numbers.
- CSS hover/underline micro-interactions read `--ng-motion-*` so CSS and GSAP move at the same speed.

## Testing

- `npx vitest run` — 329 tests. Many are **source-string regression** tests (assert a route/component still delegates to the real Shopify logic and never reimplements cart/variant/price).
- `npx tsc --noEmit`, `npx eslint`, `npm run build` must all be green before commit.
