import {redirect, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {
  ArrangementsCatalogue,
  type ArrangementProduct,
} from '~/components/arrangements/ArrangementsCatalogue';
import {CATALOGUE_QUERY, TRADE_COLLECTIONS} from '~/lib/catalogues';
import {getWholesaleAccess} from '~/lib/wholesale';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Flowers | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  // Wholesale is authentication-required.
  const {access} = await getWholesaleAccess(context.customerAccount);
  if (access !== 'authenticated') throw redirect('/wholesale');

  let products: ArrangementProduct[] = [];
  try {
    const {collection} = await context.storefront.query(CATALOGUE_QUERY, {
      variables: {handle: TRADE_COLLECTIONS.wholesaleFlowers},
    });
    products = collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('wholesale flowers catalogue failed', error);
  }
  return {products};
}

export default function WholesaleFlowers() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ArrangementsCatalogue
      eyebrow="Wholesale"
      title="Flowers"
      products={products}
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
