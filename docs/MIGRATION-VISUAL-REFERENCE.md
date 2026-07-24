# Mockup UI migration — visual reference

The six mockup HTML files supplied for this migration are the **permanent visual
reference** for every sprint. They are studied for *principles*, never copied.
This document records what each teaches, and — critically — how it is reconciled
with the brand rules and approved content that already govern the storefront.

The **approved homepage** (`fb96035`, the Step-3 result) is the live benchmark:
every inner page must feel like the same greenhouse the moment a customer arrives
from it. When a mockup and the homepage disagree, the homepage wins.

## Reference files

| File | Surface it informs |
|---|---|
| `greenhouse-about.html` | About / heritage |
| `greenhouse-retail.html` | Retail landing (Flowers / Supplies split + cross-sell) |
| `greenhouse-supplies.html` | Supplies landing (bento grid + trade note) |
| `greenhouse-arrangements.html` | Arrangements (charcoal+gold premium band, mixed/occasion duo, occasion grid) |
| `verdant-login-modal.html` | Wholesale authentication popup |
| `verdant-homepage_2.html` | Cross-surface vocabulary (nav, premium band, dark footer) |

## The design language taken from them

- **Header** — two tier: socials · centred wordmark · icons/sign-in/cart, then a
  centred letter-spaced nav row with an About dropdown. *Already built.*
- **Interior hero** — breadcrumb "← Home · X", italic eyebrow, oversized title, a
  right-side intro plus a meta row of small-label / bold-value trios.
- **Retail** — two large image-led split panels (Flowers / Supplies) with a
  gradient scrim, kicker, tag pills, an underline CTA, and a cross-sell strip to
  wholesale.
- **Supplies** — a bento grid: one tall feature tile plus smaller ones, each an
  image with a foot scrim, and a trade-rates row.
- **Arrangements** — a distinct **charcoal + gold** "Premium · Deluxe" feature
  band, a Mixed/Occasion duo, an occasion icon sub-grid, a green closer.
- **About** — a centred grand heritage hero, prose, a monogram divider, a
  **dark-green archive timeline** (gold years/dots), a 2×2 beliefs grid, a closer.
- **Auth popup** — a two-panel modal: a green pitch aside with perks, and a
  right-side Log in / Sign up form with a Personal/Trade segmented control.
- **Footer** — forest-green four-column (brand / Shop / Company / Trade) + a
  bottom bar. *Already matches the Step-3 footer.*

The mockup greens (`#2F4B37`, `#4C7C4F`, sage, cream, `#DFC694` gold) are
effectively the existing tokens, so components keep using **our tokens**, never
the mockup hexes.

## Conflicts — resolved in favour of the locked rules

1. **Fonts.** Mockups use Fraunces + Jost/Karla; production is **Montserrat +
   Raleway** (Step 1). Take the typographic *behaviour* (italic accent word,
   oversized display, letter-spaced eyebrows), never the faces.
2. **"Verdant"** is a placeholder brand. Everything stays **The New Greenhouse**
   with our real copy; the "one garden, every way to buy" line is not used.
3. **Homepage layout.** The Verdant homepage's four equal pillar cards are *not*
   adopted — the approved homepage deliberately uses asymmetric image-led panels.
   These files drive the *inner* pages.
4. **Auth logic.** Adopt the modal's visual language only; keep the existing
   `WholesaleAuthModal` behaviour and real Customer Account capability. Do not add
   "Continue with Shop" or a Personal/Trade split unless the real flow supports it.
5. **About content.** Use the mockup's *layout*, but keep the **approved About
   copy** — weddings and corporate were deliberately de-scoped, and the founding
   year follows the existing approved content ("Est. 1984"), not the mockup's
   1983. Never re-introduce de-scoped claims or placeholder statistics.

## Per-page scoping notes (so a sprint never bleeds into another)

- The shopping listings (`/retail/*`, `/wholesale/*`, `/supplies/*`,
  `/arrangements/*`) all render **one shared `CatalogueView`**. `variant="retail"`
  is shared by Retail *and* Arrangements, so retail-only styling is scoped by
  **`context`** (`retail-flowers` / `retail-supplies`), never by variant.
- Premium / Deluxe styling activates **only** under
  `html[data-experience="deluxe"]` (the `/arrangements/premium-deluxe` route).
