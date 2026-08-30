# Phase 1C — Catalogue Decision & Cleanup Audit

> **Read-only audit. No Shopify data was modified to produce this document.**
> Baseline evidence: the authoritative **pre-write** live export snapshot `a50c28e`
> (`catalog/live-audit/analysis.json`, generated 2026-08-29). Batches 1 and 2 changed
> only the SEO/body of 7 collections, so every other fact in that snapshot is still
> current; for those 7 collections the current SEO/body equals the approved copy that
> was written (the snapshot booleans are stale **for those 7 only**).

---

## 1. Post-batch catalogue health

**Completed and verified (audit → dry-run → backup → controlled write → verification → blast-radius):**

- **Batch 1** — `premium-handcrafted`, `premium-vase`, `premium-heart-box` — `seo.title` + `seo.description` only.
- **Batch 2** — `same-day-delivery`, `plants`, `thank-you`, `luxury-bouquets` — `descriptionHtml` + `seo.title` + `seo.description`.

**Provenance / state distinction:**

| State | Source | Notes |
|---|---|---|
| PRE-WRITE snapshot | `analysis.json` @ `a50c28e` | Shows the 7 batch collections as SEO/body-empty (now stale for those 7) |
| KNOWN POST-WRITE | Batch verifications + approved copy | The 7 collections now carry the approved SEO/body; both batches reported success with blast-radius proof |
| Everything else | `a50c28e` | Still current — batches touched no products and no other collections |

**Collection SEO coverage:** 33 → **40 / 52** collections now have SEO title + description.

- Catalogue size (authoritative): **274 products · 427 variants · 52 collections.**
- Product SEO coverage: 274/274 title + description (100%).
- A fresh read-only export is **optional** (only to reset the working baseline); it is not required for the decisions below. Command (local Mac): `cd commerce-manager && node scripts/export-live-audit.js && node scripts/analyze-live-audit.js`.

---

## 2. Duplicate product SEO-title findings

### Harmful — fix worthwhile
**`Mixed | The New Greenhouse` (4-way):** `gift-bouquets-mixed`, `greenery-mixed`, `novelties-mixed`, `tropicals-mixed`.
- All four are **live on the Online Store channel** (shopper-visible).
- Four live products share one generic, non-descriptive SEO title → weak for search + a duplicate signal.
- **Recommended replacements (safe, factual — not yet written):** `Mixed Gift Bouquets`, `Mixed Greenery`, `Mixed Novelty Stems`, `Mixed Tropical Flowers`, each suffixed ` | The New Greenhouse`.
- Owner input required: **No.**

### Benign / low-priority — tier pairs
| Group | Handles | Note |
|---|---|---|
| Red Rose Romance | `red-rose-romance-bouquet` (not on Online Store), `red-rose-romance-luxe` (on Online Store) | Standard-vs-luxe tier pair; low risk |
| Blush Romance | `blush-romance-bouquet` (not on OS), `blush-romance-luxe` (on OS) | Low risk |
| Get Well Sunshine | `get-well-sunshine-bouquet` (not on OS), `get-well-luxe` (on OS) | Low risk |

- Optional differentiation later (e.g. `… Luxe Bouquet`). The three "-luxe" halves also appear in the thin-description backlog (§6) and are best handled there in one pass.
- Per-product `productType`/`status`/membership for these SKUs is not in the snapshot (raw dump is local-only); a fresh export would fill it but does not change these verdicts.

---

## 3. Empty collection decision matrix

All are **0 products** yet **published to Online Store + Point of Sale + New Greenhouse Luxury Storefront** → live thin/soft-404 pages (index-bloat risk). **Do not add SEO copy while empty.**

| Collection | Products | Body/SEO | Likely purpose | Overlap / canonical | Recommendation | Redirect work if retired |
|---|---|---|---|---|---|---|
| `birthday-flowers` | 0 (has image) | none | Occasion | `all-flowers`, `best-sellers` | **A populate** or **C redirect** | Yes |
| `anniversary-flowers` | 0 | none | Occasion | `love-romance`, `luxury-bouquets` | **A populate** or **C redirect** | Yes |
| `love-romance` | 0 (has image) | none | Romance | `anniversary-flowers`, roses | **B consolidate** (one romance collection) | Yes |
| `sympathy` | 0 (has image) | none | Sympathy | **duplicate of `sympathy-and-funeral` (33)** | **D retire → C redirect** → `sympathy-and-funeral` | Yes |
| `wedding-flowers` | 0 (has image) | none | Wedding | `bridal-bouquets` (3) | **E hold — owner-gated** (§5) | Depends |
| `corporate-flowers` | 0 | none | Corporate | **dup of corporate-gifting/gifts (40)** | **D retire → C redirect** → corporate canonical | Yes |
| `gift-baskets` | 0 | none | Gift baskets | products like `fruit-flower-gift-basket` exist | **A populate** (matching products exist) | Maybe |
| `tropical-flowers` | 0 | none | Tropical | `all-flowers`; tropical products exist | **A populate** (island-relevant + products exist) | Yes if retired |

