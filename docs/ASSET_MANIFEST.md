# Asset Manifest & Art Direction (M10)

**Scope:** Imagery pipeline only — audit, specs, prompts, folder scaffolding. **No pages, commerce, or components were changed.** No images were generated (no image-generation tool is available in this environment); every "generate" asset below ships a production-grade prompt for the owner/designer to run.

**Visual direction (applies to every asset):** black `#090909` · champagne gold `#C8A96A` · warm ivory `#FAF8F4` · botanical green `#4D6A50`. Premium wholesale florist, BloomsByTheBox catalog usability, editorial polish without oversized drama, authentic Jamaican (Kingston) context. Cinematic, matte, generous negative space — never stock-photo.

---

## A. Current image audit & classification

| Asset | Actual | Ratio | Size | Used by | Verdict |
|---|---|---|---|---|---|
| `app/assets/greenhouse-hero-editorial-1920.jpg` | 1920×1080 | 16:9 | 274 KB | home, design-system | **REPLACE** (needs true hero at 2560×1440 + mobile crop; over-reused as fallback) |
| `app/assets/greenhouse-occasion-banner-1600.jpg` | 1600×900 | 16:9 | 263 KB | home, header mega, collections.$handle, products.$handle, design-system | **REPLACE** (reused 5× → templated; wrong ratio for cards) |
| `app/assets/greenhouse-botanical-banner-1600.jpg` | 1600×900 | 16:9 | 210 KB | home, collections._index, products.$handle, design-system | **REPLACE** (reused; wrong ratio for cards) |
| `app/assets/favicon.svg` | vector | 1:1 | 690 B | root | **KEEP** (optionally refine to a gold monogram — see F) |
| Shopify collection img — luxury-bouquets (`birthday_ffb5….png`) | 744×360 | ~2:1 | — | collection card | **REPLACE + GENERATE** (low-res, mismatched filename) |
| Shopify collection img — birthday-flowers (`birthday.png`) | 744×360 | ~2:1 | — | collection card | **REPLACE + GENERATE** (low-res) |
| Shopify collection img — love-romance (`love_and_romance.png`) | 743×385 | ~2:1 | — | collection card | **REPLACE + GENERATE** (low-res) |
| Shopify collection img — sympathy (`syympha.png`) | 750×382 | ~2:1 | — | collection card | **REPLACE + GENERATE** (low-res) |
| Shopify collection img — wedding-flowers (`sympthy.png`) | 744×371 | ~2:1 | — | collection card | **REPLACE + GENERATE** (⚠ wrong image — shows sympathy) |
| Shopify collections — anniversary, corporate, gift-baskets, plants, same-day, tropical, frontpage | none | — | — | collection card | **GENERATE** (7 missing) |

**Classification key:** keep · crop · resize · compress · replace · generate. No current asset qualifies for keep-as-is except the favicon; the 3 JPGs are usable **interim placeholders** but are flagged **replace** because they are low-res, 16:9-only, and heavily reused. The Shopify collection PNGs are all **replace/generate** (sub-800px, one mislabelled).

> **Nothing is safe to delete in this milestone.** All 3 repo JPGs are imported by home + product + collection pages; removing them would break the build and require page edits (out of scope here). The Shopify PNGs live in the store, not the repo. Removal happens naturally when pages adopt the new assets in later milestones. See §F.

---

## B. Format, naming & delivery conventions

- **Naming:** `public/images/<category>/<subject>-<width>x<height>.<ext>` — kebab-case, dimensions in the filename. Mobile crops carry the portrait dimensions (e.g. `-1080x1350`).
- **Master format:** deliver **AVIF + WebP + JPG** for each raster (JPG as universal fallback). Sizes below are the JPG/WebP master; also export a 2× where noted for retina.
- **Weight targets:** hero ≤ 320 KB (AVIF ≤ 200 KB); banners ≤ 240 KB; cards ≤ 140 KB; tiles ≤ 90 KB. Always run through compression (mozjpeg/squoosh) — this is the "compress" step for every generated asset.
- **Colour:** sRGB, embedded profile, no oversaturation; keep blacks near `#090909`, whites warm toward ivory.
- **Serving:** static brand imagery lives in `public/images/**` (served at `/images/...`). Note for adopting milestones: the **LCP hero** may instead live in `app/assets/` so Vite hashes/optimises it and the Hydrogen `<Image>`/`srcset` pipeline can serve responsive widths — decision to confirm at M9/M3 adoption. Product/collection photography ultimately belongs in Shopify (CDN + Hydrogen `Image`); the collection-card files below are the source images to upload to Shopify, not to hardcode.
- **Every `<img>` gets meaningful alt text** (provided per asset) and `loading="lazy"` except the LCP hero (`eager` + preload).

