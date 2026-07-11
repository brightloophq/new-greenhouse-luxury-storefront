# Asset Inventory

**Method:** Live audit via Storefront API (`ax41k1-k5.myshopify.com`, API `2026-04`) on 2026-07-11, plus repo assets. The Storefront API returns only content **published to the Hydrogen sales channel** — see the products note below.

---

## 0. Headline: the store is a near-empty skeleton
| Entity | Count (live) | State |
|---|---|---|
| **Products** | **0** | ❌ None returned by Storefront API (no products, or none published to the Hydrogen channel) |
| Collections | 12 | ⚠ All empty; most missing image/description/SEO |
| Pages | 6 | ⚠ All exist but empty bodies, no SEO |
| Blog / articles | 1 / **0** | ⚠ "News" blog, no articles |
| Policies | 1 of 5 | ⚠ Only Privacy Policy |
| Menus | 2 | ⚠ Main OK-ish (1 broken link); footer nearly empty |

---

## 1. Images

### 1a. Repo assets (`app/assets/`)
| File | Resolution | Aspect | Size | Needs work |
|---|---|---|---|---|
| `greenhouse-hero-editorial-1920.jpg` | 1920×1080 | 16:9 | 274 KB | Upscale→3840×2160 for hero |
| `greenhouse-occasion-banner-1600.jpg` | 1600×900 | 16:9 | 263 KB | Over-reused; wrong ratio for cards |
| `greenhouse-botanical-banner-1600.jpg` | 1600×900 | 16:9 | 210 KB | Over-reused |
| `favicon.svg` | vector | 1:1 | 690 B | OK |

### 1b. Shopify media (live)
- **Product images: 0** (no products).
- **Collection images: 5 of 12 present**, all low-res PNG (~744×360–385, roughly 2:1):
  | Collection | Image | Issue |
  |---|---|---|
  | Luxury Bouquets | `birthday_ffb5…png` 744×360 | Low-res; filename suggests wrong source |
  | Birthday Flowers | `birthday.png` 744×360 | Low-res |
  | Love & Romance | `love_and_romance.png` 743×385 | Low-res |
  | Sympathy | `syympha.png` 750×382 | Low-res; typo filename |
  | Wedding Flowers | `sympthy.png` 744×371 | **Wrong image** (sympathy photo on wedding collection) + low-res |
  | Anniversary, Corporate, Gift Baskets, Plants, Same-Day, Tropical, Home page | — | ❌ **No image** |
- **All collection images fail luxury bar:** ~744px wide, 2:1 PNGs — need regeneration at collection ratio (16:10, ≥2000px) in the black/gold identity.
- **No page/blog/brand imagery**; shop `brand.logo` is null.

---

## 2. Products
| Question | Finding |
|---|---|
| How many? | **0** via Storefront API. Either no products created, or products exist in admin but are **not published to the Hydrogen sales channel**. ⚠ **Owner must confirm & publish.** |
| Missing photos? | N/A until products exist. |
| Missing descriptions? | N/A until products exist. |
| Missing SEO? | N/A until products exist. |
| Missing variants? | N/A — **wholesale/bulk variant model cannot be assessed with 0 products. M8 remains fully blocked.** |

**This is the #1 blocker for all commerce milestones (M4, M5, M6, M8).**

---

