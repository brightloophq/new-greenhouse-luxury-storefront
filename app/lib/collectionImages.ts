/**
 * Local collection-card imagery (Part 2 refinement). Every Deluxe collection
 * card gets its own unique, premium, title-matching photo — no card relies on a
 * (possibly missing) Shopify `collection.image`, and no image is shared across
 * two collections. Sources: bespoke `/images/collections/*` (Gemini) and the
 * occasion cards `/images/occasions/*`, all responsive WebP at 400/600/800.
 *
 * Consumers render a plain <img src srcSet> (local assets, not Shopify CDN).
 */

const WIDTHS = [400, 600, 800] as const;

/** Deluxe collection handle → image basename under /public (no width/ext). */
const CARD_IMAGE: Record<string, string> = {
  // Bespoke luxury collection cards
  'best-sellers': '/images/collections/best-sellers',
  'luxury-bouquets': '/images/collections/luxury-bouquets',
  'signature-collection': '/images/collections/signature-collection',
  'seasonal-deluxe': '/images/collections/seasonal-deluxe',
  orchids: '/images/collections/orchids',
  roses: '/images/collections/roses',
  'add-ons': '/images/collections/add-ons',
  // No dedicated shot — the editorial "all flowers" spread reads as a general
  // premium mixed selection, apt for same-day delivery.
  'same-day-delivery': '/images/collections/all-flowers',
  // Occasion cards (already bespoke + unique per occasion)
  anniversary: '/images/occasions/anniversary',
  birthday: '/images/occasions/birthday',
  'love-and-romance': '/images/occasions/love-and-romance',
  'sympathy-and-funeral': '/images/occasions/sympathy-and-funeral',
  congratulations: '/images/occasions/congratulations',
  'thank-you': '/images/occasions/thank-you',
  'get-well': '/images/occasions/get-well',
  'new-baby': '/images/occasions/new-baby',
  'corporate-gifting': '/images/occasions/corporate-gifting',
};

export interface CardImage {
  src: string;
  srcSet: string;
}

/** Responsive local card image for a collection handle, or null if none. */
export function collectionCardImage(handle: string): CardImage | null {
  const base = CARD_IMAGE[handle];
  if (!base) return null;
  return {
    src: `${base}-800.webp`,
    srcSet: WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}
