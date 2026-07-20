import {redirect} from 'react-router';

/**
 * Legacy standalone delivery page. Delivery terms now live on /contact (areas,
 * same-day cutoff) — one page for "how do I reach you and when does it arrive".
 */
export async function loader() {
  throw redirect('/contact', 301);
}

export default function LegacyDeliveryRedirect() {
  return null;
}