---

## C. Folder structure (created this milestone)

```
public/images/
├── hero/          # homepage + secondary heroes (+ mobile crops)
├── wholesale/     # warehouse, cooler, bulk buckets, farm-direct
├── supplies/      # vases, ribbon, tools, packaging (floral supplies)
├── weddings/      # ceremony, tablescape, arch
├── corporate/     # hospitality, office, restaurant styling
├── delivery/      # branded delivery + presentation moments
├── heritage/      # atelier, team, storefront (about)
├── collections/   # 1 card image per real Shopify collection
├── mobile/        # portrait crops shared/oversized for small screens
└── README.md      # pipeline notes
```
Each folder holds a `.gitkeep` until assets land.

---

## D. Asset manifest by category

**Shared prompt preamble (prepend to every generation prompt):**
> *Cinematic editorial photograph for a luxury florist brand in Kingston, Jamaica. Palette: deep near-black background, warm ivory, champagne-gold accents, muted botanical green. Soft directional window light, shallow depth of field, refined negative space, matte film finish, restrained saturation. Authentic Jamaican context; warm natural skin tones where people appear. High-end magazine aesthetic — not stock photography. No text, no logos, no watermark, no borders.*

### 1. Homepage hero
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Primary hero | `hero/home-hero-primary-2560x1440.jpg` | 2560×1440 · 16:9 | Home hero (LCP) | GENERATE (replaces `greenhouse-hero-editorial-1920`) |
| Primary hero — mobile | `hero/home-hero-primary-1080x1350.jpg` | 1080×1350 · 4:5 | Home hero on ≤48rem | GENERATE |
| Secondary hero (wholesale) | `hero/home-hero-wholesale-2560x1440.jpg` | 2560×1440 · 16:9 | Wholesale intro band | GENERATE |

- **Alt (primary):** "Sculptural ivory-and-blush luxury floral arrangement in soft light — The New Greenhouse, Kingston."
- **Alt (secondary):** "Florist hands arranging fresh cut stems on a dark studio table."
- **Prompt (primary):** *…preamble… A single sculptural luxury bouquet of ivory garden roses, blush ranunculus and orchids in a matte black vessel, off-centre on the right third, deep near-black backdrop, a thin shaft of gold-warm light grazing the petals, vast quiet negative space on the left for headline text. Editorial, still, expensive. 16:9.*
- **Prompt (mobile):** same subject recomposed vertical, bouquet centred lower third, negative space above. 4:5.
- **Prompt (secondary/wholesale):** *…preamble… Wide shot of a florist's hands selecting long-stem tropical flowers from galvanised buckets on a dark timber wholesale bench, soft daylight, rows of fresh stems softly out of focus behind. Craft, abundance, restraint. 16:9.*

### 2. Wholesale flowers
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Cold-room / cooler | `wholesale/wholesale-cooler-2000x1125.jpg` | 2000×1125 · 16:9 | Wholesale landing banner | GENERATE |
| Bulk buckets | `wholesale/wholesale-buckets-2000x1333.jpg` | 2000×1333 · 3:2 | Wholesale editorial split | GENERATE |
| Farm-direct field | `wholesale/wholesale-farm-2000x1125.jpg` | 2000×1125 · 16:9 | "Farm-direct" story | GENERATE |

- **Alt (cooler):** "Rows of fresh cut flowers in buckets inside a florist's cold room."
- **Alt (buckets):** "Galvanised buckets of roses, lilies and tropical stems ready for wholesale."
- **Alt (farm):** "Tropical flower field at golden hour in the Jamaican hills."
- **Prompt (cooler):** *…preamble… Interior of a professional floral cold room, tall galvanised buckets brimming with roses, lilies and anthurium in ordered rows, cool even light with warm gold highlights, dark walls, a sense of scale and freshness. 16:9.*
- **Prompt (buckets):** *…preamble… Overhead-adjacent view of a dozen zinc buckets packed with long-stem blooms on a dark concrete floor, ivory and blush and deep-green stems, one gold ribbon accent. Abundance, order, luxury-trade. 3:2.*
- **Prompt (farm):** *…preamble… Rows of cultivated tropical flowers on a Jamaican hillside farm at golden hour, soft mist, distant green mountains, warm low sun. Authentic, earthy, premium provenance. 16:9.*

