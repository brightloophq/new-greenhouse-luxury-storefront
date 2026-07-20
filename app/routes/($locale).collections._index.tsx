import {redirect} from 'react-router';

/**
 * The "all collections" index is not one of the four approved pathways — it let
 * shoppers wander into an ungoverned list of every collection, wholesale ones
 * included. Retail is the correct guest entry point.
 *
 * Individual collections (/collections/:handle) still resolve — no Shopify
 * collection has been deleted, only this landing page.
 */
export async function loader() {
  throw redirect('/retail', 301);
}

export default function CollectionsIndexRedirect() {
  return null;
}
