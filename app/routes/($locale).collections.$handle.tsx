import {redirect, useLoaderData, useNavigation} from 'react-router';
import {useState} from 'react';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import type {
  ProductCollectionSortKeys,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  parseCatalogSearchParams,
  buildProductFilters,
  toCollectionSort,
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

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.collection?.seo?.title || data?.collection?.title || 'Collection';
  const description =
    data?.collection?.seo?.description ||
    data?.collection?.description ||
    'Shop luxury and wholesale floral arrangements from The New Greenhouse in Kingston, Jamaica.';
  return [
    {title: `${title} | The New Greenhouse`},
    {name: 'description', content: description},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw redirect('/collections');
  }

  const url = new URL(request.url);
  const {filters: applied, sort} = parseCatalogSearchParams(url.searchParams);
  const productFilters = buildProductFilters(applied);
  const {sortKey, reverse} = toCollectionSort(sort);
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {
        handle,
        filters: productFilters,
        sortKey: sortKey as ProductCollectionSortKeys,
        reverse,
        ...paginationVariables,
      },
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection, applied, sort};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {collection, applied, sort} = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<CatalogProduct | null>(null);

  const loading = navigation.state !== 'idle';
  const activeCount = countActiveFilters(applied);
  const products = (collection.products.nodes ?? []) as CatalogProduct[];

  const breadcrumbs = [
    {label: 'Home', to: '/'},
    {label: 'Collections', to: '/collections'},
    {label: collection.title},
  ];

  return (
    <div className="ng-catalog-page">
      <CollectionHero
        breadcrumbs={breadcrumbs}
        eyebrow="The Collection"
        title={collection.title}
        description={collection.description || undefined}
        image={
          collection.image
            ? {url: collection.image.url, altText: collection.image.altText}
            : undefined
        }
      />

      <div className="ng-catalog-layout">
        <aside className="ng-catalog-sidebar" aria-label="Product filters">
          <FilterPanel variant="sidebar" filters={applied} />
        </aside>

        <div className="ng-catalog-main">
          <CatalogToolbar
            count={products.length}
            sort={sort}
            activeCount={activeCount}
            onOpenFilters={() => setDrawerOpen(true)}
          />
          <ActiveFilterChips filters={applied} />
          <CatalogResults
            connection={collection.products}
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
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
    </div>
  );
}

const COLLECTION_QUERY = `#graphql
  ${CATALOG_PRODUCT_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        id
        url
        altText
        width
        height
      }
      seo {
        title
        description
      }
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        nodes {
          ...CatalogProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;
