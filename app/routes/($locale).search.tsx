import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {SearchForm} from '~/components/SearchForm';
import {
  type RegularSearchReturn,
  type PredictiveSearchReturn,
  getEmptyPredictiveSearchResult,
} from '~/lib/search';
import {getExperienceFromRequest, type ExperienceMode} from '~/lib/experience';
import {
  productInExperience,
  collectionBlockedIn,
} from '~/lib/experienceClassify';
import {CatalogResults} from '~/components/catalog/CatalogResults';
import type {CatalogProduct} from '~/components/catalog/types';
import {ButtonLink, Heading, Icon, Text} from '~/components/ui';
import type {
  RegularSearchQuery,
  PredictiveSearchQuery,
} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [
    {title: `Search | The New Greenhouse`},
    {
      name: 'description',
      content:
        'Search flowers, occasions and collections at The New Greenhouse — luxury bouquets and fresh stems delivered across Kingston, Jamaica.',
    },
    {name: 'robots', content: 'noindex, follow'},
  ];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');
  const experience = getExperienceFromRequest(request);
  const searchPromise: Promise<PredictiveSearchReturn | RegularSearchReturn> =
    isPredictive
      ? predictiveSearch({request, context, experience})
      : regularSearch({request, context, experience});

  searchPromise.catch((error: Error) => {
    console.error(error);
    return {term: '', result: null, error: error.message};
  });

  return await searchPromise;
}

/** Map a Storefront search-product node onto the catalog card view-model. */
function toCatalogProduct(
  node: RegularSearchQuery['products']['nodes'][number],
): CatalogProduct {
  const variant = node.selectedOrFirstAvailableVariant;
  const price = variant?.price ?? {amount: '0', currencyCode: 'USD'};
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    vendor: node.vendor,
    availableForSale: variant?.availableForSale ?? undefined,
    featuredImage: variant?.image ?? null,
    images: variant?.image ? {nodes: [variant.image]} : null,
    priceRange: {minVariantPrice: price, maxVariantPrice: price},
    compareAtPriceRange: variant?.compareAtPrice
      ? {minVariantPrice: variant.compareAtPrice}
      : null,
  };
}

/**
 * Renders the /search route — rebuilt on the premium `ng-catalog` design
 * system (was stock Hydrogen scaffolding). Product results scope to the active
 * experience server-side (Deluxe = luxury/retail only).
 */
export default function SearchPage() {
  const {type, term, result, error} = useLoaderData<typeof loader>();
  if (type === 'predictive') return null;

  const products = result?.items?.products;
  const productNodes = products?.nodes ?? [];
  const hasTerm = Boolean(term);
  const hasProducts = productNodes.length > 0;

  const connection = products
    ? {nodes: productNodes.map(toCatalogProduct), pageInfo: products.pageInfo}
    : null;

  return (
    <div className="ng-catalog-page ng-search-page">
      <header className="ng-search-hero">
        <p className="greenhouse-kicker">Search</p>
        <h1 className="ng-search-title">
          {hasTerm ? (
            <>
              Results for <span className="ng-search-term">“{term}”</span>
            </>
          ) : (
            'Search the collection'
          )}
        </h1>
        <p className="ng-search-sub">
          Find the perfect arrangement by flower, occasion, or collection.
        </p>
        <SearchForm className="ng-search-form">
          {({inputRef}) => (
            <div className="ng-search-form-row">
              <input
                className="ng-search-input"
                defaultValue={term}
                name="q"
                placeholder="Search flowers, occasions, collections…"
                ref={inputRef}
                type="search"
                aria-label="Search"
              />
              <button className="ng-search-submit" type="submit">
                Search
              </button>
            </div>
          )}
        </SearchForm>
      </header>

      {error ? (
        <p className="ng-search-error" role="alert">
          {error}
        </p>
      ) : null}

      {hasProducts && connection ? (
        <section className="ng-search-results" aria-label="Search results">
          <CatalogResults connection={connection} />
        </section>
      ) : hasTerm ? (
        <div className="ng-catalog-empty" role="status">
          <span className="ng-catalog-empty-icon" aria-hidden="true">
            <Icon name="search" size="lg" />
          </span>
          <Heading as={2} size="h3" className="ng-catalog-empty-title">
            No arrangements match “{term}”
          </Heading>
          <Text tone="secondary" className="ng-catalog-empty-text">
            Try a different word — a flower, an occasion, or a colour — or
            explore our collections below.
          </Text>
          <ButtonLink
            to="/collections"
            variant="primary"
            className="ng-catalog-empty-action"
          >
            Browse collections
          </ButtonLink>
        </div>
      ) : (
        <div className="ng-catalog-empty" role="status">
          <span className="ng-catalog-empty-icon" aria-hidden="true">
            <Icon name="flower" size="lg" />
          </span>
          <Heading as={2} size="h3" className="ng-catalog-empty-title">
            What are you looking for?
          </Heading>
          <Text tone="secondary" className="ng-catalog-empty-text">
            Search for a flower, an occasion, or a collection — or browse our
            signature arrangements.
          </Text>
          <ButtonLink
            to="/collections"
            variant="primary"
            className="ng-catalog-empty-action"
          >
            Browse collections
          </ButtonLink>
        </div>
      )}

      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    tags
    productType
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const;

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
  experience,
}: Pick<Route.LoaderArgs, 'request' | 'context'> & {
  experience: ExperienceMode;
}): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const term = String(url.searchParams.get('q') || '');

  // Search articles, pages, and products for the `q` term
  const {
    errors,
    ...items
  }: {errors?: Array<{message: string}>} & RegularSearchQuery =
    await storefront.query(SEARCH_QUERY, {
      variables: {...variables, term},
    });

  if (!items) {
    throw new Error('No search data returned from Shopify API');
  }

  // Strict experience isolation (Part 18): products are filtered to the active
  // experience by central classification (productType + experience tag), NOT by
  // the shared channel tag — 40 products carry both channel tags, so a channel
  // filter would leak. Classic keeps only wholesale flowers + supplies; Deluxe
  // keeps only luxury arrangements/gifts; ambiguous (Plant) shows in neither.
  // The `search` connection's productFilters arg does not constrain a text
  // query, so we filter the returned nodes here. Articles/pages stay (shared).
  const scopedItems = items.products?.nodes
    ? {
        ...items,
        products: {
          ...items.products,
          nodes: items.products.nodes.filter((node) =>
            productInExperience(node, experience),
          ),
        },
      }
    : items;

  const total = Object.values(scopedItems).reduce(
    (acc: number, {nodes}: {nodes: Array<unknown>}) => acc + nodes.length,
    0,
  );

  const error = errors
    ? errors.map(({message}: {message: string}) => message).join(', ')
    : undefined;

  return {type: 'regular', term, error, result: {total, items: scopedItems}};
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    tags
    productType
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
  experience,
}: Pick<Route.ActionArgs, 'request' | 'context'> & {
  experience: ExperienceMode;
}): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  // Predictive results are scoped to the active experience (Part 18): products
  // by central classification, collections by the opposite experience's
  // allow-list. Applies to BOTH experiences so neither dropdown leaks the other.
  const scoped = {
    ...items,
    products: items.products.filter((product) =>
      productInExperience(product, experience),
    ),
    collections: items.collections.filter(
      (collection) => !collectionBlockedIn(collection.handle, experience),
    ),
  };

  const total = Object.values(scoped).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items: scoped, total}};
}
