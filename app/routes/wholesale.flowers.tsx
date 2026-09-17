import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Flowers | The New Greenhouse'},
];

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
