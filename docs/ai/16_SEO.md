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

## Commercial on-page (Sprint 2)

### Route → search-intent map
Every public page family is mapped to a dominant intent; metadata is written to match it (no keyword stuffing, no doorway/location pages).

| Route family | Intent | Metadata home |
|---|---|---|
| `/` | Brand + local ("florist Kingston Jamaica") | `($locale)._index` |
| `/retail`, `/retail/flowers`, `/retail/supplies` | Transactional retail | route `meta` via `catalogueMeta` |
| `/supplies`, `/supplies/:category` | Transactional supplies | `catalogueMeta` |
| `/arrangements` + `mixed`/`occasion/:occasion`/`premium-deluxe/:category` | Commercial-investigation → transactional | `catalogueMeta` |
| `/flowers`, `/flowers/:family` | Informational guide (variety discovery) | `pageMeta`/`canonicalTag` + `ItemList` |
| `/wholesale` | Trade / B2B entry | `catalogueMeta` (landing only; product pages stay gated) |
| `/products/:handle` | Transactional (product) | route `meta` + `Product`/`Breadcrumb` |
| `/blogs`, `/blogs/*` | Informational (top-of-funnel) | Shopify blog + route `meta` |
| `/pages/*` (about-us, contact, delivery-information) | Informational / local trust | `pages.$handle` + dedicated routes |

### Breadcrumbs
`breadcrumbSchema(origin, items)` emits `BreadcrumbList` JSON-LD from the route
hierarchy (Home → parent → current). Applied to every public catalogue route via
`catalogueMeta({..., breadcrumbs})`. Positions are 1-based; item URLs are absolute.
Purely navigational — carries no business facts. `catalogueMeta` output is
byte-identical to `pageMeta` when no breadcrumbs are supplied (Sprint 1 callers
unaffected).

### Metadata helpers
- `pageMeta(input)` — title + description + absolute self-canonical + OG/Twitter,
  for informational/landing routes (was catalogue-only in Sprint 1).
- `catalogueMeta(input)` = `pageMeta` + optional `BreadcrumbList`.
- Thin landings that previously shipped only a `<title>` (`/retail`, `/wholesale`)
  now carry a unique description + absolute canonical. `/flowers` and
  `/flowers/:family` were upgraded from **relative** to **absolute** canonicals.

### Internal linking
The footer company/info list now links the previously weakly-linked
**Delivery** (`/pages/delivery-information`) and **Journal** (`/blogs`) pages, so
they are reachable site-wide (not only from a single homepage CTA / search
results). This is an internal-linking/IA change, not a visual redesign.

### Heading semantics & thin/duplicate review (assessment)
- Informational routes (`about`, `contact`, `reviews`) each render a single
  labelled `<h1>` (`aria-labelledby`), headings in order — no change needed.
- `/collections` and `/collections/all` intentionally **301 → /retail** (guest
  entry is the four approved pathways), so there is no thin "all collections"
  index competing for the crawl. Faceted catalogue variants collapse to their base
  canonical (Sprint 1). No doorway/location pages were created.
- Wholesale catalogue routes remain trade-gated (302 → `/wholesale`) and are not
  optimised as public retail pages.

### Shopify-admin SEO handoff (owner/content — NOT code)
These require the merchant and are out of scope for code:
- Populate **product** SEO title + description (the PDP already consumes
  `product.seo.*`).
- Populate **collection** SEO title + description + collection body descriptions
  (`collection.seo.*` is already consumed).
- Set **image alt text** on Shopify product/collection media.
- Provide **verified opening hours** before any hours schema is added.
- Provide **verified review provenance** before any rating/review schema.
- Confirm **GBP NAP** matches `companyContent.ts`.

## Local + editorial (Sprint 3)

### Local SEO entity
The site-wide `Florist`/`Organization` + `WebSite` JSON-LD (Sprint 1) is unchanged
and remains built solely from `companyContent.ts`. Audited this sprint — no
fabricated hours/priceRange/ratings/reviews; `@id` relationships intact. No defect.

### About / Contact / Delivery
- **`/about`** and **`/contact`** (dedicated editorial routes) now carry an absolute
  self-canonical, OG/Twitter, and a `BreadcrumbList`. About copy uses the
  source-backed "family florist in Kingston, Jamaica, four decades" heritage.
