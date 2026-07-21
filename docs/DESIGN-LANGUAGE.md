# The New Greenhouse — design language

One vocabulary for the whole storefront. Components pick from it; they never
invent values. `app/lib/designSystem.test.ts` enforces the rules below.

---

## 0. The Glasshouse — the signature system

The storefront's identity is **Luxury Botanical Architecture**: not a flower
shop but a conservatory. One architectural language runs through every room so
each page reads as another pane of the same building, never another website.

It is deliberately **not** the reference's territory. Wildstem is soft, organic,
atelier; The New Greenhouse is *structural* — the Victorian glasshouse: thin
mullion frames, glazing-bar joints, windowpane geometry, botanical line-work
climbing a structural spine. Structure is what we own.

### The four signature primitives

They live in `app/styles/design-system.css`, so **every** surface inherits them
— homepage, interior pages, and any room built later — rather than each page
reinventing a frame.

| Primitive | Class | Role |
|---|---|---|
| **Mullion frame** | `.ng-glass-corners`, `.ng-glass-framed` | Corner-bracket joints (an `::after` overlay, no extra DOM) that frame a plate like a glazed panel. `--framed` adds the full hairline border. |
| **Glazing-bar divider** | `.ng-glaze-rule` (component: `GlasshouseDivider`) | The join where two panes meet — a full-measure hairline broken at centre by a structural node. Replaces `<hr>` and opens each section head. |
| **Plate label** | `.ng-plate-label` | An engraved section marker: italic index numeral, a rule, then the name in the caption register — like a glasshouse-door plate. |
| **Editorial display + flourish** | `.ng-editorial-title`, `.ng-flourish` | The oversized architectural moment, with an italic accent carrying one word inside it. The flourish is **always house green** — the emphasis reads botanical, never as a second colour. |

### Tokens

`--ng-glass-line` / `--ng-glass-line-strong` (cooler and quieter than a content
hairline — this is architecture, not emphasis), `--ng-glass-joint` (bracket arm
length), `--ng-font-size-display-2xl` (the one true oversized step, above
`display-xl`, reserved for the largest word on a screen).

### How a room wears it

Every section masthead opens the same way: a glazing seam, a plate label
(`I` … `IV`), then an editorial title whose accent word is the flourish. The
homepage runs the full score — entrances → the botanical register → reviews →
the closing Conservatory band — and the shared interior-page masthead
(`.ng-page-*`, used by About / Contact / Reviews) inherits the same register
through CSS, so no interior page falls back to a generic heading.

---

## 1. Colour

The palette lives in `app/styles/design-system.css`. Nothing else may declare a
brand hex — a test fails the build if a component stylesheet does.

### Botanical green — the storefront's identity

| Token | Use |
|---|---|
| `--ng-green-deep` | headings, wordmark, primary ink on light grounds |
| `--ng-green-pressed` | pressed / hover-darken of the deep green |
| `--ng-green` | leaf — links, eyebrows, secondary actions |
| `--ng-green-muted` | body copy on green-tinted grounds |
| `--ng-green-soft` | meta, captions, disabled text |
| `--ng-green-faint` | placeholders, hairline text |
| `--ng-on-green` | text sitting **on** a green surface |

### Grounds

| Token | Use |
|---|---|
| `--ng-ground-sage` | hero and variety section |
| `--ng-ground-warm` | alternating section ground |
| `--ng-ground-tint` | image placeholder, empty media |
| `--ng-ground-panel` | raised panels — modal, sheet |

### Hairlines and accent

`--ng-green-line` / `--ng-green-line-strong` for rules and dividers.

`--ng-gold` and `--ng-gold-pale` are an **accent, rationed** — one gold moment
per screen, never a surface.

### Premium register

`--ng-premium-*` applies **only** under `[data-experience="deluxe"]`, which
`themeForPath` sets on `/arrangements/premium-deluxe` and nowhere else. A test
asserts no premium token is used outside a deluxe block.

