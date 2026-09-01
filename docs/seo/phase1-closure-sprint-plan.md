# Phase-1 Catalogue-Cleanup Closure Sprint — Plan (PREPARE-ONLY)

> **Status: PREPARED, NOT EXECUTED.** No Shopify write has been performed. Nothing has been
> pushed. This document, the pure decision module (`commerce-manager/scripts/sprint-lib.js`),
> its self-test, and the read-only preflight (`commerce-manager/scripts/sprint-preflight.js`)
> are the entire deliverable of this step. Each write batch below is gated behind its own
> unique authorization phrase and will only be built/executed after explicit per-batch approval.
>
> Generated 2026-09-01. Branch: `docs/shopify-content-audit`.

---

## 0. Why this sprint exists

The approved Phase-1 audit (`docs/seo/phase1c-catalogue-cleanup-audit.md`) established, from a
live catalogue export, that the store carries **empty duplicate collections** shadowing populated
canonicals, plus occasion collections whose membership does not match merchandising intent, and
two commercial categories (Gift Baskets, Tropical Flowers) that need correct population. Gate-1
(the "Mixed" SEO-title de-duplication) is **closed and verified live**. This sprint closes the
remaining Phase-1 catalogue work as a **sequence of fail-closed, individually-authorized batches**
with read-only revalidation and post-write verification after every batch.

**"One sprint" does not mean one uncontrolled mutation.** If any batch fails verification: **STOP.**

### In scope (Batches A–H)
- **A** Incident-record closure (documentation only) — *done in this step.*
- **B** Duplicate-collection consolidation (retire 6 empty duplicates → 5 canonicals).
- **C** Redirects + internal-link migration for the retired handles.
- **D** — *reserved/merged into E* (retail occasion correction is one logical batch).
- **E** Retail-occasion membership correction (birthday / anniversary / love-and-romance).
- **F** Gift Baskets population.
- **G** Tropical Flowers population + collection SEO/body for canonicals & the two categories.
- **H** Final read-only audit (evidence that the catalogue is clean).

### Explicitly OUT of scope (do not touch in this sprint)
Weddings / wholesale-access architecture · storefront redesign · `redesign-v1` branch ·
production branch · production deploy · the parked stash · any unrelated product edit.

---

## 1. Canonical / retire / redirect matrix (source of truth: `sprint-lib.js`)

| Retire (empty duplicate) | Canonical (survivor) | 301 redirect |
|---|---|---|
| `birthday-flowers` | `birthday` | `/collections/birthday-flowers` → `/collections/birthday` |
| `anniversary-flowers` | `anniversary` | `/collections/anniversary-flowers` → `/collections/anniversary` |
| `love-romance` | `love-and-romance` | `/collections/love-romance` → `/collections/love-and-romance` |
| `corporate-gifts` | `corporate-gifting` | `/collections/corporate-gifts` → `/collections/corporate-gifting` |
| `corporate-flowers` | `corporate-gifting` | `/collections/corporate-flowers` → `/collections/corporate-gifting` |
| `sympathy` | `sympathy-and-funeral` | `/collections/sympathy` → `/collections/sympathy-and-funeral` |

Canonical survivors (never retired, asserted by `assertCanonicalSurvives`):
`birthday`, `anniversary`, `love-and-romance`, `corporate-gifting`, `sympathy-and-funeral`.

Retail occasion collections corrected in Batch E: `birthday`, `anniversary`, `love-and-romance`.

> These maps are frozen in `sprint-lib.js` and covered by `sprint-lib.selftest.js`. The write
> batches read live IDs/members from `sprint-state.json` (preflight) — **no stale IDs are
> hardcoded in any writer.**

---

## 2. Read-only preflight (run FIRST, on the Mac, before any write)

```
cd commerce-manager
node scripts/sprint-preflight.js        # QUERIES ONLY → catalog/live-audit/sprint-state.json
```

`sprint-preflight.js` re-confirms, **live**, everything the write batches depend on and refuses
to send a mutation. It captures, per sprint collection: id, `productsCount`, live member handles,
`seo{title,description}`, body presence, image presence, `ruleSet`, publication channels. It also:

- computes each retire→canonical pair's **`productsOnlyInRetire`** (products that would be orphaned
  by retirement and must be re-homed first) and a **`safeToRetire`** flag;
- computes, for each occasion canonical, the **intended** membership (`retailOccasionsFor`) vs the
  **live** membership, emitting `toAdd` / `toRemove` with reasons (wedding / add-on / not-retail);
- lists Gift-Basket and retail-Tropical candidates (and the wholesale tropical **stems it
  excludes**);
- reports the **`write_url_redirects` and `write_products` scopes** (decides the redirect
  architecture and whether membership writes are possible at all);
- flags SEO/body gaps on the five canonicals + `gift-baskets` + `tropical-flowers`.

**The audit relationships are treated as "revalidate", not fact.** Every batch re-reads
`sprint-state.json` (regenerated immediately before it runs) and asserts its preconditions;
if live state disagrees with the plan, the batch **fails closed** and writes nothing.

---