## 3. Collections (12, all empty)
| # | Title | Handle | Image | Description | SEO |
|---|---|---|---|---|---|
| 1 | Home page | `frontpage` | ❌ | ❌ | ❌ |
| 2 | Luxury Bouquets | `luxury-bouquets` | ✅ low-res | ✅ (only one) | ❌ |
| 3 | Birthday Flowers | `birthday-flowers` | ✅ low-res | ❌ | ❌ |
| 4 | Anniversary Flowers | `anniversary-flowers` | ❌ | ❌ | ❌ |
| 5 | Love & Romance | `love-romance` | ✅ low-res | ❌ | ❌ |
| 6 | Sympathy | `sympathy` | ✅ low-res | ❌ | ❌ |
| 7 | Wedding Flowers | `wedding-flowers` | ⚠ wrong img | ❌ | ❌ |
| 8 | Corporate Flowers | `corporate-flowers` | ❌ | ❌ | ❌ |
| 9 | Gift Baskets | `gift-baskets` | ❌ | ❌ | ❌ |
| 10 | Plants | `plants` | ❌ | ❌ | ❌ |
| 11 | Same-Day Delivery | `same-day-delivery` | ❌ | ❌ | ❌ |
| 12 | Tropical Flowers | `tropical-flowers` | ❌ | ❌ | ❌ |

- **Enough?** Good occasion coverage; but **every collection is empty** (0 products) and there's **no wholesale collection** (bulk/by-the-box/wedding-DIY).
- **Restructuring?** Add images/descriptions/SEO to all; fix Wedding image; decide `frontpage` usage; add wholesale/type/color facets for BloomsByTheBox parity.
- **Featured?** None flagged; home currently invents fabricated cards — should map to real handles (`luxury-bouquets`, `wedding-flowers`, `sympathy`, `gift-baskets`).

---

## 4. Navigation (live)
**Main menu** (`main-menu`): Home · Shop Flowers (`/collections`) · **Occasions → `#` (broken link)** · Weddings (`/pages/wedding-events`) · Corporate (`/pages/corporate-flowers`) · About (`/pages/about-us`) · Contact (`/pages/contact`).
- ⚠ "Occasions" points to `#` — dead. No dropdown/children on any item (mega-menu has nothing real to render). **No wholesale entry.**

**Footer menu** (`footer`): **only "Search."** ❌ No policies, no info, no company links, no social — footer is effectively empty.

---

## 5. Pages (6, all empty shells)
| Title | Handle | Body | SEO | Created |
|---|---|---|---|---|
| Contact | `contact` | ❌ empty | ❌ | 2026-07-02 |
| About Us | `about-us` | ❌ empty | ❌ | 2026-07-02 |
| Wedding & Events | `wedding-events` | ❌ empty | ❌ | 2026-07-02 |
| Corporate Flowers | `corporate-flowers` | ❌ empty | ❌ | 2026-07-02 |
| Delivery Information | `delivery-information` | ❌ empty | ❌ | 2026-07-02 |
| FAQ | `faq` | ❌ empty | ❌ | 2026-07-02 |

Routes exist (`pages.$handle`) and the pages exist in Shopify, but **all bodies are empty** → they render blank. Content authoring required (M9).

---

## 6. Blog & Policies
- **Blog:** "News" (`news`) — **0 articles.** Route works; nothing to show.
- **Policies:** ✅ Privacy Policy only. ❌ **Missing Refund, Shipping, Terms of Service, Subscription** — important for a delivery-based florist + wholesale.

---

## 7. Shop & commerce config (notable)
- `description`, `brand.slogan`, `brand.shortDescription`, `brand.logo`, `brand.colors` → **all null/empty** (no brand assets in Shopify).
- **Presentment currency: USD only** — despite Jamaica positioning and JMD pricing in the codebase fallbacks. ⚠ Confirm intended currency (JMD? USD? both?).
- Ships to 29 countries; `countryCode: JM`.

---

## Metafields
Not yet enumerable — product metafields are moot with 0 products; collection/shop metafield namespaces to be audited once products/structure exist. **Deferred until catalog is populated.**

---

### Blocking summary
**Owner action required before commerce milestones:** (1) create/publish **products** to the Hydrogen channel; (2) populate collection images/descriptions/SEO + fix Wedding image; (3) author the 6 pages; (4) add missing policies; (5) build the footer menu; (6) fix the "Occasions" `#` link; (7) confirm currency; (8) define the **wholesale model** (still unknown — blocks M8).
