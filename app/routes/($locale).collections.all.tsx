import {useLoaderData, useNavigation} from 'react-router';
import {useState} from 'react';
import type {Route} from './+types/collections.all';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import type {ProductSortKeys} from '@shopify/hydrogen/storefront-api-types';
import {
  parseCatalogSearchParams,
  buildProductQueryString,
  toCatalogSort,
  countActiveFilters,
  CATALOG_PRODUCT_FRAGMENT,
} from '~/lib/catalog';
import type {CatalogProduct} from '~/components/catalog/types';
import {CollectionHero} from '~/components/catalog/CollectionHero';
import {
  FilterPanel,
  FilterDrawer,
  ActiveFilterChips,
} from '~/components/catalog/Filters';
import {CatalogToolbar} from '~/components/catalog/CatalogToolbar';
import {CatalogResults} from '~/components/catalog/CatalogResults';
import {QuickView} from '~/components/catalog/QuickView';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Shop All Flowers | The New Greenhouse'},
    {
      name: 'description',
      content:
        'Browse the full catalog of retail and wholesale flowers, arrangements, supplies and plants from The New Greenhouse in Kingston, Jamaica.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const {filters: applied, sort} = parseCatalogSearchParams(url.searchParams);
  const query = buildProductQueryString(applied);
  const {sortKey, reverse} = toCatalogSort(sort);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});

  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {
        query,
        sortKey: sortKey as ProductSortKeys,
        reverse,
        ...paginationVariables,
      },
    }),
  ]);
  return {products, applied, sort};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function AllProducts() {
  const {products, applied, sort} = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<CatalogProduct | null>(null);

  const loading = navigation.state !== 'idle';
  const activeCount = countActiveFilters(applied);
  const nodes = (products.nodes ?? []) as CatalogProduct[];

  const breadcrumbs = [
    {label: 'Home', to: '/'},
    {label: 'Collections', to: '/collections'},
    {label: 'All Flowers'},
  ];

  return (
    <div className="ng-catalog-page">
      <CollectionHero
        breadcrumbs={breadcrumbs}
        eyebrow="The Full Catalog"
        title="Shop All Flowers"
        description="Retail and wholesale flowers, arrangements, supplies and plants — the full house of The New Greenhouse."
      />

      <div className="ng-catalog-layout">
        <aside className="ng-catalog-sidebar" aria-label="Product filters">
          <FilterPanel variant="sidebar" filters={applied} />
        </aside>

        <div className="ng-catalog-main">
          <CatalogToolbar
            count={nodes.length}
            sort={sort}
            activeCount={activeCount}
            onOpenFilters={() => setDrawerOpen(true)}
          />
          <ActiveFilterChips filters={applied} />
          <CatalogResults
            connection={products}
            loading={loading}
            hasFilters={activeCount > 0}
            onQuickView={setQuickProduct}
          />
        </div>
      </div>

      <FilterDrawer
        filters={applied}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <QuickView
        product={quickProduct}
        open={Boolean(quickProduct)}
        onClose={() => setQuickProduct(null)}
      />

      <Analytics.CollectionView
        data={{collection: {id: 'all-products', handle: 'all-flowers'}}}
      />
    </div>
  );
}

const CATALOG_QUERY = `#graphql
  ${CATALOG_PRODUCT_FRAGMENT}
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $query: String
    $sortKey: ProductSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes {
        ...CatalogProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;
