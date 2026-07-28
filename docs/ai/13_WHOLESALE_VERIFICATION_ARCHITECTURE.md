# 13 — Wholesale Verification Architecture (Shopify Basic + B2B)

> **Status: Version 1.0 (approved architecture) · [Planned] — not built. Production behaviour is unchanged** (see `05`) until this is implemented, tested and migrated per `14`. Approved 2026-07-28. v1.0 = the architecture is settled and evidence-validated; it does **not** mean anything is built. The authoritative build sequence + spikes live in `14_IMPLEMENTATION_PLAN.md`.
>
> ⚠️ Building this reverses today's model (immediate wholesale access, no approval) and requires updating `05`, `08`, `09` and `storefrontRegression.test.ts` (which currently asserts no `pending_approval`).

---

## 0. Platform constraint (confirmed)
Merchant is on **Shopify Basic**. Design to Basic B2B only. **Do not** use Plus-only features (unlimited catalogs, direct per-company catalog assignment, advanced deposits/payment terms, custom Shopify Functions).

## 1. Architecture Validation Report (evidence-based)

Researched against official Shopify + Jamaican-government sources, 2026-07. Classification: **Verified** (official doc) · **Research Required** (needs a spike/owner action) · **Assumption** (reasoned, unconfirmed) · **Blocked** (needs legal/owner).

### 1a. Shopify B2B on Basic — external dependency matrix

| Capability | Status | Evidence / note |
|---|---|---|
| B2B (Companies, company locations) on Basic | **Verified** | B2B is available on Basic/Grow/Advanced/Plus. |
| Active B2B catalogs on Basic | **Verified** | **Up to 3 active catalogs** across all B2B markets. |
| B2B catalogs require **new Shopify Markets** on Basic | **Verified** | "To use B2B catalog features on Basic… your store must be using new Shopify Markets." |
| **Direct catalog assignment to a specific company/location** (customer-level pricing) | **Verified: NOT available on Basic** | Plus-only. **This kills the "assign a catalog to the approved company" design.** On Basic, pricing is delivered via **B2B *Markets* catalogs**, at market level — not per company. |
| Admin API: create Company / location / contact | **Research Required** | Spike S1 — expected to work, must confirm on Basic + rate limits. |
| Admin API: attach a company location to a B2B market carrying a wholesale catalog | **Research Required** | Spike S2 — the Basic-correct substitute for direct assignment. |
| Customer Account API returns the customer's `companyLocationId` (headless) | **Research Required** | Spike S3 — required to contextualize pricing. |
| **Headless (Hydrogen) B2B contextual pricing on Basic** | **Research Required — HIGH RISK** | Shopify's headless-B2B docs are framed around **Plus** ("Plus merchants can now build headless B2B"), and a developer-forum report exists of company catalog pricing **not working** headless. **This is the make-or-break spike (S4).** If it fails on Basic → fallback §9. |
| Cart `buyerIdentity.companyLocationId` + `@inContext` buyer → contextual prices | **Verified (mechanism)** | This is the documented Hydrogen B2B pricing mechanism; whether it resolves on **Basic** is S4. |
| Checkout honours B2B company-location pricing end-to-end on Basic | **Research Required** | Spike S5. |

**Architectural consequence (verified):** the earlier draft's "n8n assigns a catalog directly to the approved company" is **invalid on Basic**. Correct model: approved buyers get a **Company + location associated with a B2B Market** whose (≤3) catalog(s) carry wholesale pricing. Tiering = up to 3 market catalogs, **not** per-company overrides.

### 1b. Jamaica verification sources — research matrix

| Source | Purpose | Status | Note |
|---|---|---|---|
| **TRN validation** — eGov Jamaica "GOJ Validation Web Services" (TRN Web Service) | Validate a TRN | **Research Required (promising)** | A government TRN validation web service exists via eGov Jamaica. Onboarding, auth, pricing, commercial/legal terms, SLA, rate limits **all unconfirmed** — owner must apply. |
| **Companies Office of Jamaica (COJ)** — orcjamaica.com | Confirm company registration/status | **Research Required** | **No official public API** for integration (as of 2026). Manual name search returns company number/name/industry/status; a validation portal exists (`services.orcjamaica.com/validation`). Automation likely manual or portal-assisted. |
| **Tax Compliance Certificate (TCC)** — TAJ RAIS, online auto-approval (Gold/Open) | Prove tax compliance | **Research Required / likely manual** | TCC is applied for by the business via TAJ; a public API to *validate a presented TCC* was not found. Treat validation as manual/owner-side unless TAJ/eGov offers one. |
| **Data Protection Act, 2020 (Jamaica)** | Lawful handling of TRN/PII | **Blocked — legal confirmation required** | TRN + business docs are sensitive personal/financial data. Registration with the Information Commissioner, DPO obligations, retention limits, consent, and **cross-border transfer** (if backend/n8n are hosted abroad) must be confirmed by a lawyer before storing anything. |