## 3. Batch architecture (sequential, fail-closed, per-batch authorization)

Every writer follows the hardened pattern already proven in Batch-3:
three-part interlock (`--commit` + `--i-understand-this-writes-to-shopify` + a **unique env
phrase**) · hard allowlist of handles/IDs from `sprint-state.json` · fail-closed precondition
checks · timestamped gitignored backup · sequential writes · post-write fingerprint verification ·
blast-radius check · scoped rollback. **Dry-run is the default; a write requires all three keys.**

| Batch | Action | Unique authorization phrase (env) | Reversible? |
|---|---|---|---|
| **B** | Consolidate: **unpublish** (not delete) the 6 empty duplicates after confirming `safeToRetire` | `TNG_SPRINT_B_CONSOLIDATE` = `AUTHORIZE SPRINT B COLLECTION CONSOLIDATION` | Yes — re-publish |
| **C** | Redirects for the 6 retired handles + verify internal links canonical | `TNG_SPRINT_C_REDIRECTS` = `AUTHORIZE SPRINT C RETIRED COLLECTION REDIRECTS` | Yes — delete redirect |
| **E** | Correct retail-occasion membership (add belongs-missing, remove wrong) | `TNG_SPRINT_E_OCCASIONS` = `AUTHORIZE SPRINT E OCCASION MEMBERSHIP` | Yes — inverse add/remove |
| **F** | Populate `gift-baskets` from `isTrueGiftBasket` candidates | `TNG_SPRINT_F_GIFTBASKETS` = `AUTHORIZE SPRINT F GIFT BASKETS` | Yes — remove members |
| **G** | Populate `tropical-flowers` (retail only) + collection SEO/body drafts | `TNG_SPRINT_G_TROPICAL_SEO` = `AUTHORIZE SPRINT G TROPICAL AND COLLECTION SEO` | Yes — remove/rollback SEO |

> **No phrase is reused.** Batch A (docs) and Batch H (read-only audit) need no write interlock.
> Verification after each batch is mandatory; **a failure halts the sprint** (later phrases are
> never entered).

### Retirement mechanism — **unpublish, not delete (recommended)**
`collectionDelete` is irreversible and would break any bookmark/redirect target resolution.
**Unpublishing** (removing the online-store publication) retires the duplicate from the storefront
while remaining fully reversible and keeping the handle available for the 301. `collectionDelete`
is deferred to a later, separately-authorized cleanup only after the redirects are confirmed live.

---

## 4. Redirect architecture — OPEN DECISION (needs preflight scope result)

Retired collections live at `/collections/<handle>`. Two implementations, chosen by the
`write_url_redirects` scope reported by the preflight:

- **Option A — Shopify URL Redirects (preferred if `write_url_redirects` is granted).**
  Create six `urlRedirect` entries (Admin `urlRedirectCreate`). The headless storefront already
  honors Shopify URL Redirects: `server.ts` calls `storefrontRedirect(...)` as the 404 fallback,
  so a retired collection resolves to its canonical with a 301 with **no code change**.
- **Option B — code redirect map (fallback if the scope is absent).**
  Add a `RETIRED_COLLECTION_REDIRECTS` map to `app/routes/($locale).collections.$handle.tsx`,
  mirroring the existing `REMOVED_PAGE_REDIRECTS` pattern in `($locale).pages.$handle.tsx`
  (`throw redirect(target, 301)` in `loadCriticalData` before the collection query). This is a
  storefront code change (in scope for Batch C) and needs no Admin scope.

**Internal links are already canonical** (verified: `homeContent.ts` and nav point at the
canonical handles; `REMOVED_PAGE_REDIRECTS` already maps `corporate-flowers` →
`/collections/corporate-gifting`). Batch C's link step is therefore a **verification sweep**, not a
rewrite; any stray retired-handle link found is corrected.

---

## 5. Occasion membership correction — OPEN DECISION (mechanism depends on live ruleSet)

The preflight reports whether each occasion collection is **smart** (has a `ruleSet`) or **manual**:

- **Smart collection** → correct membership by fixing **product tags** (or, with explicit approval,
  broadening the rule). This is the safer, taxonomy-driven fix and keeps the collection
  self-maintaining. Batch E would then adjust `occasion:*` tags on the specific products in
  `toAdd`/`toRemove`.
- **Manual collection** → correct membership with `collectionAddProducts` /
  `collectionRemoveProducts` on the exact handles in `toAdd`/`toRemove`.

`retailOccasionsFor` (in `sprint-lib.js`) defines "belongs": a **retail-channel, non-bulk-box,
non-wedding, non-add-on** finished product (Floral Arrangement / Gift Basket / `type:luxury-arrangement`)
carrying the matching `occasion:*` tag. **Wholesale bulk stems, greenery, fillers, wedding/event
inventory and cross-sell add-ons can never enter a public retail occasion collection** — enforced
by the predicate and asserted in the self-test. Legitimate **multi-occasion overlap** (e.g. a rose
piece in both anniversary and love-and-romance) is preserved, not treated as duplication.

