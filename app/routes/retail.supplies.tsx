import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/retail/supplies',
    title: 'Retail Florist Supplies | The New Greenhouse',
    description:
      'Florist supplies for retail customers from The New Greenhouse in Kingston, Jamaica — vases, tools and materials for arranging fresh flowers at home.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Retail', path: '/retail'},
      {name: 'Supplies', path: '/retail/supplies'},
    ],
  });

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
