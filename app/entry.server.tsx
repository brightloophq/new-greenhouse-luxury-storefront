import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  // The HTML document is personalised (it varies by the ng_experience cookie and
  // the cart session) and it references hashed, per-build asset chunks. It must
  // therefore never be served from cache without revalidation: a stale document
  // would point at asset hashes that no longer exist after a rebuild/deploy,
  // which makes React Router fail to load a route chunk and reload in a loop —
  // a blank page. `no-cache` lets the browser/CDN store it but forces a
  // revalidation every time, so a reload always fetches the current HTML.
  // A route that genuinely wants to be cacheable can still override this.
  if (!responseHeaders.has('Cache-Control')) {
    responseHeaders.set('Cache-Control', 'no-cache');
  }

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
