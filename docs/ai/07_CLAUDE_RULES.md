# 07 — Rules for AI Agents

These extend the root `CLAUDE.md`. Follow them exactly.

## Scope discipline

- Do **only** what the current task asks. Do not redesign, refactor unrelated code, or "improve" adjacent files.
- Presentation-only tasks must not change Shopify/commerce logic, routes, loaders, queries, auth, filters, sorting or pagination.
- Prefer fixing the **root cause** in a shared token/primitive over per-page patches. Do not use blanket `overflow-x:hidden`/`clip` to hide an overflow whose source you haven't found.

## Verify before you claim

- **Never claim a fix works from source inspection alone.** Verify against the running build: `npm run typecheck`, `npx vitest run` (553 baseline / 37 files @ `abb19f4`), `npm run build`, and live DOM measurement in the preview. Use `npm run typecheck` — **not** bare `npx tsc --noEmit` — because React Router type generation (`react-router typegen`) must run first; bare `tsc` fails on a fresh tree with spurious "Cannot find module `.react-router/types/…`" errors.
- Prefer scale-invariant measurements in the in-app preview pane (`scrollWidth`/`clientWidth` ratios, `offset` from centre, computed styles). The pane's absolute pixel rects can be scaled — do not trust raw `getBoundingClientRect` widths as device pixels.
- Oxygen preview URLs are behind Shopify's OAuth wall — `curl` cannot reach the app. Live verification of a deployment requires the authenticated browser or the owner's help.
- If something can't be verified, say so plainly. Report skipped steps and failures honestly.

## Local setup (new machine) — canonical validation

Verified green on a fresh clone at `abb19f4` (2026-08-26). Run in order:

1. Node `^22 || ^24` (verified on Node 22).
2. `npm ci` — do **not** run `npm audit fix` or any dependency mutation; it must leave `package.json`/`package-lock.json` unchanged.
3. `npm run typecheck` — **not** bare `npx tsc --noEmit` (typegen must run first; see above).
4. `npx vitest run` — 553 tests / 37 files.
5. `npm run build`.

Note: `npm run build` (`--codegen`) regenerates `customer-accountapi.generated.d.ts`. That file is committed **stale** relative to the current `WholesaleStatus` / `wholesale_status` source query, so the build shows it (and `tsconfig.tsbuildinfo`) as modified — expected, not a regression. See `08`.

## Don't fabricate

- No invented brand claims, testimonials, care advice, awards or copy. Use approved content sources or a visual-only treatment.
- Don't invent business logic that doesn't exist (e.g. a wholesale pending-approval state).
- If you can't reproduce a reported bug, prove that instead of manufacturing a fix.

## Commit discipline

- One isolated, well-scoped commit per task. Verify green first.
- Commit messages: state root cause + verification evidence. End with the `Co-Authored-By` trailer.
- Branch: work on `redesign-v1` (or the branch named by the task).
- **[Verified] Pushing may trigger an Oxygen deployment.** `.github/workflows/oxygen-deployment-1000155967.yml` runs `npx shopify hydrogen deploy` on `on: [push]` (every push, any branch). **Verify branch/deployment behavior before pushing.** A manual `shopify hydrogen deploy` also still works. (See `00`.)

## Cost + external actions

- Paid/irreversible/outward actions (deploys, video/image generation, sends) require explicit authorization and a working, verified toolchain first. Confirm credentials + dependencies (the Phase 0 gate) before spending.
- Never expose secrets; keep `.env*` gitignored.

## Context honesty

- If the context budget is too low to finish a large task safely, stop at a clean boundary and hand off with findings — do not ship half-verified work. (This project has needed reverts from work that outran its verification.)
