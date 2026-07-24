import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {PREMIUM_CATEGORIES, findBySlug, loadCatalogue} from '~/lib/catalogues';

export const meta: MetaFunction<typeof loader> = ({data: d}) => [
  {title: `${d?.label ?? 'Premium'} | The New Greenhouse`},
];

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const category = findBySlug(PREMIUM_CATEGORIES, params.category);
  if (!category) throw data('Category not found', {status: 404});

  const result = await loadCatalogue<CatalogueProduct>(
    context.storefront,
    category.handle,
    request,
    'premium',
  );
  return {...result, label: category.label};
}

export default function PremiumCategory() {
  const {label, ...cat} = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Premium / Deluxe"
      title={label}
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="premium"
      variant="premium"
      noun="arrangement"
      back={{to: '/arrangements/premium-deluxe', label: 'Premium / Deluxe'}}
    />
  );
}
