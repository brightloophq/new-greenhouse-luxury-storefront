import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {flowerCategoryPath, flowerFamilyPath} from '~/lib/flowerCategories';
import heroEditorial from '~/assets/greenhouse-hero-editorial-1920.jpg';
import occasionBanner from '~/assets/greenhouse-occasion-banner-1600.jpg';
import botanicalBanner from '~/assets/greenhouse-botanical-banner-1600.jpg';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'The New Greenhouse | Luxury Florist in Kingston, Jamaica'},
    {
      name: 'description',
      content:
        'Shop luxury flowers, gifts, wedding florals, sympathy arrangements, and corporate floral design from The New Greenhouse in Kingston, Jamaica.',
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
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <HomeAnnouncement />
      <HomeHero collection={data.featuredCollection} />
      <FeaturedCollections collection={data.featuredCollection} />
      <ShopByFlower />
      <ShopByOccasion />
      <ProductRow
        id="best-sellers"
        kicker="Best sellers"
        title="Arrangements made to be remembered."
        products={data.recommendedProducts}
      />
      <WeddingEditorial />
      <CorporateServices />
      <HeritageStory />
      <Testimonials />
      <Newsletter />
    </div>
  );
}

function HomeAnnouncement() {
  return (
    <div className="greenhouse-home-announcement" role="status">
      Same-day delivery available across Kingston &amp; St. Andrew for orders
      placed before 2PM.
    </div>
  );
}

function HomeHero({
  collection,
}: {
  collection?: FeaturedCollectionFragment | null;
}) {
  const collectionUrl = collection?.handle
    ? `/collections/${collection.handle}`
    : '/collections/all-flowers';

  return (
    <section className="greenhouse-hero" aria-labelledby="greenhouse-hero-title">
      <div className="greenhouse-hero-media">
        <img
          src={heroEditorial}
          alt="Luxury ivory and blush floral arrangement by The New Greenhouse"
        />
      </div>
      <div className="greenhouse-hero-panel">
        <p className="greenhouse-kicker">The New Greenhouse, Kingston</p>
        <h1 id="greenhouse-hero-title">
          Luxury flowers for life&apos;s most meaningful moments.
        </h1>
        <p>
          Handcrafted floral arrangements, gifts, weddings, sympathy flowers,
          and corporate designs from Kingston&apos;s trusted floral house.
        </p>
        <div className="greenhouse-hero-actions">
          <Link className="greenhouse-button" to={collectionUrl}>
            Shop Arrangements
          </Link>
          <Link className="greenhouse-button greenhouse-button-secondary" to="/pages/contact">
            Request Custom Design
          </Link>
        </div>
        <span className="greenhouse-hero-slogan">
          Not just flowers, whatever it takes.
        </span>
      </div>
    </section>
  );
}

function ProductRow({
  id,
  kicker,
  title,
  products,
}: {
  id: string;
  kicker: string;
  title: string;
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section
      className="greenhouse-product-row"
      aria-labelledby={id}
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{kicker}</p>
        <h2 id={id}>{title}</h2>
        <Link to="/collections/all">Shop all</Link>
      </div>
      <Suspense fallback={<FallbackProductGrid />}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response?.products.nodes.length
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : FALLBACK_PRODUCTS.map((product) => (
                    <FallbackProductCard key={product.title} {...product} />
                  ))}
            </div>
          )}
        </Await>
      </Suspense>
    </section>
  );
}

