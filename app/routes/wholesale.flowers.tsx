import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/wholesale/flowers',
    title: 'Wholesale Flowers for Florists & Trade | The New Greenhouse',
    description:
      'Wholesale flowers from The New Greenhouse in Kingston, Jamaica — buy fresh stems by the bunch or the box, no account required. Florists, event professionals and trade buyers welcome.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Wholesale', path: '/wholesale'},
      {name: 'Flowers', path: '/wholesale/flowers'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  // Wholesale is OPEN to everyone — browse and buy as a guest (name + email are
  // captured at Shopify checkout). No account, business profile or approval is
  // required to purchase wholesale. A Business Account (see /wholesale) is a
  // separate, OPTIONAL relationship for future benefits and never gates shopping.
  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    TRADE_COLLECTIONS.wholesaleFlowers,
    request,
    'wholesale-flowers',
  );
}

export default function WholesaleFlowers() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Wholesale"
      title="Flowers"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="wholesale-flowers"
      variant="wholesale"
      noun="stem"
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
