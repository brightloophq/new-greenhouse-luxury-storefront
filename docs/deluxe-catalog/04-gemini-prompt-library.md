# Gemini Prompt Library — Deluxe House Style

Reusable, modular prompt system for generating **photorealistic, luxury, Shopify-ready** product imagery for the Deluxe catalogue. Every per-product prompt in the master CSV / product blocks is built from these modules so the whole catalogue looks like one cohesive photoshoot.

Pipeline: `scripts/images/*.mjs` → `gemini-2.5-flash-image`, `.env.images` (`IMAGE_GENERATION_DRY_RUN`), aspect `4:5`. **Do not generate yet — this is the spec only.**

---

## 1. The house style (the "constant" every prompt shares)

These clauses are **identical across all florals** — they are what make the catalogue consistent:

| Module | Locked value |
|---|---|
| **Background** | "soft warm ivory-to-pale-taupe seamless studio background that fills the frame, with a gentle natural grounding shadow — no black, no dark border, no vignette, no props, no table" |
| **Lighting** | "soft luxury commercial studio lighting, balanced exposure, gentle natural highlights, no harsh shadows" |
| **Camera** | "eye-level, straight-on" (centerpieces: "slight 3/4 elevated angle") |
| **Composition** | "subject centred, generous negative space, ~10% even margin, full arrangement visible" |
| **Ribbon** | "plain smooth champagne-gold and black satin ribbon, completely blank — no text, no print" (sympathy: "plain white or soft-grey satin ribbon, blank") |
| **Grading** | "warm, natural, true-to-life colour, premium editorial finish" |
| **Crop** | "Vertical 4:5 crop" |
| **Quality guardrails** | "Photorealistic high-end florist catalogue photograph; botanically accurate; ultra-sharp, high detail; not CGI, not painterly, not oversaturated" |
| **Negative** | "no AI artifacts, no malformed or duplicated petals, no wrong species, no text, no logo, no watermark, no people, no hands, no black background, no frame, no vignette" |

## 2. Prompt skeleton (fill the {slots})

```
Professional luxury florist catalogue photograph of {SUBJECT: a finished gift-ready
{form} of {primary flowers} with {secondary flowers} and {greenery}, {palette}
palette, {arrangement style}, hand-arranged with refined density}, presented in
{VESSEL: premium kraft and ivory tissue wrap | a {colour} ceramic vase | a {colour}
keepsake gift box | a woven basket}, tied with a plain smooth {ribbon} satin ribbon,
completely blank with no text. Photographed eye-level and straight-on, subject centred
with generous negative space and about a 10% margin, on a soft warm ivory-to-pale-taupe
seamless studio background with a gentle natural grounding shadow — no black, no dark
border, no vignette, no props. Soft luxury commercial studio lighting, balanced exposure,
gentle natural highlights. Warm, natural, true-to-life colour, premium editorial finish.
Vertical 4:5 crop. Photorealistic high-end florist catalogue quality, botanically
accurate {primary flowers} with correct petal shape and bloom structure, ultra-sharp,
high detail. Not CGI, not painterly, not oversaturated. No text, no logo, no watermark,
no people, no hands, no malformed or duplicated flowers, no wrong species.
```

## 3. Slot modules

**{form}** — bouquet · vase arrangement · box arrangement · basket · standing spray · wreath · casket spray · centerpiece · posy
**{vessel}** — `premium kraft and ivory tissue wrap` (bouquets) · `a matte-black and gold ceramic vase` (signature) · `a clear premium glass vase` (arrangements) · `a black keepsake hat box` (rose boxes) · `a wire easel stand` (standing spray/wreath) · `a woven natural basket` (baskets)
**{palette}** modules — red · blush · white-and-ivory · pastel · jewel-toned · gold-and-white · bright-mixed · soft-blue · soft-pink · autumnal amber-and-burgundy · white-and-silver

## 4. Category overrides

### Sympathy Tributes
- Palette **predominantly white and green**, no bright colours.
- Standing spray / wreath: **shown on a wire easel stand**, upright.
- Casket spray: **horizontal casket-top piece**, viewed at a slight downward 3/4 angle.
- Ribbon: **white or soft-grey**, blank. Tone: **serene, dignified, respectful**.

### Corporate
- Structured, polished, **whites/greens with a restrained accent**, in a modern vase suited to a desk or lobby. No romance cues.

### Wedding
- Bridal/bridesmaid: **hand-tied, trailing greenery**, ivory/blush/white, held-style but **no hands** (rest on the seamless background).
- Centerpieces: show the **vessel/footed stand**, slight elevated 3/4 angle.

### Gift Add-ons (NON-floral — critical)
Depict the **actual product**, NOT flowers, in the same background/lighting/4:5 style:
| Add-on | Subject clause |
|---|---|
| Belgian Chocolates | "an elegant ribboned box of assorted Belgian chocolates, lid slightly open showing the chocolates" |
| Premium Teddy Bear | "a premium soft cream plush teddy bear sitting upright, luxurious fur" |
| Luxury Greeting Card | "a luxe blank ivory greeting card standing with its envelope, subtle gold edge, no text" |
| Balloon Bouquet | "a tasteful cluster of ivory and champagne balloons with satin ribbon" |
| Premium Vase Upgrade | "a single clear premium cut-glass vase, empty, elegant proportions" |

## 5. Consistency & QA rules

1. **One shoot look:** never change background/lighting/crop between products.
2. **Botanical accuracy first:** name the exact species; reject malformed/wrong-variety output (same rule that governed the wholesale library).
3. **Blank ribbon always** — no text/logos baked into imagery (prevents dated/duplicated assets).
4. **Generate at 4:5**, then optimise to WebP `{200,300,400,800}` widths into `public/images/deluxe/<occasion>/<handle>-<w>.webp`; keep the original PNG under `source-images/deluxe/`.
5. **Validate every image** before it's attached (human/vision review), exactly like the wholesale Phase-1/2A gate.
6. **Dry-run the pipeline first** (`IMAGE_GENERATION_DRY_RUN`), live only after approval.

## 6. Per-product prompts

The complete, ready-to-run prompt for **every** product lives in its 27-field block (field "Gemini Image Prompt") and in the master CSV `image_prompt` column. This library is the grammar; those are the sentences.
