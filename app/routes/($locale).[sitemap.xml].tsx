import type {Route} from './+types/[sitemap.xml]';
import {getSitemapIndex} from '@shopify/hydrogen';

export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  // Shopify's sitemap index lists only Shopify resources (products, collections,
  // pages, blogs). Append our hand-built landing pages (/retail, /wholesale, …)
  // so they're submitted for indexing too — see /sitemap-static.xml.
  const origin = new URL(request.url).origin;
  const xml = await response.text();
  const staticEntry = `<sitemap><loc>${origin}/sitemap-static.xml</loc></sitemap>`;
  const merged = xml.includes('</sitemapindex>')
    ? xml.replace('</sitemapindex>', `${staticEntry}</sitemapindex>`)
    : xml;

  return new Response(merged, {
    status: response.status,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
