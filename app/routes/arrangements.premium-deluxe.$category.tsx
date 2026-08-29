import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {PREMIUM_CATEGORIES, findBySlug, loadCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data: d}) =>
  catalogueMeta({
    origin: d?.origin,
    path: `/arrangements/premium-deluxe/${d?.slug ?? ''}`,
    title: `${d?.label ?? 'Premium / Deluxe'} | The New Greenhouse`,
    description: `${
      d?.label ?? 'Premium and deluxe'
    } floral arrangements from The New Greenhouse — our most considered work, hand-crafted in Kingston, Jamaica.`,
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Arrangements', path: '/arrangements'},
      {name: 'Premium / Deluxe', path: '/arrangements/premium-deluxe'},
      {
        name: d?.label ?? 'Premium / Deluxe',
        path: `/arrangements/premium-deluxe/${d?.slug ?? ''}`,
      },
    ],
  });

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const category = findBySlug(PREMIUM_CATEGORIES, params.category);
  if (!category) throw data('Category not found', {status: 404});

  const result = await loadCatalogue<CatalogueProduct>(
    context.storefront,
    category.handle,
    request,
    'premium',
  );
  return {...result, label: category.label, slug: category.slug};
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
