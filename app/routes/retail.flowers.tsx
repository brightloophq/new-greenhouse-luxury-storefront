import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Retail Flowers | The New Greenhouse'},
];

export async function loader({context, request}: LoaderFunctionArgs) {
  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    TRADE_COLLECTIONS.retailFlowers,
    request,
    'retail-flowers',
  );
}

export default function RetailFlowers() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Retail"
      title="Flowers"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="retail-flowers"
      variant="retail"
      noun="bouquet"
      back={{to: '/retail', label: 'Retail'}}
    />
  );
}
