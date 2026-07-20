import {Outlet} from 'react-router';
/**
 * Premium / Deluxe layout. This is the ONLY branch where the elevated theme
 * activates (resolved by `themeForPath` in the root loader).
 */
export default function PremiumDeluxeLayout() {
  return <Outlet />;
}
