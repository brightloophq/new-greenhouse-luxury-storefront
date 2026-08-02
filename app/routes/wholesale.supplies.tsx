import {redirect, useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogue} from '~/lib/catalogues';
import {getWholesaleAccess} from '~/lib/wholesale';
import {requireWholesaleProfile} from '~/lib/wholesaleProfile';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Supplies | The New Greenhouse'},
];

export async function loader({context, request}: LoaderFunctionArgs) {
  // Approval-gated: only "approved" customers reach the wholesale catalogue.
  const {access} = await getWholesaleAccess(context.customerAccount);
  if (access !== 'approved') throw redirect('/wholesale');
  await requireWholesaleProfile(context.customerAccount, request);

  return loadCatalogue<CatalogueProduct>(
    context.storefront,
    TRADE_COLLECTIONS.wholesaleSupplies,
    request,
    'wholesale-supplies',
  );
}

export default function WholesaleSupplies() {
  const cat = useLoaderData<typeof loader>();
  return (
    <CatalogueView
      eyebrow="Wholesale"
      title="Supplies"
      products={cat.products}
      filters={cat.filters}
      sort={cat.sort}
      missing={cat.missing}
      failed={cat.failed}
      context="wholesale-supplies"
      variant="supply"
      noun="item"
      back={{to: '/wholesale', label: 'Wholesale'}}
    />
  );
}
