import {useLoaderData} from 'react-router';
import type {Route} from './+types/arrangements.premium-deluxe';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {
  ARRANGEMENTS_COLLECTION_QUERY,
  ARRANGEMENTS_COLLECTIONS,
} from '~/lib/arrangements';

/**
 * Premium / Deluxe catalogue — the ONLY elevated-theme route (resolved by
 * `themeForPath` in the root loader). Loads products directly; no intermediate
 * luxury homepage. Concise copy, then products.
 */
export const meta: Route.MetaFunction = () => [
  {title: 'Premium / Deluxe Arrangements | The New Greenhouse'},
  {
    name: 'description',
    content:
      'The New Greenhouse Premium/Deluxe collection — exceptional arrangements, thoughtfully composed.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(
      ARRANGEMENTS_COLLECTION_QUERY,
      {variables: {handle: ARRANGEMENTS_COLLECTIONS.premiumDeluxe}},
    );
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('premium-deluxe catalogue failed', error);
  }
  return {products};
}

export default function PremiumDeluxe() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Arrangements"
      title="Premium / Deluxe"
      sub="Exceptional arrangements, thoughtfully composed."
      products={products}
    />
  );
}
