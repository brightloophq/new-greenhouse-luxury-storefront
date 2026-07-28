# 00 — Project Overview

> Living context for AI agents working in this repository. Keep it accurate; update when reality changes.

> **Verification baseline:** branch `redesign-v1` @ `acc9c3c` (verified 2026-07-28). 329 tests / typecheck / lint / build green.
>
> **Status legend** used across this knowledge base:
> - **[Verified]** — checked against the current `redesign-v1` source this pass.
> - **[Assumption]** — observed at runtime or in a prior session; **not** provable from source (e.g. live Shopify data). Confirm before relying on it.
> - **[Planned]** — specified/approved but not yet built.
> - **[Not Implemented]** — does not exist in the codebase.
>
> Any architectural claim **without** a tag has been verified against `redesign-v1` @ `acc9c3c`. `redesign-v1` is the single canonical branch — ignore other branches unless a task names one.

## What this is

**The New Greenhouse** — a premium florist storefront for a wholesale + retail flower business in **Kingston, Jamaica**. The goal is the most premium florist commerce experience in the market, on the quality bar of Venus ET Fleur, Bloom & Wild, Farmgirl Flowers and Aesop/COS-grade editorial polish.

This is **not** a template redesign — it is a luxury commerce experience built on Shopify Hydrogen.

## Tech stack

- **Shopify Hydrogen** (React Router 7) on **Oxygen** (Cloudflare Workers runtime)
- **React + TypeScript**
- **Tailwind CSS v4** + a bespoke `--ng-*` design-token layer
- **Vitest** for tests (source-string regression + unit)
- Storefront API for all commerce data

## Two experiences (one codebase)

The visual identity is **route-based**, set via `<html data-experience>` from the root loader:

- **classic** (default) — botanical green identity; the live retail/wholesale store
- **deluxe** — elevated black + champagne-gold premium identity (premium catalogue only)

`app/lib/experience.ts` decides the theme from the pathname. Overriding the `--color-greenhouse-*` primitives per `[data-experience]` re-themes the entire store with no component changes.

## Branches

- `redesign-v1` — **the canonical branch.** All docs describe this branch. Treat other branches as history unless a task names one.
- Deploys to Oxygen are **manual** (`shopify hydrogen deploy`). **[Assumption]** No Oxygen GitHub auto-deploy exists on this repo — observed via the commit's check-suites (Netlify/Supabase/Vercel only), not provable from source.

## Key facts an agent must know

- **[Assumption]** Preview/staging Oxygen URLs (`*.myshopify.dev`) sit behind Shopify's own OAuth wall — unauthenticated `curl` cannot reach the app (observed this session).
- **[Verified]** `/account/login` route (`($locale).account_.login.tsx`) initiates the Shopify Customer Account login (handles `login_hint`). There is no storefront-owned credential form.
- **[Verified]** Wholesale has **no** pending-approval state — enforced by `storefrontRegression.test.ts` (asserts the wholesale route never matches `wholesale_approved|approvalPending|pending_approval`). Do not invent one.
- **[Verified]** Test baseline: **329 tests**, typecheck + lint + production build green.

## Where to look next

| Topic | File |
|---|---|
| Code + runtime architecture | `01_ARCHITECTURE.md` |
| Tokens, primitives, motion | `02_DESIGN_SYSTEM.md` |
| Palette, type, voice | `03_BRAND_GUIDELINES.md` |
| Catalogue, cart, routes | `04_SHOPIFY_ARCHITECTURE.md` |
| Wholesale gating | `05_WHOLESALE_SYSTEM.md` |
| Working rules for agents | `07_CLAUDE_RULES.md` |
| Decisions + rationale | `08_DECISIONS.md` |
| Open work | `09_ROADMAP.md` |
