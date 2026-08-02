# 05 — Wholesale System

> **Wholesale onboarding is a simple MANUAL review process** (2026-07 decision).
> The automated-verification architecture (AI wholesale officer, TRN/registry
> providers, rules engine, orchestration, payload recorder, n8n workflows) was
> **removed**. An applicant submits the wholesale business profile (incl. a
> CRA/TRN number, not auto-validated); the team is notified, reviews it, checks
> the CRA/TRN manually, and grants wholesale access by hand in Shopify admin.
> No automated verification and no automated Shopify writes occur.

## Positioning

The "private trade conservatory" — wholesale for florists, designers, event professionals, hotels and trade partners. Distinct trade voice; do not leak consumer-only messaging into wholesale, and do not leak wholesale pricing/messaging into retail.

## Access model — READ THIS

- Wholesale routes require **Shopify Customer Account authentication**.
- On successful authentication, access is granted **immediately**.
- **[Verified]** There is **NO pending-approval state** and **no separate wholesale password system** — enforced by `app/lib/storefrontRegression.test.ts` (the wholesale route must not match `wholesale_approved|approvalPending|pending_approval`). Do not invent an "approval pending" screen or gate.

## Flow

```
Guest
→ wholesale entry (card / gate / account icon)
→ branded modal (entry point only)
→ real Shopify Customer Account OAuth
→ callback → secure server session
→ wholesale destination (immediate access)
```

The modal is a **branded entry point**, never a replacement for Shopify's secure hosted auth. Sign-in and account-creation both hand off to the same Shopify Customer Account flow (there is no separate storefront sign-up form).

## Routes

- `/wholesale`, `/wholesale/flowers`, `/wholesale/supplies` (render via `CatalogueView`, `context` = wholesale). Unauthenticated wholesale product routes redirect to `/wholesale`.

## Rules for agents

- Preserve the existing auth + gating logic exactly.
- Do not persist tokens client-side; sessions use the existing secure Hydrogen server-session mechanism.
- Validate any return URL (no open redirects).
- Editorial pacing / marketing interstitials: exclude wholesale unless explicitly requested.

## Manual review decisions — email → confirmation → Admin write

The internal notification email lets the owner decide **from the email**, safely:

```
Profile saved → Resend internal email (FULL CRA/TRN, single recipient)
  → Approve / Reject buttons (signed, expiring tokens)
  → GET /internal/wholesale/review  (read-only confirmation page)
  → explicit POST confirmation
  → Shopify ADMIN API writes custom.wholesale_status (+ custom.wholesale_review_note on reject)
  → result page
```

- **Tokens** (`app/lib/wholesaleReviewToken.ts`): HMAC-SHA256 via Web Crypto
  (Oxygen/Workers-compatible). Payload is ONLY `{cid, act, exp, nonce, ver}` — never
  the CRA/TRN, email, business data, or any secret. Verified for signature, expiry,
  action, and a valid Customer GID.
- **HTTP safety**: GET is read-only (safe for scanners/previews/forwards); only an
  explicit POST mutates. An approve token cannot reject (action must match).
- **Decision guard** (`app/lib/wholesaleReview.ts` `commitReviewDecision`): only a
  **missing or pending** application may be decided; `approved`/`rejected`/
  `more_information_required` are never overwritten. Idempotent; a Shopify write
  failure never shows success. Reject requires a non-empty reason, stored in the
  staff-only `custom.wholesale_review_note` (never `business_notes`).
- **Admin write** (`app/lib/shopifyAdmin.ts`): server-only Shopify Admin GraphQL
  (`SHOPIFY_ADMIN_API_TOKEN`, `read_customers` + `write_customers`). The token is
  header-only and redacted from errors; the Customer Account API still cannot write
  `wholesale_status`. Tree-shaken out of the client bundle.
- **CRA/TRN**: full value appears ONLY in the internal email body and on the
  authenticated confirmation page — never in the subject, URLs, tokens, logs, errors,
  or the client bundle.

**Oxygen env:** `SHOPIFY_ADMIN_API_TOKEN`, `WHOLESALE_REVIEW_SIGNING_SECRET`,
`WHOLESALE_REVIEW_LINK_TTL_SECONDS`, `WHOLESALE_REVIEW_BASE_URL` (+ existing
`SHOPIFY_ADMIN_STORE_HANDLE`, Resend vars). Missing review config → the email still
sends, just without the Approve/Reject buttons.

> Note: this writes `wholesale_status` but does **not** change the storefront access
> gate, which remains authentication-only (see "Access model"). Making
> `approved` the access requirement is a separate, deferred decision.

## Status

The authentication **experience** (branded modal, account surfaces, session/logout polish) is specified but **not yet fully implemented** — see `09_ROADMAP.md`. The underlying Shopify auth flow already works.
