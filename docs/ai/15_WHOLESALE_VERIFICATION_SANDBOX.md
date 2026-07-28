# 15 — Wholesale Verification Sandbox (Pre-Production Pilot)

> **Status: [Planned] — not built. No production impact.** A pilot that runs the **real** verification logic on **real, consented** business data while **physically preventing any production Shopify write**. Architecture is defined in `13` (V1.0) and sequenced in `14`; this doc adds only the sandbox/dry-run layer. Terminology + roles per `13`. Agent conduct per `07` (verify-before-claim, don't fabricate, secrets off client).

## 0. Execution tracks (parallel)

Three tracks run in parallel so engineering is not blocked by legal/provider lead times. Architecture is `13`; build sequence + spikes are `14`. This section only assigns work to tracks and gates.

> **Reconciliation note (do not silently drop):** `15 §2` still holds — **real TRN/PII cannot be processed on consent alone.** Track B therefore requires consent **plus** a lightweight legal sign-off / DPIA for *sandbox* processing. That is narrower than the **full** production DPA compliance (Information Commissioner registration, DPO, retention infra) that gates **Track C**. Consent enables Track B; full compliance enables Track C.

### Track A — Engineering (start immediately; no PII, no government access)
| | |
|---|---|
| **Prerequisites** | Dev/test Shopify store (for `14` S1–S4); repo access; sandbox infra provisioning (non-PII). |
| **Deliverables** | Backend + state machine (`14` P2/P3); n8n workflow skeletons (`14` P4) against **mocked** provider responses; AI Officer + Rules Engine (`13 §4/§5`) validated on **non-sensitive synthetic fixtures** (business names/types/decision-path shapes — **no fabricated TRNs**); the **Payload Recorder** (§5); **run S3 (make-or-break) + S1/S2/S4**. |
| **Blockers** | None to start. S3 outcome selects B2B-native vs fallback pricing path (`13 §1a/§7`). |
| **Exit criteria** | S1–S4 decided + recorded (`10`); pipeline passes all §6 scenarios on synthetic fixtures; every APPROVED yields a schema-valid recorded payload; **zero real PII used**; storefront regression update planned. |

### Track B — Sandbox Pilot (requires consent + sandbox legal sign-off; real businesses, isolated)
| | |
|---|---|
| **Prerequisites** | Track A end-to-end runnable; **participant consent** (§2, revocable); **DPIA / legal sign-off for sandbox PII**; isolated sandbox hosting decision; real provider access *if* available (else manual per `14` S5). |
| **Deliverables** | Real, consented applications processed end-to-end; **recorded (not sent) Shopify payloads** reviewed by a human; manual-review path exercised (§8); KPIs captured (§9); accuracy vs known ground truth. |
| **Blockers** | Consent + sandbox DPIA; participant recruitment; sandbox hosting/residency. **Hard bar: any production Shopify write path = stop.** |
| **Exit criteria** | Go/No-Go (§10) met: 0 production writes, payloads human-validated, decisions deterministic/explainable across §6, deletion-on-request proven, no PII in logs. |

### Track C — Production Readiness (blocked until full legal + provider onboarding)
| | |
|---|---|
| **Prerequisites** | Track B **Go**; **full production DPA compliance**; **eGov TRN provider onboarding** (`14` S5); final S3 pricing decision; owner approval-policy decision (`13 §8`). |
| **Deliverables** | Payload Recorder → **gated real Shopify Admin writes**; production migration + flag cutover (`14` P10, default OFF = today's immediate access); monitoring + success metrics; existing-user migration decision. |
| **Blockers** | Legal compliance; provider access; S3 outcome; owner sign-off. **Nothing here starts until Track B passes.** |
| **Exit criteria** | Flagged production pilot cohort live; zero retail↔wholesale price leaks; rollback proven (flag off → instant revert); `05/08/09/13` updated + regression suite migrated (`14 §9`). |

### Track B rollout stages (staged, lowest-risk first)

**Stage B0 — The New Greenhouse (self-validation, first real-world case).** Use **only The New Greenhouse's own authorized business information** (its TRN and other required registration details) as the single first real application. Because it is the operator's *own* authorized data, **no third-party participant consent is required** for this stage — but §2's security posture still applies (encryption at rest, PII-redacted logs, `07`), and processing real PII still assumes the sandbox DPIA/legal sign-off from §0.

- **Objective:** validate the full pipeline once, on real data the operator controls — end-to-end workflow (§4), n8n orchestration (§7 / `14` P4), AI Wholesale Officer analysis (`13 §4`), Rules Engine decisions (`13 §5`), the **Payload Recorder** (§5), logging (§3), retry handling (§7), notifications (§3), and the manual-review path (§8).
- **Hard bars (unchanged):** no production Shopify writes, no production customer creation, no production catalog changes, no production orders — approvals produce **recorded payloads only** (§5).
- **Exit:** the §6 scenarios and the §10 Go/No-Go hold for the self-validation run; every APPROVED yields a schema-valid recorded payload; zero production writes.

**Stage B1 — small consented pilot group.** *Only after* B0 passes, expand to a **small group of additional consented businesses** (participant consent + sandbox sign-off per §0/§2). Same isolation, same recorded-payload safety, broader data.

**→ Track C (production)** remains gated as in §0 — nothing production-facing begins until B1 and the Track C prerequisites (full legal compliance + provider onboarding) are met.

## 1. Scope & isolation
| In scope | Out of scope |
|---|---|
| Real application intake, backend state machine, n8n orchestration, real provider calls (where access granted), AI Officer, Rules Engine, manual-review path | **Any production Shopify write** (company/catalog/customer/order), production customers, production checkout |

**Hard isolation (enforced, not promised):**
- Separate **sandbox** DB, backend instance, and n8n instance — no shared credentials with production.
- The sandbox holds **no Shopify Admin *write* token.** The "provision on approval" step (`13 §5.3` / `14` Phase 5) is replaced by the **Payload Recorder** (§5) — intended writes are serialized for review, never sent.
- Read-only Storefront/Customer Account access to a **dev/test** store only, if needed for S3-style checks (`14` S3) — never the production store.
- Feature-flagged and network-segregated from the live storefront; production `redesign-v1` behaviour is unchanged (`05`, `08`).

## 2. Real-data requirements & consent
- **Blocking prerequisite:** the Data Protection Act 2020 legal review (`13 §1b`, `13 §8`, `14` Phase 0) must clear **before any real TRN/PII enters the sandbox.**
- **No fake sensitive data** — do not synthesize TRNs/registration numbers. Use either (a) the pilot operator's *own* business data, or (b) a small set of **explicitly consented** pilot trade customers.
- **Consent:** written, informed, revocable; states purpose, data stored, retention, deletion rights, that it's a pilot. Consent record stored with the application (audit).
- **Minimization:** collect only fields the Rules Engine needs; sensitive fields encrypted at rest (`13 §8`).

## 3. Components
| Component | Sandbox form | Notes |
|---|---|---|
| Database | Isolated sandbox DB, schema per `14` Phase 3 | encrypted sensitive fields; append-only audit |
| Backend | Sandbox instance, system of record | no prod credentials; service-to-service auth only |
| n8n | Separate instance/workflows (`14` Phase 4) | provider creds in n8n vault; **no Shopify write cred** |
| AI Officer | Advisory only (`13 §4`) | recommendation + citations; outage → NEEDS_REVIEW |
| Notifications | To internal reviewers + consented pilot participants only | no production customer sends |
| Logs | Structured, PII-redacted, append-only audit | secrets never logged (`07`) |

## 4. End-to-end workflow
Same as `13 §6` / `14` Phase 4, with the terminal Shopify write swapped for the Payload Recorder:
```
Applicant → backend (SUBMITTED/PENDING) → n8n: real provider checks (retries)
 → AI Officer (advisory) → Rules Engine (decision)
 → on APPROVED: **generate intended Shopify payload → store for review (NOT sent)**
 → notify internal reviewers; write audit
```
The Rules Engine remains the sole decider; AI never approves.

## 5. Dry-run Shopify payload generation (the core safety mechanism)
On any decision that *would* mutate Shopify, the sandbox **records the intended mutation** instead of calling Admin API.
| Field | Content |
|---|---|
| `intent` | e.g. `create_company`, `attach_location_to_market_catalog` (Basic model, `13 §1a`) |
| `payload` | exact Admin API request body that *would* be sent |
| `target` | dev-store ref only; never production |
| `decision_ref`, `application_ref` | link to the deciding rule + application |
| `status` | `pending_review` → (human) `approved_for_send` / `rejected` — sending is a **separate, future, gated** step, out of sandbox scope |
Payloads are human-reviewable diffs. This proves the write logic is correct **without touching Shopify**. Precedent: mirrors the project's existing `experience:dry-run` → gated `apply` pattern.

## 6. Test scenarios
| # | Scenario | Expected decision |
|---|---|---|
| 1 | Clean, consistent, valid TRN + active COJ + name match | `APPROVED` → payload recorded |
| 2 | Applicant name ≠ COJ record (fuzzy below threshold) | `MANUAL_REVIEW` (AI flags mismatch) |
| 3 | Invalid/failed TRN validation | `REJECTED` or `MORE_INFORMATION_REQUIRED` |
| 4 | Provider timeout/outage after retries | `PROVIDER_UNAVAILABLE` → retry queue |
| 5 | Duplicate TRN/business across applications | fraud flag → `MANUAL_REVIEW` |
| 6 | Missing required document | `MORE_INFORMATION_REQUIRED` |
| 7 | Dissolved/removed COJ status | `MANUAL_REVIEW`/`REJECTED` |

## 7. Retry & failure handling
Per `14` Phase 4: per-provider retry with backoff; capped attempts → `PROVIDER_UNAVAILABLE` (never silent fail); dead-letter + alert; idempotent by application id (replays safe). Payload Recorder writes are idempotent (check-then-record).

## 8. Manual-review path
Reviewer queue (`14` Phase 7 MVP may be minimal). Reviewer sees evidence + **AI report (clearly labelled advisory)** + the recorded payload; the **human** issues Approve/Reject/More-info. Every action audited with actor + timestamp (`13 §5`).

## 9. KPIs
| KPI | Target |
|---|---|
| Production Shopify writes | **0 (hard requirement)** |
| Decision correctness vs known ground truth | high (define threshold at go-live) |
| Auto-decided vs manual ratio | measured (informs auto-approve policy) |
| Median manual-review time | measured |
| Payload correctness (would-be write valid) | 100% schema-valid, human-approved |
| Provider success/timeout rate | measured (informs S5 automation) |
| PII/secret leaks in logs | 0 |

## 10. Go / No-Go criteria (sandbox → real build/pilot)
**Go** requires ALL: zero production writes; recorded payloads validated as correct by a human; Rules Engine decisions match expected across §6 scenarios; provider integration behaves within retry/outage handling; DPA legal cleared; consent + deletion working. **No-Go** if any sensitive data handled without consent/legal, any accidental production write path exists, or decisions are non-deterministic/unexplainable.

## 11. Data deletion & cleanup
- Defined retention window (owner + legal); purge at pilot end.
- Per-subject **deletion on request** (consent is revocable) — DPA requirement.
- Secure erase of DB records + document store + n8n execution data + logs containing PII.
- Cleanup checklist run + evidenced before sandbox teardown; no PII persists post-pilot.

## 12. Risks & open decisions
| Item | Type |
|---|---|
| DPA legal clearance before real PII | **Blocking** (`13 §8`) |
| eGov TRN access for real validation (`14` S5) | Research Required |
| Where sandbox DB + n8n are hosted (residency) | Owner decision |
| Consent scope + participant recruitment | Owner decision |
| Retention window + deletion SLA | Owner + legal |
| Whether pilot notifies real participants or internal only | Owner decision |
Full open-decision list: `13 §8`. This doc adds no new architecture — only the isolation, consent, and dry-run/payload-review layer.

**Cross-references:** `13` (architecture V1.0) · `14` (implementation sequence, spikes, Phase 3 schema / Phase 4 workflows) · `07` (agent rules) · `05` (unchanged production model).
