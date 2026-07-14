import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

/**
 * Runs `onRouteChange` once per *meaningful route change* — a change of
 * `location.pathname` — skipping the initial render. Used to close menus,
 * mega-panels and drawers so no stale hover/overlay state carries over onto the
 * destination page.
 *
 * Router-level and reusable: keeps menu-dismissal separate from individual link
 * `onClick` handlers, and — crucially — also covers Back/Forward navigations
 * that link handlers never fire on.
 *
 * We key on `pathname`, NOT `key`/`search`, so that in-page filtering, sorting
 * and pagination (which mutate only the query string via
 * `setSearchParams(..., {preventScrollReset:true})` on the same pathname) do NOT
 * count as a route change. Scroll-to-top on real navigations is handled
 * separately and correctly by React Router's <ScrollRestoration>. Same-pathname
 * nav links (e.g. a sort shortcut) still close their menu via their own
 * `onClick` handlers.
 */
export function useCloseOnRouteChange(onRouteChange: () => void) {
  const {pathname} = useLocation();
  const cb = useRef(onRouteChange);
  cb.current = onRouteChange;
  const initialPath = useRef(pathname);

  useEffect(() => {
    if (pathname === initialPath.current) return; // skip first render
    cb.current();
  }, [pathname]);
}
