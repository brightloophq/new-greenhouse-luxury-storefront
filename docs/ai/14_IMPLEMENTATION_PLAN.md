# 14 — Implementation Plan (Wholesale Verification System)

> **Status: [Planned] — master execution plan. No production code. Current wholesale flow is untouched** until migration (Phase 10). Aligns with `05` (current model), `08` (decision), `09` (roadmap), `13` (architecture + validation). Where this plan and `13` describe the same thing, `13` is the architecture of record and this is the *build order*.

## How to read this
Each phase carries: **Objective · Deliverables · Dependencies · Acceptance Criteria · Risks · Rollback · Complexity (1–10) · Effort** (indicative dev-days; estimates, not commitments). Phase 1 spikes use the spike template the owner requested.

## Non-negotiable principles
Production untouched until migration · build incrementally · every phase independently testable · **feature-flagged** · rollback always possible · **backend = source of truth** · **n8n orchestrates** · **AI assists (never decides)** · **deterministic rules decide** · Shopify handles commerce · Hydrogen handles UX.

## Phase 0 — Gates (must clear before Phase 2)
Owner + legal decisions from `13 §8` (approval policy, government-API access, backend/DB + hosting/residency, n8n hosting, tiers ≤3 catalogs, gate scope, **Data Protection Act legal review**, migration of existing users, SLA). **No backend/DB work that stores TRN/PII begins until the DPA legal review clears.**

---

## PHASE 1 — TECHNICAL SPIKES

Consolidates `13 §2`. **Nothing past Phase 1 proceeds until these produce decisions.** Spikes are throwaway probes against a **dev/test store**, not production code.

