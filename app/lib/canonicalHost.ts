/**
 * Canonical-host redirect.
 *
 * The store is served from a single canonical host, `shop.thenewgreenhouseja.com`.
 * The bare apex (and www) also route to this app, which would let Google index
 * the store on two hosts and split its ranking signals. Any request arriving on
 * an apex host is 301-redirected to the same path on the canonical host; every
 * other host — the canonical host itself, Oxygen previews (`*.myshopify.dev`),
 * and localhost — is left untouched so nothing else is disturbed.
 *
 * Pure and host-list driven so it is unit-tested without a running server.
 */
export const CANONICAL_HOST = 'shop.thenewgreenhouseja.com';

/** Apex hosts that must fold into the canonical host. */
export const APEX_HOSTS = new Set([
  'thenewgreenhouseja.com',
  'www.thenewgreenhouseja.com',
]);

/**
 * A permanent redirect to the canonical host for an apex request, or `null` when
 * the request is already on an allowed host. Path and query string are preserved.
 */
export function canonicalHostRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (!APEX_HOSTS.has(url.hostname)) return null;

  url.protocol = 'https:';
  url.hostname = CANONICAL_HOST;
  url.port = '';
  return new Response(null, {
    status: 301,
    headers: {Location: url.toString()},
  });
}
