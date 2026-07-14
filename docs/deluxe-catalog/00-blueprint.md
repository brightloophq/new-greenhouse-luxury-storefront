# The New Greenhouse — Deluxe (Luxury) Product Catalogue Blueprint

**Status:** Draft for review & approval · Planning phase only — no Shopify products, no images, no storefront changes.
**Purpose:** The single source of truth for the Deluxe catalogue — products, collections, image generation, SEO, copy, merchandising, AI concierge, and future automation.

> This blueprint defines a luxury florist catalogue (gifting & occasion led), not a wholesale supply list. It is designed to rival Venus ET Fleur, Farmgirl Flowers, McQueens, and Ode à la Rose in polish and coherence.

---

## How this blueprint is organised

| # | Deliverable | File |
|---|---|---|
| 1 | **Product Blueprint** (this index + product blocks) | `00-blueprint.md` + `products/*.md` |
| 2 | **Master Product Catalogue (CSV)** | `deluxe-product-catalog.csv` |
| 3 | **Collection Architecture + Diagram** | [`01-collection-architecture.md`](01-collection-architecture.md) |
| 4 | **Shopify Structure & Tagging Strategy** | [`02-shopify-structure.md`](02-shopify-structure.md) |
| 5 | **Product Naming Standards** | [`03-naming-standards.md`](03-naming-standards.md) |
| 6 | **URL Naming Standards** | [`03-naming-standards.md`](03-naming-standards.md) §2 |
| 7 | **Gemini Prompt Library** | [`04-gemini-prompt-library.md`](04-gemini-prompt-library.md) |
| 8 | **SEO Strategy** | [`05-seo-strategy.md`](05-seo-strategy.md) |
| 9 | **AI Concierge Recommendation Strategy** | [`06-concierge-strategy.md`](06-concierge-strategy.md) |
| 10 | **Launch Recommendation** | [`07-launch-recommendation.md`](07-launch-recommendation.md) |

**Full 27-field product definitions** (with per-product Gemini prompts) live in the `products/` folder, one file per collection group:
- [`products/romance-anniversary.md`](products/romance-anniversary.md) — Love & Romance + Anniversary
- [`products/wedding.md`](products/wedding.md) — Wedding
- [`products/sympathy-corporate.md`](products/sympathy-corporate.md) — Sympathy + Corporate
- [`products/everyday-occasions.md`](products/everyday-occasions.md) — Birthday, Congratulations, Thank You, Get Well, New Baby
- [`products/signature-seasonal-addons.md`](products/signature-seasonal-addons.md) — Signature, Luxury, Seasonal, Gift Add-ons

---

## Catalogue at a glance

The launch catalogue is **~50 products** across **11 occasion collections + 4 curated collections + add-ons**, spanning four price tiers so every gifter is served.

| Group | Products | Collections |
|---|---|---|
| Love & Romance + Anniversary | 8 | love-and-romance, anniversary |
| Wedding | 8 | bridal-bouquets, wedding-flowers, centerpieces |
| Sympathy + Corporate | 11 | sympathy-and-funeral, corporate-gifting |
| Everyday Occasions | 12 | birthday, congratulations, thank-you, get-well, new-baby |
| Signature + Luxury + Seasonal + Add-ons | ~15 | signature-collection, luxury-bouquets, seasonal-deluxe, gift-add-ons |
| **Total** | **~54** | 11 occasion + 4 curated + add-ons |

**Price tiers (USD):** Standard $65–95 · Premium $100–150 · Luxury $155–225 · Signature $250–450.

Of these, **19 are existing** Deluxe products (enriched to blueprint standard, imagery kept) and **~35 are new** (to be generated + created only after approval).

---

## The 27-field product model

Every product is fully specified with these fields (see the `products/*.md` blocks and CSV columns):

1. Product Name · 2. URL Handle · 3. Collection(s) · 4. Occasion · 5. Product Type · 6. Primary Flowers · 7. Secondary Flowers · 8. Greenery · 9. Colour Palette · 10. Arrangement Style · 11. Wrap Style · 12. Ribbon Style · 13. Vase/Box/Basket · 14. Size Options · 15. Price Tier · 16. Short Description · 17. Long Storytelling Description · 18. SEO Title · 19. SEO Description · 20. Meta Keywords · 21. Image Alt Text · 22. AI Concierge Tags · 23. Cross-sell · 24. Upsell · 25. Delivery Notes · 26. Care Instructions · 27. Availability Notes

Plus, for every product: a **complete, ready-to-run Gemini image prompt** in the Deluxe house style.

---

## Design principles honoured

- **Gifting-first IA** — browse by emotion/occasion, species is a filter only.
- **One coherent photoshoot** — every image shares background, lighting, crop, and blank ribbon (no baked-in text).
- **Luxury voice** — evocative names + storytelling copy, zero wholesale/trade language.
- **Every budget served** — each occasion offers ≥2 tiers.
- **Scalable & clean** — controlled product types, namespaced tags, structured metafields; adding products never needs code changes.
- **Concierge-ready** — 8-dimension structured data drives AI gifting recommendations, cross-sell, and upsell.
- **Safe rollout** — structure → enrich existing 19 → gated image gen → batched product creation → QA; Wholesale/Classic untouched; PR unchanged.

---

## What happens next

This phase **ends here, at review**. On approval, follow [`07-launch-recommendation.md`](07-launch-recommendation.md): collections & taxonomy first, then enrich the existing 19, then gated image generation, then batched product creation, then merchandising/concierge, then QA & go-live.

**No image generation, product creation, or Shopify writes occur until you approve this blueprint.**
