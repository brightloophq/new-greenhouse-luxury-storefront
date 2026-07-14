import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {useExperience} from '~/components/ExperienceProvider';
import {ProductGrid} from '~/components/catalog/ProductGrid';
import type {CatalogProduct} from '~/components/catalog/types';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  // Use the Shopify SEO title verbatim when set (it may already include the
  // brand); otherwise append the brand to the product title. Prevents the
  // "… | The New Greenhouse | The New Greenhouse" doubling.
  const pageTitle = data?.product.seo.title
    ? data.product.seo.title
    : `${data?.product.title || 'Luxury Flowers'} | The New Greenhouse`;
  return [
    {title: pageTitle},
    {
      name: 'description',
      content:
        data?.product.seo.description ||
        data?.product.description ||
        'Luxury floral arrangements handcrafted by The New Greenhouse in Kingston, Jamaica.',
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}, {productRecommendations}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Related products for the "You may also like" band (empty for brand-new
    // products — the PDP falls back to a curated add-ons band in that case).
    storefront.query(PRODUCT_RECOMMENDATIONS_QUERY, {variables: {handle}}),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
    recommendations: productRecommendations ?? [],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {product, recommendations} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml, vendor} = product;
  const {experience} = useExperience();
  const deluxe = experience === 'deluxe';
  const assurances = deluxe
    ? ['Secure checkout', 'Hand-tied in Kingston', 'Signature presentation']
    : ['Wholesale pricing available', 'Fresh, graded stems', 'Island-wide delivery'];

  // Real product gallery: prefer the selected-variant image, else fall back to
  // the first product media (demo products carry media, not a variant image),
  // so the main frame is never empty. Additional images become secondary shots.
  const galleryImages = product.images?.nodes ?? [];
  const primaryImage = selectedVariant?.image ?? galleryImages[0] ?? null;
  const secondaryImages = galleryImages.filter(
    (image) => image?.url && image.url !== primaryImage?.url,
  );

  // Real related products (recommendations), scoped to the active experience so
  // Deluxe never surfaces wholesale items. Falls back to a curated band below.
  const related = (recommendations ?? [])
    .filter((item) => item && item.id !== product.id)
    .filter((item) =>
      deluxe ? (item.tags ?? []).includes('channel:retail') : true,
    )
    .slice(0, 4)
    .map(toRecommendationCard);

  return (
    <div className="product commerce-product">
      <section className="product-gallery" aria-label={`${title} imagery`}>
        <ProductImage
          image={primaryImage}
          aspectRatio={deluxe ? '4/5' : '1/1'}
        />
        {secondaryImages.length ? (
          <div className="product-gallery-secondary">
            {secondaryImages.map((image) => (
              <img
                key={image.id ?? image.url}
                src={image.url}
                alt={image.altText ?? title}
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
      </section>
      <aside className="product-main">
        <p className="greenhouse-kicker">{vendor || 'The New Greenhouse'}</p>
        <h1>{title}</h1>
        <div className="product-price-block">
          <ProductPrice
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
        </div>
        <p className="product-delivery-note">
          Same-day delivery may be available across Kingston &amp; St. Andrew
          for orders placed before 2PM.
        </p>
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        {deluxe ? (
          <div className="product-gift-message">
            <p className="product-gift-message-title">Sending as a gift?</p>
            <small>
              Add your personal gift message and delivery date during checkout —
              we hand-write every note in Kingston.
            </small>
          </div>
        ) : (
          <div className="product-gift-message">
            <p className="product-gift-message-title">
              Buying for a business or event?
            </p>
            <small>
              Volume and standing-order pricing is available for florists,
              planners, hotels and offices.{' '}
              <Link to="/pages/contact">Ask about trade pricing →</Link>
            </small>
          </div>
        )}
        <div className="product-trust-grid" aria-label="Purchase assurances">
          {assurances.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="product-story">
          <details open>
            <summary>{deluxe ? 'The story' : 'Product details'}</summary>
            <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
          </details>
          <details>
            <summary>Flower care</summary>
            <p>
              Refresh water daily, keep blooms away from direct sunlight, and
              remove fading stems to preserve the arrangement.
            </p>
          </details>
          <details>
            <summary>Delivery estimate</summary>
            <p>
              Our team confirms timing after purchase and prepares each order
              with care for local delivery or collection.
            </p>
          </details>
        </div>
      </aside>
      {related.length ? (
        <section className="product-commerce-section product-pairings">
          <div>
            <p className="greenhouse-kicker">You may also like</p>
            <h2>Complete the gesture.</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      ) : (
        <section className="product-commerce-section product-pairings product-pairings-curated">
          <div>
            <p className="greenhouse-kicker">
              {deluxe ? 'Complete the gesture' : 'Build your order'}
            </p>
            <h2>
              {deluxe
                ? 'Add a finishing touch.'
                : 'Everything for your build.'}
            </h2>
            <p className="product-pairings-copy">
              {deluxe
                ? 'Pair your arrangement with a curated add-on and a hand-written note, wrapped and delivered together.'
                : 'Add greenery, vases and studio supplies to complete your order in one delivery.'}
            </p>
          </div>
          <Link
            className="greenhouse-button greenhouse-button-dark"
            to={deluxe ? '/collections/add-ons' : '/collections/floral-supplies'}
          >
            {deluxe ? 'Explore add-ons' : 'Shop supplies'}
          </Link>
        </section>
      )}
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 8) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const RECOMMENDED_PRODUCT_FRAGMENT = `#graphql
  fragment PdpRecommendation on Product {
    id
    handle
    title
    vendor
    availableForSale
    tags
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
` as const;

const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productHandle: $handle, intent: RELATED) {
      ...PdpRecommendation
    }
  }
  ${RECOMMENDED_PRODUCT_FRAGMENT}
` as const;

/** Map a recommended-product node onto the catalog card view-model. */
function toRecommendationCard(
  node: NonNullable<
    Awaited<ReturnType<typeof loader>>['recommendations']
  >[number],
): CatalogProduct {
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    vendor: node.vendor,
    availableForSale: node.availableForSale,
    featuredImage: node.featuredImage,
    images: node.featuredImage ? {nodes: [node.featuredImage]} : null,
    priceRange: node.priceRange,
    compareAtPriceRange: node.compareAtPriceRange,
  };
}
