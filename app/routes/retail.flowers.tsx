import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {
  TRADE_COLLECTIONS,
  loadCatalogue,
  loadFlowerVarietyCatalogue,
} from '~/lib/catalogues';
import {parseCatalogSearchParams} from '~/lib/catalog';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/retail/flowers',
    title: 'Retail Flowers | The New Greenhouse',
    description:
      'Shop fresh retail flowers from The New Greenhouse — hand-selected stems and bouquets, delivered across Kingston and St. Andrew, Jamaica.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Retail', path: '/retail'},
      {name: 'Flowers', path: '/retail/flowers'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  // A flower-variety facet (?flower=…) must resolve through the reliable product
  // search — the collection's own tag filter is ignored by Shopify, so it would
  // return a sparse subset of the first page with component-tagged arrangements
  // mixed in. The unfiltered department view keeps the curated collection.
  const {filters} = parseCatalogSearchParams(
    new URL(request.url).searchParams,
    'retail-flowers',
  );
  if (filters.flower) {
    return loadFlowerVarietyCatalogue<CatalogueProduct>(
      context.storefront,
      request,
      'retail-flowers',
    );
  }
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
