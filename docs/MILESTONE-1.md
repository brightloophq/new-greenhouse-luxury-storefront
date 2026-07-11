# Milestone 1 — Design Foundation ✅ COMPLETE (2026-07-11)

**Goal:** One canonical design-token source matching `CLAUDE.md` exactly; brand palette corrected; fonts loaded/preloaded; stale fallbacks reconciled; WCAG AA validated. Data-independent (safe with empty catalog).

## Brand palette (target — CLAUDE.md)
| Token | Hex | Was (`--ng`) |
|---|---|---|
| Black (primary) | `#090909` | `#090909` ✓ |
| Champagne Gold (secondary) | `#C8A96A` | `#c8a45b` |
| Warm Ivory (background) | `#FAF8F4` | `#f7f4ef` |
| Deep Charcoal (text) | `#222222` | `#12110f` |
| Botanical Green (accent) | `#4D6A50` | `#234938` |

## Architecture decision — single source of truth
`tailwind.css @theme` becomes the **one** palette source (keeps Tailwind meaningful per the stack). Chain:
```
tailwind @theme (--color-greenhouse-*)  →  design-system --ng-color-*  →  legacy --color-* aliases
```
No more three independent copies.

## Task checklist
- [x] Tailwind `@theme` → brand palette + `charcoal` token (single source of truth)
- [x] `design-system.css` core palette → references Tailwind vars; `--ng-text-primary` → charcoal, page bg → ivory
- [x] `app.css` legacy `--color-*` literals → reference canonical chain (no conflicting hexes)
- [x] Fonts: self-hosted Inter (400/500/600/700) + Cormorant Garamond (400/400i/500/600), `@font-face` + preload of critical faces, CSP-safe (same-origin)
- [x] Reconcile `reset.css` element headings → `--ng-*` scale; base button → control-height token
- [x] Strip all stale `var(--x, #hex)` fallbacks (85 removed across app.css + reset.css)
- [x] WCAG AA contrast validation — added `--ng-gold-text` (#8a6a2a) for gold-on-light; `.home` keeps bright gold on dark
- [x] typecheck + build + lint clean; live visual verification

## Files changed
- `app/styles/tailwind.css` — brand palette as single source (@theme)
- `app/styles/design-system.css` — core palette → var refs; +`--ng-gold-text`; `.ng-label` color
- `app/styles/app.css` — legacy color vars → canonical; `.greenhouse-kicker` a11y; `.home` override; fallbacks stripped
- `app/styles/reset.css` — headings/button → design-system tokens; fallbacks stripped
- `app/styles/fonts.css` — NEW, self-hosted @font-face
- `app/assets/fonts/*.woff2` — NEW, 8 self-hosted font files
- `app/root.tsx` — fonts stylesheet link + 2 preloads

## Verification (live app, localhost:3000 against real store)
- Tokens resolve to brand exactly: gold `#c8a96a`, ivory `#faf8f4`, charcoal `#222222`, green `#4d6a50`; single chain (`--color-gold` → `#c8a96a`).
- Body ivory `rgb(250,248,244)` on charcoal `rgb(34,34,34)`; home wrapper dark `rgb(9,9,9)`.
- Fonts self-hosting & applied: hero H1 = Cormorant Garamond 56px; body = Inter; `document.fonts` shows Inter + Cormorant loaded.
- Contrast: light-page kicker `#8a6a2a` (AA 4.74); dark-home kicker `#c8a96a` (AA 8.86); all other pairings ≥ AA.
- `npm run typecheck` ✓ · `react-router build` ✓ (8 fonts hashed & bundled) · `eslint` ✓.

## Progress log
- 2026-07-11: M1 started; discovery complete.
- 2026-07-11: Token consolidation, self-hosted fonts, contrast tokens, reset reconciliation — all done, built, and verified live. **M1 complete.**
