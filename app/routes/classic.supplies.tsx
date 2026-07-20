import {redirect} from 'react-router';
/** Obsolete public route — supplies now live at /supplies. */
export async function loader() {
  throw redirect('/supplies', 301);
}
export default function ClassicSuppliesRedirect() {
  return null;
}
