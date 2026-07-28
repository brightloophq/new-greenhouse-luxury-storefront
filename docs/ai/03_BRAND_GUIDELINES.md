# 03 — Brand Guidelines

## Brand

The New Greenhouse — a luxury florist and wholesale flower house in Kingston, Jamaica. Established **1984**.

Tagline: *"Not just a flower, whatever it takes."*

Character: **Luxury · Minimal · Elegant · Editorial · Timeless.** Never flashy, never over-animated, never generic Shopify.

The governing metaphor is a **glasshouse / conservatory** — glass, mullions, botanical line-work, reflected light, warm botanical atmosphere. Every screen should feel like another room in the same conservatory.

## Palette

| Role | Classic (live) | Deluxe (premium) |
|---|---|---|
| Primary ground | Botanical green (`#0f3d26` forest) | Black `#090909` |
| Accent | Leaf green (`#3fae63`) — the "gold role" re-themed to green | Champagne gold `#c8a96a` |
| Fine accent | Champagne gold `--ng-gold` (`#c8a96a`) — kept in both | Champagne gold |
| Light page | Green-cream `#f4fbf6` | Warm ivory `#faf8f4` |
| Text on light | Deep green `#16452c` | Deep charcoal `#222` |

Classic is **green-dominant with restrained champagne accents** — both are brand colours; the mix is intentional, not an error.

Use lots of whitespace. Remove more than you add. One focal point per viewport.

## Typography

- Display: **Montserrat** (wide geometric caps for the wordmark and headings).
- Body: **Raleway**.
- (Brief legacy references to Canela/Cormorant/Playfair predate the Montserrat/Raleway migration — the live system is Montserrat + Raleway.)

## Logo

- Full wordmark **THE NEW GREENHOUSE** on tablet/desktop.
- Compact **leaf mark** on mobile (`< 768px`), centered in the header. Asset lives under `public/images/brand/`.
- Logo links to `/`; link `aria-label` "The New Greenhouse home"; decorative marks `aria-hidden`.

## Voice

Editorial, unhurried, confident. Educates or inspires; never hard-sells. Example approved lines: *"Every stem prepared with care."* / *"Same-day delivery across Kingston & St. Andrew."*

**Do not invent brand claims** — no fabricated testimonials, heritage, awards, care promises or seasonal claims. Approved copy lives in `app/lib/companyContent.ts` and `app/lib/homeContent.ts`. If no approved copy exists, use a purely visual treatment with no claim.

## Non-negotiables (`docs/LUXURY_PRINCIPLES.md`)

One focal point per viewport · ≤3 primary actions · never two buttons side by side · white space is content · remove more than you add.
