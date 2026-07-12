# Product Image Prompts & Photography System

Every one of the 80 products has a **per-product generation prompt** in `product-image-manifest.csv` (columns: Filename, Dimensions, Aspect Ratio, Alt Text, Photography Direction, Generation Prompt, Status). This doc defines the shared system those prompts follow. **No product images exist yet** — all 80 are `Status: REQUIRED`.

> No image-generation tool was available in this environment, so images were **not** generated — only prompts. Do not use or copy images from any other florist.

## Specs (all product images)
- **Dimensions:** 1200 × 1500 · **portrait 4:5** (matches the storefront product ratio).
- **Format:** export AVIF + WebP + JPG (sRGB), ≤ ~180 KB JPG.
- **Filename:** `products/<handle>-1200x1500.jpg` (from the manifest).
- Collection images: 1600 × 1000 (16:10); mobile collection crops: 900 × 1200; hero/editorial: 1920 × 1080 desktop + 900 × 1200 mobile (see `docs/ASSET_MANIFEST.md`).

## Visual system
- Background: **warm ivory** seamless, or **controlled charcoal** for dramatic/luxury items.
- Realistic floral texture, accurate botanical appearance, natural proportions and true colour.
- Premium studio softbox lighting; soft shadow; shallow-to-medium depth.
- Black & **champagne-gold** packaging accents where appropriate (ribbon, box, wax seal).
- Centered subject with headroom/negative space for a clean 4:5 crop.
- **No text, no logos, no watermarks** generated inside the image.
- Consistent look across the catalog so the grid reads as one system.

## Prompt template (the manifest fills `{…}` per product)
> `Studio product photograph of {product title, lowercased} for a luxury florist catalog. {product summary} Warm ivory seamless background (or controlled charcoal for dramatic items), soft premium studio lighting, realistic floral texture and true-to-life color, centered with generous negative space for a 4:5 portrait crop, subtle champagne-gold and black accents. Catalog-clean, editorial, photorealistic. No text, no logo, no watermark.`

### Category art-direction nuances
- **Wholesale stems/bunches:** show a generous bunch or a bulk box with stems fanned; emphasise volume, stem length, freshness. Charcoal works well for depth.
- **Retail bouquets/arrangements:** finished, hand-tied or vased; gift-ready with ribbon/wrap; warm ivory.
- **Sympathy:** restrained, dignified, mostly ivory/white and greenery; soft even light; no bright/celebratory tones.
- **Weddings:** editorial, romantic; ivory/blush; can show bouquet held or centerpiece styled on a table.
- **Supplies:** clean product-catalogue clarity on ivory; single item or neat set; accurate materials.
- **Plants:** in a simple matte vessel; healthy foliage; home/office context implied.

## Workflow
1. Generate per the manifest prompt → 2. Crop to 4:5 → 3. Colour-correct to the palette → 4. Export AVIF/WebP/JPG + compress → 5. Verify on light and dark → 6. Upload to Shopify Files/CDN → 7. Apply via `shopify-products-image-update-template.csv` (`replacement-workflow.md` §2). Update `Status` in the manifest to DONE as you go.

## Approval
- Brand-accuracy sign-off required — generated florals must match what The New Greenhouse actually sells.
- Owner may substitute **real product photography** for any item (preferred where available).
