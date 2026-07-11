# Content Status

Legend: ✅ Existing · ❌ Missing · ⚠ Needs rewriting
**Source:** Live Storefront API audit (`ax41k1-k5.myshopify.com`, `2026-04`) 2026-07-11 + code-authored content.

| Area | Status | Detail (live) |
|---|---|---|
| **Product copy** | ❌ **Missing (no products)** | Storefront API returns **0 products**. Nothing to grade. Blocks PDP/collection commerce. |
| **Collection copy** | ⚠ / ❌ | 12 collections exist; **only "Luxury Bouquets" has a description**; the other 11 are blank; all lack SEO. Home promotes fabricated cards not mapped to these real handles. |
| **Homepage** | ⚠ Needs rewriting | Rich code-authored copy exists, but testimonials are **fabricated**, heritage claims unverified, no wholesale voice; promoted collections don't map to real handles. |
| **About** | ❌ Missing content | `/pages/about-us` exists but **body is empty**. |
| **FAQ** | ❌ Missing content | `/pages/faq` exists but **body is empty**. |
| **Wedding & Events** | ❌ Missing content | `/pages/wedding-events` exists, **empty**. |
| **Corporate** | ❌ Missing content | `/pages/corporate-flowers` exists, **empty**. |
| **Delivery** | ❌ Missing content | `/pages/delivery-information` exists, **empty**. |
| **Contact** | ❌ Missing content | `/pages/contact` exists, **empty** (no form/details). |
| **Policies** | ⚠ Incomplete | ✅ Privacy Policy only. ❌ **Refund, Shipping, Terms, Subscription missing** — needed for delivery + wholesale/trade terms. |
| **Blog** | ❌ Empty | "News" blog exists with **0 articles**. No editorial/care-guide content (a BloomsByTheBox staple). |
| **SEO / Meta** | ⚠ Needs work | Collection/page/product SEO fields all **null** in Shopify; code has scaffold `Hydrogen | …` titles on several routes; no JSON-LD/OG. See `docs/SEO_STATUS.md`. |
| **Shop brand copy** | ❌ Missing | Shop `description`, brand `slogan`/`shortDescription` all null. |

---

### The core content reality
The store was scaffolded (collections + pages + blog + 1 policy created 2026-07-02) but **almost no content was entered**: 0 products, 11/12 collections without descriptions, 6/6 pages empty, 0 blog articles, 4/5 policies missing. Functionally there is **nothing to sell and little to read.**

### Content to author (owner + M9), priority order
1. **Products** (blocking everything) — titles, descriptions, SEO, photos, variants, **wholesale/bulk pricing model**.
2. **Collection descriptions + SEO** for all 12; map homepage featured cards to real handles.
3. **Page bodies:** About (real brand story — verify "40+ years"), Wholesale (new), Wedding, Corporate, Delivery, FAQ, Contact (+ form).
4. **Policies:** Refund, Shipping, Terms (+ wholesale/trade terms).
5. **Blog:** launch with care guides / seasonal / wedding editorial (SEO + BloomsByTheBox-style education).
6. **Wholesale voice** across copy: MOQ, bulk/box, trade accounts, wedding/event/corporate volume.
7. **Replace fabricated homepage testimonials** with real, attributed quotes.
8. **Shop brand fields** (description, slogan) in Shopify.

**Dependency:** product/collection/page content is owner-entered in Shopify; storefront rendering + rewrite + SEO wiring happens in **M9 (content)** and **M11 (SEO hardening)**.