### 3. Floral supplies
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Supplies banner | `supplies/supplies-banner-2000x1125.jpg` | 2000×1125 · 16:9 | Supplies landing | GENERATE |
| Vases tile | `supplies/supplies-vases-1200x1200.jpg` | 1200×1200 · 1:1 | Supply category tile | GENERATE |
| Ribbon & wrap tile | `supplies/supplies-ribbon-1200x1200.jpg` | 1200×1200 · 1:1 | Supply tile | GENERATE |
| Tools & mechanics tile | `supplies/supplies-tools-1200x1200.jpg` | 1200×1200 · 1:1 | Supply tile | GENERATE |

- **Alt (banner):** "Flat lay of florist supplies — vases, ribbon, shears and wrapping in ivory and gold."
- **Alt (vases):** "Matte black and ivory ceramic vases arranged on a warm neutral surface."
- **Prompt (banner):** *…preamble… Elegant flat-lay of florist supplies on warm ivory linen — a matte black vase, spools of champagne-gold and ivory ribbon, brass shears, kraft wrap, sprigs of eucalyptus — organised with generous spacing, soft top light. Refined, tactile. 16:9.*
- **Prompt (vases tile):** *…preamble… Three vessels — matte black, ivory ceramic, brushed gold — grouped centre on a warm neutral backdrop, soft shadow, product-catalogue clarity with editorial mood. 1:1.*
- **Prompt (ribbon tile):** spools of ivory & gold silk ribbon, one unspooled ribbon curling, dark surface. 1:1.
- **Prompt (tools tile):** brass florist shears, twine and a bundle of wire on ivory linen, top-down, minimal. 1:1.

### 4. Weddings & events
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Wedding banner | `weddings/wedding-banner-2000x1125.jpg` | 2000×1125 · 16:9 | Weddings page hero | GENERATE |
| Ceremony arch | `weddings/wedding-arch-2000x1333.jpg` | 2000×1333 · 3:2 | Editorial split | GENERATE |
| Tablescape | `weddings/wedding-tablescape-2000x1333.jpg` | 2000×1333 · 3:2 | Editorial split | GENERATE |

- **Alt (banner):** "Blush and ivory wedding floral installation in warm candlelight."
- **Alt (arch):** "Floral ceremony arch of ivory roses and greenery at an outdoor Jamaican venue."
- **Alt (tablescape):** "Wedding reception tablescape with low floral runner, taper candles and gold accents."
- **Prompt (banner):** *…preamble… A romantic wedding floral installation — cascading ivory garden roses, blush peonies and trailing greenery — against a soft dark venue wall, warm candle glow, gold flatware just visible. Intimate, opulent, tasteful. 16:9.*
- **Prompt (arch):** *…preamble… An outdoor ceremony arch dressed in ivory roses and eucalyptus at a Jamaican garden venue, soft late-afternoon light, lush greenery beyond. 3:2.*
- **Prompt (tablescape):** *…preamble… A long reception table with a low ivory-and-blush floral runner, ivory taper candles, gold-rimmed glassware, dark linen, warm ambient light. Editorial overhead-angle. 3:2.*

### 5. Corporate flowers
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Hospitality lobby | `corporate/corporate-lobby-2000x1125.jpg` | 2000×1125 · 16:9 | Corporate page hero | GENERATE |
| Office / restaurant styling | `corporate/corporate-styling-2000x1333.jpg` | 2000×1333 · 3:2 | Editorial split | GENERATE |

- **Alt (lobby):** "Large sculptural floral arrangement on a hotel lobby console in warm light."
- **Alt (styling):** "Weekly floral styling on a restaurant host stand with botanical greenery."
- **Prompt (lobby):** *…preamble… A grand yet restrained floral arrangement of anthurium, orchids and tropical foliage on a dark stone console in a luxury Kingston hotel lobby, warm architectural light, deep shadows, sense of scale. 16:9.*
- **Prompt (styling):** *…preamble… A refined weekly floral arrangement on a boutique restaurant host stand, deep-green foliage and ivory blooms, warm interior, out-of-focus diners beyond. 3:2.*

