# Live vs Source — Catalogue Summary

> Generated 2026-08-29T22:03:03.583Z from the **authoritative LIVE Shopify export**.
> `catalog/` source data is comparison/planning only. Raw dumps live in
> `catalog/live-audit/raw/` (gitignored).

## Counts

| Metric | LIVE | Source | Match |
|---|---|---|---|
| Products | 274 | 80 | ✗ drift |
| Variants | 427 | — | — |
| Collections | 52 | 37 | ✗ drift |
| Export pagination verified | ✓ shop count == exported | | |

## Product drift (matched by handle)

- Live-only products (in Shopify, not in source): **194** — `alstroemeria-purple`, `alstroemeria-lavender`, `alstroemeria-orange`, `alstroemeria-pink`, `alstroemeria-red`, `alstroemeria-white`, `alstroemeria-yellow`, `asters-lavender`, `asters-pink`, `asters-purple`, `asters-white`, `babys-breath-white` … (+182)
- Source-only products (planned, not live): **0** — —
- SEO **title** differs live vs source: **0** products
- SEO **description** differs live vs source: **0** products

## confirmationRequired (source flag → live)

- Source products with a non-empty `confirmationRequired` list: **59**
- Of those, present in LIVE catalogue: **59**
- Flagged in source but NOT found live: —

## Wedding conflict (LIVE)

- Live products matching wedding/bridal: **34**
- Live wedding/bridal collections: **2** — `wedding-flowers`, `bridal-bouquets`
- **Visible to shoppers right now** (ACTIVE + published to Online Store): **11** — `long-stem-ivory-roses`, `ivory-garden-roses`, `dendrobium-orchid-stems`, `cymbidium-orchid-stems`, `phalaenopsis-orchid-stems`, `calla-lilies-ivory`, `anthurium-stems`, `torch-ginger`, `israeli-ruscus`, `palm-leather-leaf`, `babys-breath-gypsophila`

> The storefront code states weddings/events are **not offered** (routes 301, footer hides links).
> Any wedding product visible to shoppers above is a live conflict for the owner to resolve.
