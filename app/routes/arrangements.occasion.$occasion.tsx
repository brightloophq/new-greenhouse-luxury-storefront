import {useLoaderData, data} from 'react-router';
import type {Route} from './+types/arrangements.occasion.$occasion';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {
  ARRANGEMENTS_COLLECTION_QUERY,
  OCCASION_COLLECTIONS,
} from '~/lib/arrangements';

/** Single occasion catalogue — GREEN (guest checkout). */
export const meta: Route.MetaFunction = ({data: d}) => [
  {
    title: `${d?.label ?? 'Occasion'} Arrangements | The New Greenhouse`,
  },
];

export async function loader({context, params}: Route.LoaderArgs) {
  const slug = params.occasion ?? '';
  const occ = OCCASION_COLLECTIONS[slug];
  if (!occ) {
    throw data('Occasion not found', {status: 404});
  }

  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(
      ARRANGEMENTS_COLLECTION_QUERY,
      {variables: {handle: occ.handle}},
    );
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('occasion catalogue failed', error);
  }
  return {products, label: occ.label};
}

export default function OccasionCatalogue() {
  const {products, label} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Occasion"
      title={label}
      products={products}
      back={{to: '/arrangements/occasion', label: 'Occasions'}}
    />
  );
}
