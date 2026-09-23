import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {loadSupplyCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/wholesale/supplies',
    title: 'Wholesale Florist Supplies | The New Greenhouse',
    description:
      'Wholesale florist and studio supplies from The New Greenhouse in Kingston, Jamaica — vases, ribbon, tools and packaging by the case, no account required. Trade buyers welcome.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Wholesale', path: '/wholesale'},
      {name: 'Supplies', path: '/wholesale/supplies'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  // Open to everyone — guest wholesale purchasing, no account/approval required.
  // The optional Business Account (see /wholesale) governs benefit eligibility
  // only; it never gates browsing or checkout.
  //
  // Sourced by product type (Floral Supply), scoped to the wholesale channel,
  // rather than curated collection membership — so the page fills from the
  // catalogue. Every supply carries both channels today, so this shows the full
  // set; the channel scope is forward-compatible with a future wholesale-priced
  // split.
  return loadSupplyCatalogue<CatalogueProduct>(
    context.storefront,
    request,
    'wholesale-supplies',
    {channel: 'wholesale'},
  );
}

export default function WholesaleSupplies() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Wholesale"
      title="Supplies"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="wholesale-supplies"
      variant="supply"
      noun="item"
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
