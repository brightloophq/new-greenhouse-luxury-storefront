import {redirect, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {CATALOGUE_QUERY, TRADE_COLLECTIONS} from '~/lib/catalogues';
import {getWholesaleAccess} from '~/lib/wholesale';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Supplies | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  const {access} = await getWholesaleAccess(context.customerAccount);
  if (access !== 'authenticated') throw redirect('/wholesale');

  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(CATALOGUE_QUERY, {
      variables: {handle: TRADE_COLLECTIONS.wholesaleSupplies},
    });
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('wholesale supplies catalogue failed', error);
  }
  return {products};
}

export default function WholesaleSupplies() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Wholesale"
      title="Supplies"
      products={products}
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
