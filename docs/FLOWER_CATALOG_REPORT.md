# Flower Catalog Architecture — Report

**Date:** 2026-07-12 · **Branch:** `rescue-after-global-audit`
A scalable, data-driven flower catalog: **add a variety by dropping images + one data entry — zero UI changes.**

---

## 1. Files created / modified

### New
| File | Purpose |
|---|---|
| `app/data/flowers.ts` | Typed single source of truth (`Flower`, `FLOWERS`, helpers). |
| `app/components/FlowerCard.tsx` | The one reusable card every flower renders through. |
| `app/routes/($locale).flowers.tsx` | `/flowers` library route (SEO meta + JSON-LD `ItemList`). |
| `app/styles/flowers.css` | Premium card + grid styling. |
| `scripts/optimize-flowers.mjs` | Source → responsive WebP pipeline (Sharp). |
| `public/images/flowers/alstroemeria/*.webp` | 28 optimized WebP (7 colours × 4 widths). |
| `source-images/flowers/alstroemeria/*` | Staged originals (git-ignored). |

### Modified
| File | Change |
|---|---|
| `app/root.tsx` | Link `flowers.css`. |
| `app/components/Header.tsx` | Added "Flower Guide" → `/flowers` in the mega + mobile accordion. |
| `package.json` | `sharp` devDep + `npm run flowers:optimize`. |
| `eslint.config.js` | Ignore `scripts/**` (Node tooling). |
| `.gitignore` | Ignore raw `source-images/`. |

---

## 2. New folder structure

```
source-images/flowers/<family>/<color>.{png,jpg,webp}   ← raw uploads (git-ignored)
        │  npm run flowers:optimize (Sharp)
        ▼
public/images/flowers/<family>/<color>-{200,300,400,800}.webp   ← served, committed
        │
app/data/flowers.ts        ← data entries (id, family, name, slug, color, image, alt, …)
app/components/FlowerCard  ← renders any entry
app/routes/…flowers.tsx    ← /flowers grid, grouped by family
```

Each family gets its **own folder** (never one shared folder). Current: `alstroemeria/` with 7 colourways.

---

## 3. Reusable components / data

- **`FlowerCard`** — the only flower UI. Whole card is a keyboard-focusable `<a>`; responsive `<img srcset/sizes>`; `width/height` reserved; `loading`/`fetchPriority` driven by a `priority` prop; availability badge; name + colour.
- **`flowers.ts`** — `Flower` interface with every requested field (`id, family, name, slug, color, image, alt, category, availability, featured?, futurePrice?, description?`), `flowerSrcSet/flowerSrc`, `familyHandle`, `flowerHref`, `flowersByFamily`, and a terse `family()` builder. **No hardcoded cards anywhere.**

---

## 4. Performance improvements

| Concern | Implementation |
|---|---|
| Oversized assets | 700–840KB PNG sources → **5–42KB WebP** per variant. All 28 files = **556KB total**. |
| Responsive delivery | 4 widths (200/300/400/800) + `sizes` → browser fetches the right one (measured: 300w chosen for a 258px desktop slot; 400w for a 2× mobile slot). |
| Lazy loading | Only the first 4 cards (`priority`) are `loading="eager" fetchpriority="high"`; the rest `loading="lazy" fetchpriority="auto"`. |
| CLS | `aspect-ratio: 1/1` on the media box **and** intrinsic `width`/`height` on `<img>` → space reserved before load. |
| No duplicate requests | One `<img>` per card; `srcset` picks a single source. |
| Caching | Static assets under `public/` are hashed/served with long-cache headers by Oxygen. |
| Animation cost | Hover = `transform: translateY` (GPU) + box-shadow, `220ms`; honours `prefers-reduced-motion`. No blur/filters. |

---

## 5. Optimization summary