> The concrete mechanism (tag-fix vs rule-broaden vs manual add/remove) is **selected from the live
> `ruleSet`** in `sprint-state.json` and confirmed with the owner before Batch E is built.

---

## 6. Gift Baskets & Tropical Flowers (Batches F, G)

- **Gift Baskets** (`isTrueGiftBasket`): `productType == "Gift Basket"` **or** tag
  `format:gift-basket` / `type:gift-basket`. A bulk stem merely titled "Basket of Roses" is
  **excluded** (self-tested). Candidates and their current membership come from the preflight.
- **Tropical Flowers** (`isRetailTropical`): a tropical product (`flower:tropicals` /
  anthurium / heliconia / ginger / bird-of-paradise / protea, or "tropical" in title) that is
  **retail-channel, not a bulk box**, and a finished arrangement / `type:luxury-arrangement`.
  Wholesale tropical **stems** (`isWholesaleTropicalStem`) are **listed and excluded** so
  wholesale inventory never leaks into the retail category.

Population uses `collectionAddProducts` (or tag alignment if the target is smart), gated by
Batch F/G interlocks, on the exact candidate handles from `sprint-state.json`.

---

## 7. Collection SEO / body (Batch G) — **never title-only**

Every collection SEO write goes through `assertSeoInputComplete`, which **rejects any payload that
is not exactly `{title, description}` with both non-null** — the hard lesson from the Gate-1
incident, encoded and regression-tested. Batch G drafts SEO title + description + body for any of
`birthday`, `anniversary`, `love-and-romance`, `corporate-gifting`, `sympathy-and-funeral`,
`gift-baskets`, `tropical-flowers` the preflight flags as `needsSeo` / `needsBody`. Drafts follow
the brand voice and Jamaica/Kingston luxury-florist keywords from `CLAUDE.md`; the exact copy is
prepared for review when Batch G is authorized (it depends on which collections actually have gaps
live). Existing complete SEO/body is left untouched.

---

## 8. Rollback strategy (per batch)

- **B (unpublish):** re-publish the collection to the online-store channel.
- **C (redirects):** delete the created `urlRedirect` (Option A) or revert the code map (Option B).
- **E (membership):** apply the inverse `collectionRemoveProducts`/`collectionAddProducts`, or
  restore the exact prior tag set from the batch's backup.
- **F/G (membership):** remove the just-added members.
- **G (SEO):** restore `seo{title,description}` and `descriptionHtml` from the timestamped backup
  (same seo-scoped rollback as Batch-3, always re-supplying both companion fields).

Every batch writes a timestamped, gitignored backup (`catalog/live-audit/backups/…`) **before**
its first write and verifies a structural backup exists as a precondition.

---

## 9. Test matrix

**Offline, deterministic — `commerce-manager/scripts/sprint-lib.selftest.js` (51 checks, all green):**
exact canonical/retire/redirect allowlists · canonical-can-never-be-retired · retail-vs-wholesale
exclusion (bulk stems / greenery excluded) · wedding excluded from public retail · add-ons flagged
not auto-placed · legitimate multi-occasion overlap preserved · Gift-Basket strict classification ·
Tropical retail vs wholesale-stem split · **SEO payload must carry both fields — 8 title-only /
null / extra-key rejection regressions.**

**Live, read-only — `sprint-preflight.js`:** re-confirms every relationship before any write and
emits the evidence file the writers consume.

**Per-batch, on execution:** dry-run preview → backup → write → post-write fingerprint verification
→ blast-radius check. Any mismatch halts the sprint.

---

## 10. Remaining work / owner decisions to confirm before executing

1. **Run the preflight on the Mac** and review `sprint-state.json` (scopes, `safeToRetire`,
   occasion `toAdd`/`toRemove`, gift/tropical candidates, SEO gaps).
2. **Redirect architecture:** Option A (Shopify URL Redirects) vs Option B (code map) — decided by
   the `write_url_redirects` scope. **Recommend A if granted.**
3. **Occasion mechanism:** tag-fix vs rule-broaden vs manual add/remove — decided by the live
   `ruleSet`. **Recommend tag-fix for smart collections.**
4. **Retirement mechanism:** unpublish (recommended, reversible) now; `collectionDelete` deferred to
   a later separately-authorized step after redirects are confirmed live.
5. **Any `productsOnlyInRetire`:** if a retire collection has unique members, they are re-homed to
   the canonical **before** retirement (Batch B precondition; `safeToRetire` must be true).
6. **Per-batch authorization:** each of B/C/E/F/G requires its own phrase (Section 3). No batch is
   built or executed until its batch is explicitly approved.

---

## 11. Safety / provenance

- This step: **Shopify writes: 0.** No writer executed; no live mutation; nothing pushed.
- No merge, no deploy. `redesign-v1` and production untouched. Parked stash not restored.
- Raw exports, backups and `.env` remain local/gitignored — never pushed.
- `sprint-lib.js` invents nothing: all maps come from the approved audit; all live facts come from
  the read-only preflight at execution time.

_Prepared read-only. Awaiting explicit per-batch authorization before any Shopify write._
