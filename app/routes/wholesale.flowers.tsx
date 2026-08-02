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
  // Wholesale is approval-gated: sign-in is required, and the owner must have
  // set the customer's status to "approved". Every other state is sent back to
  // /wholesale, which shows the matching gate or status notice.
  const {access} = await getWholesaleAccess(context.customerAccount);
  if (access !== 'approved') throw redirect('/wholesale');
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
