# 05 — Wholesale System

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

## Status

The authentication **experience** (branded modal, account surfaces, session/logout polish) is specified but **not yet fully implemented** — see `09_ROADMAP.md`. The underlying Shopify auth flow already works.
