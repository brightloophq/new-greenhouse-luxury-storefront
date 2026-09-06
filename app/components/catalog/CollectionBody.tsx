/**
 * Editorial collection body, rendered BELOW the product grid.
 *
 * Renders the merchant-authored rich HTML (everything after the hero lede — see
 * `splitCollectionDescription`) in a quiet, readable measure. Shopify collection
 * HTML is trusted the same way the PDP (`products.$handle.tsx`) and the page /
 * policy routes already render `descriptionHtml` / `body` via
 * `dangerouslySetInnerHTML`. Renders nothing when there is no below-lede content,
 * so single-paragraph collections are unaffected.
 */
export function CollectionBody({html}: {html: string}) {
  if (!html) return null;
  return (
    <section className="ng-collection-body" aria-label="About this collection">
      <div
        className="ng-collection-body-prose"
        dangerouslySetInnerHTML={{__html: html}}
      />
    </section>
  );
}
