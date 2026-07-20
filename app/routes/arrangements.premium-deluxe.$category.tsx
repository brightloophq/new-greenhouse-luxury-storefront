import {data, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {CATALOGUE_QUERY, PREMIUM_CATEGORIES, findBySlug} from '~/lib/catalogues';

export const meta: MetaFunction<typeof loader> = ({data: d}) => [
  {title: `${d?.label ?? 'Premium'} | The New Greenhouse`},
];

export async function loader({context, params}: LoaderFunctionArgs) {
  const category = findBySlug(PREMIUM_CATEGORIES, params.category);
  if (!category) throw data('Category not found', {status: 404});

  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(CATALOGUE_QUERY, {
      variables: {handle: category.handle},
    });
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('premium catalogue failed', error);
  }
  return {products, label: category.label};
}

export default function PremiumCategory() {
  const {products, label} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Premium / Deluxe"
      title={label}
      products={products}
      back={{to: '/arrangements/premium-deluxe', label: 'Premium / Deluxe'}}
    />
  );
}
