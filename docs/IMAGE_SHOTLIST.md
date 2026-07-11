# Image Shotlist

Target imagery for the wholesale-luxury florist experience. Ratios map to the design system's aspect tokens (`--ng-ratio-*`).

**Live store media (audited 2026-07-11):** 0 product images (no products); **5 of 12 collections** have images, all low-res PNG (~744×360, 2:1) and one mislabeled (Wedding uses the sympathy image); no page/blog/brand imagery; shop logo null. **Every live image fails the luxury bar and needs regeneration.** Repo has only 3 reused 16:9 JPGs + favicon. See `docs/ASSET_INVENTORY.md`.

| # | Shot | Target res | Aspect | Purpose / placement | Status |
|---|---|---|---|---|---|
| 1 | **Hero 1** — luxury floral arrangement | 3840×2160 | 16:9 | Homepage hero (LCP) | ❌ Needs AI generation (current hero only 1920×1080) |
| 2 | **Hero 2** — wholesale, worker arranging stems | 3840×2160 | 16:9 | Wholesale/secondary hero | ❌ Needs AI generation |
| 3 | **Wedding banner** | 2560×1440 | 16:9 / 16:10 | Wedding editorial section + wedding page | ❌ Missing (reusing occasion banner) |
| 4 | **Subscription banner** | 2560×1440 | 16:9 | Subscription/standing-order promo | ❌ Missing |
| 5 | **Collection banners** (per collection) | 2000×1250 | 16:10 | Collection hero headers | ❌ Missing (needs real per-collection art on M0) |
| 6 | **Category cards** (occasion/type) | 1200×750 | 16:10 | Home category grid, nav mega-panel | ⚠ Reusing 1 banner across all → replace |
| 7 | **Product placeholders** | 1200×1500 | 4:5 | Grid/PDP fallback when no product photo | ⚠ Current fallbacks are 16:9 banners (wrong ratio) |
| 8 | **Lifestyle photography** | 2400×1600 | 3:2 | Editorial blocks, home, blog | ❌ Missing |
| 9 | **About page** | 2400×1600 | 3:2 | About story | ❌ Missing (no About design) |
| 10 | **Team page** | 1600×2000 | 4:5 | Team/portrait grid | ❌ Missing |
| 11 | **Delivery** | 2000×1250 | 16:10 | Delivery page, trust sections | ❌ Missing |
| 12 | **Corporate flowers** | 2560×1440 | 16:9 | Corporate section + page | ⚠ Reusing botanical banner → replace |
| 13 | **Wholesale warehouse** | 2560×1440 | 16:9 | Wholesale landing, "farm-direct" story | ❌ Missing (core to brief) |
| 14 | **Packaging** | 1600×2000 | 4:5 | Unboxing/presentation, PDP trust | ❌ Missing |
| 15 | **Testimonials** | 800×800 | 1:1 | Testimonial avatars/context | ❌ Missing (testimonials also fabricated) |

---

### Production notes
- **Ratios matter:** product imagery must be **4:5** (`--ng-ratio-product`), collection **16:10**, editorial **16:9**, avatars **1:1** — the current all-16:9 assets don't fit product/collection slots.
- **Every image flows through Hydrogen `<Image>`** with correct `sizes`/`aspectRatio` and meaningful alt text (Accessibility + Performance sections of `CLAUDE.md`).
- **Avoid stock-photo appearance** (brief); prefer cinematic, authentic floral photography — regenerate/upscale/re-crop weak assets.
- **LCP:** Hero 1 is the LCP image — prioritize its optimization (format, preload, eager) in M11.
- **Real product/collection photography** comes from Shopify — audit and gap-fill against this list on **M0**; generation/optimization executes in **M10**.

**Blocked items:** #5 (needs real collections), #7 real product photos, and all Shopify-hosted media → **M0**. AI-generated brand/editorial shots (#1–4, 8–14) can be produced independently once art direction is set.