- **Delivery:** there is **no** standalone delivery page. `/pages/delivery-information`
  is a legacy **301 → `/contact`**; delivery terms (areas: Kingston & St. Andrew;
  same-day cutoff) live on `/contact`. So Contact's metadata carries the flower-delivery
  local relevance. The Sprint-2 footer "Delivery" link resolves to `/contact` via that
  301. A dedicated delivery landing page is a deferred landing/content decision (below).
- **`/pages/:handle`** (generic Shopify pages) now emits an absolute canonical + OG and
  prefers Shopify `page.seo.*`.

### Editorial structured data (Journal)
- `/blogs`, `/blogs/:blogHandle`, `/blogs/:blogHandle/:articleHandle` now carry
  absolute canonicals, OG (articles use `og:type=article`), and `BreadcrumbList`.
- Articles emit **`BlogPosting`** (`articleSchema`) from live loader fields only:
  `headline`, `description` (Shopify `seo.description`), `image`, `datePublished`
  (`publishedAt`), `author` (`authorV2.name`) — each omitted when absent.
  **`dateModified` is intentionally never emitted** (Shopify's article query exposes no
  update timestamp). `publisher` references the site-wide Organization node by `@id`.
  (`ARTICLE_QUERY` gained `blog.title` for the breadcrumb — regenerated
  `storefrontapi.generated.d.ts` accordingly.)

### Breadcrumb coverage
`BreadcrumbList` now covers: catalogue routes (Sprint 2) + About, Contact, Journal
index/blog/article, collection pages, and the flower guide/family. All absolute URLs,
1-based positions, canonical destinations, one node per page (no duplicates).

### Internal linking
Header + footer nav, footer Delivery/Journal links (Sprint 2), and the new breadcrumb
trails give every priority page a crawl path from the homepage. Determination: no
additional contextual links were warranted — a link farm would not help customers, and
the breadcrumbs already strengthen the Journal → blog → article and Home → section paths.

### Local search-intent gap analysis
A = existing page serves it · B = existing page needs Shopify content · C = dedicated
landing justified · D = insufficient/unsupported (do not fabricate).

| Search intent | Existing target | Class | Recommendation |
|---|---|---|---|
| florist Kingston Jamaica | `/` (title + Florist schema) | **A** | Serves it; monitor in GSC |
| flower delivery Kingston Jamaica | `/contact` (owns delivery terms) | **B** | Enhance Shopify delivery content on Contact; a dedicated delivery page is a later option (C) |
| wholesale flowers Jamaica | `/wholesale` landing | **A** | Serves it |
| wedding flowers Jamaica | — (service not offered) | **D** | Do not create — weddings/event floristry are explicitly not offered |
| funeral / sympathy flowers Jamaica | `/arrangements/occasion/sympathy` (`sympathy-and-funeral`) | **A** | Serves it (verify the live Shopify collection is populated) |
| corporate flowers Jamaica | `/collections/corporate-gifting` | **B** | Existing target; enrich Shopify collection SEO/body content |
| event flowers Jamaica | — (service not offered) | **D** | Do not create |

No doorway/location-spam pages. No new landing pages created this sprint.

### Future editorial content clusters (planning only — do not publish)
Each cluster must support a real commercial page:

| Cluster | Supports |
|---|---|
| Flower care & longevity | product/collection pages, `/flowers/:family` |
| Flowers by occasion (birthday, romance, sympathy) | `/arrangements/occasion/*` |
| Sympathy & funeral etiquette | `/arrangements/occasion/sympathy` |
| Seasonal flower availability in Jamaica | `/flowers`, seasonal collections |
| Choosing an arrangement | `/arrangements`, `/arrangements/premium-deluxe` |
| Wholesale buying guidance for florists/trade | `/wholesale` |
| Corporate gifting | `/collections/corporate-gifting` |

(No wedding/event cluster — the service is not offered.)

### Shopify content actions (owner/admin — NOT code)
- Enrich **`/contact`** (or a future dedicated delivery page) with fuller verified
  delivery content for the delivery-Kingston intent.
- Populate **corporate-gifting** collection SEO title/description + body.
- Ensure the **sympathy** occasion collection is populated in Shopify.
- (Carried over) product/collection SEO fields, media alt text, GBP NAP check.

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
