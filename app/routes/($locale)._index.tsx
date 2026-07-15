import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {useExperience} from '~/components/ExperienceProvider';
import {flowerCategoryPath, flowerFamilyPath} from '~/lib/flowerCategories';
import {getExperienceFromRequest} from '~/lib/experience';
import type {ExperienceMode} from '~/lib/experience';
import {HOME_CONTENT, type HomeImageKey, type HomeEditorial} from '~/lib/homeContent';
import heroEditorial from '~/assets/greenhouse-hero-editorial-1920.jpg';
import occasionBanner from '~/assets/greenhouse-occasion-banner-1600.jpg';
import botanicalBanner from '~/assets/greenhouse-botanical-banner-1600.jpg';

/** Resolve a content image key to its bundled asset URL. */
const IMAGES: Record<HomeImageKey, string> = {
  hero: heroEditorial,
  occasion: occasionBanner,
  botanical: botanicalBanner,
};

/**
 * Build a responsive srcSet from a local `…-800.webp` asset path (the Deluxe
 * hero/tile images ship 400/600/800 widths). Returns undefined for bundled
 * assets so the browser just uses `src`.
 */
function localSrcSet(src?: string): string | undefined {
  if (!src || !src.includes('-800.webp')) return undefined;
  const base = src.replace('-800.webp', '');
  return `${base}-400.webp 400w, ${base}-600.webp 600w, ${base}-800.webp 800w`;
}

export const meta: Route.MetaFunction = ({data}) => {
  // Distinct SEO per experience: wholesale intent (Classic) vs luxury gifting
  // (Deluxe). Canonical stays "/" for both (no duplicate-content routes).
  const classic = data?.experience === 'classic';
  // Brand tagline is the default document title (requested). Experience-specific
  // keyword copy lives in the description + OG below for SEO.
  const title = 'The New Greenhouse | Not just a flower, whatever it takes.';
  const description = classic
    ? 'Bulk flowers, wholesale roses, greenery and florist supplies for florists, event planners, hotels and businesses in Kingston, Jamaica.'
    : 'Signature luxury bouquets, premium roses and orchids, and refined corporate and wedding floral design from The New Greenhouse in Kingston, Jamaica.';
  const origin = data?.origin ?? '';
  // Branded share image (a real, always-present asset) for both experiences.
  const image = `${origin}/images/collection-heroes/luxury-bouquets-1200.webp`;

  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: `${origin}/`},
    {property: 'og:site_name', content: 'The New Greenhouse'},
    {property: 'og:image', content: image},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
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
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
    experience: getExperienceFromRequest(request),
    origin: new URL(request.url).origin,
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
  // Experience comes from the SSR loader for first paint, then the live context
  // (so a client-side toggle re-renders the homepage without a reload).
  const {experience} = useExperience();
  const mode: ExperienceMode = experience ?? data.experience;
  const content = HOME_CONTENT[mode];

  return (
    <div className="home">
      <HomeAnnouncement text={content.announcement} />
      <HomeHero content={content.hero} collection={data.featuredCollection} />
      <FeaturedCollections
        content={content.featured}
        collection={data.featuredCollection}
      />
      <TileSection content={content.flowers} labelledBy="shop-by-flower-title" />
      <TileSection content={content.browse} labelledBy="shop-by-browse-title" />
      <ProductRow content={content.productRow} products={data.recommendedProducts} />
      {content.editorials.map((editorial, index) => (
        <Editorial
          key={editorial.title}
          content={editorial}
          variant={index % 2 === 0 ? 'wedding' : 'corporate'}
        />
      ))}
      <HeritageStory content={content.heritage} />
      <Testimonials content={content.testimonials} />
      {/* Deluxe relies on the single site-wide footer newsletter; Classic keeps
          its homepage capture form (audit M4 — remove the duplicate). */}
      {mode === 'classic' ? (
        <Newsletter content={content.newsletter} />
      ) : null}
    </div>
  );
}

function HomeAnnouncement({text}: {text: string}) {
  // Not a live region: the site-wide header announcement is the single
  // role="status" (avoids two competing status regions in the header area).
  return <div className="greenhouse-home-announcement">{text}</div>;
}

function HomeHero({
  content,
  collection,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['hero'];
  collection?: FeaturedCollectionFragment | null;
}) {
  const collectionUrl = collection?.handle
    ? `/collections/${collection.handle}`
    : '/collections/all-flowers';
  // A null primary target means "link to the freshest featured collection".
  const primaryTo = content.primary.to ?? collectionUrl;

  return (
    <section className="greenhouse-hero" aria-labelledby="greenhouse-hero-title">
      <div className="greenhouse-hero-media">
        <img
          src={content.imageSrc ?? IMAGES[content.image]}
          srcSet={localSrcSet(content.imageSrc)}
          sizes={content.imageSrc ? '100vw' : undefined}
          alt={content.alt}
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="greenhouse-hero-panel">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h1 id="greenhouse-hero-title">{content.title}</h1>
        <p>{content.body}</p>
        <div className="greenhouse-hero-actions">
          <Link className="greenhouse-button" to={primaryTo}>
            {content.primary.label}
          </Link>
          <Link
            className="greenhouse-button greenhouse-button-secondary"
            to={content.secondary.to}
          >
            {content.secondary.label}
          </Link>
        </div>
        <span className="greenhouse-hero-slogan">{content.slogan}</span>
      </div>
    </section>
  );
}

