# Deluxe Collection Architecture

**The New Greenhouse — Luxury (Deluxe) Experience**
Single source of truth for how Deluxe products are organised into collections, how those collections map to navigation, and how a product finds its home.

---

## 1. Organising principle

The Deluxe experience is **gifting- and occasion-first**. Customers shop by *emotion and purpose*, never by flower species. Species is a **filter**, never a top-level browse path.

Three collection layers:

| Layer | Purpose | Shown in nav as | Membership rule |
|---|---|---|---|
| **Occasion** | The primary browse path — why you're sending flowers | "Shop by Occasion" | Every product belongs to **exactly one** primary occasion (+ optional secondary) |
| **Curated** | Editorial / merchandising overlays | "Collections" | Hand-picked; a product may appear in several |
| **Functional** | Operational filters | Filter chips / utility links | Rule-based (tag-driven), auto-populated |

---

## 2. Canonical collection list

### Occasion collections (primary browse)
| Handle | Title | Primary occasion tag | Notes |
|---|---|---|---|
| `birthday` | Birthday | `occasion:birthday` | Bright, celebratory |
| `anniversary` | Anniversary | `occasion:anniversary` | Romantic milestones |
| `love-and-romance` | Love & Romance | `occasion:romance` | Roses-led, year-round + Valentine's |
| `sympathy-and-funeral` | Sympathy & Funeral | `occasion:sympathy` | Dignified, white/green |
| `congratulations` | Congratulations | `occasion:congratulations` | New job, graduation, achievements |
| `thank-you` | Thank You | `occasion:thank-you` | Gratitude |
| `get-well` | Get Well Soon | `occasion:get-well` | Cheerful, comforting |
| `new-baby` | New Baby | `occasion:new-baby` | Boy / girl / unisex |
| `corporate-gifting` | Corporate Gifts | `occasion:corporate` | Desk, lobby, client gifting, recurring |
| `wedding` | Wedding | `occasion:wedding` | Made-to-order, consultation-led |
| `mothers-day` | Mother's Day | `occasion:mothers-day` | Seasonal spotlight (evergreen handle) |

### Curated collections (editorial merchandising)
| Handle | Title | Membership | Notes |
|---|---|---|---|
| `best-sellers` | Best Sellers | tag `collection:best-seller` | Top performers across occasions; hand-curated, ~8–10 |
| `signature-collection` | The Signature Collection | tag `collection:signature` | The house's most premium statement pieces |
| `luxury-bouquets` | Luxury Bouquets | tag `collection:luxury-bouquet` | Elevated everyday hand-tied bouquets |
| `seasonal-deluxe` | Seasonal Collection | tag `collection:seasonal` | Rotates by season; designer's-choice |

### Functional collections (rule-based / utility)
| Handle | Title | Rule | Notes |
|---|---|---|---|
| `same-day-delivery` | Same-Day Delivery | tag `delivery:same-day` | Auto-populated; excludes made-to-order weddings |
| `gift-add-ons` | Gift Add-ons | tag `addon` | Chocolates, teddy, card, balloon, vase upgrade — not standalone gifts |

---

## 3. Architecture diagram

```
THE NEW GREENHOUSE — DELUXE CATALOG
│
├─ SHOP BY OCCASION  (primary browse — 1 product : 1 primary occasion)
│   ├─ Birthday ............... birthday
│   ├─ Anniversary ........... anniversary
│   ├─ Love & Romance ........ love-and-romance
│   ├─ Sympathy & Funeral .... sympathy-and-funeral
│   ├─ Congratulations ....... congratulations
│   ├─ Thank You ............. thank-you
│   ├─ Get Well Soon ......... get-well
│   ├─ New Baby .............. new-baby
│   ├─ Corporate Gifts ....... corporate-gifting
│   ├─ Wedding ............... wedding            (made-to-order)
│   └─ Mother's Day .......... mothers-day        (seasonal spotlight)
│
├─ COLLECTIONS  (editorial overlays — 1 product : many)
│   ├─ Best Sellers .......... best-sellers        [collection:best-seller]
│   ├─ Signature ............. signature-collection [collection:signature]
│   ├─ Luxury Bouquets ....... luxury-bouquets      [collection:luxury-bouquet]
│   └─ Seasonal ............. seasonal-deluxe       [collection:seasonal]
│
├─ FILTERS  (facets, never nav destinations)
│   ├─ Flower ..... flower:rose | orchid | lily | peony | hydrangea | …
│   ├─ Palette .... palette:red | blush | white | ivory | pastel | jewel | gold | …
│   ├─ Price tier . tier:standard | premium | luxury | signature
│   ├─ Format ..... format:bouquet | vase | box | basket | stand
│   └─ Recipient .. recipient:her | him | couple | family | new-parent | colleague | client
│
└─ UTILITY
    ├─ Same-Day Delivery ..... same-day-delivery  [delivery:same-day]
    └─ Gift Add-ons .......... gift-add-ons       [addon]  (checkout upsell only)

           A PRODUCT'S ADDRESS
           ────────────────────
   1 primary occasion  (required)
 + 0–1 secondary occasion (optional)
 + 0–n curated collections (optional, hand-picked)
 + auto filters via tags (flower / palette / tier / format / recipient)
 + optional same-day / addon flags
```

---

## 4. Membership rules (how a product finds its home)

1. **Exactly one primary occasion.** Drives breadcrumbs, canonical collection, and the default "Shop more like this" rail.
2. **At most one secondary occasion.** e.g. a blush rose bouquet is `romance` (primary) + `anniversary` (secondary). Avoid stacking >2 — it dilutes merchandising.
3. **Curated membership is editorial**, added by hand, capped so each stays special: Signature ≤ 12, Best Sellers ≤ 10, Luxury Bouquets ≤ 12, Seasonal rotates (≤ 12 live).
4. **Add-ons never carry an occasion collection** — they only appear in `gift-add-ons` and as PDP/cart upsells.
5. **Weddings are excluded from `same-day-delivery`** (made-to-order, lead-time based).
6. **Sympathy is excluded from bright-palette filters** and from Best Sellers cross-merchandising to keep tone appropriate.

---

## 5. Navigation mapping

- **Deluxe header → "Shop by Occasion"** mega-menu = the 11 occasion collections (Mother's Day surfaced seasonally).
- **Deluxe header → "Collections"** = the 4 curated collections.
- **"Same-Day"** = utility link in header/footer.
- **Add-ons** never appear in nav — they surface on PDP ("Complete your gift") and in cart.
- Filters live on collection + search pages, driven entirely by the tag taxonomy in [`02-shopify-structure.md`](02-shopify-structure.md).

---

## 6. Scale & governance

- Target launch catalogue: **~50 products** across the layers (see the master CSV).
- Each occasion collection should hold **3–8** products at launch; grow by adding within tiers (a Standard, a Premium, a Luxury option minimum per occasion so every budget is served).
- Review curated collections monthly; rotate Seasonal quarterly.
- No product ships without: 1 primary occasion, ≥1 tier tag, ≥1 flower tag, ≥1 palette tag, an image, and full SEO fields.