`--ng-on-green` and `--ng-premium-text` share a value today but are deliberately
separate: they mean different things and will diverge if either register is
retuned.

---

## 2. Motion

Families live in `app/lib/motion.ts` and are mirrored as `--ng-motion-*` custom
properties, so a CSS hover and a GSAP timeline move at identical speed.

| Family | Duration | Job |
|---|---|---|
| `hover`, `interact` | 0.2s | buttons, links, arrows, inputs |
| `card`, `modal`, `nav`, `page` | 0.4s | cards, dialogs, nav panels, route change |
| `reveal` | 0.72s | a section arriving on scroll |
| `hero` | 1.1s | homepage opening sequence |
| `loading`, `success`, `error` | 0.4–0.72s | pending and feedback states |

Easings: `power2.out`, `power3.out`, `expo.out`. **No bounce, elastic or
overshoot** — including for errors.

### Rules

- Components pick a family by name. No component declares a duration.
- GSAP is **dynamically imported**; it never enters the server bundle.
- Reduced motion is checked **before** the import — no library, no animation.
- Every timeline runs in a `gsap.context` reverted on unmount.
- Reveals use `fromTo` + `immediateRender: false`, so content is never left
  invisible if a trigger does not fire.
- ScrollTrigger only for section reveals. No pinning, no scrub, `once: true`.

---

## 3. Imagery

### Photography specification

Every commissioned or generated image must match:

- **Ground** — seamless warm cream, no rooms, no props, no scattered stems
- **Camera** — eye level, subject centred, generous air above
- **Light** — single soft key, gentle falloff, no hard multi-source
- **Styling** — raffia-tied stems where a bunch is shown
- **Palette** — one or two hues; multi-hue only when the variety *is* mixed

The flower library (`/public/images/flowers/*`) already meets this and is the
reference set. The four homepage chooser photographs do **not** — see the
remaining-work list.

### Technical rules

| Rule | Value |
|---|---|
| Format | WebP |
| Flower library widths | 200 / 300 / 400 / 800 |
| Section & collection widths | 400 / 600 / 800 |
| Loading | `lazy` below the fold, `eager` for the hero only |
| Decoding | `async` |
| Dimensions | always `width`/`height` to reserve space |
| Placeholder | `--ng-ground-tint`, never white |
| Radius | 3px on editorial plates; 14px on chooser cards |

**Never list a width that is not on disk** — the browser will pick a 404.

### Focal points

Every photograph is a portrait bloom shot, but the frames that hold them are
not — the entrances crop to 5:4 / 3:2, the variety plates to anything from 4:5
to 3:1. A naive centred `object-fit: cover` decapitates a bouquet whose blooms
sit high in the frame. `app/lib/focalPoint.ts` carries the subject position for
each image as `object-position` percentages, read from the actual photograph,
so the same image crops responsibly into any frame at any width.

- Keyed by the image's path base (no `-{width}.webp`), so one entry covers every
  responsive width.
- Unregistered images fall back to the **botanical default** `50% 40%` — blooms
  sit above stems, so a flower's honest centre is a little high.
- Pure render-time metadata: no client JS, and `object-position` changes neither
  layout nor the LCP, so there is no CLS or performance cost.
- Applied on the entrances and the variety plates today; new cropped surfaces
  (collection heroes, PDP galleries) should adopt `focalStyle()` as they are
  built rather than re-centring by hand.

---

## 4. Layout

- Grid: 12 columns, `--ng-space-*` for rhythm.
- Editorial plates: 3px radius, no shadow, label on the ground beneath a
  hairline — never a white box over the photograph.
- Wayfinding cards: 14px radius, image-filled, gradient scrim, label inside.
- Section max width 78rem.
- Variety grid spans are chosen by **count** (`spansFor`), so every row fills
  and no card is ever orphaned.
