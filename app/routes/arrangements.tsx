import {Outlet} from 'react-router';

/**
 * Arrangements section layout. The visual theme is resolved per-route by the
 * root loader (`themeForPath`): green everywhere except the premium-deluxe
 * catalogue. This layout only renders its children.
 */
export default function ArrangementsLayout() {
  return <Outlet />;
}
