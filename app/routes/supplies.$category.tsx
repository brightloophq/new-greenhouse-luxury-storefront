import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {SUPPLY_CATEGORIES, findBySlug, loadCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data: d}) =>
  catalogueMeta({
    origin: d?.origin,
    path: `/supplies/${d?.slug ?? ''}`,
    title: `${d?.label ?? 'Supplies'} | The New Greenhouse`,
    description: `${
      d?.label ?? 'Florist supplies'
    } from The New Greenhouse in Kingston, Jamaica — quality florist supplies for arranging and presenting fresh flowers.`,
  });

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const category = findBySlug(SUPPLY_CATEGORIES, params.category);
  if (!category) throw data('Category not found', {status: 404});

  const result = await loadCatalogue<CatalogueProduct>(
    context.storefront,
    category.handle,
    request,
    'supplies',
  );
  return {...result, label: category.label, slug: category.slug};
}

export default function SuppliesCategory() {
  const {label, ...cat} = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Supplies"
      title={label}
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="supplies"
      variant="supply"
      noun="item"
      back={{to: '/supplies', label: 'Supplies'}}
    />
  );
}
