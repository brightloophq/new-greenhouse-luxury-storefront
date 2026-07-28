# 02 — Design System

## Tokens (`app/styles/design-system.css`, themed in `experience.css`)

- **Greens:** `--ng-green`, `--ng-green-deep`, `--ng-green-muted`, `--ng-green-faint`, `--ng-green-line`, `--ng-green-pressed`, `--ng-green-soft`.
- **Grounds:** `--ng-ground-warm`, `--ng-ground-sage`, `--ng-ground-panel`, `--ng-ground-tint`.
- **On-green text:** `--ng-on-green`.
- **Gold (champagne accent, fixed — NOT re-themed):** `--ng-gold`, `--ng-gold-pale`. Distinct from `--ng-gold-text` / `--ng-color-luxury-gold` which **are** re-themed to green in classic.
- **Glass lines:** `--ng-glass-line`, `--ng-glass-line-strong`, `--ng-glass-joint`.
- **Premium (deluxe only):** `--ng-premium-ground/surface/tint/line/text/text-muted`. Never use outside `[data-experience='deluxe']`.
- **Motion:** `--ng-motion-hover`, `--ng-motion-ease`, `--ng-motion-card`.

## Radius — IMPORTANT

The editorial identity is **soft**: `--ng-radius-xs/sm/md/lg = 2/4/6/10px` (base). Classic previously **zeroed** these in `experience.css`; that override was removed so every token-driven corner (cards, buttons, inputs, chips, steppers) is soft and consistent store-wide. Editorial pages also hard-code `3px` (controls) / `4px` (panels) — treat `3–4px` as "one soft corner."

## Buttons — one family

Driven by `--ng-btn-*` tokens (re-themed per experience): `--ng-btn-primary-bg`, `--ng-btn-primary-fg`, `--ng-btn-primary-bg-hover`, `--ng-btn-radius`, `--ng-btn-weight`, `--ng-btn-tracking`.

- Canonical component: `app/components/ui/Button.tsx` → `.ng-button*` (primary/secondary/outline/ghost/text). Used by catalog cards, search, cart drawer.
- Editorial filled CTAs (cart checkout, PDP add-to-cart, `.ng-search-submit`, etc.) point at the same tokens → green-deep, Montserrat, colour-only hover (no lift), unified radius.
- The **editorial-link** tier (text + animated rule, e.g. `.ng-hero-cta`) is a deliberate named variant, not an inconsistency.

## Signature primitives

- **`GlasshouseDivider`** (`.ng-glaze-rule` + `.ng-glaze-node`) — the glazing-bar seam that replaces `<hr>` between sections. Used site-wide (PDP, cart, search overlay, informational).
- **`EditorialSectionHeader`, `EditorialPanel`** — shared editorial building blocks (`app/components/editorial/`). A cross-sell rail is also used in places (e.g. informational pages via `.ng-info-cta`).
- **`.ng-image-frame`** — the standard image container: `overflow:hidden`, soft radius, `:hover > img { scale(1.04) }` (unified store-wide; reduced-motion guarded).
- **Loading language:** `.ng-loading-glaze` — a single champagne pass of light along a 1px glazing bar; indeterminate, never fakes progress; used by cart drawer + predictive search. Reduced-motion → light rests.

## Typography

- Display/headings: **Montserrat** (`--ng-font-heading`, self-hosted variable).
- Body: **Raleway** (`--ng-font-body`, self-hosted variable).
- Eyebrows/kickers: caption size, wide tracking, uppercase; green in classic.

## Rules

- No bare element selectors in component stylesheets (guard test).
- Fonts only ever `var(--ng-font-heading|body)`.
- No premium tokens outside deluxe.
- Respect `prefers-reduced-motion` on every animation.
