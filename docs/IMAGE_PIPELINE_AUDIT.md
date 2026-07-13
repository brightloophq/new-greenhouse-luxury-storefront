# Image Pipeline Audit (read-only)

**Scope:** inventory of every image surface in the storefront before any
generation. **Nothing was generated, optimized, replaced, or deleted.** No
Shopify data was touched. This is the "FIRST ACTION — AUDIT ONLY" deliverable.

**Method:** filesystem inventory of `app/assets/`, `public/images/`,
`source-images/`, `catalog/`; inspection of the image components and the flower
data layer; cross-check against the prior image docs (`ASSET_INVENTORY.md`,
`ASSET_MANIFEST.md`, `IMAGE_SHOTLIST.md`) and the product-image manifest in
`catalog/`. Shopify-side image state is taken from the earlier read-only product
audit (all 87 products, `mediaCount = 0`).

---

## 0. Headline

1. **No product images exist anywhere.** All 87 Shopify products return
   `mediaCount = 0`, and the PDP component renders an **empty grey box** when a
   variant has no image. This is the single largest gap.
2. **One flower family has real imagery.** `public/images/flowers/alstroemeria/`
   has 8 colourways × 4 widths (WebP). The other **24 flower families render a
   letter-placeholder tile** (no images on disk).
3. **The whole site shares 3 reused 16:9 JPG banners** (`app/assets/*`). They are
   used as homepage cards, PDP gallery, collection art, and editorial media —
   across **both** Classic and Deluxe — so imagery does **not** currently
   differentiate the two experiences (only theme + layout do).
4. **Aspect-ratio mismatch:** cards/PDP want **4:5**; the shared banners are
   **16:9**. They only look acceptable because CSS `object-fit: cover` crops them.
5. **Prior planning exists and is reusable** — `catalog/product-image-manifest.csv`
   already carries per-product prompts, but they apply a **Deluxe/luxury**
   aesthetic (black + champagne-gold) to **all** products, including Classic
   wholesale. Those prompts must be **re-scoped per experience** before use.

**Conclusion:** the pipeline is warranted. Start with the approved pilot
(Alstroemeria / Roses / Orchids, Classic + Deluxe). Nothing here should be
generated before the pilot is approved.

---

## 1. Repository image inventory

| Path | Dims (approx) | Ratio | Size | Format | Used by | Experience | Verdict |
|---|---|---|---|---|---|---|---|
| `app/assets/greenhouse-hero-editorial-1920.jpg` | 1920×1080 | 16:9 | 274 KB | JPG | home hero, featured cards, PDP gallery, fallback products | shared (Deluxe-leaning) | **Retain as fallback; regenerate** true hero + 4:5 crop |
| `app/assets/greenhouse-occasion-banner-1600.jpg` | 1600×900 | 16:9 | 263 KB | JPG | home cards, editorials, PDP gallery | shared | **Retain as fallback; regenerate** |
| `app/assets/greenhouse-botanical-banner-1600.jpg` | 1600×900 | 16:9 | 210 KB | JPG | home cards, editorials, PDP gallery | shared | **Retain as fallback; regenerate** |
| `app/assets/favicon.svg` | vector | 1:1 | 690 B | SVG | root | shared | **Keep** |
| `public/images/flowers/alstroemeria/{8 colours}-{200,300,400,800}.webp` (32) | square | 1:1 | 5–86 KB | WebP | flower category cards | Classic (catalog) | **Keep — approved, correct format/ratio** |
| `public/images/pages/{about,corporate,wedding}-hero-{640,1024}.webp` (6) | landscape | ~16:9 | 29–93 KB | WebP | editorial page heroes | shared | **Keep** (corporate/wedding are out of active scope) |
| `source-images/flowers/alstroemeria/*.{png,jpg}` (8) | large | 1:1 | 0.17–1.5 MB | PNG/JPG | **originals only** (not served) | Classic | **Keep as source; never serve directly** |
| `source-images/pages/*.jpg` (3) | large | — | 0.08–0.88 MB | JPG | originals only | shared | Keep as source |
| `guides/**/*.jpg` (2) | — | — | ~0.3 MB | JPG | Hydrogen scaffold docs | n/a | Ignore (not customer-facing) |