> Spike-numbering note: this list is authoritative; it maps to `13 §2` (13's S1–S6 are folded into S1/S3/S4 below). If approved, update `13 §2` to reference this set — flagged in the consistency check.

### S1 — Shopify Basic B2B capability validation
- **Objective:** confirm Companies, company locations, contacts, and B2B **Market** catalogs (≤3) can be created/assigned via **Admin API** on Basic.
- **Questions answered:** Can we programmatically create a Company + location + contact? Can a location be associated with a B2B Market whose catalog carries wholesale prices (the Basic substitute for direct assignment)?
- **Success:** company/location/contact created; wholesale price visible to a test buyer via a Market catalog.
- **Failure:** any of the above impossible on Basic → fallback (`13 §7`).
- **Evidence:** Admin API request/response logs; screenshots of the created company + catalog.
- **Effort:** 2–3 d · **Risks:** Basic B2B nuances undocumented; Markets prerequisite. · **Decision produced:** B2B-native company/catalog model viable? y/n.

### S2 — Customer Account API validation
- **Objective:** confirm headless auth returns the buyer's **company + `companyLocationId`**.
- **Questions:** After Customer Account OAuth, can the storefront read the customer's company locations? Multiple locations?
- **Success:** `companyLocationId` retrievable server-side for a signed-in B2B buyer.
- **Failure:** not exposed on Basic headless → fallback / DB-driven location map.
- **Evidence:** Customer Account API query + response (redacted).
- **Effort:** 1–2 d · **Risks:** headless B2B is Plus-framed in docs. · **Decision:** can we contextualize pricing by location? y/n.

### S3 — Hydrogen B2B pricing validation **(MAKE-OR-BREAK)**
- **Objective:** confirm the Hydrogen cart + `@inContext` buyer resolves **B2B catalog prices on Basic**.
- **Questions:** Does setting `buyerIdentity.companyLocationId` + buyer context return wholesale prices via the Storefront API on Basic?
- **Success:** contextualized query returns wholesale price + quantity rules for a test buyer.
- **Failure:** prices don't resolve headless on Basic (a documented community failure exists) → **fallback pricing path** (`13 §7`); everything downstream re-scopes.
- **Evidence:** contextualized Storefront API query + response showing wholesale price.
- **Effort:** 2–4 d · **Risks:** **highest in the project**; docs frame headless B2B around Plus. · **Decision:** B2B-native pricing vs fallback. **Run this FIRST.**

### S4 — Headless checkout validation
- **Objective:** confirm checkout honours B2B company-location pricing end-to-end on Basic.
- **Success:** order placed at wholesale price; totals correct.
- **Failure:** checkout reverts to retail price → fallback.
- **Evidence:** a completed test order at wholesale price.
- **Effort:** 1–2 d (after S3) · **Risks:** checkout is Shopify-hosted; limited control. · **Decision:** end-to-end B2B pricing viable? y/n.

### S5 — Jamaica verification provider validation
- **Objective:** determine what can be automated vs manual for **TRN** (eGov "GOJ Validation Web Services"), **COJ** (no official API), **TCC** (likely manual).
- **Questions:** Is commercial/authorized access to the eGov TRN Web Service obtainable (auth, pricing, SLA, legal terms)? Can COJ status be checked programmatically or only via portal? Is TCC validation manual-only?
- **Success:** written access terms for at least TRN validation; documented manual procedure for COJ/TCC.
- **Failure:** no automated source available → MVP is **manual verification** with AI-assisted evidence gathering.
- **Evidence:** provider access confirmation / documented refusal; sample validation call if granted.
- **Effort:** owner-led, days–weeks (external onboarding) · **Risks:** government onboarding latency; commercial-use restrictions. · **Decision:** automated vs manual verification per source.

### S6 — Security validation
- **Objective:** confirm the security posture for storing/handling TRN + business documents (DPA-aligned).
- **Questions:** Encryption at rest/in transit? Secret management for Admin API + provider creds? Service-to-service auth (Hydrogen↔backend↔n8n)? Data-residency vs Jamaica DPA if hosted abroad?
- **Success:** a security design signed off (ideally with the DPA legal review).
- **Failure:** unresolved legal/residency issues → **blocked** until resolved.
- **Evidence:** threat model + secrets/encryption design; legal sign-off reference.
- **Effort:** 2–3 d + legal · **Risks:** legal/compliance is a hard blocker. · **Decision:** cleared to store PII? y/n.

**Phase 1 gate:** write results to `10_SESSION_SUMMARY.md`; produce a go/no-go on **B2B-native vs fallback**. Complexity **8**. Effort **~2–3 wks incl. external onboarding**.

---

## PHASE 2 — Backend Foundation (architecture only)
- **Objective:** define the system-of-record service — application lifecycle, verification state machine, audit, authorization, API boundaries.
- **Deliverables:** service boundary doc; state machine (below); API contract (Hydrogen↔backend, n8n↔backend, backend↔Shopify Admin); authZ model (service tokens, roles); audit strategy (append-only event log).
- **State machine:** `DRAFT → SUBMITTED → PENDING → (AUTO_CHECKS) → NEEDS_REVIEW → APPROVED | REJECTED | MORE_INFO → (MORE_INFO → PENDING) → APPROVED → PROVISIONED → ACTIVE → (EXPIRED → PENDING)`; plus `PROVIDER_UNAVAILABLE` holding state.
- **Dependencies:** Phase 0 (hosting/DPA), Phase 1 (path decision).
- **Acceptance:** every state + transition enumerated; each transition has an actor (system/n8n/rules/human) and an audit event; no PII in API responses to the client.
- **Risks:** over-engineering; residency. · **Rollback:** backend is isolated + flagged off; deleting it cannot affect production storefront.
- **Complexity 6 · Effort ~1 wk (design).**

---

## PHASE 3 — Database Design (logical schema only, no SQL)
- **Objective:** a logical schema covering every entity + state transitions.
- **Entities (logical):**
  - `applicant` (person; links to Shopify customer id)
  - `business` (trading name, type, TRN [encrypted], registration no. [encrypted])
  - `application` (applicant, business, status, timestamps)
  - `document` (type, encrypted-store ref, checksum) — files in an object store, refs only in DB
  - `verification_provider` (name, kind: TRN/COJ/TCC/KYB)
  - `verification_run` (application, provider, result, evidence ref, attempts, status)
  - `ai_report` (application, summary, name-match score, industry class, flags, confidence, model, prompt-hash)
  - `risk_score` (application, score, factors)
  - `decision` (application, outcome enum, rule-set version, decided_by [rules|human], reason)
  - `manual_review` (application, reviewer, notes, outcome)
  - `notification` (application, channel, template, status)
  - `audit_event` (append-only: entity, actor, action, before/after ref, timestamp)
  - `shopify_link` (application, company_id, location_id, market/catalog ref, synced_at)
- **Deliverables:** entity list + relationships + which fields are sensitive/encrypted + retention tags.
- **Dependencies:** Phase 2.
- **Acceptance:** every `13`/Phase-2 state representable; sensitive fields flagged; audit is append-only; no plaintext TRN.
- **Risks:** PII sprawl. · **Rollback:** schema versioned/migratable; isolated DB.
- **Complexity 5 · Effort ~3–5 d.**

---

## PHASE 4 — n8n Workflow Design
For each: **Trigger · Inputs · Nodes · External services · Outputs · Failure handling · Retries · Idempotency · Logging · Monitoring.**

| Workflow | Trigger | Core nodes / externals | Idempotency | Failure handling |
|---|---|---|---|---|
| **New Application** | backend webhook (SUBMITTED) | validate → create verification_runs → enqueue pipeline | keyed by application_id | dead-letter + alert |
| **Verification Pipeline** | pipeline enqueue | COJ (portal/manual), TRN (eGov), TCC (manual) → AI Officer → Rules Engine | per-run id; check-then-write | per-provider retry w/ backoff |
| **Retry Failed Providers** | schedule / `PROVIDER_UNAVAILABLE` | re-call failed providers only | attempt counter | cap attempts → NEEDS_REVIEW |
| **Manual Review Queue** | Rules → NEEDS_REVIEW | notify owner + create review task | one task per application | escalation on SLA breach |
| **Approval** | decision=APPROVED | Admin API: company+location+Market catalog → write shopify_link → notify | check-then-create company | on Admin API fail → hold + alert |
| **Rejection** | decision=REJECTED | store reason → notify applicant | — | — |
| **More Information** | decision=MORE_INFO | request specifics → set state | — | reminder schedule |
| **Nightly Maintenance** | cron | reconcile DB↔Shopify; retry stuck | idempotent sweep | report anomalies |
| **Scheduled Re-verification** | cron (expiry) | re-run checks; set EXPIRED→PENDING | per-application | same as pipeline |
| **Failure Recovery** | error hook | capture, dead-letter, alert | — | human runbook |
- **Deliverables:** the 10 workflow specs; a monitoring/alerting plan; a secrets plan (creds in n8n vault).
- **Dependencies:** Phases 2–3; S5.
- **Acceptance:** every workflow idempotent + logged + monitored; no silent failures; no secret in logs.
- **Risks:** orchestration sprawl; provider latency. · **Rollback:** workflows disabled by flag; DB unaffected.
- **Complexity 7 · Effort ~1–2 wks.**

---

## PHASE 5 — Shopify Integration
| Area | Status | Design |
|---|---|---|
| Admin API — company/location/contact | **Research Required (S1)** | create on approval via n8n |
| Catalog strategy | **Verified constraint** | **≤3 B2B Market catalogs**; tiers map to Markets, **no per-company assignment** (Plus-only) |
| Customer updates / tagging | **Verified** | status tag/metafield mirror for segmentation |
| Customer Account API (companyLocationId) | **Research Required (S2)** | contextualize pricing |
| Hydrogen B2B pricing | **Research Required — HIGH RISK (S3)** | cart buyerIdentity + `@inContext` |
| Checkout | **Research Required (S4)** | must honour B2B price |
| Markets integration | **Verified prerequisite** | new Shopify Markets required for Basic B2B catalogs |
| Fallback | **Designed** | metafield/tag gate + non-B2B pricing (`13 §7`) |
- **Deliverables:** Admin API call inventory; catalog/Markets model; fallback switch.
- **Dependencies:** Phase 1.
- **Acceptance:** approved buyer sees wholesale price (native or fallback); unapproved never does (server-enforced).
- **Risks:** S3 failure re-scopes pricing. · **Rollback:** integration behind flag; Admin writes reversible (archive company).
- **Complexity 8 · Effort ~1–2 wks (native) / ~1 wk (fallback).**

---

## PHASE 6 — Hydrogen UX (user flow only, no UI)
- **Objective:** the applicant journey for every state.
- **Flows:** wholesale route (unapproved) → **application**; **pending** (under review); **more-info** (specifics requested → resubmit); **approved** (catalogue + B2B pricing unlocked); **rejected** (reason + re-apply); **status page** (current state + history); **account dashboard** (trade status); **notifications** (email); **error handling** (provider/Shopify down → graceful "we're reviewing").
- **Deliverables:** state→screen flow map; `requireWholesaleAccess` gate contract (server-side; no wholesale HTML unless APPROVED).
- **Dependencies:** Phases 2, 5.
- **Acceptance:** each backend state has exactly one applicant-facing flow; gate enforced server-side; auth stays Shopify Customer Accounts.
- **Risks:** state/UX drift. · **Rollback:** routes behind flag; default = today's immediate access until cutover.
- **Complexity 5 · Effort ~1 wk.**

---

## PHASE 7 — Admin Portal (design only)
- **Objective:** owner review tooling (MVP may be Shopify-admin-based; portal is Phase 3+ of the feature).
- **Deliverables:** application queue; review screen; evidence viewer; **AI recommendation panel (advisory, clearly labelled)**; decision panel (Approve/Reject/More-info — human authority); timeline; audit history; filters/search; bulk actions; metrics; **role permissions**.
- **Dependencies:** Phases 2–4, 8.
- **Acceptance:** a reviewer can decide from evidence in one screen; every action audited; permissions enforced; AI can't be mistaken for the decider.
- **Risks:** scope creep (MVP could be Shopify admin + notifications). · **Rollback:** portal is internal/isolated.
- **Complexity 6 · Effort ~1–2 wks (defer to post-MVP if manual admin suffices).**

---

## PHASE 8 — AI Wholesale Officer (design only)
- **Objective:** advisory analyst subsystem. **Never approves/rejects.**
- **Responsibilities:** summarize evidence; **compare business names** (applicant vs COJ, fuzzy match + score); classify industry plausibility; **detect inconsistencies** (name mismatch, dissolved status, invalid TRN); calculate **confidence** with reasons; recommend an action *to the Rules Engine*; generate a manual-review report; **highlight fraud indicators** (duplicate TRN/business across applications, mismatched identity, tampered docs).
- **Guardrails:** output = recommendation + explanation + citations only; every claim cites source evidence; no unsourced assertions; PII minimized in prompts; nothing sensitive logged; AI outage → degrade to NEEDS_REVIEW (never blocks).
- **Deliverables:** input/output contract; confidence rubric; fraud-signal list; prompt/data-handling policy.
- **Dependencies:** Phases 3–4.
- **Acceptance:** AI output is consumed only by the Rules Engine + shown to humans; it cannot write a decision; recommendations are reproducible/explainable.
- **Risks:** over-trust in AI; hallucination. · **Rollback:** disable AI → pipeline routes all to NEEDS_REVIEW.
- **Complexity 6 · Effort ~1 wk.**

---

## PHASE 9 — Testing Strategy
- **Unit:** rules engine (every outcome path), state transitions, name-match, encryption helpers.
- **Integration:** backend↔n8n↔Shopify (dev store); Customer Account/pricing (native or fallback).
- **Workflow:** each n8n workflow incl. idempotent replays.
- **Failure scenarios:** government provider outage/timeout → `PROVIDER_UNAVAILABLE` + retry; Shopify Admin/checkout outage → hold + alert; **duplicate applications** (same TRN/business) → dedupe + fraud flag; **fraud attempts** (mismatched identity, tampered docs) → NEEDS_REVIEW/REJECT.
- **Security:** secrets never in logs/bundle; authZ on every endpoint; PII encryption; DPA retention.
- **Performance:** expected approval volume within Admin API + provider rate limits (n8n backoff).
- **Acceptance:** the storefront regression suite is updated (replace the `pending_approval` negative assertion) and green; new suites cover states + rules + fallbacks.
- **Dependencies:** all build phases. · **Rollback:** tests gate the release.
- **Complexity 7 · Effort ~1–2 wks (continuous).**

---

## PHASE 10 — Deployment & Migration
- **Environments:** dev → staging (Shopify dev store) → **pilot** (small set of invited trade customers, feature-flagged) → production.
- **Feature flags:** `wholesale_verification_enabled` (global), per-cohort pilot flag; **default OFF = today's immediate-access behaviour** (production untouched until cutover).
- **Migration:** decide existing-wholesale-user handling (auto-approve vs re-apply) per `13 §8`; backfill company/Market where native.
- **Monitoring:** application funnel, decision mix, provider health, Admin API errors, pricing-resolution success.
- **Success metrics:** % auto-decided vs manual, median review time, verification pass rate, pricing-resolution rate, zero retail-price leaks to approved buyers / zero wholesale leaks to unapproved.
- **Rollback:** flip the flag off → instant revert to current immediate-access flow (no data migration needed to roll back); Shopify company/catalog changes are archivable.
- **Complexity 7 · Effort ~1 wk + pilot soak.**

---

## FINAL SECTIONS

### Implementation Order
Phase 0 (gates) → **S3 first**, then S1/S2/S4/S5/S6 → Phase 2 → 3 → (4 ∥ 5 ∥ 8) → 6 → 9 → 7 (if needed) → 10.

### Critical Path
**Phase 0 (DPA legal + hosting) → S3 headless pricing decision → Phase 5 pricing model → Phase 6 gate → Phase 10 pilot.** S3 and the DPA review are the two hardest gates; everything else can parallelize behind them.

### Dependency Graph (text)
- Phase 0 → everything.
- S3 → Phase 5 (pricing path) → Phase 6 (approved UX) → Phase 10.
- S5 → Phase 4 (pipeline) → Phase 8 (AI) → Phase 7 (admin).
- Phase 2 → Phase 3 → Phase 4.
- Phase 9 spans all.

### Risk Register
| Risk | Sev | Mitigation |
|---|---|---|
| **Headless B2B pricing fails on Basic (S3)** | **High** | run S3 first; fallback (`13 §7`) designed |
| DPA legal blocks PII storage | High | Phase 0 legal review before any storage |
| Government API access unavailable/slow (S5) | Med-High | MVP = manual + AI-assisted evidence |
| Direct catalog assignment assumed (Plus-only) | Resolved | Markets model, ≤3 catalogs |
| AI over-trusted as decider | Med | Rules Engine decides; AI advisory + audited |
| Admin API rate limits | Med | n8n backoff + queue |
| Data residency (backend/n8n abroad) | Med | Phase 0 hosting decision + DPA review |
| Scope creep (admin portal) | Med | MVP via Shopify admin + notifications |

### Known Unknowns
Headless B2B pricing behaviour on Basic (S3/S4); eGov TRN API commercial terms; COJ/TCC automation feasibility; DPA specifics; real approval volume; existing-user migration size.

### Future Enhancements
Automated document OCR/validation; KYB provider integration; self-serve re-verification; tiered pricing beyond 3 catalogs (would require Plus); analytics dashboard; Shopify Flow automations.

### Technical Debt (accepted upfront)
MVP likely manual COJ/TCC checks; possible fallback pricing (non-B2B) if S3 fails; admin MVP in Shopify admin rather than a bespoke portal.

### Open Questions
All of `13 §8` (unchanged) — most urgent: DPA legal review; eGov TRN access; approval policy (auto vs human); backend/DB + hosting choice.

### Recommended Next Sprint
1. **Owner/legal:** start the **DPA review** and **eGov TRN access** application (long lead times).
2. **Engineering:** run **S3 (headless B2B pricing on Basic)** on a dev store — one spike that de-risks the entire pricing approach — then S1/S2/S4.
3. Nothing else builds until S3 + DPA return.

---

## Consistency check vs the Knowledge Base
- **05 / 08 / 09** — aligned (this session's edits point to `13`; production-unchanged stance repeated here). ✅
- **13** — this plan is the build order for `13`'s architecture; the Basic constraints (≤3 Market catalogs, no per-company assignment), the S3 make-or-break, AI-advisory/Rules-decides, backend-system-of-record, and the fallback all match. ✅
- **07 (agent rules)** — honoured (no fake auth, server sessions, secrets off client, verify-before-claim). ✅
- **One reconciliation item (not a contradiction):** spike numbering. `13 §2` lists S1–S6 with slightly different groupings; **this doc's S1–S6 is the authoritative build set** and folds them in. If approved, update `13 §2` to reference `14`'s spikes. Flagged, not silently changed.
- No contradictions found with `00–04`, `06`, `10`.

**Cross-references:** `13` (architecture/validation) · `05` (current model) · `08` · `09` · `07`.
