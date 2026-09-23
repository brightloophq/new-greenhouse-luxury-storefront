import type {LoaderFunctionArgs} from 'react-router';

/**
 * Sitemap for the hand-built landing pages that Shopify's resource sitemap
 * (products / collections / pages / blogs, via `getSitemapIndex`) does not
 * include. Referenced from `/sitemap.xml`. Paths are the approved public routes
 * only — dynamic per-item pages come from the Shopify sitemaps.
 */
const STATIC_PATHS = [
  '/',
  '/retail',
  '/retail/flowers',
  '/retail/supplies',
  '/wholesale',
  '/wholesale/flowers',
  '/wholesale/supplies',
  '/arrangements',
  '/arrangements/mixed',
  '/arrangements/occasion',
  '/supplies',
  '/flowers',
  '/about',
  '/contact',
  '/reviews',
] as const;

export async function loader({request}: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const urls = STATIC_PATHS.map(
    (path) =>
      `<url><loc>${origin}${path}</loc><changefreq>weekly</changefreq></url>`,
  ).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
