# 00 — Project Overview

> Living context for AI agents working in this repository. Keep it accurate; update when reality changes.

> **Verification baseline:** branch `redesign-v1` @ `abb19f4` (re-verified 2026-08-26). 553 tests across 37 files / `npm run typecheck` / build green. (Earlier baseline: `acc9c3c` @ 329 tests, 2026-07-28 — superseded by the wholesale email-review work.)
>
> **Status legend** used across this knowledge base:
> - **[Verified]** — checked against the current `redesign-v1` source this pass.
> - **[Assumption]** — observed at runtime or in a prior session; **not** provable from source (e.g. live Shopify data). Confirm before relying on it.
> - **[Planned]** — specified/approved but not yet built.
> - **[Not Implemented]** — does not exist in the codebase.
>
> Any architectural claim **without** a tag has been verified against `redesign-v1` @ `abb19f4`. `redesign-v1` is the single canonical branch — ignore other branches unless a task names one.

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
- **[Verified]** Oxygen auto-deploys from GitHub Actions. `.github/workflows/oxygen-deployment-1000155967.yml` runs `npx shopify hydrogen deploy` on `on: [push]` (every push, any branch), using the `OXYGEN_DEPLOYMENT_TOKEN_1000155967` secret. **HIGH-RISK operational fact: pushing may trigger an Oxygen deployment — verify branch/deployment behavior before pushing.** (`shopify hydrogen deploy` also still works as a manual deploy. The earlier "manual-only / no GitHub auto-deploy" assumption was wrong — the workflow file is the evidence.)

## Key facts an agent must know

- **[Assumption]** Preview/staging Oxygen URLs (`*.myshopify.dev`) sit behind Shopify's own OAuth wall — unauthenticated `curl` cannot reach the app (observed this session).
- **[Verified]** `/account/login` route (`($locale).account_.login.tsx`) initiates the Shopify Customer Account login (handles `login_hint`). There is no storefront-owned credential form.
- **[Verified]** Wholesale access is gated on the owner's manual `custom.wholesale_status` decision (the single source of truth), resolved only in `app/lib/wholesale.ts`. Only `approved` opens the trade catalogue; `pending`/`rejected`/`more_information_required`/blank deny with a status notice. The legacy `custom.wholesale_approved` key is retired — `storefrontRegression.test.ts` asserts the gate never references it again.
- **[Verified]** Test baseline: typecheck + lint + production build green (see `app/lib/*.test.ts`).

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
