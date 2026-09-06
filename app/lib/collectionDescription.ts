/**
 * Split a Shopify collection `descriptionHtml` into a concise hero lede and the
 * remaining rich HTML for the editorial body rendered BELOW the product grid.
 *
 * Why this exists: Shopify derives the plain `description` from `descriptionHtml`
 * (there is no independent short-lede field), so expanding the body would also
 * expand whatever the hero shows. To keep the hero concise no matter how long
 * the body grows, we treat the FIRST paragraph as the lede (plain text, for the
 * hero) and render every paragraph AFTER it below the grid — so the hero lede is
 * never duplicated in the body. When the body is a single paragraph (today's
 * live state) there is no below-grid content and the hero is unchanged.
 */
export interface CollectionDescriptionParts {
  /** Plain-text first paragraph, for the hero. `''` when there is no content. */
  lede: string;
  /** Rich HTML after the first paragraph, for the below-grid body. `''` when none. */
  bodyHtml: string;
}

/** The handful of named entities Shopify emits in collection bodies. */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
};

/** Strip tags + decode common entities, for the plain-text hero lede. */
function toPlainText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, '');
  const decoded = withoutTags.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash);/g,
    (match) => ENTITIES[match] ?? match,
  );
  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * @param descriptionHtml   Shopify `collection.descriptionHtml` (may be null).
 * @param fallbackDescription Plain `collection.description`, used as the lede when
 *                            there is no HTML (e.g. planned/empty-state collections).
 */
export function splitCollectionDescription(
  descriptionHtml?: string | null,
  fallbackDescription?: string | null,
): CollectionDescriptionParts {
  const html = (descriptionHtml ?? '').trim();
  if (!html) {
    return {lede: (fallbackDescription ?? '').trim(), bodyHtml: ''};
  }

  const firstParagraph = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/i);
  if (!firstParagraph || firstParagraph.index === undefined) {
    // No paragraph wrapper — treat the whole value as the lede, nothing below.
    return {lede: toPlainText(html), bodyHtml: ''};
  }

  const lede = toPlainText(firstParagraph[0]);
  const bodyHtml = html
    .slice(firstParagraph.index + firstParagraph[0].length)
    .trim();
  return {lede, bodyHtml};
}