function FeaturedCollections({
  collection,
}: {
  collection?: FeaturedCollectionFragment | null;
}) {
  const featuredCollectionUrl = collection?.handle
    ? `/collections/${collection.handle}`
    : '/collections/all-flowers';

  const cards = [
    {
      title: 'Signature Bouquets',
      eyebrow: 'House arrangements',
      to: featuredCollectionUrl,
      image: occasionBanner,
      alt: 'Blush and ivory luxury floral arrangement',
    },
    {
      title: 'Sympathy & Funeral',
      eyebrow: 'Quiet grace',
      to: '/collections/sympathy-and-funeral',
      image: heroEditorial,
      alt: 'Ivory floral arrangement in a cinematic dark setting',
    },
    {
      title: 'Weddings & Events',
      eyebrow: 'Ceremonies in bloom',
      to: '/pages/wedding-events',
      image: botanicalBanner,
      alt: 'Botanical floral arrangement with orchids and deep greenery',
    },
    {
      title: 'Wholesale Flowers',
      eyebrow: 'By the box',
      to: '/collections/bulk-flowers',
      image: occasionBanner,
      alt: 'Bulk wholesale flowers ready for florists and events',
    },
  ];

  return (
    <section
      className="greenhouse-featured-collections"
      aria-labelledby="collection-banners-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">Featured collections</p>
        <h2 id="collection-banners-title">
          Floral gestures for every kind of occasion.
        </h2>
      </div>
      <div className="greenhouse-banner-grid">
        {cards.map((card) => (
          <Link className="greenhouse-banner-card" key={card.title} to={card.to}>
            <img src={card.image} alt={card.alt} loading="lazy" />
            <span>{card.eyebrow}</span>
            <strong>{card.title}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ShopByFlower() {
  const flowers = [
    {label: 'Alstroemeria', to: flowerFamilyPath('alstroemeria')},
    {label: 'Roses - In Stock', to: flowerCategoryPath('roses-in-stock')},
    {label: 'Orchids', to: flowerCategoryPath('orchids')},
    {label: 'Lilies', to: flowerCategoryPath('lilies')},
    {label: 'Hydrangea', to: flowerCategoryPath('hydrangea')},
    {label: 'Tulips', to: flowerCategoryPath('tulips')},
  ];

  return (
    <section
      className="greenhouse-occasions"
      aria-labelledby="shop-by-flower-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">Shop by flower</p>
        <h2 id="shop-by-flower-title">Choose your bloom.</h2>
        <Link to="/collections/all-flowers">All flowers</Link>
      </div>
      <div className="greenhouse-occasion-grid">
        {flowers.map((flower) => (
          <Link key={flower.label} to={flower.to}>
            <span>{flower.label}</span>
            <small>Explore</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ShopByOccasion() {
  const occasions = [
    {label: 'Birthday', to: '/collections/birthday'},
    {label: 'Anniversary', to: '/collections/anniversary'},
    {label: 'Sympathy', to: '/collections/sympathy-and-funeral'},
    {label: 'Congratulations', to: '/collections/congratulations'},
    {label: 'Romance', to: '/collections/love-and-romance'},
    {label: 'Corporate', to: '/collections/corporate-gifting'},
  ];

  return (
    <section
      className="greenhouse-occasions"
      aria-labelledby="shop-by-occasion-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">Shop by occasion</p>
        <h2 id="shop-by-occasion-title">Send beauty with intention.</h2>
      </div>
      <div className="greenhouse-occasion-grid">
        {occasions.map((occasion) => (
          <Link key={occasion.label} to={occasion.to}>
            <span>{occasion.label}</span>
            <small>Explore</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WeddingEditorial() {
  return (
    <section
      className="greenhouse-editorial greenhouse-editorial-wedding"
      aria-labelledby="wedding-editorial-title"
    >
      <div className="greenhouse-editorial-copy">
        <p className="greenhouse-kicker">Wedding atelier</p>
        <h2 id="wedding-editorial-title">
          Your wedding, imagined in bloom.
        </h2>
        <p>
          From ceremony arches to tablescapes, our floral team composes the
          atmosphere around your vows, venue, and the feeling you want guests to
          carry home.
        </p>
        <Link className="greenhouse-button" to="/pages/wedding-events">
          Book a Floral Consultation
        </Link>
      </div>
      <div className="greenhouse-editorial-media">
        <img
          src={occasionBanner}
          alt="Romantic blush and ivory wedding floral arrangement"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function CorporateServices() {
  return (
    <section
      className="greenhouse-corporate"
      aria-labelledby="corporate-title"
    >
      <div className="greenhouse-corporate-media">
        <img
          src={botanicalBanner}
          alt="Botanical floral arrangement for a luxury hospitality interior"
          loading="lazy"
        />
      </div>
      <div className="greenhouse-corporate-copy">
        <p className="greenhouse-kicker">Corporate floral services</p>
        <h2 id="corporate-title">Flowers that hold the room.</h2>
        <p>
          Weekly floral styling and event arrangements for Kingston hotels,
          offices, restaurants, embassies, boutiques, and private functions.
        </p>
        <Link className="greenhouse-button greenhouse-button-dark" to="/collections/corporate-gifting">
          Explore Corporate Flowers
        </Link>
      </div>
    </section>
  );
}

function HeritageStory() {
  return (
    <section
      className="greenhouse-heritage"
      aria-labelledby="heritage-title"
    >
      <div>
        <p className="greenhouse-kicker">Kingston, Jamaica</p>
        <h2 id="heritage-title">
          Four decades of flowers, memories, and moments.
        </h2>
      </div>
      <p>
        For 40+ years, The New Greenhouse has served Jamaica with flowers for
        celebrations, farewells, weddings, homes, businesses, and the meaningful
        gestures in between.
      </p>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote:
        'Every arrangement arrived with the polish of a luxury gift and the warmth of something personal.',
      name: 'Marsha L.',
      context: 'Kingston',
    },
    {
      quote:
        'Their wedding florals transformed the space without ever feeling overdone.',
      name: 'Danielle R.',
      context: 'Wedding client',
    },
    {
      quote:
        'Reliable, elegant, and beautifully presented. Our lobby flowers are now part of the guest experience.',
      name: 'Corporate client',
      context: 'Hospitality',
    },
  ];

  return (
    <section
      className="greenhouse-testimonials"
      aria-labelledby="testimonials-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">Loved by customers</p>
        <h2 id="testimonials-title">A quiet standard of excellence.</h2>
      </div>
      <div className="greenhouse-testimonial-grid">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.name}>
            <blockquote>&ldquo;{testimonial.quote}&rdquo;</blockquote>
            <figcaption>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.context}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="greenhouse-newsletter" aria-labelledby="newsletter-title">
      <p className="greenhouse-kicker">The floral circle</p>
      <h2 id="newsletter-title">Join the floral circle.</h2>
      <p>
        Receive seasonal arrivals, gifting inspiration, and exclusive floral
        updates.
      </p>
      <form className="greenhouse-newsletter-form">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          placeholder="Email address"
        />
        <button type="button">Join the list</button>
      </form>
    </section>
  );
}

function FallbackProductGrid() {
  return (
    <div className="recommended-products-grid">
      {FALLBACK_PRODUCTS.map((product) => (
        <FallbackProductCard key={product.title} {...product} />
      ))}
    </div>
  );
}

function FallbackProductCard({
  title,
  price,
  image,
}: {
  title: string;
  price: string;
  image: string;
}) {
  return (
    <Link className="greenhouse-fallback-product product-item" to="/collections/all">
      <img src={image} alt={title} loading="lazy" />
      <h4>{title}</h4>
      <small>{price}</small>
    </Link>
  );
}

const FALLBACK_PRODUCTS = [
  {
    title: 'Ivory Orchid Gesture',
    price: 'From JMD 18,500',
    image: heroEditorial,
  },
  {
    title: 'Blush Garden Arrangement',
    price: 'From JMD 15,000',
    image: occasionBanner,
  },
  {
    title: 'Botanical Gold Bowl',
    price: 'From JMD 21,000',
    image: botanicalBanner,
  },
  {
    title: 'Signature Gift Florals',
    price: 'From JMD 12,500',
    image: occasionBanner,
  },
];

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
