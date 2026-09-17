import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CatalogueView} from '~/components/catalogue/CatalogueView';
import type {CatalogueProduct} from '~/components/catalogue/CatalogueCard';
import {TRADE_COLLECTIONS, loadCatalogueWithFallback} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Wholesale Supplies | The New Greenhouse'},
];

export async function loader({context, request}: LoaderFunctionArgs) {
  // Open to everyone — guest wholesale purchasing, no account/approval required.
  // The optional Business Account (see /wholesale) governs benefit eligibility
  // only; it never gates browsing or checkout.
  //
  // Prefer the dedicated wholesale-priced supplies collection; serve the shared
  // retail supplies collection until it exists AND has products. Creating the
  // collection empty (then adding products later) never blanks this page — the
  // fallback covers an unfiltered-empty preferred collection. Auto-upgrades with
  // no code change once the dedicated collection has stock.
  return loadCatalogueWithFallback<CatalogueProduct>(
    context.storefront,
    {
      preferred: TRADE_COLLECTIONS.wholesaleSupplies,
      fallback: TRADE_COLLECTIONS.wholesaleSuppliesFallback,
    },
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
