import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {OCCASIONS, findBySlug, loadOccasionCatalogue} from '~/lib/catalogues';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data: d}) =>
  catalogueMeta({
    origin: d?.origin,
    path: `/arrangements/occasion/${d?.slug ?? ''}`,
    title: `${d?.label ?? 'Occasion'} Flowers & Arrangements | The New Greenhouse`,
    description: `${
      d?.label ?? 'Occasion'
    } flowers and hand-crafted arrangements from The New Greenhouse — chosen for the moment and delivered across Kingston and St. Andrew, Jamaica.`,
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Arrangements', path: '/arrangements'},
      {name: 'Occasion', path: '/arrangements/occasion'},
      {
        name: d?.label ?? 'Occasion',
        path: `/arrangements/occasion/${d?.slug ?? ''}`,
      },
    ],
  });

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const occasion = findBySlug(OCCASIONS, params.occasion);
  if (!occasion) throw data('Occasion not found', {status: 404});

  // Source from the occasion TAG (everything tagged, minus supplies) via the
  // reliable product search, not the curated Shopify collection — the collection
  // is often empty or mis-membered while the products are correctly tagged, which
  // left these pages showing one or two items (or none).
  const result = await loadOccasionCatalogue<CatalogueProduct>(
    context.storefront,
    occasion.slug,
    request,
    'arrangements',
  );
  return {...result, label: occasion.label, slug: occasion.slug};
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