> **Do not fabricate government API details.** Every Jamaica-source integration is Research Required until the owner obtains written access terms.

## 2. Mandatory Phase 1 — capability spikes (before any build)

> **`14_IMPLEMENTATION_PLAN.md` is the authoritative source for the final S1–S6 spike definitions, numbering, execution order, acceptance criteria, and evidence requirements.** This section states only *why* the spikes exist architecturally; it does not redefine them. If the two ever differ, `14` wins.

The architecture cannot be committed to code until Phase 1 confirms **B2B-native vs fallback (§7)**. The load-bearing unknowns are: whether headless (Hydrogen) B2B **pricing resolves on Basic** (the make-or-break gate — `14` **S3**), and whether the Customer Account API exposes `companyLocationId` headless, checkout honours B2B pricing, Admin API can model company + B2B **Market** catalogs on Basic, the Jamaica providers are automatable, and the security/DPA posture clears. **If headless pricing fails on Basic → fallback §7.** See `14` Phase 1 for each spike's objective, success/failure criteria, evidence, effort and the decision it produces. Spike results are recorded in `10_SESSION_SUMMARY.md`.

## 3. System responsibilities

| System | Owns |
|---|---|
| **Hydrogen** | Applicant experience, application tracking UI, account/status experience, wholesale gate (`requireWholesaleAccess`), post-approval B2B pricing wiring. Never decides approval. |
| **Backend + DB** | **System of record**: applications, verification state, audit logs, decisions, sensitive data (encrypted). Holds authorization; performs Shopify Admin API writes (or triggers n8n to). |
| **n8n** | Orchestration only: provider calls, retries/backoff, notifications, scheduling/re-verification, manual-review routing, workflow coordination. Stateless; state lives in the DB. |
| **Shopify (Basic B2B)** | Customer, Company, company location, B2B **Market** catalogs (≤3), pricing, checkout. |
| **AI ("Wholesale Officer")** | Analysis, evidence synthesis, recommendations, explanations — **advisory only**. |

## 4. AI Wholesale Officer — specification
Role: **Senior Verification Analyst. Advisory only — never approves or rejects.**
- **Inputs:** application fields + evidence gathered by n8n (COJ search result, TRN validation result, TCC status, uploaded docs).
- **Responsibilities:** collect/organise evidence; **compare business names** (applicant vs COJ record, fuzzy match); **classify industry** (is it a plausible florist/designer/event/reseller?); summarise findings; **detect inconsistencies** (name mismatch, status "removed"/"dissolved", TRN invalid); **calculate a confidence score** with reasons; produce a **manual-review report** for the owner.
- **Hard constraints:** outputs a *recommendation + explanation only*; the **Rules Engine (§5) decides**. Every AI claim must cite the evidence it came from (no unsourced assertions). No PII in prompts beyond what's needed; no sensitive data logged. AI unavailability must not block the deterministic path (it degrades to MANUAL_REVIEW).

## 5. Deterministic Rules Engine — specification
The **only** component that produces a decision. Deterministic, auditable, explainable.
- **Outcomes:** `APPROVED` · `MANUAL_REVIEW` · `REJECTED` · `MORE_INFORMATION_REQUIRED` · `PROVIDER_UNAVAILABLE`.
- **Inputs:** structured verification results (TRN valid?, COJ status, name-match score, TCC present?), the AI confidence + flags, and policy thresholds (owner-set).
- **Examples (owner tunes thresholds):**
  - TRN invalid → `REJECTED` (or `MORE_INFORMATION_REQUIRED`).
  - COJ status active + name match ≥ threshold + TRN valid → `APPROVED` (if owner allows auto-approve) else `MANUAL_REVIEW`.
  - Any provider down / timeout after retries → `PROVIDER_UNAVAILABLE` → queue + retry, never a silent fail.
  - Missing required doc → `MORE_INFORMATION_REQUIRED`.
- **Auditability:** every decision stores the inputs, the rule(s) fired, the AI report reference, timestamp, and (for manual) the human approver. **Every approval is explainable from stored evidence.**
- **Policy:** whether `APPROVED` may be automatic or always requires human sign-off is an **owner decision** (§8).

