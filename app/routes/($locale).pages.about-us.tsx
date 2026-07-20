import {redirect} from 'react-router';

/**
 * Legacy Shopify page path. The approved About page is /about — this keeps old
 * links, bookmarks and search results working and consolidates ranking signal.
 */
export async function loader() {
  throw redirect('/about', 301);
}

export default function LegacyAboutRedirect() {
  return null;
}
