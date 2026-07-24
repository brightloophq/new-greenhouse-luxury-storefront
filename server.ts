import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';
import {experienceEntryResponse} from '~/lib/experienceEntry';
import {previewGateResponse} from '~/lib/previewGate';

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      // Private-preview gate. When PREVIEW_MODE === 'true', every non-asset
      // request without a valid preview cookie is redirected to the launch
      // page. When the flag is unset/false this returns null and the store
      // behaves exactly as today. Runs first so nothing (including the
      // /classic·/deluxe entry links) can slip past the gate.
      const previewRedirect = previewGateResponse(request, env);
      if (previewRedirect) return previewRedirect;

      // Experience entry policy: /classic, /deluxe and their deep links set the
      // ng_experience cookie and 302 to the canonical store path. Resolved here
      // (before routing) so nested /classic/collections/* deep links can't
      // collide with the optional ($locale) segment. Returns null — falling
      // through to React Router — for the /classic/wholesale and /classic/supplies
      // landing pages, which render and set the cookie themselves.
      const entryRedirect = experienceEntryResponse(request);
      if (entryRedirect) return entryRedirect;

      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      if (hydrogenContext.session.isPending) {
        // APPEND, not set: a route may already have attached its own Set-Cookie
        // (e.g. the private-preview access cookie from the /preview action). The
        // scaffold's `.set` replaced ALL Set-Cookie headers with the session
        // cookie, silently dropping the route's — so a fresh visitor whose cart
        // session was pending on the login POST would lose `preview_access` and
        // bounce back to the gate. Appending keeps both (valid HTTP).
        response.headers.append(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
