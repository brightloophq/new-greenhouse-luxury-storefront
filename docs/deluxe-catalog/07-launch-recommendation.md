# Launch Recommendation — Deluxe Catalogue

Recommended sequence to take the blueprint from approved plan → live luxury catalogue, safely and in the right order. **Nothing below runs until you approve it.**

---

## 1. Guardrails carried from prior phases

- **Do not touch** the Wholesale storefront, Wholesale catalogue, or completed cleanup — all production-ready and frozen.
- **Do not modify** the existing 19 Deluxe products except where this blueprint deliberately enriches them (and only after per-item approval).
- Storefront code + open PR remain **unchanged** during catalogue work.
- Every write phase: **rollback manifest → dry-run → validate → live only on clean validation**. No invented stock (untracked + CONTINUE). Botanical/image validation gate before any image is attached.

## 2. Phased rollout

### Phase 0 — Approve the blueprint (this phase)
Review the 10 deliverables. Lock naming, tiers, taxonomy, collection list, and the product roster. **Output: signed-off master CSV.**

### Phase 1 — Collections & taxonomy (structure first, no products)
- Create/confirm the 11 occasion + 4 curated + 2 functional collections (handles per architecture doc).
- Confirm metafield definitions (`custom.*`) exist.
- Confirm filter facets map to the tag namespaces.
- Dry-run → apply (Admin-gated). No products created yet.

### Phase 2 — Enrich the existing 19 (no new products, no image regen)
- Backfill tags, metafields, SEO fields, size variants, and collection membership on the current Deluxe products to match the blueprint.
- Keep existing approved imagery. Per-item diff → approve → write. Rollback manifest.

### Phase 3 — Image generation for NEW products (gated, batched)
- Generate the ~31 new-product images via the Gemini pipeline in the house style.
- **Dry-run first**, then live; **validate every image** (botanical accuracy + brand consistency) before it's kept; optimise to WebP `{200,300,400,800}`; keep originals.
- Batch by occasion; approve each batch's contact sheet before proceeding.

### Phase 4 — Create NEW products (batched by occasion)
- For each approved batch: create product (DRAFT) → attach validated image → set type/vendor/tags/metafields/variants/SEO → assign collections → availability (untracked/CONTINUE) → publish to Online Store + Deluxe channel.
- Rollback manifest per batch; post-write Admin + storefront verification (PDP renders, buyable, in correct collections, SEO present, no "Sold Out").
- Suggested order: Best Sellers/Signature first (highest impact), then Romance, Birthday, Anniversary, Sympathy, Corporate, Wedding, remaining occasions, Add-ons last.

### Phase 5 — Merchandising & concierge
- Curate Best Sellers / Signature / Seasonal memberships.
- Wire PDP cross-sell/upsell + "Complete your gift" add-ons.
- Seed the concierge index from the master CSV.

### Phase 6 — QA & go-live
- Full route × experience QA (SSR/status/SEO/a11y/responsive) — reuse the established matrix.
- Verify Classic/Wholesale untouched; cart/checkout/search/account intact.
- Screenshots, final report, then flip visibility / announce.

## 3. Sequencing rationale

- **Structure before content** (collections + metafields first) so products land into a ready home and filters work on day one.
- **Enrich before expand** — upgrade the 19 you already have before adding 31, so the whole catalogue is consistent, not two tiers of quality.
- **Images gated and validated** — the single biggest quality risk; never bulk-attach unvalidated output.
- **Add-ons last** — they depend on host products existing to upsell against.

## 4. Recommended launch roster (priority)

| Priority | Set | Why |
|---|---|---|
| P1 | Signature + Best Sellers + Love & Romance | Highest-margin, highest-intent, brand-defining |
| P2 | Birthday + Anniversary + Thank You | Everyday volume drivers |
| P3 | Sympathy + Get Well + New Baby | Steady need-based demand |
| P4 | Corporate + Wedding | Higher-touch, consultation/lead-time |
| P5 | Seasonal + Add-ons | Ongoing rotation + attach-rate lift |

## 5. Success criteria at go-live

- Every occasion collection has **≥3 products spanning ≥2 tiers** (a reachable price for every gifter).
- 100% of products: image + alt + SEO + metafields + correct collections + buyable.
- Concierge returns a sensible top-3 for each of the 11 occasions.
- Wholesale/Classic entirely unaffected; shared cart/checkout/search green.
- Lighthouse/LCP within the project's performance budget.

## 6. What NOT to do

- No image generation, product creation, or Shopify writes before explicit approval of this blueprint.
- No merging the open PR as part of catalogue work.
- No pricing/handle changes to live products without redirects + approval.
- No unvalidated or wrong-variety imagery attached.
