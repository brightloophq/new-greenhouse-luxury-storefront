import {redirect} from 'react-router';
/** Obsolete public route — wholesale now lives at /wholesale. */
export async function loader() {
  throw redirect('/wholesale', 301);
}
export default function ClassicWholesaleRedirect() {
  return null;
}
