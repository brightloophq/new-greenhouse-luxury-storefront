/**
 * CENTRALISED experience classification (Part 2). One source of truth for which
 * storefront-facing entities belong to Classic (wholesale + supplies) vs Deluxe
 * (luxury gifting) vs are shared/ambiguous.
 *
 * SOURCE OF TRUTH, in priority order:
 *   1. explicit `experience:classic` / `experience:deluxe` product tag (if
 *      exactly one is present — the clean, authoritative signal);
 *   2. Shopify `productType` (every product has exactly one; the current catalog
 *      maps cleanly — see below);
 *   3. collection membership via the curated handle allow-lists.
 *
 * We deliberately do NOT classify by title keywords at runtime. `productType` is
 * a structured Shopify field, not a keyword heuristic. If new product types are
 * added they must be added here (fail-closed: unknown types are excluded from
 * BOTH primary storefronts until classified — Part 20).
 *
 * Current catalog productType → experience (audited 2026-07-14):
 *   Classic flowers:  Fresh Flowers · Fresh Cut Flowers · Greenery · Floral Filler
 *   Classic supplies: Floral Supply
 *   Deluxe:           Floral Arrangement · Sympathy Arrangement · Wedding Flowers
 *                     · Gift Add-on · Gift Basket
 *   Ambiguous:        Plant  (hidden from both until a merchant decision)
 */
import type {ExperienceMode} from '~/lib/experience';

export const CLASSIC_FLOWER_TYPES = [
  'Fresh Flowers',
  'Fresh Cut Flowers',
  'Greenery',
  'Floral Filler',
] as const;
export const CLASSIC_SUPPLY_TYPES = ['Floral Supply'] as const;
export const DELUXE_TYPES = [
  'Floral Arrangement',
  'Sympathy Arrangement',
  'Wedding Flowers',
  'Gift Add-on',
  'Gift Basket',
] as const;
/** Excluded from BOTH primary storefronts until the merchant approves a home. */
export const AMBIGUOUS_TYPES = ['Plant'] as const;

const CLASSIC_TYPE_SET = new Set<string>([
  ...CLASSIC_FLOWER_TYPES,
  ...CLASSIC_SUPPLY_TYPES,
]);
const CLASSIC_SUPPLY_SET = new Set<string>(CLASSIC_SUPPLY_TYPES);
const DELUXE_TYPE_SET = new Set<string>(DELUXE_TYPES);
const AMBIGUOUS_SET = new Set<string>(AMBIGUOUS_TYPES);

export type EntityExperience = 'classic' | 'deluxe' | 'ambiguous' | 'unknown';

export interface ClassifiableProduct {
  productType?: string | null;
  tags?: string[] | null;
}

/** Classify a product: explicit single experience tag wins, else productType. */
export function classifyProduct(input: ClassifiableProduct): EntityExperience {
  const tags = (input.tags ?? []).map((t) => t.toLowerCase());
  const taggedDeluxe = tags.includes('experience:deluxe');
  const taggedClassic = tags.includes('experience:classic');
  if (taggedDeluxe && !taggedClassic) return 'deluxe';
  if (taggedClassic && !taggedDeluxe) return 'classic';

  const type = input.productType ?? '';
  if (DELUXE_TYPE_SET.has(type)) return 'deluxe';
  if (CLASSIC_TYPE_SET.has(type)) return 'classic';
  if (AMBIGUOUS_SET.has(type)) return 'ambiguous';
  return 'unknown';
}

/** True only when the product belongs in the given primary experience. */
export function productInExperience(
  input: ClassifiableProduct,
  experience: ExperienceMode,
): boolean {
  return classifyProduct(input) === experience;
}

/**
 * Products to render in a collection grid.
 *
 * Curated Shopify collections are trusted as merchandised: their full membership
 * shows (Deluxe arrangements, mixed gifting sets, plants), because a merchant
 * curated exactly those products into the collection. Only SHARED / HUB
 * collections — whose grid is assembled from catalog-wide product search rather
 * than curated membership — keep the cross-experience leakage guard, so wholesale
 * and Deluxe items cannot bleed into each other there.
 *
 * `applyExperienceGuard` is the caller's hub/shared signal (the route passes its
 * existing `FLOWER_HUBS` membership). When false, nodes are returned untouched —
 * same order, same length — so nothing curated is dropped and pagination is
 * unaffected.
 */
export function selectCollectionGridProducts<T extends ClassifiableProduct>(
  nodes: T[],
  experience: ExperienceMode,
  applyExperienceGuard: boolean,
): T[] {
  // The guard runs only on flower hubs (all-flowers, bulk-flowers). There it
  // keeps this experience's items AND drops Floral Supply products: supplies are
  // Classic-typed, so the experience filter alone would let them sit among the
  // flowers — but a vase belongs on the supplies pages, never in a flower grid.
  return applyExperienceGuard
    ? nodes.filter(
        (node) => productInExperience(node, experience) && !isSupplyProduct(node),
      )
    : nodes;
}

/** Within Classic, is this a Floral Supply (vs a wholesale flower)? Reads only
 *  productType, so it accepts any product-shaped node (e.g. a catalogue node). */
export function isSupplyProduct(input: {productType?: string | null}): boolean {
  return CLASSIC_SUPPLY_SET.has(input.productType ?? '');
}

/* -------------------------------------------------------------------------- */
/* Collection allow-lists (single source of truth for the whole app)          */
/* -------------------------------------------------------------------------- */

/** Deluxe collection index, curated occasion-first order. */
export const DELUXE_COLLECTION_ORDER = [
  'best-sellers',
  'luxury-bouquets',
  'signature-collection',
  'anniversary',
  'birthday',
  'love-and-romance',
  'sympathy-and-funeral',
  'congratulations',
  'thank-you',
  'get-well',
  'new-baby',
  'corporate-gifting',
  'seasonal-deluxe',
  'orchids',
  'roses',
  'same-day-delivery',
  'add-ons',
  // Wedding/event collections (bridal-bouquets, centerpieces) deliberately
  // omitted — business does not offer wedding services (products retired).
];
export const DELUXE_COLLECTION_SET = new Set(DELUXE_COLLECTION_ORDER);

/** Classic flower collections (wholesale). */
export const CLASSIC_FLOWER_COLLECTIONS = new Set([
  'bulk-flowers',
  'wholesale-roses',
  'wholesale-greenery',
  'greenery-and-fillers',
  'all-flowers',
  'lilies',
]);

/** Classic supply collections. */
export const CLASSIC_SUPPLY_COLLECTIONS = new Set([
  'floral-supplies',
  'vases-and-containers',
  'ribbon',
  'wrapping-and-packaging',
  'tools-and-accessories',
  'florist-essentials',
]);

const CLASSIC_COLLECTION_SET = new Set([
  ...CLASSIC_FLOWER_COLLECTIONS,
  ...CLASSIC_SUPPLY_COLLECTIONS,
]);

/** Is a collection allowed in the given experience? */
export function collectionInExperience(
  handle: string,
  experience: ExperienceMode,
): boolean {
  return experience === 'deluxe'
    ? DELUXE_COLLECTION_SET.has(handle)
    : CLASSIC_COLLECTION_SET.has(handle);
}

/** A collection that must NEVER appear in the opposite experience's results. */
export function collectionBlockedIn(
  handle: string,
  experience: ExperienceMode,
): boolean {
  // A handle is blocked if it is claimed exclusively by the other experience.
  if (experience === 'deluxe') return CLASSIC_COLLECTION_SET.has(handle);
  return DELUXE_COLLECTION_SET.has(handle) && !CLASSIC_COLLECTION_SET.has(handle);
}