**Clear calls:** `sympathy` and `corporate-flowers` → retire + redirect. `gift-baskets` and `tropical-flowers` → likely populate (matching products already exist). Occasion collections → owner populate-or-consolidate.

(Note: `orchids` is also 0 products but already carries SEO+body and sits only on the Storefront channel — legacy; fold into the same populate-or-retire review.)

---

## 4. Collection consolidation / canonicalization

| Family | Members (products) | Assessment | Primary | Secondary → redirect | Internal-link change | SEO implication |
|---|---|---|---|---|---|---|
| **Corporate** | `corporate-gifting` (40), `corporate-gifts` (40), `corporate-flowers` (0) | **Accidental duplicate** — two identical 40-product live collections with full SEO competing | **`corporate-gifting`** (pending owner terminology confirm) | `corporate-gifts`, `corporate-flowers` → primary | Yes (nav/footer/links) | Removes a real duplicate-content signal |
| **Sympathy** | `sympathy-and-funeral` (33), `sympathy` (0) | `sympathy` = empty legacy dupe | `sympathy-and-funeral` | `sympathy` → primary | Check nav | Removes thin dup |
| **Wedding** | `wedding-flowers` (0), `bridal-bouquets` (3) | Owner-gated (§5) | TBD | TBD | TBD | Gated |
| **Wholesale / retail** | `bulk-flowers` (189), `all-flowers` (116), `wholesale-roses` (4), `wholesale-greenery` (5), `florist-essentials` (42), `floral-supplies` (10) | **Legitimate separate intent** (wholesale vs retail vs supplies) | Keep all separate | — | — | No consolidation |

The corporate duplicate is the single most important canonical fix. Implementation is **TECH (redirect) + OWNER (pick canonical)** — not performed here.

---

## 5. Wedding decision gate (OWNER-gated)

Evidence (current publication state, from `a50c28e`):

