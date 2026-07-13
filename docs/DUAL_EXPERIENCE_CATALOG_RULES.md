# Dual-Experience Catalog Rules

How **one** Shopify catalogue serves **two** curated experiences (Classic /
Deluxe) over a single Admin, product DB, inventory, cart and checkout.

## The one commerce engine (never forked)

| Concern | Behaviour |
|---|---|
| Products | One product record per SKU. Never duplicated per experience. |
| Inventory / price | Single source. The experience never alters price or stock. |
| Cart | One cart. Switching experience **never** clears or mutates it (see below). |
| Checkout | Shopify checkout, shared, untouched. |
| Queries | One set of Storefront loaders/fragments per route, shared by both experiences. |

## What the experience actually changes

Only **presentation + merchandising**:

- **Theme** — `[data-experience]` overrides the `--color-greenhouse-*` primitives
  (green Classic vs black/gold Deluxe). No component/token rename.
- **Navigation** — `app/lib/navigation.ts` → `navFor(experience)` returns a
  different primary nav, mega-menu, and footer per experience.
- **Homepage** — `app/lib/homeContent.ts` → `HOME_CONTENT[experience]` drives one
  set of homepage components with different copy, cards, rails and testimonials.
- **Collection template** — same route/loader; `[data-experience]` CSS switches
  density (Classic = denser catalogue grid; Deluxe = editorial). Hero eyebrow
  copy differs (`Wholesale Flowers` vs `The Signature Collection`).
- **PDP** — same variant/cart/checkout; per-experience assurances, a
  trade-pricing note (Classic) vs gift-message note (Deluxe), story label, and
  layout density.
- **SEO** — distinct homepage `<title>`/description per experience; canonical
  stays `/` (no duplicate-content route).

## State & routing

- Source of truth: cookie `ng_experience` (`classic` | `deluxe`, default
  `classic`), read SSR via `getExperienceFromRequest` and rendered as
  `<html data-experience>` — correct palette on first paint, no hydration flash.
- Entry routes `/classic` and `/deluxe` (+ any nested path) are intercepted in
  `server.ts` **before** routing: they set the cookie and 302 to the clean
  canonical URL (path + query preserved). Used for marketing deep-links from the
  main website (see `MAIN_WEBSITE_COMMERCE_LINKS.md`).
- Toggling in-session writes the cookie **and** flips
  `document.documentElement.dataset.experience` for an instant, reload-free
  re-theme. It touches **no** cart/session state.

## Classification (`custom.experience`)

- Values `classic | deluxe | both`; unset ⇒ treated as `both` (fail-open).
- Today the storefront routes by **collection handle + nav**, not by this
  metafield — so it is a merchandising spec, not a runtime dependency. Full
  table + runbook in `DUAL_EXPERIENCE_METAFIELDS.md`.

## Non-negotiable guarantees

1. Every product stays buyable in **both** experiences via `/products/<handle>`,
   search and cart — classification only affects *where it is surfaced*, never
   *whether it can be bought*.
2. Switching experience must never clear the cart. Enforced by construction:
   `setExperience` writes only the `ng_experience` cookie
   (`app/components/ExperienceProvider.tsx`); cart lives in the separate Shopify
   session cookie and is never read/written by experience code.
3. No route is experience-gated for availability — both experiences return the
   same HTTP status for every route (verified, `DUAL_EXPERIENCE_QA.md`).
