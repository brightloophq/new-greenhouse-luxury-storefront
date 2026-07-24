import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {OCCASIONS, findBySlug, loadCatalogue} from '~/lib/catalogues';

export const meta: MetaFunction<typeof loader> = ({data: d}) => [
  {title: `${d?.label ?? 'Occasion'} Arrangements | The New Greenhouse`},
];

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const occasion = findBySlug(OCCASIONS, params.occasion);
  if (!occasion) throw data('Occasion not found', {status: 404});

  const result = await loadCatalogue<CatalogueProduct>(
    context.storefront,
    occasion.handle,
    request,
    'arrangements',
  );
  return {...result, label: occasion.label};
}

/** Occasion catalogue — stays GREEN (never premium). */
export default function OccasionCatalogue() {
  const {label, ...cat} = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Occasion"
      title={label}
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="arrangements"
      variant="retail"
      noun="arrangement"
      back={{to: '/arrangements/occasion', label: 'Occasions'}}
    />
  );
}
