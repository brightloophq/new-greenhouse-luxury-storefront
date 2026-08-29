# Shopify LIVE Content SEO Audit

> **Authoritative.** Generated 2026-08-29T23:07:29.056Z from a read-only LIVE Shopify
> export (`catalog/live-audit/raw/`). No Shopify data was modified. The `catalog/`
> source dataset is referenced only for drift comparison. **No changes were executed.**

## Access & Provenance

- Method: Admin GraphQL **queries only**, client-credentials grant, via `commerce-manager`.
- Store: ax41k1-k5.myshopify.com · API 2026-07.
- Pagination verified: products OK, collections OK.
- Publications data included: products=true, collections=true.
- Writes performed: **NONE**.

## Catalogue at a glance (LIVE)

- **Products:** 274 · **Variants:** 427 · **Collections:** 52
- **By status:** DRAFT 19 · ACTIVE 255
- Products not published to Online Store: **113**

## Product SEO coverage (LIVE)

| Field | Coverage | Notes |
|---|---|---|
| SEO title | 274/274 (100%) | 17 over ~60 chars |
| SEO description | 274/274 (100%) | 0 over 160; 7 very short |
| Body description | 255/274 substantive | 19 thin (<200 chars) |
| Featured image | 241/274 | alt text on 241 |
| Image alt (all images) | 241/241 (100%) | |

- Missing SEO title: —
- Missing SEO description: —
- Thin descriptions: `grand-red-rose-arrangement`, `white-orchid-elegance`, `blush-romance-luxe`, `golden-celebration-bouquet`, `luxury-mixed-garden-bouquet`, `royal-hydrangea-arrangement`, `classic-white-sympathy-arrangement`, `sunshine-birthday-bouquet`, `luxury-tropical-arrangement`, `premium-mothers-day-bouquet`, `signature-ivory-blush-bouquet`, `red-rose-romance-luxe` … (+7)

## Collection SEO coverage (LIVE)

| Field | Coverage |
|---|---|
| SEO title | 33/52 (63.5%) |
| SEO description | 33/52 (63.5%) |
| Body description | 36/52 (69.2%) |
| Image + alt | 4/52 image · 0 with alt |
| Empty (0 products) | 9 — `birthday-flowers`, `anniversary-flowers`, `love-romance`, `sympathy`, `wedding-flowers`, `corporate-flowers`, `gift-baskets`, `tropical-flowers`, `orchids` |

- Missing SEO title: `frontpage`, `luxury-bouquets`, `birthday-flowers`, `anniversary-flowers`, `love-romance`, `sympathy`, `wedding-flowers`, `corporate-flowers`, `gift-baskets`, `plants`, `same-day-delivery`, `tropical-flowers` … (+7)
- Missing SEO description: `frontpage`, `luxury-bouquets`, `birthday-flowers`, `anniversary-flowers`, `love-romance`, `sympathy`, `wedding-flowers`, `corporate-flowers`, `gift-baskets`, `plants`, `same-day-delivery`, `tropical-flowers` … (+7)
- Missing body copy: `frontpage`, `luxury-bouquets`, `birthday-flowers`, `anniversary-flowers`, `love-romance`, `sympathy`, `wedding-flowers`, `corporate-flowers`, `gift-baskets`, `plants`, `same-day-delivery`, `tropical-flowers` … (+4)

## Priority collections (LIVE)

| Segment | Handle | Products | SEO title | SEO desc | Body | Img alt |
|---|---|---|---|---|---|---|
| Corporate Gifting | `corporate-flowers` | 0 | ✗ | ✗ | ✗ | ✗ |
| Corporate Gifting | `corporate-gifting` | 40 | ✓ | ✓ | ✓ | ✗ |
| Corporate Gifting | `corporate-gifts` | 40 | ✓ | ✓ | ✓ | ✗ |
| Sympathy / Funeral | `sympathy` | 0 | ✗ | ✗ | ✗ | ✗ |
| Sympathy / Funeral | `sympathy-and-funeral` | 33 | ✓ | ✓ | ✓ | ✗ |
| Wholesale / Bulk | `bulk-flowers` | 189 | ✓ | ✓ | ✓ | ✗ |
| Wholesale / Bulk | `wholesale-roses` | 4 | ✓ | ✓ | ✓ | ✗ |
| Wholesale / Bulk | `wholesale-greenery` | 5 | ✓ | ✓ | ✓ | ✗ |
| Arrangements | — (not found live) | — | — | — | — | — |
| Retail Flowers | `all-flowers` | 116 | ✓ | ✓ | ✓ | ✗ |
| Supplies | `florist-essentials` | 42 | ✓ | ✓ | ✓ | ✗ |
| Supplies | `floral-supplies` | 10 | ✓ | ✓ | ✓ | ✗ |

## Duplicate metadata (LIVE)

- Duplicate product SEO titles: **4** group(s)
- Duplicate product SEO descriptions: **0** group(s)
- Duplicate product titles: **10** group(s)
- Duplicate collection SEO titles: **0** · descriptions: **0**


## Wedding conflict (LIVE)

- Wedding/bridal products live: **34** · collections: **2**
- **Visible to shoppers now** (ACTIVE + on Online Store): **11** — `long-stem-ivory-roses`, `ivory-garden-roses`, `dendrobium-orchid-stems`, `cymbidium-orchid-stems`, `phalaenopsis-orchid-stems`, `calla-lilies-ivory`, `anthurium-stems`, `torch-ginger`, `israeli-ruscus`, `palm-leather-leaf`, `babys-breath-gypsophila`
- Storefront stance: weddings/events **not offered**. Owner must reconcile (publish + restore routes, or unpublish these).

## confirmationRequired (source → live)

- 59 source products flagged for owner confirmation; **59** are live.
- Do NOT finalise SEO/body for these until the owner confirms the flagged facts.

## Live-vs-source drift

- Live-only products: **194** · Source-only: **0**
- SEO title drift: **0** · SEO description drift: **0**

## Proposed FIRST optimization batch (NOT executed)

Chosen for highest search leverage + lowest risk, gated on owner-approved copy and a
pre-write export. **Read-only until explicitly authorized.**

1. **Collection SEO copy** for the priority segments missing it (see table): SEO title +
   meta description + short body for Corporate Gifting, Sympathy/Funeral, Wholesale/Bulk,
   Arrangements, Retail Flowers, Supplies — whichever rows show ✗ above. This is the
   biggest structural gap and is customer-visible.
2. Scope: `collectionUpdate` on `seo.title`, `seo.description`, `descriptionHtml` only.
3. Risk: Low–Med (visible copy). Rollback: restore from the pre-write collection export.
4. Excluded from batch 1: the 59 confirmationRequired products and
   any wedding decision — both need owner input first.

_All figures above are computed from the authoritative live export; nothing was changed._
