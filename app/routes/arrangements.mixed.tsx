import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {ARRANGEMENT_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/arrangements/mixed',
    title: 'Mixed Flower Arrangements | The New Greenhouse',
    description:
      'Seasonal hand-tied mixed flower arrangements from The New Greenhouse — expressive everyday bouquets, delivered across Kingston and St. Andrew, Jamaica.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Arrangements', path: '/arrangements'},
      {name: 'Mixed', path: '/arrangements/mixed'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    ARRANGEMENT_COLLECTIONS.mixed,
    request,
    'arrangements',
  );
}

/** Mixed arrangements — stays GREEN. */
export default function MixedArrangements() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Arrangements"
      title="Mixed"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="arrangements"
      variant="retail"
      noun="arrangement"
      back={{to: '/arrangements', label: 'Arrangements'}}
    />
  );
}
