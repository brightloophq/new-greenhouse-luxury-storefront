# Image Generation — Pilot Report

**Pilot scope:** Alstroemeria · Roses · Orchids, Classic + Deluxe. 12 concepts
generated live, optimized, and reviewed. **No storefront integration and no
catalogue-wide generation** — awaiting owner sign-off on this report.

- Model: `gemini-2.5-flash-image` (Gemini image API, paid key)
- Generated: **12 / 12**, 0 errors. Originals ~1.3 MB PNG each
  (`source-images/generated-originals/`, gitignored — large/regenerable).
- Native sizes: cards **896×1152** (~4:5), heroes **1344×768** (~16:9).
- Optimized: 66 WebP+AVIF derivatives, **1.6 MB total** (`public/images/generated/`).
  Cards deliver up to 800w, heroes up to 1280w (the optimizer never enlarges past
  the source).
- Every image was visually inspected. Full-size previews were shown in the chat.

## Verdicts

| # | Asset | Verdict | Notes |
|---|---|---|---|
| 1 | classic-alstroemeria-purple-wholesale-bunch-card | ✅ approve | Accurate purple alstroemeria (correct speckled throat), fresh stems, cellophane bunch, clean neutral bg, no text |
| 2 | classic-alstroemeria-pink-wholesale-bunch-card | ✅ approve | Accurate pink alstroemeria, kraft cuff + twine, clean bg, no text |
| 3 | classic-roses-red-wholesale-box-card | ✅ approve | Red roses in kraft box, cellophane bunches, visible stems/greenery, no text |
| 4 | classic-roses-ivory-wholesale-box-card | ✅ approve | Ivory roses by the box, clean, accurate, no text |
| 5 | classic-orchids-white-wholesale-stems-card | ✅ approve | White phalaenopsis stems, cellophane base, clean bg, no text |
| 6 | classic-orchids-purple-wholesale-stems-card | ✅ approve | Magenta phalaenopsis stems, accurate, clean, no text |
| 7 | deluxe-alstroemeria-purple-signature-bouquet-card | ♻ regenerate | Beautiful, but ribbon reads garbled brand text ("New Grenhouse") |
| 8 | deluxe-alstroemeria-pink-signature-hero | ♻ regenerate | Editorial 16:9, but garbled ribbon text ("NPYENDUSE") |
| 9 | deluxe-roses-red-signature-bouquet-card | ♻ regenerate | Stunning bouquet; ribbon carries embedded brand text (mostly legible) |
| 10 | deluxe-roses-red-signature-hero | ♻ regenerate | Garbled ribbon text + slightly CGI gold-twig props |
| 11 | deluxe-orchids-white-luxury-gift-card | ♻ regenerate | Elegant; ribbon text garbled ("New Greehouse / Copenhouse") |
| 12 | deluxe-orchids-white-luxury-hero | ♻ regenerate | Editorial 16:9; garbled ribbon text |

**Tally:** approve **6** · regenerate **6** · manual-review 0 · rejected 0.

## Root cause of the Deluxe issue (and the fix already applied)

The Deluxe prompt requested a *"champagne-gold and black New Greenhouse ribbon."*
That instruction told the model to render the **brand name on the ribbon**, and
image models render text as **gibberish**. This violates the no-embedded-text /
no-gibberish rule.

**Fix applied** (`scripts/images/lib.mjs`, already committed to the matrix): the
Deluxe prompt now asks for *"a plain champagne-gold and black satin ribbon —
smooth and blank with absolutely no text, lettering, words, or writing"* and the
negative prompt continues to ban text/letters. Re-running the matrix refreshed
all 6 Deluxe prompts. The Classic prompts and images are unaffected.

## Quality notes
- **Classic set is production-ready** — catalog-clear, botanically accurate,
  correct colours, clean backgrounds, no text. Recommended: **approve all 6.**
- **Deluxe set** nails the premium look (wrap, colour story, editorial framing,
  negative space) — only the ribbon text is wrong. A regenerate with the fixed
  prompt should clear it in one pass.
- **Hero resolution**: native 1344×768 → derivatives max 1280w. Fine for most
  screens; if pixel-sharp full-bleed heroes on 1920px displays are required, a
  future option is Imagen 4 Ultra (higher native res) for hero rows only.

## Recommended next steps (await approval per step)
1. **Approve the 6 Classic assets** (set `approved=true` in the matrix, or tell me).
2. **Regenerate the 6 Deluxe assets** with the fixed prompt:
   set `IMAGE_GENERATION_DRY_RUN=false` → `npm run images:pilot:generate --force`
   (or delete the 6 Deluxe originals and re-run) → `images:optimize` →
   `images:validate` → re-review here.
3. Only after both sets are approved: `images:integrate` (build the manifest) and
   wire the resolution layer into the storefront — **a separate, approval-gated
   step. No integration has happened yet.**

*No storefront, component, or Shopify change was made. Dry-run restored to the
default. The API key lives only in gitignored `.env.images` and was never logged.*
