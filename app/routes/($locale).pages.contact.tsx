import {redirect} from 'react-router';

/** Legacy Shopify page path — the approved Contact page is /contact. */
export async function loader() {
  throw redirect('/contact', 301);
}

export default function LegacyContactRedirect() {
  return null;
}
