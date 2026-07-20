import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {CATALOGUE_QUERY, TRADE_COLLECTIONS} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Retail Supplies | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(CATALOGUE_QUERY, {
      variables: {handle: TRADE_COLLECTIONS.retailSupplies},
    });
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('retail supplies catalogue failed', error);
  }
  return {products};
}

export default function RetailSupplies() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Retail"
      title="Supplies"
      products={products}
      back={{to: '/retail', label: 'Retail'}}
    />
  );
}
