# Image Shot List & Generation Reference

Two tracks of imagery, and how to keep every new image consistent with the
existing set. Companion to `docs/IMAGE_PIPELINE_AUDIT.md`.

> **Audit status:** every image the storefront references resolves to a file on
> disk — there are no broken or blank images. Both tracks below are
> *enhancements*, not gaps.

---

## Track 1 — Supplies collection: product photos (Shopify upload)

The `/wholesale/supplies` grid renders each product's Shopify `featuredImage`.
These are **photographs you upload to the products**, not AI-generated assets.

**Where they appear**

- Catalogue cards, rendered in a **16 : 10** frame (`--ng-ratio-collection`)
  with `object-fit: cover`.
- The product page (full image).

**Specs (match the existing catalogue look)**

| Item | Spec |
| --- | --- |
| Master file | Square **2048 × 2048 px**, high-res |
| Composition | Compose for a **16 : 10 crop** — subject centred with headroom top & bottom; nothing critical near the vertical edges |
| Background | Clean **bright white / warm-neutral seamless studio**, even soft lighting — identical across every product so the grid reads as one set |
| Styling | No props, text, watermark or hands; true colour; trade/bulk framing (case, roll, pack) where sensible |
| Format | Upload JPG or PNG (Shopify serves WebP) |
| Alt text | Descriptive per product (SEO + accessibility) |

**Per category** (the five supply groups)

| Category | Shot |
| --- | --- |
| Vases & Containers | Vessels grouped or single, neutral background |
| Ribbon | Spools / rolls fanned or stacked, colour range |
| Wrapping & Packaging | Kraft / tissue / sleeves / boxes, standing or flat-lay |
| Tools & Accessories | Snips, wire, tape, picks — clean layout |
| Florist Essentials | Foam, flower food, packs / cases |

One 16 : 10-safe hero per product; optional detail shots on the product page.

**Also required:** publish the collection to the **Hydrogen / Online Store**
sales channel, or the Storefront API will not return it. Collection handle must
be exactly `wholesale-supplies`.

---

## Track 2 — Flower generation matrix (Gemini, on the Mac)

Defined in `config/image-generation-matrix.csv` — 12 rows of wholesale (classic)
and signature (deluxe) flower imagery. Prompts already follow the house style
(catalog-clean for classic; champagne-gold / black editorial for deluxe).

**Source references** now point at the real in-repo flower library
(`public/images/flowers/<type>/…-800.webp`) so generated realism is anchored on
the same flowers used across the site:

| Flower | Source |
| --- | --- |
| Alstroemeria (purple / pink) | `public/images/flowers/alstroemeria/` |
| Roses (red / ivory→white) | `public/images/flowers/roses-in-stock/` |
| Orchids (white / purple) | `public/images/flowers/orchids/` |

**Output specs** (already consistent with existing derivatives)

- Card assets: **4 : 5 → 1200 × 1500**
- Hero assets: **16 : 9 → 1920 × 1080**
- WebP; `optimize` / `integrate` produce the `-400 / -600 / -800` responsive sets.

**Run order (on the Mac — needs `.env.images` Gemini key + working network)**

```
npm run images:pilot:dry-run     # preview the queue, no calls
npm run images:pilot:generate    # generate (Gemini)
npm run images:optimize          # responsive derivatives
npm run images:validate          # integrity checks
npm run images:integrate         # wire into the storefront
```

Respect the `approved` column in the matrix before `integrate`. This cannot be
run from the cloud session (no Gemini egress or key there).

---

## Consistency rule

New images match the existing set on **framing** (4 : 5 cards, 16 : 9 heroes,
16 : 10 product cards), **naming** (`-400 / -600 / -800.webp`), **background**
(clean neutral studio for catalog; matte black / warm ivory + champagne-gold for
deluxe), and **focal treatment** — never introduce a one-off crop, ratio or
background that breaks the grid.
