import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Retail Supplies | The New Greenhouse'},
];

export async function loader({context, request}: LoaderFunctionArgs) {
  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    TRADE_COLLECTIONS.retailSupplies,
    request,
    'retail-supplies',
  );
}

export default function RetailSupplies() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Retail"
      title="Supplies"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="retail-supplies"
      variant="supply"
      noun="item"
      back={{to: '/retail', label: 'Retail'}}
    />
  );
}
