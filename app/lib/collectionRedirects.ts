/**
 * Phase-1 catalogue cleanup — retired duplicate collection redirects.
 *
 * Each key was an empty or fully-shadowed duplicate of a populated canonical collection.
 * The duplicates have been unpublished from the Online Store (Batch B). Because the store
 * does not grant `write_url_redirects`, these 301s are handled in the storefront edge
 * (mirroring REMOVED_PAGE_REDIRECTS in the pages route) so any bookmarked or indexed retired
 * URL lands on its canonical. Internal links already use the canonical handles directly —
 * these are compatibility fallbacks, not the primary navigation path.
 */
export const RETIRED_COLLECTION_REDIRECTS: Record<string, string> = {
  'birthday-flowers': '/collections/birthday',
  'anniversary-flowers': '/collections/anniversary',
  'love-romance': '/collections/love-and-romance',
  'corporate-gifts': '/collections/corporate-gifting',
  'corporate-flowers': '/collections/corporate-gifting',
  sympathy: '/collections/sympathy-and-funeral',
};

/**
 * Canonical destination for a retired collection handle, or `null` if the handle is not
 * retired. Case-insensitive on the handle.
 */
export function retiredCollectionTarget(handle: string): string | null {
  if (!handle) return null;
  return RETIRED_COLLECTION_REDIRECTS[handle.toLowerCase()] ?? null;
}
