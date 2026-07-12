import {Outlet} from 'react-router';

/**
 * Layout for the flower library (/flowers and /flowers/:family). Renders its
 * children via <Outlet/>; the index and family routes provide the content.
 */
export default function FlowersLayout() {
  return <Outlet />;
}
