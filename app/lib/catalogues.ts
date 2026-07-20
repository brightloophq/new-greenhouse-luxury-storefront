/**
 * Catalogue data — the single map from an approved route to its Shopify
 * collection. Deliberately separate from visual theme (see `themeForPath`):
 * membership here never implies premium styling.
 */

export const CATALOGUE_QUERY = `#graphql
  query CatalogueCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      products(first: 24) {
        nodes {
          id
          handle
          title
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

/** Wholesale (auth-required) and Retail (guest) catalogues. */
export const TRADE_COLLECTIONS = {
  wholesaleFlowers: 'bulk-flowers',
  wholesaleSupplies: 'floral-supplies',
  retailFlowers: 'all-flowers',
  retailSupplies: 'floral-supplies',
} as const;

/** Arrangements pathways. */
export const ARRANGEMENT_COLLECTIONS = {
  mixed: 'best-sellers',
} as const;

/** Premium / Deluxe categories (the ONLY premium-themed catalogues). */
export const PREMIUM_CATEGORIES = [
  {
    slug: 'handcrafted',
    label: 'Handcrafted',
    handle: 'luxury-bouquets',
    img: '/images/collections/luxury-bouquets',
  },
  {
    slug: 'vase',
    label: 'Vase',
    handle: 'signature-collection',
    img: '/images/collections/signature-collection',
  },
  {
    slug: 'heart-box',
    label: 'Heart Box',
    handle: 'add-ons',
    img: '/images/collections/add-ons',
  },
] as const;

/** Approved occasions (owner-approved list). */
export const OCCASIONS = [
  {slug: 'birthday', label: 'Birthday', handle: 'birthday', img: '/images/occasions/birthday'},
  {slug: 'romance', label: 'Romance', handle: 'love-and-romance', img: '/images/occasions/love-and-romance'},
  {slug: 'sympathy', label: 'Sympathy', handle: 'sympathy-and-funeral', img: '/images/occasions/sympathy-and-funeral'},
  {slug: 'thank-you', label: 'Thank You', handle: 'thank-you', img: '/images/occasions/thank-you'},
  {slug: 'get-well', label: 'Get Well', handle: 'get-well', img: '/images/occasions/get-well'},
  {slug: 'new-baby', label: 'New Baby', handle: 'new-baby', img: '/images/occasions/new-baby'},
] as const;

/** Approved supply categories (already in the Shopify catalogue). */
export const SUPPLY_CATEGORIES = [
  {slug: 'vases-and-containers', label: 'Vases & Containers', handle: 'vases-and-containers', img: '/images/supplies/vases'},
  {slug: 'ribbon', label: 'Ribbon', handle: 'ribbon', img: '/images/supplies/ribbon'},
  {slug: 'wrapping-and-packaging', label: 'Wrapping & Packaging', handle: 'wrapping-and-packaging', img: '/images/supplies/wrapping'},
  {slug: 'tools-and-accessories', label: 'Tools & Accessories', handle: 'tools-and-accessories', img: '/images/supplies/tools'},
  {slug: 'florist-essentials', label: 'Florist Essentials', handle: 'florist-essentials', img: '/images/supplies/essentials'},
] as const;

export function findBySlug<T extends {slug: string}>(
  list: readonly T[],
  slug: string | undefined,
): T | undefined {
  return list.find((i) => i.slug === slug);
}

/** Responsive src/srcSet for a `<base>-{400,600,800}.webp` image set. */
export function cardImage(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}
