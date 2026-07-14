# SEO Strategy — Deluxe Catalogue

Luxury-florist keyword strategy for Kingston / Jamaica, aligned to the project's SEO priorities. Preserves all existing Hydrogen SEO features (never remove them) and layers structured, occasion-led metadata on top.

---

## 1. Keyword architecture

Three intent tiers:

| Tier | Example queries | Where it wins |
|---|---|---|
| **Occasion + place** (primary) | "birthday flowers Kingston", "sympathy flowers Jamaica", "anniversary flower delivery Kingston" | Occasion collection pages |
| **Product + place** | "luxury rose bouquet Kingston", "white orchid arrangement Jamaica" | PDPs |
| **Service** | "same day flower delivery Kingston", "luxury florist Jamaica", "corporate flowers Kingston" | Home, same-day, corporate pages |

Core brand terms to reinforce everywhere: **luxury florist Kingston**, **flower delivery Jamaica**, **The New Greenhouse**, **premium flowers Kingston**.

## 2. Templates

### Product SEO title
```
<Product Name> | Luxury Flower Delivery Kingston | The New Greenhouse
```
Keep ≤ ~60 chars where possible; if the name is long, drop the middle clause:
`<Product Name> | The New Greenhouse`.

### Product SEO description (140–160 chars)
```
<Benefit/emotion sentence>. <Occasion + flower>. Same-day luxury flower
delivery in Kingston by The New Greenhouse.
```
Example: *"Two dozen velvety red roses, hand-arranged and gift-ready. The signature romantic gesture — same-day luxury flower delivery in Kingston."*

### Meta keywords (5–8)
`luxury flowers kingston, <occasion> flowers jamaica, <flower> bouquet delivery kingston, premium florist jamaica, the new greenhouse`

### Collection SEO
- Title: `<Occasion> Flowers Kingston | Luxury Delivery | The New Greenhouse`
- Description: intent-rich intro paragraph (also used as the on-page editorial lede), 150–300 chars, naming the occasion, palette range, tiers, and same-day Kingston delivery.

### Image alt
```
<Product Name> — <brief visual description> by The New Greenhouse
```
(Also the accessibility alt; do double duty.)

## 3. Structured data (JSON-LD) — reuse existing PDP implementation

The Deluxe PDP already emits `Product` + `Offer` + `BreadcrumbList`. For the new catalogue ensure each product feeds:
- `Product`: name, description, image, brand = The New Greenhouse, sku/handle
- `Offer`: price (per variant), priceCurrency `USD`, availability (`InStock` given untracked/CONTINUE), url
- `BreadcrumbList`: Home → <Occasion collection> → <Product>
- Collections: `CollectionPage` + breadcrumbs.
- Consider `Florist`/`LocalBusiness` on home/contact (Kingston address, geo, hours) — already partially present; keep.

## 4. On-page content SEO

- Every **occasion collection** gets a 2–3 sentence editorial lede (keyword-rich, human-first) — not a wall of text.
- PDP **long storytelling description** (field 17) is the ranking body copy; it must be unique per product (no duplication across the catalogue).
- Internal linking: PDP cross-sell/upsell rails (fields 23–24) create a dense internal link graph within each occasion.
- Breadcrumbs on every PDP and collection.

## 5. Technical / preservation rules

- **Never remove** Hydrogen SEO handles, `getSeoMeta`, sitemap, or robots behaviour.
- Canonical URLs on PDPs; retired/renamed handles → **301 redirects** (`urlRedirectCreate`).
- Open Graph + Twitter cards already added on PDP — populate `og:image` with the 4:5 hero (or a 1:1 crop) per product.
- Keep titles/descriptions unique; no templated duplication that trips "duplicate meta".
- Alt text on 100% of images.

## 6. Priority keyword map (launch)

| Collection | Primary keyword | Secondary |
|---|---|---|
| love-and-romance | romantic flowers kingston | red roses delivery jamaica, valentine flowers kingston |
| birthday | birthday flowers kingston | birthday bouquet delivery jamaica |
| anniversary | anniversary flowers kingston | anniversary roses jamaica |
| sympathy-and-funeral | sympathy flowers kingston | funeral flowers jamaica, standing spray kingston |
| wedding | wedding florist kingston | bridal bouquet jamaica |
| corporate-gifting | corporate flowers kingston | office flowers jamaica |
| new-baby | new baby flowers kingston | baby bouquet delivery jamaica |
| same-day-delivery | same day flower delivery kingston | same day florist jamaica |
| signature-collection | luxury flowers kingston | signature roses jamaica |
