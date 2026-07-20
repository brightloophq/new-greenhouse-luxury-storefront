import {useLoaderData} from 'react-router';
import type {Route} from './+types/arrangements.mixed';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {
  ARRANGEMENTS_COLLECTION_QUERY,
  ARRANGEMENTS_COLLECTIONS,
} from '~/lib/arrangements';

/** Mixed arrangements — GREEN catalogue (theme stays green; guest checkout). */
export const meta: Route.MetaFunction = () => [
  {title: 'Mixed Arrangements | The New Greenhouse'},
];

export async function loader({context}: Route.LoaderArgs) {
  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(
      ARRANGEMENTS_COLLECTION_QUERY,
      {variables: {handle: ARRANGEMENTS_COLLECTIONS.mixed}},
    );
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('mixed catalogue failed', error);
  }
  return {products};
}

export default function MixedArrangements() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Arrangements"
      title="Mixed"
      sub="Abundant, colourful mixed bouquets."
      products={products}
    />
  );
}
