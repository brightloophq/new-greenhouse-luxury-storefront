# Navigation Plan

A BloomsByTheBox-style, wholesale-and-retail nav built on the 37 smart collections. Set up in **Online Store → Navigation** (main menu + footer). Handles reference the collections in `automated-collection-rules.md`. The existing storefront mega-menu (M3) can consume this structure.

## Main menu (with mega-menu groups)
- **Shop Flowers** → `/collections/all-flowers`
  - Roses · Orchids · Lilies · Tropical Flowers · Greenery & Fillers
- **Shop by Occasion** → (dropdown; no landing needed)
  - Birthday · Anniversary · Love & Romance · Sympathy & Funeral · Congratulations · New Baby · Get Well · Corporate Gifting
- **Shop by Colour** → (dropdown)
  - White & Ivory · Red · Pink · Yellow & Orange · Purple · Green · Mixed
- **Weddings & Events** → `/pages/wedding-events`
  - Wedding Flowers · Bridal Bouquets · Centerpieces
- **Wholesale** → `/collections/bulk-flowers`  *(the trade entry point — new)*
  - Bulk Flowers · Wholesale Roses · Wholesale Greenery · Florist Essentials · Floral Supplies
- **Supplies** → `/collections/floral-supplies`
  - Vases & Containers · Ribbon · Wrapping & Packaging · Tools & Accessories
- **Plants & Gifts** → `/collections/plants`
  - Plants · Gift Baskets · Add-ons · Corporate Gifts
- **About** → `/pages/about-us` · **Contact** → `/pages/contact`

## Footer menu (align with M3 editorial footer)
- **Shop:** All Flowers · Roses · Weddings · Sympathy · Gift Baskets
- **Wholesale & Trade:** Bulk Flowers · Wholesale Roses · Florist Essentials · Floral Supplies
- **Company:** About · Contact · Delivery Information · FAQ
- **Policies:** Privacy · Refund · Shipping · Terms *(create the missing policies)*

## Notes
- **Wholesale** as a top-level item is the key structural add — the store's current "Occasions" menu link points to `#` (fix it to the Occasions dropdown/landing).
- Reconcile with existing collections already in the store (e.g. `wedding-flowers`, `birthday-flowers`, `plants`) — reuse those handles, don't duplicate.
- Delivery/timing copy in menus must stay conditional (no same-day guarantee).
- Order occasion/colour lists by expected demand once you have sales data.