function ProductRow({
  content,
  products,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['productRow'];
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section className="greenhouse-product-row" aria-labelledby="best-sellers">
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="best-sellers">{content.title}</h2>
        <Link to={content.cta.to}>{content.cta.label}</Link>
      </div>
      <Suspense fallback={<FallbackProductGrid to={content.cta.to} />}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response?.products.nodes.length
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : FALLBACK_PRODUCTS.map((product) => (
                    <FallbackProductCard
                      key={product.title}
                      {...product}
                      to={content.cta.to}
                    />
                  ))}
            </div>
          )}
        </Await>
      </Suspense>
    </section>
  );
}

function FeaturedCollections({
  content,
  collection,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['featured'];
  collection?: FeaturedCollectionFragment | null;
}) {
  const featuredCollectionUrl = collection?.handle
    ? `/collections/${collection.handle}`
    : '/collections/all-flowers';

  return (
    <section
      className="greenhouse-featured-collections"
      aria-labelledby="collection-banners-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="collection-banners-title">{content.title}</h2>
      </div>
      <div className="greenhouse-banner-grid">
        {content.cards.map((card) => (
          <Link
            className="greenhouse-banner-card"
            key={card.title}
            to={card.to ?? featuredCollectionUrl}
          >
            <img
              src={card.imageSrc ?? IMAGES[card.image]}
              srcSet={localSrcSet(card.imageSrc)}
              sizes="(min-width: 64em) 25vw, (min-width: 45em) 50vw, 100vw"
              alt={card.alt}
              loading="lazy"
              decoding="async"
            />
            <span>{card.eyebrow}</span>
            <strong>{card.title}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TileSection({
  content,
  labelledBy,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['flowers'];
  labelledBy: string;
}) {
  return (
    <section className="greenhouse-occasions" aria-labelledby={labelledBy}>
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id={labelledBy}>{content.title}</h2>
        {content.link ? (
          <Link to={content.link.to}>{content.link.label}</Link>
        ) : null}
      </div>
      <div
        className={
          content.tiles.some((tile) => tile.image)
            ? 'greenhouse-occasion-grid greenhouse-occasion-grid--imaged'
            : 'greenhouse-occasion-grid'
        }
      >
        {content.tiles.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className={tile.image ? 'greenhouse-occasion-tile--imaged' : undefined}
          >
            {tile.image ? (
              <img
                className="greenhouse-occasion-tile-img"
                src={tile.image}
                srcSet={localSrcSet(tile.image)}
                sizes="(min-width: 64em) 25vw, (min-width: 45em) 33vw, 50vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <span>{tile.label}</span>
            <small>Explore</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Editorial({
  content,
  variant,
}: {
  content: HomeEditorial;
  variant: 'wedding' | 'corporate';
}) {
  const titleId = `${variant}-editorial-title`;
  const media = (
    <div
      className={
        variant === 'wedding'
          ? 'greenhouse-editorial-media'
          : 'greenhouse-corporate-media'
      }
    >
      <img
        src={content.imageSrc ?? IMAGES[content.image]}
        alt={content.alt}
        loading="lazy"
      />
    </div>
  );
  const copy = (
    <div
      className={
        variant === 'wedding'
          ? 'greenhouse-editorial-copy'
          : 'greenhouse-corporate-copy'
      }
    >
      <p className="greenhouse-kicker">{content.kicker}</p>
      <h2 id={titleId}>{content.title}</h2>
      <p>{content.body}</p>
      <Link
        className={
          variant === 'wedding'
            ? 'greenhouse-button'
            : 'greenhouse-button greenhouse-button-dark'
        }
        to={content.cta.to}
      >
        {content.cta.label}
      </Link>
    </div>
  );

  if (variant === 'wedding') {
    return (
      <section
        className="greenhouse-editorial greenhouse-editorial-wedding"
        aria-labelledby={titleId}
      >
        {copy}
        {media}
      </section>
    );
  }
  return (
    <section className="greenhouse-corporate" aria-labelledby={titleId}>
      {media}
      {copy}
    </section>
  );
}

function HeritageStory({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['heritage'];
}) {
  return (
    <section className="greenhouse-heritage" aria-labelledby="heritage-title">
      <div>
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="heritage-title">{content.title}</h2>
      </div>
      <p>{content.body}</p>
    </section>
  );
}

function Testimonials({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['testimonials'];
}) {
  return (
    <section
      className="greenhouse-testimonials"
      aria-labelledby="testimonials-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="testimonials-title">{content.title}</h2>
        {content.rating ? (
          <a
            className="greenhouse-rating-badge"
            href={content.rating.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="greenhouse-rating-star" aria-hidden="true">
              ★
            </span>
            <strong>{content.rating.score}</strong>
            <span>from {content.rating.count} Google reviews</span>
          </a>
        ) : null}
      </div>
      <div className="greenhouse-testimonial-grid">
        {content.items.map((testimonial) => (
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

function Newsletter({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['newsletter'];
}) {
  return (
    <section className="greenhouse-newsletter" aria-labelledby="newsletter-title">
      <p className="greenhouse-kicker">{content.kicker}</p>
      <h2 id="newsletter-title">{content.title}</h2>
      <p>{content.body}</p>
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

function FallbackProductGrid({to}: {to: string}) {
  return (
    <div className="recommended-products-grid">
      {FALLBACK_PRODUCTS.map((product) => (
        <FallbackProductCard key={product.title} {...product} to={to} />
      ))}
    </div>
  );
}

function FallbackProductCard({
  title,
  price,
  image,
  to,
}: {
  title: string;
  price: string;
  image: string;
  to: string;
}) {
  return (
    <Link className="greenhouse-fallback-product product-item" to={to}>
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
