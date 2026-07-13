# Dual-Experience QA (Phase 8)

Verified against the **production build** (`npm run build` + `npm run preview`,
Mini-Oxygen). Both experiences exercised: no cookie (Classic default) and
`Cookie: ng_experience=deluxe`.

> Note: the in-app browser blocks `localhost` navigation in this environment, so
> rendering was verified via server-rendered HTML (curl) and code inspection
> rather than screenshots. Visual spot-check on a real browser is recommended
> before go-live.

## Gate

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors |
| `npm test` | ✅ 13 passed |
| `npm run build` | ✅ success |

## Route × experience — HTTP status

All routes return identical status in both experiences (no experience-gated
availability). `/account/login` 302 → Shopify customer-account auth (expected).

`/` · `/collections` · `/collections/all` · `/collections/bulk-flowers` ·
`/collections/all-flowers` · `/collections/all-flowers?flower=roses-in-stock` ·
`/products/:handle` · `/cart` · `/search?q=` · `/pages/wedding-events` ·
`/pages/about-us` · `/policies` · `/blogs` → **200 / 200**.
`/account/login` → **302 / 302**.

## Experience state & SSR

| Check | Result |
|---|---|
| `data-experience` on `<html>` (no cookie) | ✅ `classic` on all routes |
| `data-experience` (deluxe cookie) | ✅ `deluxe` on all routes |
| First-paint palette (no hydration flash) | ✅ SSR value == provider seed (root loader) |
| Entry `/classic`, `/deluxe` | ✅ 302 + `Set-Cookie: ng_experience=…` |
| Entry nested `/classic/collections/bulk-flowers` | ✅ 302 → clean URL, cookie set |
| Entry query preserved `/deluxe/collections/roses?flower=x` | ✅ query carried through |
| Toggle labels | ✅ exactly "Classic" / "Deluxe" |

## Cart safety

| Check | Result |
|---|---|
| Switching writes only `ng_experience` | ✅ `setExperience` touches no cart/session state |
| Cart route/components experience-gated? | ✅ No (0 functional refs; one copy string only) |
| Add-to-cart present on PDP both experiences | ✅ Yes |

## SEO

| Check | Result |
|---|---|
| Homepage title differs per experience | ✅ wholesale vs luxury |
| PDP canonical | ✅ `<link rel="canonical" href="/products/:handle">` |
| Collection canonical (filtered → base) | ✅ `?flower=…` canonicalizes to `/collections/:handle` |
| Pages / flowers canonicals | ✅ all render as `<link rel="canonical">` |
| `robots.txt` / `sitemap.xml` | ✅ 200 / 200 |

**Fix applied this phase:** canonicals on PDP, collections, `/flowers`,
`/flowers/:family`, `/pages/about-us`, `/pages/wedding-events`,
`/pages/corporate-flowers` were rendering as `<meta rel="canonical">` (ignored by
crawlers). Corrected to `<link rel="canonical">` via `tagName: 'link'`, and a
base-collection canonical was added for faceted collection views.

## Accessibility

| Check | Result |
|---|---|
| Single `<h1>` per page | ✅ homepage / collection / PDP |
| `<html lang="en">` | ✅ |
| Skip-to-content (`sr-only`) | ✅ present |
| Images without `alt` | ✅ 0 |

## Responsive

| Check | Result |
|---|---|
| `<meta name="viewport">` | ✅ `width=device-width, initial-scale=1` |
| Breakpoints in `experience.css` | ✅ 1100 / 1280 / 1536px / 45em |
| Global overflow guard (`max-width:100%` on media) | ✅ present |
| Grid CLS-safety (`minmax(0,1fr)` preserved) | ✅ both templates |

## Residual / recommended before go-live

- Real-browser visual pass at 320 / 768 / 1280 / 1920 in both experiences.
- If a **shared** collection ever needs per-experience filtering, wire the
  `custom.experience` metafield per `DUAL_EXPERIENCE_METAFIELDS.md` §4.
- Connect a production domain, then update `{SHOP}` links per
  `MAIN_WEBSITE_COMMERCE_LINKS.md`.
