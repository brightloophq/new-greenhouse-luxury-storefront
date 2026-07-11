# SEO Status

**Method:** Code-based audit of `app/routes/*` meta/SEO surface + **live Storefront API** SEO fields (`ax41k1-k5.myshopify.com`, `2026-04`, 2026-07-11).

## Live Shopify SEO fields (audited)
- **Products:** 0 products → no product SEO to grade (blocked until catalog populated).
- **Collections (12):** every collection's `seo.title` and `seo.description` are **null**. Only "Luxury Bouquets" has any description at all.
- **Pages (6):** every page's `seo` is **null** and bodies are empty.
- **Shop:** `description` null; `brand.slogan`/`shortDescription` null → no shop-level SEO/OG defaults from Shopify.
- **Net:** Shopify provides **no** usable SEO metadata today; all titles/descriptions/structured data must come from the storefront code (below) **and** owner-entered Shopify SEO fields.

## Meta title coverage
| Route | Title | Grade |
|---|---|---|
| `_index` (home) | `The New Greenhouse \| Luxury Florist in Kingston, Jamaica` | ✅ Branded + keyworded |
| `collections._index` | `Luxury Floral Collections \| The New Greenhouse` | ✅ Branded |
| `collections.$handle` | `{collection.title} \| The New Greenhouse` | ✅ Branded (dynamic) |
| `products.$handle` | `{seo.title \|\| title} \| The New Greenhouse` | ✅ Branded (+ description + canonical) |
| `collections.all` | `Hydrogen \| Products` | ❌ Scaffold |
| `blogs._index` | `Hydrogen \| Blogs` | ❌ Scaffold |
| `blogs.$blogHandle.*` | Hydrogen-prefixed | ❌ Scaffold |
| `pages.$handle` | `Hydrogen \| {page.title}` | ❌ Scaffold |
| `policies.$handle` | `Hydrogen \| {policy.title}` | ❌ Scaffold |
| `search` | `Hydrogen \| Search` | ❌ Scaffold |
| `cart` | `Hydrogen \| Cart` | ❌ Scaffold |
| `account.*` (orders/profile/addresses) | present, non-branded | ⚠ Inconsistent |
| `collections._index` account/others without meta | — | see below |

**Routes with NO `meta` export at all:** `$` (404), `account.tsx`, `account._index`, `account.$`, `account_.login/authorize/logout`, `cart.$lines`, `discount.$code`, `policies._index`, `($locale).tsx`, sitemap/robots. (Some are non-indexable and fine; **`policies._index` and the 404 should have titles.**)

## Meta description
- ✅ **Home** — full keyworded description.
- ✅ **PDP** — from `seo.description \|\| descriptionHtml` (strip) + canonical link.
- ❌ **Everywhere else** — no `<meta name="description">` (collections list/all, blogs, pages, policies, search).

## Structured data (JSON-LD)
- ❌ **None anywhere.** No `application/ld+json`, no `schema.org`. Missing: `Organization`/`LocalBusiness` (critical for a Kingston florist — NAP, geo, hours), `Product` + `Offer` (rich results / price / availability), `BreadcrumbList`, `Article` (blog), `FAQPage`.

## Social / canonical
- ❌ No Open Graph (`og:*`) tags anywhere → poor link previews on WhatsApp/IG/FB (primary channels for a JM florist).
- ❌ No Twitter card tags.
- ⚠ Canonical only on PDP; missing on collections, pages, blog, home.
- ✅ Favicon + `preconnect` to `cdn.shopify.com` / `shop.app` present.

## Crawlability
- ✅ `[robots.txt]` route present (Hydrogen default).
- ✅ `[sitemap.xml]` + `sitemap.$type.$page[.xml]` present (Hydrogen dynamic sitemaps).
- ⚠ Locale routing (`($locale)`) with no `hreflang` tags — fine while single-locale, revisit if markets expand.
- ⚠ PDP variant navigation deliberately uses JS buttons (not indexable links) to avoid duplicate indexing — correct, keep.

## Keyword strategy (CLAUDE.md targets)
Brief targets: *luxury florist, wholesale flowers, wedding flowers, corporate flowers, florist supplies, Jamaica, Kingston.*
- ✅ Home title/description hit luxury florist + Kingston + Jamaica.
- ❌ **"Wholesale"** keyword appears in **no** meta anywhere — despite being the core positioning.
- ❌ No wedding/corporate/supplies landing pages to rank for those terms (no routes exist).

## SEO fix backlog (feeds M9 content + M11 hardening)
1. Replace all `Hydrogen | …` scaffold titles with branded, keyworded titles.
2. Add meta descriptions to every indexable route.
3. Add JSON-LD: `LocalBusiness`/`Organization` (site-wide), `Product`+`Offer` (PDP), `BreadcrumbList`, `Article`, `FAQPage`.
4. Add Open Graph + Twitter card tags (site-wide defaults + per-page overrides), incl. a branded OG image.
5. Add canonical tags to collections, pages, blog, home.
6. Build wholesale/wedding/corporate landing pages to capture those keywords.
7. Title/description on `policies._index` and a branded 404.
8. Preserve existing Hydrogen SEO (sitemaps, robots, variant JS-nav) — do not remove.

**Complexity:** titles/descriptions = S; structured data + OG + landing pages = M (M9/M11).
