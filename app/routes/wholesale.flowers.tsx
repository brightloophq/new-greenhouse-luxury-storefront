import {redirect, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';
import {getWholesaleAccess} from '~/lib/wholesale';
import {requireWholesaleProfile} from '~/lib/wholesaleProfile';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Flowers | The New Greenhouse'},
];

export async function loader({context, request}: LoaderFunctionArgs) {
  // Wholesale is authentication-required.
  const {access} = await getWholesaleAccess(context.customerAccount);
  if (access !== 'authenticated') throw redirect('/wholesale');
  // …and trade buyers must have completed their business profile.
  await requireWholesaleProfile(context.customerAccount, request);

  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    TRADE_COLLECTIONS.wholesaleFlowers,
    request,
    'wholesale-flowers',
  );
}

export default function WholesaleFlowers() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Wholesale"
      title="Flowers"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="wholesale-flowers"
      variant="wholesale"
      noun="stem"
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