**Empty scaffolding directories** (exist, no real images):
`public/images/{collections,hero,mobile,supplies,wholesale,heritage,corporate,delivery,weddings}`
— these are the intended homes for generated assets.

## 2. Shopify-hosted vs repository images

| Surface | Source today | State |
|---|---|---|
| **Product images (PDP + product cards)** | Shopify variant `image` via `<Image>` (`app/components/ProductImage.tsx`) | **None** — 0 of 87 products have media → PDP shows an empty box; catalog cards fall back to the shared banner |
| **Collection hero art** | Shopify `collection.image` via `CollectionHero` | Mostly absent; per prior audit ~5/12 collections had low-res PNG (~744×360, 2:1), one mislabeled (Wedding used the sympathy image) — **re-verify live** |
| **Flower category cards** | Repository WebP via `app/data/flowers.ts` (`flowerSrc`/`flowerSrcSet`) | Only `alstroemeria`; others → letter placeholder |
| **Homepage cards / editorials / hero** | Repository `app/assets` banners (3) via `homeContent.ts` `IMAGES` map | Present but shared/reused, wrong ratio |
| **Page heroes (about/corporate/wedding)** | Repository `public/images/pages` WebP | Present |

**Rule confirmed for the resolution layer (to build later):** prefer an approved
**Shopify** product image for live products; use **repository** generated images
for collection/editorial surfaces and as experience fallbacks.

## 3. Coverage gaps

### Missing product images
- **All 87 products.** PDP fallback is a blank box (`ProductImage` returns
  `<div className="product-image" />` when `!image`). Catalog cards fall back to
  the shared banner. Pilot covers Roses + Orchids + Alstroemeria products only.

### Missing / weak collection images
- Classic hubs: `bulk-flowers`, `floral-supplies`, `greenery-and-fillers`,
  `florist-essentials` — no dedicated hero art (use repository editorial art).
- Deluxe: `luxury-bouquets` (empty), `gift-baskets` (empty), `roses`, `orchids`,
  `love-and-romance`, `anniversary`, `birthday`, `add-ons` — no dedicated hero art.
- `seasonal-deluxe` — collection does not exist (safe empty-state route already).

### Missing flower-family imagery (Classic category cards)
- **24 of 25 families** have no images (only `alstroemeria`). Full list to be
  regenerated later; pilot adds **roses** and **orchids** families.

### Missing Classic-vs-Deluxe differentiation
- There is **no** experience-specific imagery. Both experiences draw from the
  same 3 banners. The pipeline must produce a **Classic set** (clean catalog) and
  a **Deluxe set** (editorial gifting) so imagery reinforces the split.

## 4. Incorrect aspect ratios

| Asset | Current | Needed | Impact |
|---|---|---|---|
| `app/assets/*` banners used as cards | 16:9 | **4:5** (cards/PDP) | cropped by `object-fit`; focal point not guaranteed |
| `app/assets/*` banners used as hero | 16:9 | 16:9 desktop **+ 4:5 / 3:4 mobile** | no mobile-hero crop today |
| Flower cards | 1:1 ✅ | 1:1 (component requires square) | correct |
| Legacy collection PNGs (Shopify) | 2:1 | 4:5 card / 16:9 hero | wrong ratio, low-res |

## 5. Low-resolution assets
- Legacy Shopify collection images (~744×360 PNG) — **below** the luxury bar; regenerate.
- `app/assets` banners top out at 1920×1080 — acceptable for hero fallback, but a
  true LCP hero should be larger (per `IMAGE_SHOTLIST.md`).
- Alstroemeria WebP max width **800px** — fine for the square category card
  (rendered ≤ ~400px), **not** for hero/PDP use.

## 6. Duplicated assets
- **The 3 `app/assets` banners are the main duplication** — each reused across
  4–6 surfaces (home, PDP, collections, editorials) and both experiences. The
  homepage `IMAGES` map, PDP gallery, and editorial blocks all point at the same
  three files. Deterministic per-surface generated assets will remove this reuse.
