# Classic Experience — Source-of-Truth Extraction (Main Website)

**Purpose:** extract the exact Classic (green) design system from the live main-website build so the Hydrogen storefront's **Classic** experience matches it 1:1. **Deluxe stays on the established storefront system** (black #090909 / champagne-gold #C8A96A / charcoal #222 / warm-ivory #FAF8F4) — the main site is used **only** as the Classic reference.
**Status:** audit only — no implementation until confirmed. The ZIP/main-site source was not modified.

---

## 1. Files inspected (from `thenewgreenhousedist (4).zip`)

| File | Bytes | What it gave us |
|---|---|---|
| `assets/index-YPAvfo88.css` | 15,450 | **Entire design system** — CSS variables (both themes), typography, radii, shadows, transitions, buttons, toggle, nav, breakpoints, animations. |
| `index.html` | — | Google Fonts link, `<title>`, meta. |
| `assets/index-CXUbmz_g.js` | — | React SPA — routes, nav labels, `data-theme` toggle logic, localStorage persistence. |
| `assets/logo-classic.svg` | — | Classic circular "New Greenhouse" mark (greens #146B39 / #0D4B27). |
| `assets/favicon.svg` | — | Favicon. |
| `assets/video/hero-home.{webm,mp4}` | — | Cinematic homepage hero video. |
| `assets/README.md` | — | Asset manifest (image/video filenames + `ImageSlot` fallback convention). |

**Theme mechanism found:** `<html data-theme="classic|deluxe">`, default **classic**, persisted to **localStorage** (`getItem(...)==="deluxe"?"deluxe":"classic"`). The Hydrogen build already mirrors this exactly with a cookie (SSR-safe) + `data-experience` — see `docs/DUAL_EXPERIENCE_AUDIT.md`.

---

## 2. Exact colour values

Base `:root` = **Deluxe** on the main site; `:root[data-theme=classic]` overrides to **Classic**. We adopt **only the Classic column**.

### Classic (green) — the values we will use
| Token (main site) | Hex | Role |
|---|---|---|
| `--dark` | **#0F3D26** | forest — header/footer/inverse surface |
| `--dark-2` | **#123A24** | surface |
| `--dark-3` | **#16452C** | surface / strong text |
| `--dark-4` | **#1B5033** | raised surface |
| `--dark-5` | **#0A2C1B** | deepest / active-toggle text |
| `--cream` | **#F4FBF6** | page background (green-cream) |
| `--cream-2` | **#E8F5EC** | muted surface |
| `--gold` (accent) | **#3FAE63** | **accent — leaf green** (all "gold" CTAs/borders become green) |
| `--gold-light` | **#6FCB8D** | accent hover / soft |
| `--text-body-light` | **#33463B** | body text on cream |
| `--text-label-light` | **#6E8478** | labels |
| `--text-faint-dark` | **#7FA98F** | faint text on dark |
| `--text-muted-dark` | **#B9D9C4** | muted text on dark |
| `--nav-bg-idle` | rgba(15,61,38,.04) | header at top |
| `--nav-bg-scrolled` | rgba(15,61,38,.92) | header on scroll |
| `--nav-border-idle / scrolled` | rgba(63,174,99,.15 / .25) | header border |
| `--overlay-tint-1/2/3` | rgba(15,61,38,.2) / rgba(15,61,38,.4) / rgba(10,44,27,.8) | image overlays |
| `--overlay-vignette` | rgba(63,174,99,.18) | hero vignette |
| `--accent-weak / translucent / strong` | rgba(63,174,99,.14 / .32 / .5) | tints |
| `--ambient-glow` | rgba(63,174,99,.09) | ambient |
| `--white` | #FFFFFF | (shared) |
| `--whatsapp` | #25D366 | (shared) |
| Classic logo greens | #146B39 fill, #0D4B27 stroke | `logo-classic.svg` only |

### Deluxe (main site, for reference — **NOT adopted**; storefront keeps #090909/#C8A96A)
`--dark #1A1714 · --gold #C8953A · --gold-light #E5C46A · --cream #F5F0E8 · --cream-2 #EDE7DC · --text-body-light #5A544E`. *(Noted only to document the divergence; per your instruction Deluxe remains the established storefront palette.)*

---

## 3. Typography (exact)

- **Fonts loaded** (`index.html` → Google Fonts): **Cormorant Garamond** `ital,wght@0,300;0,400;0,500;0,600;1,300;1,400` (serif display) + **DM Sans** `wght@300;400;500` (sans body).
- Token names: `--font-serif: "Cormorant Garamond", serif` · `--font-sans: "DM Sans", sans-serif`.
- **Weights used:** 300 / 400 / 500 only (light → medium; **no bold**).
- **Display sizes:** hero `clamp(44px, 7vw, 96px)`; section head `clamp(36px, 4.5vw, 54px)` (serif).
- **Label treatment:** `text-transform: uppercase` with wide tracking `letter-spacing: .1em / .18em / .22em / .3em` (editorial) in DM Sans 500.

**Storefront today:** Cormorant Garamond (✅ matches) + **Inter** (❌ main site uses **DM Sans**). → **Decision needed** (§8).

---

## 4. Spacing, radii, shadows, motion (exact)

- **Radii:** the site uses **`border-radius: 999px` (pills) only** — buttons/toggle are pills, **cards and sections are sharp (0 radius)**. This is a defining Classic trait.
- **Shadows:** `0 2px 24px #1a17140f` (subtle), `0 12px 40px #1a17141f` (soft lift), `0 8px 24px #00000059` (strong/overlay). (Tinted with the dark base; will be re-tinted green for Classic.)
- **Motion:** master easing `--ease: cubic-bezier(.22, 1, .36, 1)`; base transition `all .24s`. Signature animations: `cinematicZoom` (hero ken-burns 28–32s), `heroReveal` (1s), `mobileMenuIn` (.38s), `mobileLinkIn` (.52s), `tngScrollLine` (scroll indicator). Respects `prefers-reduced-motion`.
- **Spacing:** no numeric spacing-scale variables — spacing is per-component (generous editorial padding, e.g. buttons `18px 44px`). We keep the storefront's `--ng-space-*` scale and match visual rhythm.

---

## 5. Reusable components identified

| Component | Main-site CSS | Notes for Classic |
|---|---|---|
| **Buttons** | `.btn` (padding 18px 44px, DM Sans 500, sharp), `.btn-solid` (bg `--gold`, white text, hover → `--gold-light`), with a diagonal **shine sweep** `:after` on hover. | Sharp rectangular; primary = green fill in Classic. |
| **Theme toggle** | `.theme-toggle` (pill, bg `#7f7f7f24`, border `--accent-translucent`), `.theme-toggle__thumb` (**sliding pill thumb**, `background: var(--gold)`, animated), `.theme-toggle__option(.is-active → color var(--dark-5))`. | **Sliding-pill toggle with a gold/green thumb** — adopt this exact style over my draft two-button version. |
| **Header / nav** | transparent at top → `--nav-bg-scrolled` (dark .92) with backdrop on scroll; `.nav-toggle` burger on mobile. | Matches storefront's `is-solid`-on-scroll behaviour. |
| **Mobile menu** | `.mobile-menu-overlay`, `mobileMenuIn`/`mobileLinkIn` animations. | Accordion-style drawer (storefront already has this). |
| **Hero** | `.hero-video` + `.cinematic-zoom`, gradient + vignette overlays, `tngScrollLine` scroll cue. | Cinematic video hero. |
| **ImageSlot** | (JS) requests `/assets/<id>.jpg`, styled placeholder fallback. | Same drop-in pattern the storefront flower pipeline uses. |
| **Logo** | `logo-classic.svg` circular mark, shown beside the wordmark in Classic mode. | Adopt for Classic header. |

---

## 6. Responsive rules identified

- **Breakpoints:** `max-width: 640px`, `max-width: 768px`, **`min-width: 920px`** (desktop), `prefers-reduced-motion`.
- Desktop nav appears at **≥920px** on the main site. **Storefront uses ≥1100px** (chosen + QA'd for the mega-menu). → **Decision needed** (§8): keep 1100 (recommended, already responsive-tested) or align to 920.
- Fluid type via `clamp()`; mobile menu is an overlay drawer.

---

## 7. Conflicts / duplicate theme implementations

- **On the main site:** clean — one `data-theme` system, two palettes, no duplicate/conflicting theme state. Good model.
- **Between main site and storefront:**
  1. **Sans font:** DM Sans (main) vs Inter (storefront).
  2. **Desktop breakpoint:** 920px (main) vs 1100px (storefront).
  3. **Deluxe palette:** #1A1714/#C8953A (main) vs #090909/#C8A96A (storefront, **kept**).
  4. **Radii:** pill-only/sharp (main) vs mixed rounded (storefront) — Classic should go sharp.
  5. **Toggle:** sliding-pill thumb (main) vs my draft two-button (storefront) — adopt the main-site style.
  6. **Commerce links:** the main site's buttons currently point to **internal routes** (`/wholesale`, `/premium-flowers`, `/gifts-bouquets`, `/moments`, `/supplies`, `/events`, `/story`, `/contact`) — **no `shop.` / `/collections/` Shopify links exist yet**. The Shopify deep-link map is therefore *new work*, not extractable.

---

## 8. What will be COPIED / ADAPTED / EXCLUDED

**Copied exactly (Classic only):**
- The full Classic colour set (§2) → the storefront's `[data-experience="classic"]` token overrides. *(My draft `experience.css` already used these exact greens — confirmed correct.)*
- Easing `cubic-bezier(.22,1,.36,1)`, pill/sharp radius language, uppercase wide-tracked labels, DM Sans/Cormorant type roles, sliding-pill toggle style, sharp buttons with hover shine, cinematic hero + scroll cue, `logo-classic.svg`.

**Adapted:**
- Colours mapped onto the storefront's `--color-greenhouse-*` / `--ng-*` token names (so all existing components re-theme with no rewrite).
- Shadows re-tinted from the dark base to green for Classic.
- Motion/animation matched using the storefront's existing primitives.

**Excluded / not adopted:**
- The main site's **Deluxe** palette (storefront keeps the established black/champagne system).
- Nothing copied verbatim as code (the main site is React SPA / different stack) — we replicate the *design*, not the source.

**Requires your confirmation before I build (Decisions):**
1. **Sans font for Classic** — adopt **DM Sans** to match the website (recommended for continuity), or keep Inter?
2. **Deluxe font** — keep Inter, or move both experiences to DM Sans?
3. **Desktop nav breakpoint** — keep storefront **1100px** (recommended) or align to the site's 920px?
4. **Card corners in Classic** — go **sharp** (match site) — confirm?
5. **Toggle style** — adopt the **sliding-pill gold-thumb** toggle — confirm?
6. **Classic logo** — use `logo-classic.svg` in the Classic header — confirm (and will you send the final vector, per the README it's a recreation)?

---

*Extraction complete. No storefront code was changed in this pass beyond the earlier draft foundation, which will be reconciled to the values above once you confirm. I will not resume implementation until you approve this Classic design system.*