## 6. End-to-end flow
```
Applicant (Hydrogen) → backend (application, PENDING) → n8n:
  gather evidence (COJ / TRN / TCC) with retries
  → AI Wholesale Officer: analysis + confidence + report
  → Rules Engine: APPROVED | MANUAL_REVIEW | REJECTED | MORE_INFO | PROVIDER_UNAVAILABLE
  → on APPROVED: Admin API → Company + location + B2B Market (catalog) association; write IDs to DB
  → notify applicant + owner; update DB audit
Hydrogen (post-approval): read companyLocationId → cart buyerIdentity → B2B pricing (subject to S4)
```

## 7. Fallback — metafield/tag gating (§9 alias)
Use **only if** Phase 1 shows headless B2B pricing is unusable on Basic. Gate on `custom.wholesale_status` (written by n8n via Admin API); DB stays system of record + audit. Wholesale pricing then via a non-B2B mechanism (separate priced set / manual quote / draft orders) — each with tradeoffs to surface, not silently pick. Verification half is unchanged; only pricing delivery differs.

## 8. Outstanding Owner Decisions (blocking — resolve before V1.0)
1. **Approval policy** — may the Rules Engine auto-approve, or is human sign-off always required?
2. **Government API access** — will the owner apply for eGov Jamaica TRN Web Service access (auth, pricing, legal terms)? COJ + TCC are likely manual — acceptable for MVP?
3. **Verification providers** — TRN via eGov; any commercial KYB provider as backup?
4. **Backend + database** — hosting + tech for the system of record (is one available)? **Where is it hosted** (data-residency vs Jamaica DPA)?
5. **Document storage** — where do uploaded licenses/TCCs live (encrypted object store)?
6. **n8n hosting** — self-hosted vs cloud; operator?
7. **Pricing tiers** — how many, and do they fit in **≤3 B2B Market catalogs**?
8. **Gate scope** — catalogue visibility, pricing, or both?
9. **Data protection** — engage a lawyer on the Jamaica Data Protection Act 2020 (registration, DPO, retention, consent, cross-border) **before** storing TRN/PII.
10. **Existing wholesale users** — auto-approve anyone currently using wholesale on launch (migration)?
11. **SLA** — target turnaround for manual review.

## 9. Impact when built (must-do)
Replace the `pending_approval` negative assertion in `storefrontRegression.test.ts`; update `05` (immediate → verified model), `08` (record the decision + Phase-1 results), `09` (spec → in-progress). Add: application route/action, `requireWholesaleAccess`, backend service, n8n workflows, AI Officer service, Rules Engine, Admin API integration (Company + Market catalog), cart buyer-identity wiring.

## 10. Phasing
- **Phase 0:** owner answers §8.
- **Phase 1 (MANDATORY):** run S1–S6 → decide B2B-native vs fallback; secure government-API access terms.
- **Phase 2 (MVP):** application + backend + n8n verification + AI Officer + Rules Engine + manual approval + gate + states; pricing per the Phase-1 decision.
- **Phase 3:** notifications, MORE_INFO/rejection reasons, re-verification, tier catalogs (≤3).

---

**Sources (validation, 2026-07):** Shopify Help — [B2B features by plan](https://help.shopify.com/en/manual/b2b/getting-started/plan-features), [B2B catalogs](https://help.shopify.com/en/manual/b2b/catalogs), [B2B & Markets](https://help.shopify.com/en/manual/b2b/markets); Shopify Changelog — [Key B2B features on non-Plus plans](https://changelog.shopify.com/posts/key-b2b-features-now-available-on-non-plus-plans); shopify.dev — [Headless with B2B](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b), [B2B in Hydrogen](https://shopify.dev/docs/storefronts/headless/hydrogen/cookbook/b2b), [Update buyer identity](https://shopify.dev/docs/storefronts/headless/hydrogen/cart/buyer-identity); [dev-forum: headless B2B pricing not working](https://community.shopify.dev/t/companys-catalog-pricing-for-headless-using-customer-accounts-and-storefront-apis-not-working/12565); Jamaica — [COJ](https://www.orcjamaica.com/), [eGov GOJ Validation Web Services](https://www.egovja.com/goj-validation-web-services/), [TAJ TRN](https://www.jamaicatax.gov.jm/trn1), [TAJ TCC FAQ](https://www.jamaicatax.gov.jm/tax-compliance-certificate-tcc-faq).

**Cross-references:** `05` (current model) · `04` (commerce/auth constraints) · `07` (no fake auth, secrets) · `08` · `09`.