### 6. Delivery / service
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Delivery moment | `delivery/delivery-moment-2000x1125.jpg` | 2000×1125 · 16:9 | Delivery page / trust band | GENERATE |
| Presentation / handover | `delivery/delivery-handover-1200x1500.jpg` | 1200×1500 · 4:5 | PDP trust / delivery card | GENERATE |

- **Alt (moment):** "Ivory-wrapped bouquet in a branded box being delivered to a Kingston doorway."
- **Alt (handover):** "Hands presenting a ribboned bouquet wrapped in ivory paper with a gold seal."
- **Prompt (moment):** *…preamble… A beautifully wrapped bouquet in an ivory box with a gold wax seal, held at a sunlit Kingston doorway with tropical foliage, warm morning light, a moment of arrival. Considered, gift-worthy. 16:9.*
- **Prompt (handover):** *…preamble… Close crop of two hands presenting a bouquet wrapped in ivory paper tied with champagne-gold ribbon and a wax seal, dark soft background. Vertical. 4:5.*

### 7. Heritage / about
| Asset | File | Dims / Ratio | Placement | Verdict |
|---|---|---|---|---|
| Atelier at work | `heritage/heritage-atelier-2000x1333.jpg` | 2000×1333 · 3:2 | About hero / story | GENERATE |
| Florist portrait | `heritage/heritage-portrait-1200x1500.jpg` | 1200×1500 · 4:5 | About / team | GENERATE |
| Storefront | `heritage/heritage-storefront-2000x1333.jpg` | 2000×1333 · 3:2 | About / contact | GENERATE |

- **Alt (atelier):** "Florist arranging a luxury bouquet at a dark timber workbench in the studio."
- **Alt (portrait):** "Portrait of a Jamaican master florist holding fresh stems."
- **Alt (storefront):** "The New Greenhouse florist storefront in Kingston at golden hour."
- **Prompt (atelier):** *…preamble… A Jamaican florist composing a luxury bouquet at a dark timber workbench strewn with ivory blooms and gold ribbon, soft side window light, focused craft, warm skin tones, film grain. 3:2.*
- **Prompt (portrait):** *…preamble… Editorial half-body portrait of a Black Jamaican master florist in an ivory apron holding a bundle of fresh stems, dark backdrop, soft Rembrandt light, dignified and warm. 4:5.*
- **Prompt (storefront):** *…preamble… An elegant florist storefront with black-and-gold signage and ivory blooms in the window, a Kingston street at golden hour with subtle tropical greenery. 3:2.*

### 8. Collection cards (BloomsByTheBox-style catalog)
One image per real Shopify collection. **Spec (all):** `collections/<handle>-1600x1000.jpg`, 1600×1000, **16:10** (matches `--ng-ratio-collection`), 2× master 3200×2000, ≤140 KB export. **Verdict: GENERATE**, then upload to the matching Shopify collection (do not hardcode). Base prompt = preamble + *"a luxury floral arrangement representing {theme}, on a dark editorial backdrop with ivory and gold accents, catalogue-clean but cinematic, generous negative space top-right for an overlay label. 16:10."*

| Handle | File | Subject / theme for prompt | Alt text |
|---|---|---|---|
| luxury-bouquets | `collections/luxury-bouquets-1600x1000.jpg` | signature ivory & blush garden-rose bouquet | "Signature luxury bouquet of ivory and blush garden roses." |
| birthday-flowers | `collections/birthday-flowers-1600x1000.jpg` | joyful bright bouquet, gold accents | "Bright celebratory birthday flower arrangement with gold accents." |
| anniversary-flowers | `collections/anniversary-flowers-1600x1000.jpg` | deep-red & ivory romantic roses | "Romantic anniversary arrangement of red and ivory roses." |
| love-romance | `collections/love-romance-1600x1000.jpg` | blush & red roses, intimate | "Romantic blush and red rose bouquet." |
| sympathy | `collections/sympathy-1600x1000.jpg` | serene all-ivory white lilies & roses | "Serene all-white sympathy arrangement of lilies and roses." |
| wedding-flowers | `collections/wedding-flowers-1600x1000.jpg` | bridal ivory cascade (⚠ replaces mislabelled image) | "Bridal cascade of ivory roses and greenery." |
| corporate-flowers | `collections/corporate-flowers-1600x1000.jpg` | architectural anthurium & orchid | "Architectural corporate arrangement of anthurium and orchids." |
| gift-baskets | `collections/gift-baskets-1600x1000.jpg` | luxe floral gift basket with ribbon | "Luxury floral gift basket tied with gold ribbon." |
| plants | `collections/plants-1600x1000.jpg` | sculptural potted tropical plants | "Sculptural potted tropical plants in matte vessels." |
| same-day-delivery | `collections/same-day-delivery-1600x1000.jpg` | wrapped ready-to-send bouquet + box | "Wrapped bouquet ready for same-day delivery." |
| tropical-flowers | `collections/tropical-flowers-1600x1000.jpg` | bold heliconia, ginger, anthurium | "Bold tropical arrangement of heliconia, ginger and anthurium." |

