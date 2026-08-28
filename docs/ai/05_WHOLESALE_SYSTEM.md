# 05 — Wholesale System

> **Wholesale onboarding is a simple MANUAL review process** (2026-07 decision).
> The automated-verification architecture (AI wholesale officer, TRN/registry
> providers, rules engine, orchestration, payload recorder, n8n workflows) was
> **removed**. An applicant submits the wholesale business profile (incl. a
> CRA/TRN number, not auto-validated); the team is notified, reviews it, checks
> the CRA/TRN manually, and grants wholesale access by hand in Shopify admin.
> No automated verification and no automated Shopify writes occur.
>
> **[Verified 2026-08-26]** "Removed" is accurate for the AI officer, the
> TRN/registry providers, the payload recorder, and the n8n workflows (the `n8n/`
> directory is gone). It is **not** accurate for the Sprint A1/A2 code: the
> `app/lib/wholesale/` domain (state machine, orchestration, in-memory sandbox)
> and docs `13`/`14`/`15` **still exist in the repo**. They are **dormant** —
> imported by no route or component, not part of the active route-level
> authorization path (that path is the separate file `app/lib/wholesale.ts`),
> though their own unit tests still run. Do not delete them as part of unrelated
> work; treat them as an inactive foundation pending an owner decision. See `08`.

## Positioning

The "private trade conservatory" — wholesale for florists, designers, event professionals, hotels and trade partners. Distinct trade voice; do not leak consumer-only messaging into wholesale, and do not leak wholesale pricing/messaging into retail.

## Access model — READ THIS

- Wholesale routes require **Shopify Customer Account authentication**.
- Authentication is **necessary but not sufficient**. Access is gated on the
  owner's **manual review decision**, the SINGLE source of truth:
  the `custom.wholesale_status` customer metafield.
- **[Verified]** `app/lib/wholesale.ts` (`getWholesaleAccess` +
  `normalizeWholesaleStatus`) is the only place this is resolved; there is **no
  separate wholesale password system** and **no other approval mechanism**. The
  legacy `custom.wholesale_approved` key is retired — `storefrontRegression.test.ts`
  asserts the wholesale gate never references `wholesale_approved` again.
- Status → access:
  - `approved` → wholesale catalogue + pricing + checkout
  - `pending` (or blank / unknown / a failed read) → "under review" notice
  - `rejected` → rejection notice + Contact us
  - `more_information_required` → "one more step" notice + Contact us
- **Fails closed**: anything other than an explicit `approved` denies access —
  a customer is never granted wholesale by default.

## Flow

```
Guest
→ wholesale entry (card / gate / account icon)
→ branded modal (entry point only)
→ real Shopify Customer Account OAuth
→ callback → secure server session
→ wholesale destination — only if custom.wholesale_status = approved
  (otherwise the matching status notice; owner sets the status in Shopify Admin)
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

> **[Verified] (commit `72b18e5`)** The storefront access gate now enforces the
> manual decision: `custom.wholesale_status` is the source of truth, and only an
> explicit `approved` grants the wholesale catalogue / pricing / checkout.
> `blank` / `pending` / `rejected` / `more_information_required` / unknown / a
> failed read all **fail closed** (denied). This supersedes the earlier
> "authentication-only, `approved` deferred" note. The Admin write here sets that
> same `wholesale_status` value the gate reads.

## Status

The authentication **experience** (branded modal, account surfaces, session/logout polish) is specified but **not yet fully implemented** — see `09_ROADMAP.md`. The underlying Shopify auth flow already works.
