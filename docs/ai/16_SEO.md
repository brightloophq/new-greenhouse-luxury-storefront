# 16 — SEO Architecture

> Established by the "technical search foundation" sprint (branch
> `seo/technical-foundation`, 2026-08). Repository evidence wins over this doc.

## Metadata system

- Per-route React Router `meta()` exports. **No** `getSeoMeta`, **no** deprecated
  `<Seo/>`. Root sets brand-default title/description/OG/Twitter that apply to any
  route **without** its own `meta()` (a leaf `meta()` fully replaces root meta).
- Shared helpers live in **`app/lib/seo.ts`**:
  - `absoluteUrl(origin, path)` — origin + path, graceful relative fallback when
    origin is unknown.
  - `canonicalTag(origin, path)` — an absolute `<link rel="canonical">` descriptor.
  - `catalogueMeta({origin, path, title, description, image?})` — the full tag set
    (title, description, absolute self-canonical, OG, Twitter) for a catalogue route.
  - `organizationSchema(origin)` / `websiteSchema(origin)` — site-wide JSON-LD.
- `origin` is always the **request** origin (`new URL(request.url).origin`), passed
  through loader data. No production host is hard-coded, so preview and production
  self-canonicalise correctly.

## Canonical strategy

- **Absolute** canonicals everywhere (homepage, PDP, collections, flowers/family,
  catalogue routes).
- Catalogue canonicals point at the **clean base path** (e.g. `/retail/flowers`),
  so the facet params CatalogueView reads — `sort`, `minp`, `maxp`, `q`, `flower`,
  `color`, `occasion`, `channel`, `avail`, `cursor`, `direction` — never spawn a
  duplicate. `collections/$handle` already canonicalises faceted views to the base
  collection; catalogue routes now do the same via `catalogueMeta`.
- Regression: `app/lib/seo.test.ts` asserts the catalogue canonical contains no
  query string and no facet key.
- `rel="canonical"` is a **hint/signal**, not an absolute directive — Google may
  choose a different canonical. What we ship here *supports* de-duplication and
  *reduces* duplicate-URL ambiguity; the actual canonical Google selects must be
  confirmed in Search Console (URL Inspection) against the production domain.

## What this does and does not claim

This foundation provides **canonicalization signals** and **structured entity/site
semantics** that help search engines understand the business, the site and its
pages. It does **not** guarantee rankings or rich results, and it does not by
itself create any Google search feature. Structured data makes us **eligible**
for a rich result **only where Google actively supports that feature** and only
if its own quality/eligibility criteria are met — eligibility is decided by
Google, not by the presence of markup. Treat every search-feature outcome as
"verify in Search Console", not "delivered by this commit".

## Structured data

- **Site-wide** (rendered once in `app/root.tsx` `<head>`, nonce'd for CSP, so it
  survives whichever leaf `meta()` runs):
  - `Florist` (Organization/LocalBusiness) with a stable `@id` = `<origin>/#organization`,
    built only from `companyContent.ts` facts (name, address, email, primary phone,
    areaServed Kingston & St. Andrew, `sameAs` socials).
  - `WebSite` `@id` = `<origin>/#website`, `publisher` → the Florist `@id`, plus a
    `SearchAction` whose target is the **real** `/search?q=` endpoint (input
    `name="q"`). This is retained as **valid semantic markup only** — it describes
    that the site has an on-site search. It does **not** promise a Google SERP
    "sitelinks search box": Google **retired** that visual feature in **November
    2024**, so no such rendering should be expected from this markup.
- **PDP** (`products.$handle`): `Product` (+ stable `@id` `<url>#product`, `image`,
  `description`, `url`, `sku`, `brand`, `Offer` price/currency/availability — all
  live Shopify fields) and `BreadcrumbList`.
- `/flowers`: `ItemList`.

## Catalogue metadata strategy

Every **public** CatalogueView route (retail flowers/supplies, supplies +
category, arrangements hub/mixed/occasion/premium-deluxe) emits a unique title,
a unique natural-language description, an absolute self-canonical and OG tags via
`catalogueMeta`. Copy is factual and location-aware (Kingston & St. Andrew,
Jamaica) with no superlatives or unsupported delivery claims.

**Wholesale catalogue routes are deliberately excluded** — they are trade-gated
(non-approved visitors are 302'd to `/wholesale`), so their product pages are not
publicly crawlable and must not be treated as indexable retail pages.

## Indexation

- `robots.txt` (custom route) disallows `/cart`, `/account`, `/search`; references
  the sitemap. `sitemap.xml` uses Shopify `getSitemapIndex`/`getSitemap`.
- `noindex`: `/search` (noindex,follow), `/cart` (noindex,follow — added this sprint),
  `/internal/wholesale/review` (noindex,nofollow), `/design-system` (noindex).

## Deferred (intentionally NOT implemented — do not fabricate)

- **GTM / GA4** — no `GTM-*`/`gtag`/`dataLayer` in code yet. Planned: consent-gated,
  nonce-safe GTM (`GTM-T76LM64K`) bridging Shopify Analytics events → dataLayer.
- **`openingHoursSpecification`** — pending verified business hours (absent from
  `companyContent.ts`; do not guess).
- **FAQPage schema** — pending verified FAQ content.
- **Review / AggregateRating schema** — pending verified review provenance.
- **Shopify content** — product/collection SEO titles/descriptions, image alt text,
  and collection descriptions are admin content work, not code.
- **Live Search Console validation** — canonicals/schema/sitemap require validation
  against the production domain (blocked from the sandbox; owner/browser task).