### 9. Mobile crops
Portrait recompositions for small screens (art-directed, not just downscales). Provide for the LCP hero and any full-bleed banners.
| Asset | File | Dims / Ratio | Source |
|---|---|---|---|
| Home hero — mobile | `hero/home-hero-primary-1080x1350.jpg` | 1080×1350 · 4:5 | primary hero (§1) |
| Wholesale hero — mobile | `mobile/wholesale-hero-1080x1350.jpg` | 1080×1350 · 4:5 | wholesale cooler (§2) |
| Wedding banner — mobile | `mobile/wedding-banner-1080x1350.jpg` | 1080×1350 · 4:5 | wedding banner (§4) |
| Corporate banner — mobile | `mobile/corporate-banner-1080x1350.jpg` | 1080×1350 · 4:5 | corporate lobby (§5) |
| Delivery — mobile | `mobile/delivery-1080x1350.jpg` | 1080×1350 · 4:5 | delivery moment (§6) |

**Mobile crop rule:** keep the subject in the lower-two-thirds with headroom for overlaid copy; never letterbox a 16:9 master into a portrait slot.

### Social / favicon (supporting)
| Asset | File | Dims / Ratio | Verdict |
|---|---|---|---|
| Open Graph share image | `hero/og-share-1200x630.jpg` | 1200×630 · 1.91:1 | GENERATE (brand hero + wordmark space) — wire in M11 SEO |
| Favicon | `app/assets/favicon.svg` | vector | KEEP (optional: gold "NG" monogram refresh — approval) |

---

## E. Compression / processing checklist (per generated asset)
1. Crop to the exact ratio above (art-directed, not stretched). 2. Resize to the master width. 3. Export AVIF + WebP + JPG (sRGB). 4. Compress to the weight target (§B). 5. Verify on light **and** dark surfaces. 6. Confirm alt text. 7. Collection cards → upload to the matching Shopify collection; brand imagery → drop into `public/images/<category>/`.

## F. Removal report
- **Repo:** no orphaned or duplicate image files exist. The 3 `greenhouse-*.jpg` files are each imported by multiple pages, so **none can be removed safely** without page-code changes (out of scope for M10). They remain as interim placeholders and become removable when pages adopt the new assets (M4/M5/M9).
- **Shopify:** the 5 low-res collection PNGs (incl. the mislabelled `sympthy.png` on *wedding-flowers*) should be **replaced** in Shopify admin with the §8 collection cards — an owner action in the admin, not a repo change.
- Net files deleted this milestone: **0** (correctly — nothing was safe to remove).

## G. Generation & approval report
**Total assets requiring generation: 46**
- Hero: 3 · Wholesale: 3 · Supplies: 4 · Weddings: 3 · Corporate: 2 · Delivery: 2 · Heritage: 3 · Collection cards: 11 · Mobile crops: 5 (4 new + 1 shared with hero) · Social/OG: 1 = **~46** master renders (×3 formats on export).

**Requires client/owner approval or input:**
- Real **phone number**, social handles, and any real **team/storefront photography** (heritage §7 may use real photos of the actual studio/team instead of AI — owner preference).
- Whether the **LCP hero** ships from `public/images/` or `app/assets/` (build-optimised) — confirm at adoption.
- Brand-accuracy sign-off on generated florals (arrangement style must match what The New Greenhouse actually sells).
- Favicon monogram refresh (optional).
- Replacing the Shopify collection PNGs (admin access).

**No images were generated in this milestone** — an image-generation tool is not available here. All 46 ship as prompts above for the owner/designer to render, then compress (§E) and drop into the scaffolded folders.