- **A. Clearly wedding-specific (8):** `bridal-bouquet-ivory-garden`, `bridal-bouquet-cascading-blush`, `bridesmaid-bouquet`, `low-reception-centerpiece`, `elevated-reception-centerpiece` (all **DRAFT**); `ceremony-aisle-arch-arrangement`, `sweetheart-table-arrangement`, `intimate-wedding-flower-package` (**ACTIVE but not on Online Store**). None shopper-visible via Online Store.
- **B. Multipurpose stems (~23)** tagged/collected into wedding — the **11 "visible" wedding items are all here** (ivory roses, orchid stems, calla lilies, anthurium, torch ginger, ruscus, palm, baby's breath). Visible because they are general ACTIVE stems, not because a wedding PDP is live.
- **C. Ambiguous bridal-palette (3):** `long-stem-ivory-roses`, `ivory-garden-roses`, `calla-lilies-ivory`.
- **D. Collections/routes:** `wedding-flowers` (0 products, live), `bridal-bouquets` (3 products, live on storefront). Storefront code still 301s wedding routes and hides wedding nav.

**Implementation paths (execute only after Nicola answers — see Owner Decision section):**

- **IF YES:** restore wedding routes/nav in storefront code; publish `wedding-flowers` + `bridal-bouquets` and the 8 wedding-specific products (populate `wedding-flowers`); commission wedding SEO/body copy; keep multipurpose stems as-is.
- **IF NO:** unpublish/redirect `wedding-flowers` + `bridal-bouquets`; keep the 8 wedding-specific products DRAFT/archived (no delete); remove the wedding tag/collection membership from the ~23 multipurpose stems so they remain sellable as general/wholesale flowers; leave storefront 301s in place.

---

## 6. Thin-description backlog (19 products, all premium-retail cluster)

Factual attributes needed for safe copy are **not** in the repo for these; each is **HOLD** until a per-product read confirms variety/colour/size. **Do not fabricate** flower variety, size, stem count, vase, colour, availability, delivery, care, origin, or pricing.

- **P0 (commercial + indexable):** `grand-red-rose-arrangement`, `royal-hydrangea-arrangement`, `luxury-mixed-garden-bouquet`, `classic-white-sympathy-arrangement`, `corporate-elegance-arrangement`.
- **P1 (useful):** `white-orchid-elegance`, `golden-celebration-bouquet`, `signature-ivory-blush-bouquet`, `luxury-tropical-arrangement`, `congratulations-brights-bouquet`, `new-baby-soft-pastels-bouquet`, `sunshine-birthday-bouquet`, `thank-you-peach-bouquet`, `seasonal-luxe-bouquet`.
- **P2 (legacy luxe-tier duplicates):** `blush-romance-luxe`, `red-rose-romance-luxe`, `get-well-luxe` (tie to §2 title differentiation).
- **HOLD (seasonal/wedding-gated):** `premium-mothers-day-bouquet`, `bridal-white-bouquet` (wedding → §5).

All remain HOLD until attributes are confirmed by a read; then P0 → P1. No copy written.

---

## 7. Shopify / source-of-truth recommendation

194 live-only / 0 source-only / 0 drift → Shopify (274) is strictly ahead of the repo seed fixture (80). Segments: wholesale single-stem matrix (~140), premium retail (~54), plus 10 legacy/duplicate stem-title pairs.

**Recommendation:** make **Shopify the single source of truth** for catalogue content; retire `catalog/product-master-data.json` as a catalogue authority. Keep `catalog/live-audit/` exports as periodic read-only snapshots for auditing/diffing. **No mass sync** back into the fixture. This is an architecture/TECH note, not a task.

---

## 8. Image action queue (no generation/upload)

33 imageless products: **wedding 23, wholesale 10** (premium/legacy/other 0).

| Bucket | Handles (status) | Action |
|---|---|---|
| Wedding-gated, DRAFT (16) | long-stem red/pink roses, oriental lilies, hydrangeas ×3, heliconia, bird-of-paradise, eucalyptus ×2, wax-flower, statice, solidago, bridal-bouquet ×2, bridesmaid, reception centerpieces ×2 | **HOLD** — depends on §5 |
| Wedding, ACTIVE (7) | `assorted-spray-roses`, `spray-mini-carnations`, `ceremony-aisle-arch-arrangement`, `sweetheart-table-arrangement`, `intimate-wedding-flower-package` (+ visible stems) | General stems need photos; wedding-specific gated by §5 |
| Wholesale/sympathy + add-ons, ACTIVE (9) | `standing-spray-classic-white`, `standing-spray-mixed-tribute`, `sympathy-wreath-ivory-greenery`, `casket-spray-full-ivory`, `tribute-basket-arrangement`, `memorial-vase-arrangement`, `fruit-flower-gift-basket`, `belgian-chocolates-add-on`, `plush-teddy-bear-add-on` | **PHOTOGRAPH (P1)** — live products with no image |
| Wholesale, DRAFT (1) | `long-stem-yellow-roses` | Low priority (not visible) |

**Collection imagery (separate):** only 4/52 collections have an image and 0 have image alt → broad low-risk backlog (hero images + alt on ~10 commercial collections). No images generated or uploaded.

---

## 9. Remaining collection SEO/body gaps (after Batches 1 & 2)

40/52 covered; 12 remain. Buckets:

- **ALREADY HEALTHY (40):** incl. Batch 1 & 2, `corporate-gifting`, `corporate-gifts`, `sympathy-and-funeral`, `bulk-flowers`, `all-flowers`, `florist-essentials`, `wholesale-*`.
- **SAFE CONTENT BACKFILL (2, optional):** `best-sellers` (5), `signature-collection` (4). **`seasonal-deluxe` (3) with caution** — rotational copy dates quickly.
- **EMPTY — DO NOT WRITE (8):** the eight in §3.
- **DUPLICATE / CANONICAL DECISION:** `corporate-flowers`, `sympathy` (retire/redirect, not backfill).
- **UTILITY — LOW/NO SEO VALUE (1):** `frontpage` (1 product; homepage feed) → **skip**.
- **OWNER DECISION:** `wedding-flowers` (+ empties needing populate/retire).

The safe-backfill candidates are thin (3–5 products) and rotational → low, decaying SEO value. A further SEO batch on them is permissible but **marginal**, and not prioritized over the owner/tech decisions.

---

## 10. Prioritized cleanup queue

| Pri | Issue | Handles | Evidence | Action | Risk | Shopify write later? | Storefront code later? |
|---|---|---|---|---|---|---|---|
| **P1** | Empty live collections = thin/index-bloat | 8 empties (§3) | 0 products, published to OS+POS+Storefront | Retire/redirect or populate | Low–Med | Yes (unpublish) | Yes (redirects) |
| **P1** | Corporate duplicate collections | `corporate-gifting` vs `corporate-gifts` (+`corporate-flowers`) | two identical 40-product live collections | Pick canonical → redirect others | Med | Yes | Yes |
| **P1** | Sympathy/add-on imageless live products | 9 ACTIVE (§8) | live, no image | Photograph | Low | media upload | No |
| **P2** | "Mixed" duplicate SEO titles | 4 `*-mixed` | 4 visible identical titles | Differentiate titles | Low | Yes (small) | No |
| **P2** | Thin premium descriptions | 19 (§6) | <200 chars | Improve after attribute read | Low | Yes | No |
| **P2** | `best-sellers`/`signature-collection` SEO | 2 | live, no SEO/body | Optional SEO+body batch | Low | Yes (small) | No |
| **P2** | Collection hero images/alt | ~10 commercial | 4/52 imaged, 0 alt | Add images+alt | Low | media upload | No |
| **OWNER** | Wedding service yes/no | §5 | 8 specific + 23 stems + 2 collections | One question → path | — | Depends | Depends |
| **OWNER** | Populate-vs-retire empties | §3 | — | Nicola decides | — | — | — |
| **TECH** | Source-of-truth model | 194 live-only | fixture 80 vs live 274 | Shopify authoritative; retire fixture | Low | No | No |
| **TECH** | Redirect strategy | retired/dup collections | — | 301 map | Med | No | Yes |
| **SKIP** | `frontpage` SEO; luxe-pair title tweaks | — | utility / negligible | none | — | — | — |

---

## 11. SEO Phase 1 stop condition (explicit)

Shopify catalogue SEO Phase 1 is considered **sufficiently complete** when:

1. All commercially important, populated, shopper-visible collections have SEO title + description + body — **already true** (Batches 1 & 2 + the pre-existing healthy set = 40/52).
2. No **harmful** duplicate metadata remains on visible products — one item left (the "Mixed" group), a small safe fix.
3. Empty/duplicate collections have an **owner decision recorded** (populate vs retire) — pending the Owner Decision section below.

Explicitly **out of scope / not required** for Phase 1 completion: SEO copy for empty, utility, or rotational collections; 100% collection coverage; thin-description rewrites gated on attribute data; collection hero imagery. These are **backlog**, not blockers. We are optimizing for commercial impact and risk reduction, not for making every audit metric reach 100%.

**Decision recorded: B — Catalogue SEO Phase 1 can close after the owner decisions below.**

---

## 12. Recommended next workstreams

Owner catalogue decisions gate a few catalogue cleanups but **do not block** the measurement/marketing/AI workstreams, which can begin in parallel now.

1. **Owner catalogue decisions** (below) — unblock empty/duplicate/wedding cleanup.
2. **Google Business Profile / local SEO** — Kingston & St. Andrew local capture.
3. **Search Console** — monitoring + indexation (resolve empty/duplicate collections before pushing hard on indexation, to avoid indexing thin/dup URLs).
4. **GTM + GA4** — measurement foundation.
5. **AI Business Knowledge Base.**
6. **AI Email Sales Manager.**
7. **AI Voice Receptionist.**
8. **Social Media Automation.**

---

## Owner Decision Section — for Nicola

Plain-language decisions only. Technical actions (redirects, canonicals, metadata, collection architecture) are ours to translate afterwards.

### Question 1 — Wedding / Event Floristry
Does The New Greenhouse currently offer wedding/event floristry as an active service that should be marketed and sold through the website?

**Answer: YES / NO**

### Question 2 — Corporate offering name
We have more than one "corporate" section that currently shows the same products. We would like to present this as a single section and recommend calling it **"Corporate Gifting"**.

Does "Corporate Gifting" accurately represent how you want this service presented to customers? (If you use different wording in the business, tell us what it should be called.)

**Answer: ______________________**

### Question 3 — Occasion / category sections
Should each of these remain an active offering the business wants to sell? (Yes = we will stock and feature it; No = we will remove it from the site.)

- Birthday Flowers — **YES / NO**
- Anniversary Flowers — **YES / NO**
- Love & Romance — **YES / NO**
- Gift Baskets — **YES / NO**
- Tropical Flowers — **YES / NO**

---

## Safety / provenance

- Read-only audit. **Shopify writes: 0.** No write script, no catalogue change, no storefront code change.
- No merge, no deploy; `redesign-v1` and production untouched; parked stash not restored.
- Evidence source: `catalog/live-audit/analysis.json` (`a50c28e`) + known post-write state of the 7 batch collections.
