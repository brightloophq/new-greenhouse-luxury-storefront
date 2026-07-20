/**
 * Arrangements catalogue data. One brand, one green identity — the ONLY place
 * the elevated theme activates is the premium-deluxe route (resolved by
 * `themeForPath`, not by these product mappings). Product/collection membership
 * is kept separate from the visual theme here on purpose.
 */

/** Products for an arrangements catalogue (a single Shopify collection). */
export const ARRANGEMENTS_COLLECTION_QUERY = `#graphql
  query ArrangementsCollection(
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

/** Occasion slug (URL) → Shopify collection handle. Green catalogue either way. */
export const OCCASION_COLLECTIONS: Record<string, {label: string; handle: string}> = {
  birthday: {label: 'Birthday', handle: 'birthday'},
  romance: {label: 'Romance', handle: 'love-and-romance'},
  'just-because': {label: 'Just Because', handle: 'best-sellers'},
  sympathy: {label: 'Sympathy', handle: 'sympathy-and-funeral'},
  'new-baby': {label: 'New Baby', handle: 'new-baby'},
  'thank-you': {label: 'Thank You', handle: 'thank-you'},
};

export const OCCASION_ORDER = [
  'birthday',
  'romance',
  'just-because',
  'sympathy',
  'new-baby',
  'thank-you',
] as const;

/** Representative collection handle for each top-level arrangements pathway. */
export const ARRANGEMENTS_COLLECTIONS = {
  premiumDeluxe: 'luxury-bouquets',
  mixed: 'best-sellers',
} as const;