- **WebP, quality 82** (within 80–85), alpha preserved for cutout sources; never enlarged, **never cropped** (`fit: inside` + `object-fit: contain` + `object-position: center`).
- Image container is a fixed `1/1` box → flower heads and stems are always fully visible.
- **Theme-safe:** no `filter`, tint, or recolour on images — identical in any theme (the project has a single palette; the rule holds regardless).
- **SEO:** descriptive filenames (`purple-400.webp`), generated alt text ("Purple Alstroemeria — fresh cut flowers from The New Greenhouse, Kingston, Jamaica"), intrinsic dimensions, canonical, and JSON-LD `ItemList` structured data.
- **A11y:** whole card focusable `<a>` with `aria-label`, visible `:focus-visible` gold ring, semantic `<section>`/`<h2>` per family.

---

## 6. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ 0 |
| `npm run lint` | ✅ 0 (0 warnings) |
| `npm test` (Vitest) | ✅ 8/8 |
| `npm run build` | ✅ 0 (only pre-existing Rolldown bundle-analyzer notices) |

Verified in the browser: `/flowers` → 200; WebP asset → 200 (15.9KB); 4-col desktop / 2-col mobile; `object-fit: contain`; eager+high first row, lazy rest; JSON-LD present; **no console errors; no horizontal scroll**.

---

## 7. Scaling to a new family (the whole workflow)

1. `source-images/flowers/roses/{red,white,pink,…}.png`
2. `npm run flowers:optimize`
3. Add a `family('Roses', [{color:'Red', file:'red'}, …])` block to `FLOWERS` in `app/data/flowers.ts`.

That's it — the `/flowers` grid, the card, srcset, lazy-loading, SEO and JSON-LD all update automatically. **Zero component/CSS changes.**

---

## 7b. Storefront wiring (browse → images)

The images are now reachable from the storefront, not just `/flowers`:

- **New route** `app/routes/($locale).flowers.$family.tsx` — a per-family page (`/flowers/<handle>`) showing that family's colourway images + a **"Shop all <family>"** CTA to the filtered collection. Graceful **coming-soon** state for approved families without images yet; **404** for unknown handles.
- **Route layout fix:** the index was renamed `($locale).flowers._index.tsx` and a pathless layout `($locale).flowers.tsx` (`<Outlet/>`) added, so `/flowers` and `/flowers/:family` both SSR correctly (the implicit parent otherwise 500'd on direct load).
- **Nav wiring** (`Header.tsx`): each mega "Flower Varieties" link routes to `/flowers/<handle>` **only when that family has uploaded images** (`hasFlowerImages`), otherwise to the existing filter — so Alstroemeria opens the image page today and every other family lights up automatically as images are added. The home page "Shop by flower" now surfaces **Alstroemeria** → its family page.
- New helpers: `flowerFamilyPath` (flowerCategories.ts), `hasFlowerImages` / `flowersForFamily` (flowers.ts).

Verified: `/flowers` 200 · `/flowers/alstroemeria` 200 (7 images) · `/flowers/roses-in-stock` 200 (coming-soon) · `/flowers/nope-xyz` 404; mega "Alstroemeria" → `/flowers/alstroemeria`, "Roses - In Stock" → filter.

## 8. Remaining recommendations

1. **Lighthouse:** could not run headless Lighthouse in this environment. The build satisfies the standard levers for 95+/100/100/100 (responsive WebP, lazy + priority hints, reserved dimensions, alt/semantics/JSON-LD, GPU-only motion). Run `lighthouse http://localhost:<port>/flowers` to confirm on the deployed URL.
2. **Product linkage:** cards currently link to the filtered catalog (`?flower=alstroemeria`). If per-colour PDPs are desired later, add `slug`-based routes and point `flowerHref` at them.
3. **`futurePrice`/`description`:** fields exist in the type but are unused in the card; surface them when pricing is finalized.
4. **Remaining 24 families:** drop images + data entries as they arrive (see §7). No architecture work needed.
5. **AVIF:** if further savings are wanted, add an `avif` branch to the optimizer and an extra `<source>` — the card is already `<img>`-based and easy to wrap in `<picture>`.