- No byte-identical duplicate files were found elsewhere.

## 7. Classic vs Deluxe classification of existing assets

| Bucket | Assets |
|---|---|
| **Classic** (catalog-accurate) | `public/images/flowers/alstroemeria/*` (square, clean), `source-images/flowers/*` originals |
| **Deluxe-leaning** | `greenhouse-hero-editorial-1920.jpg`, `greenhouse-occasion-banner-1600.jpg` (styled, cinematic) |
| **Shared / neutral** | `greenhouse-botanical-banner-1600.jpg`, page heroes, favicon |
| **Out of active scope** | `public/images/pages/{corporate,wedding}-hero-*`, `source-images/pages/*` (Weddings/Corporate) |

## 8. Assets needing regeneration (later, per pilot approval)
- Product images for all catalogue products (pilot: Roses, Orchids, Alstroemeria).
- 24 missing flower families (pilot: Roses, Orchids).
- Dedicated collection/hero art for Classic hubs and Deluxe collections.
- Experience-split hero + card imagery to replace the 3 reused banners.
- A proper mobile hero crop (4:5 / 3:4).

## 9. Integration risks
1. **PDP blank box** — `ProductImage` has no graceful placeholder; integrating
   generated images must also add an experience-aware fallback so no-image
   products never show an empty box.
2. **Shopify vs repo precedence** — live products should prefer approved Shopify
   media; a resolution layer must choose Shopify → approved generated → fallback
   **without** breaking existing `<Image>`/`collection.image` usage.
3. **No hardcoded image maps in routes** — today the homepage keys 3 images in
   `homeContent.ts`; scaling this must live in a data/config layer, not route
   components (matches the spec).
4. **Ratio/CLS** — generated assets must match the rendered box (4:5 cards, 1:1
   flower tiles, 16:9 hero) with width/height set to prevent layout shift.
5. **Prompt aesthetic drift** — the existing `catalog/product-image-manifest.csv`
   prompts are Deluxe-styled for *all* products; reusing them as-is would make
   Classic wholesale look like luxury gifting. Prompts must be re-scoped to the
   Classic vs Deluxe visual standards.
6. **Format/size** — deliver WebP (+ AVIF where the stack supports it), strip
   metadata, keep originals out of `public/` (serve only optimized derivatives).
7. **Payload discipline** — no base64 in source, lazy-load below-the-fold cards,
   eager/preload only the hero, avoid duplicate downloads across experience switch.

## 10. Safe to retain (no action)
- `app/assets/favicon.svg`
- `public/images/flowers/alstroemeria/*` (approved Classic catalog imagery)
- `public/images/pages/*` (page heroes; corporate/wedding are out of active nav)
- `source-images/**` (originals — keep, never serve directly)
- The 3 `app/assets` banners — **retain as experience fallbacks** until
  generated replacements are approved (do not delete during the pilot).

---

## 11. Proposed output structure (for the approved build — not yet created)
Matches the spec:
```
public/images/generated/{classic,deluxe,shared,mobile}/...
source-images/generated-originals/           # originals, never served
config/image-generation-matrix.csv           # the matrix
```
Plus a reusable image-resolution layer (`app/lib/…`) choosing
Shopify → approved generated → experience fallback, and no hardcoded maps in routes.

## 12. Recommended next steps (await approval before each)
1. **Build `config/image-generation-matrix.csv`** (`npm run images:matrix`) from
   the approved catalog + collection data, re-scoping prompts per experience.
2. **Build the secure Gemini client** (env-only key, dry-run default, retries/
   rate-limit/timeout, no-secret metadata) + `images:*` commands.
3. **Pilot dry-run** (`images:pilot:dry-run`) — 12 concepts: Alstroemeria/Roses/
   Orchids × Classic+Deluxe × 2 colours, 4:5 cards + 16:9 hero.
4. Only after you approve the dry-run: **`images:pilot:generate`** → optimize →
   validate → pilot report → **stop for your approval** before catalogue-wide work.

*No images were generated or replaced. No Shopify data was changed. The pasted
GEMINI_API_KEY was not stored, logged, or used during this audit.*
