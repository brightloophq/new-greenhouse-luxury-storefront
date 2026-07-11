# Project Discovery — Readiness Report (Live)

**Date:** 2026-07-11 · **Access:** Live Storefront API reached (`ax41k1-k5.myshopify.com`, API `2026-04`). Discovery is now **complete**.

---

## Verdict

### 🟡 Milestone 1 (Design Foundation): **READY — cleared to begin** (data-independent).
### 🔴 Commerce milestones (M4/M5/M6/M8): **BLOCKED** — the store has **no products** and no wholesale model.

Discovery is complete. M1 (brand tokens, palette, fonts, component-system groundwork) needs no catalog and can start now. But the store is a near-empty scaffold, so every product/collection/checkout milestone is blocked on owner content entry.

---

## Live store state (audited)

| Entity | Live count | Verdict |
|---|---|---|
| **Products** | **0** | 🔴 None published to the Hydrogen channel — blocks all commerce |
| Collections | 12 | 🟡 Good taxonomy; all empty; 7 lack images, 11 lack descriptions, all lack SEO; Wedding image is wrong |
| Pages | 6 | 🟡 Exist (About, FAQ, Wedding, Corporate, Delivery, Contact) but **all bodies empty** |
| Blog / articles | 1 / 0 | 🟡 "News" blog, no articles |
| Policies | 1 of 5 | 🟡 Privacy only; Refund/Shipping/Terms missing |
| Menus | main + footer | 🟡 Main has a broken "Occasions → #"; footer only "Search"; no wholesale nav |
| Shop brand | — | 🔴 description/slogan/logo/colors all empty; **currency USD-only** (not JMD) |
| Metafields | — | ⏸ Deferred (no products to carry them) |

Full detail: `docs/ASSET_INVENTORY.md`, `docs/CONTENT_STATUS.md`, `docs/IMAGE_SHOTLIST.md`, `docs/SEO_STATUS.md`.

---

## Discovery deliverables — all complete
| Doc | Status |
|---|---|
| `docs/ASSET_INVENTORY.md` | ✅ Complete (live) |
| `docs/CONTENT_STATUS.md` | ✅ Complete (live) |
| `docs/IMAGE_SHOTLIST.md` | ✅ Complete (targets + live gap) |
| `docs/SEO_STATUS.md` | ✅ Complete (code + live) |
| `docs/READINESS_REPORT.md` | ✅ This document |

---

## Missing for BloomsByTheBox parity (luxury black-and-gold preserved)
- **Products** — the entire catalog, with photos (4:5), descriptions, SEO, variants, and a **wholesale/bulk model** (box/case/stem, MOQ, tiered pricing). *Nothing exists today.*
- **Imagery** — all 15 shotlist shots; every current collection image needs regeneration (low-res/mislabeled); product + lifestyle + wholesale-warehouse + wedding + packaging photography; brand logo; black/gold icon set; OG image.
- **Content** — 6 empty pages to author, Wholesale page (new), 4 missing policies, blog/care-guide content, real testimonials, shop brand copy.
- **Navigation/IA** — fix "Occasions" link, build footer, add wholesale nav, real mega-menu source.
- **SEO** — branded titles (remove `Hydrogen | …`), meta descriptions, JSON-LD (LocalBusiness/Product/Breadcrumb), OG/Twitter.
- **Config** — confirm currency (JMD vs USD), publish products to the Hydrogen sales channel.

---

## Owner action checklist (parallel to M1)
Blocking commerce, **not** M1:
1. **Create & publish products** to the Hydrogen sales channel (confirm whether products exist in admin but are unpublished).
2. Decide & implement the **wholesale model** (native B2B / metafields / tags) — unblocks M8 scope.
3. Populate collection **images + descriptions + SEO**; fix the Wedding collection image.
4. Author the **6 page bodies** + add Wholesale page.
5. Add **Refund / Shipping / Terms** policies.
6. Build the **footer menu**; fix "Occasions → #".
7. Confirm **currency** (USD-only today).

---

## Decision applied
Per your instruction ("complete the docs, then begin Milestone 1"), and because **M1 is data-independent**, discovery is closed and **Milestone 1 (Design Foundation) begins now**. Commerce milestones remain gated on the owner checklist above. M1 progress is tracked in `docs/MILESTONE-1.md`.
