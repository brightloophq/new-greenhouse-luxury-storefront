import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {CATALOGUE_QUERY, TRADE_COLLECTIONS} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Retail Flowers | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(CATALOGUE_QUERY, {
      variables: {handle: TRADE_COLLECTIONS.retailFlowers},
    });
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('retail flowers catalogue failed', error);
  }
  return {products};
}

export default function RetailFlowers() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Retail"
      title="Flowers"
      products={products}
      back={{to: '/retail', label: 'Retail'}}
    />
  );
}
