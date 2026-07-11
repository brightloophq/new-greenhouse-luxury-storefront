# Milestone 3 — Global Shell ✅ COMPLETE (2026-07-11)

**Goal:** Replace the default Hydrogen shell with a luxury editorial shell, every part consuming the M2 library. **Do not touch product or collection layouts.**

## Deliverables
1. Premium announcement bar
2. Sticky nav, translucent at top → solid on scroll
3. Mega menu (Occasions + Wholesale, driven by real collections)
4. Redesigned search overlay
5. Luxury cart drawer
6. Editorial footer
7. Newsletter section
8. Contact strip
9. Responsive mobile navigation

## Architecture
- New `ng-shell-*` / `ng-drawer-*` / `ng-mega-*` class namespace in a new `app/styles/shell.css` (loaded after components.css). Avoids old shell selectors (`.header`, `.footer`, `.overlay`, `<aside>`), so legacy shell CSS in app.css goes dead (M11 cleanup) with zero conflict.
- Files rewritten: `Header.tsx`, `Footer.tsx`, `PageLayout.tsx`, `Aside.tsx` (enhanced). New: `app/lib/useScrolled.ts`, `app/styles/shell.css`.
- Scroll behavior via a small client hook (`useScrolled`); SSR renders top state.
- Real store data: menus, 11 collections, pages (about-us, contact, wedding-events, corporate-flowers, delivery-information, faq).

## Guardrails
- Cart drawer = tasteful chrome/presentation restyle only; deep cart logic is M6.
- Search overlay = restyle chrome + input; keep predictive-search logic.
- No product/collection page layouts touched.

## Deliverables — all complete
1. ✅ Premium announcement bar (collapses on scroll)
2. ✅ Sticky nav — translucent (68% for AA) → solid on scroll (`useScrolled`)
3. ✅ Mega menu (Occasions + The Collection + Wholesale & Trade columns + featured card) from real collections; hover + click + keyboard, `aria-expanded`, Esc-close
4. ✅ Redesigned search overlay (top drawer, large serif input, predictive results, autofocus)
5. ✅ Luxury cart drawer (right drawer, scrim, scroll-lock, Esc, focus mgmt; CartMain reused)
6. ✅ Editorial footer (4-column, dark) — built by parallel builder
7. ✅ Newsletter section (in footer)
8. ✅ Contact strip (phone/mail/map-pin/clock via Icon + TrustGrid)
9. ✅ Responsive mobile navigation (left drawer, Accordion for occasions/collection/wholesale, account + contact)

## Files
- Rewritten: `Header.tsx`, `Footer.tsx`, `PageLayout.tsx`, `Aside.tsx`; `root.tsx` (+shell.css link).
- New: `app/lib/useScrolled.ts`, `app/styles/shell.css` (+@imports `shell/footer.css`).
- Namespace: `ng-shell-*` / `ng-drawer-*` / `ng-mega-*`. Old shell CSS in app.css now dead (M11 cleanup) — zero conflict.

## Verification (live against real store)
- Header sticky; `is-solid` toggles on scroll (verified scrollY 500 → true); announcement collapses.
- Contrast: ivory header text over light-page nav = **7.01** (AA/AAA); over dark hero fine.
- Mega menu: opens on click (`aria-expanded=true`, 15 links, 3 columns visible); Esc closes.
- Drawers: cart/search/mobile all open, scrim + Esc close, body scroll-lock on/off, Tab focus trap.
- **Focus management**: search → input focused; cart → close button; mobile → inside drawer (fixed a duplicate `data-autofocus` bug).
- Fonts/tokens: Cormorant logo & headings, gold accents.
- `typecheck` ✓ · `build` ✓ (shell.css 17 kB) · `eslint` ✓. Only pre-existing `PUBLIC_CHECKOUT_DOMAIN` analytics warning.

## Guardrail honoured
No product or collection page layouts touched. Cart drawer = chrome/presentation only (deep cart = M6). Search = chrome only (predictive logic untouched).

## Follow-ups (not blocking)
- Newsletter form + social links are UI-only (need endpoint/real URLs — M9), flagged with TODOs.
- `MEGA_COLUMNS`/`PRIMARY_NAV` are curated in Header.tsx (real Shopify menu "Occasions" links to `#`); revisit if the store's menu structure is finalised.

## Progress log
- 2026-07-11: M2 complete. M3 started; footer built by parallel builder, shell core built + verified live. **M3 complete.**
