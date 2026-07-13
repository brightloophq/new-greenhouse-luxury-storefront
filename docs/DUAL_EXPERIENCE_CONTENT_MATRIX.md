# Dual-Experience Content Matrix

Every surface where the copy/merchandising differs between **Classic**
(wholesale / professional, green) and **Deluxe** (luxury gifting, black + gold).
Source files noted so copy edits have one home.

## Voice

| | Classic | Deluxe |
|---|---|---|
| Audience | Florists, planners, hotels, event & DIY buyers | Gift, romance, VIP, corporate-gift buyers |
| Tone | Practical, trade, by-the-box, reliable | Editorial, cinematic, emotional, refined |
| Palette | Forest green + leaf accent, DM Sans body | Matte black + champagne gold, Inter body |

## Homepage — `app/lib/homeContent.ts`

| Section | Classic | Deluxe |
|---|---|---|
| Announcement | "Wholesale pricing for florists, planners and venues…" | "Same-day delivery across Kingston & St. Andrew…" |
| Hero title | "Wholesale flowers, greenery & florist supplies." | "Luxury flowers for life's most meaningful moments." |
| Hero CTAs | Shop Wholesale Flowers · Floral Supplies | Shop Arrangements · Request Custom Design |
| Featured | Wholesale · Greenery · Supplies · Vases | Signature · Sympathy · Weddings · Wholesale |
| Browse rail | Shop by category — "Stock the studio." | Shop by occasion — "Send beauty with intention." |
| Product row | "Trade favourites" | "Best sellers" |
| Wedding block | "Flowers by the box for planners and venues." | "Your wedding, imagined in bloom." |
| Corporate block | "Weekly flowers for venues and offices." | "Flowers that hold the room." |
| Heritage | "Four decades supplying Jamaica's florists." | "Four decades of flowers, memories, and moments." |
| Testimonials | Florist / planner / hospitality buyer | Gift / wedding / corporate client |
| Newsletter | "Join the trade list." | "Join the floral circle." |

Shared on both: "Shop by flower" rail (buying stems suits both), the slogan
"Not just flowers, whatever it takes."

## Navigation — `app/lib/navigation.ts`

| | Classic | Deluxe |
|---|---|---|
| Primary | Shop · Wholesale · Supplies · Weddings · Corporate | Shop · Weddings · Our Story · Concierge |
| Mega | Shop Flowers / Wholesale / Floral Supplies / Shop By | Signature / Flowers / Gifts / Services |
| Footer | Wholesale-oriented shop + service links | Luxury-oriented shop + service links |

## Collection template — `routes/($locale).collections.$handle.tsx` + `experience.css`

| | Classic | Deluxe |
|---|---|---|
| Hub hero eyebrow | "Wholesale Flowers" | "The Signature Collection" |
| Grid density | Denser (extra column ≥1536px, tighter gaps, square tiles) | Editorial (3 cols ≥1280px, larger gaps) |

## Product page — `routes/($locale).products.$handle.tsx` + `experience.css`

| | Classic | Deluxe |
|---|---|---|
| Assurances | Wholesale pricing · Fresh, graded stems · Island-wide delivery | Secure checkout · Hand-tied in Kingston · Signature presentation |
| Note block | "Buying for a business or event?" + Ask about trade pricing → | "Sending as a gift?" hand-written note |
| Details label | "Product details" | "The story" |
| Layout | Balanced, tighter gap | Larger gallery (1.15/0.85), more whitespace |

Identical on both: gallery source, price, variant selector, add-to-cart, cart,
checkout.

## SEO — per route meta

| Route | Classic title | Deluxe title |
|---|---|---|
| `/` | "Wholesale Flowers & Florist Supplies Jamaica \| The New Greenhouse" | "Luxury Flowers & Premium Bouquets Kingston \| The New Greenhouse" |

Canonicals are experience-independent: `/` for the homepage, base collection for
filtered collection views, self for PDP/pages (all `<link rel="canonical">`).
