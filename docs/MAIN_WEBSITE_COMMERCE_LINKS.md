# Main Website → Shopify Commerce Links

How the main website's buttons should link into the Hydrogen storefront so the
shopper lands in the **right experience**, already themed, on a **real** page.

- **`{SHOP}`** = the storefront origin. Today: the Oxygen URL
  (`https://<hash>.o2.myshopify.dev`); once a domain is connected, e.g.
  `https://shop.thenewgreenhouseja.com`.
- **How it works:** `/classic/...` and `/deluxe/...` are **entry routes** — they
  set the `ng_experience` cookie and **302-redirect to the clean canonical URL**
  (path + query preserved). So `{SHOP}/classic/collections/bulk-flowers` lands
  the visitor on `{SHOP}/collections/bulk-flowers` **in Classic mode**. One set
  of Shopify loaders, canonical URLs, no duplicate content.
- Every destination handle below **exists** in Shopify (verified) → no 404s.

---

## Classic website buttons → Classic experience

| Button label | Entry link (`{SHOP}` + …) | Lands on (canonical) | Collection handle | Fallback |
|---|---|---|---|---|
| Shop Wholesale Flowers | `/classic/collections/bulk-flowers` | `/collections/bulk-flowers` | `bulk-flowers` | exists |
| Buy Bulk Flowers | `/classic/collections/bulk-flowers` | `/collections/bulk-flowers` | `bulk-flowers` | exists |
| Wholesale Roses | `/classic/collections/wholesale-roses` | `/collections/wholesale-roses` | `wholesale-roses` | exists |
| Wholesale Greenery | `/classic/collections/wholesale-greenery` | `/collections/wholesale-greenery` | `wholesale-greenery` | exists |
| Florist Essentials | `/classic/collections/florist-essentials` | `/collections/florist-essentials` | `florist-essentials` | exists |
| Shop Floral Supplies | `/classic/collections/floral-supplies` | `/collections/floral-supplies` | `floral-supplies` | exists |
| Vases & Containers | `/classic/collections/vases-and-containers` | `/collections/vases-and-containers` | `vases-and-containers` | exists |
| Ribbon | `/classic/collections/ribbon` | `/collections/ribbon` | `ribbon` | exists |
| Wrapping & Packaging | `/classic/collections/wrapping-and-packaging` | `/collections/wrapping-and-packaging` | `wrapping-and-packaging` | exists |
| Tools & Accessories | `/classic/collections/tools-and-accessories` | `/collections/tools-and-accessories` | `tools-and-accessories` | exists |
| Shop Greenery | `/classic/collections/greenery-and-fillers` | `/collections/greenery-and-fillers` | `greenery-and-fillers` | exists |
| Shop All Flowers | `/classic/collections/all-flowers` | `/collections/all-flowers` | `all-flowers` | exists |
| Weddings & Events | `/classic/pages/wedding-events` | `/pages/wedding-events` | — (page) | exists |
| Enter Classic (generic) | `/classic` | `/` (Classic) | — | always |

## Deluxe website buttons → Deluxe experience

| Button label | Entry link (`{SHOP}` + …) | Lands on (canonical) | Collection handle | Fallback |
|---|---|---|---|---|
| Shop Luxury (generic) | `/deluxe` | `/` (Deluxe) | — | always |
| Shop Signature Bouquets | `/deluxe/collections/luxury-bouquets` | `/collections/luxury-bouquets` | `luxury-bouquets` | exists |
| Luxury Arrangements | `/deluxe/collections/luxury-bouquets` | `/collections/luxury-bouquets` | `luxury-bouquets` | exists |
| Order Premium Roses | `/deluxe/collections/roses` | `/collections/roses` | `roses` | exists |
| Premium Orchids | `/deluxe/collections/orchids` | `/collections/orchids` | `orchids` | exists |
| Shop Premium Gifts / Luxury Gift Boxes | `/deluxe/collections/gift-baskets` | `/collections/gift-baskets` | `gift-baskets` | exists |
| Romance | `/deluxe/collections/love-and-romance` | `/collections/love-and-romance` | `love-and-romance` | exists |
| Anniversary | `/deluxe/collections/anniversary` | `/collections/anniversary` | `anniversary` | exists |
| Corporate Gifting | `/deluxe/collections/corporate-gifting` | `/collections/corporate-gifting` | `corporate-gifting` | exists |
| Weddings & Events | `/deluxe/pages/wedding-events` | `/pages/wedding-events` | — (page) | exists |

---

## Notes & fallbacks

- **Query strings pass through**, so filtered links work too — e.g.
  `/classic/collections/all-flowers?flower=hydrangea` →
  `/collections/all-flowers?flower=hydrangea` (Classic).
- **Dedicated premium collections not yet created** (Signature Bouquets,
  Premium Roses, Premium Orchids as *separate* collections): the table above
  maps them to the nearest existing collection (`luxury-bouquets`, `roses`,
  `orchids`). When Phase 5 creates dedicated premium collections, only this map
  + `app/lib/navigation.ts` update — the website links can point at the new
  handles then.
- **Graceful failure:** if a future link targets a handle that doesn't exist,
  the collection route should resolve to the filtered catalog + empty state (the
  pattern already shipped for flower varieties) rather than a hard 404.
- **Main-site routes today** (`/wholesale`, `/premium-flowers`,
  `/gifts-bouquets`, `/moments`, `/supplies`, `/events`, `/story`, `/contact`)
  point at *internal* website pages — repoint their commerce CTAs to the
  `{SHOP}/classic|deluxe/...` links above.
