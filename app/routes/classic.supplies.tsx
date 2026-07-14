import {Link, data, useLoaderData} from 'react-router';
import type {SuppliesFeaturedQuery} from 'storefrontapi.generated';
import type {Route} from './+types/classic.supplies';
import {
  ButtonLink,
  Container,
  Icon,
  Section,
  SectionHeading,
  Text,
  TrustGrid,
  TrustItem,
  CTA,
} from '~/components/ui';
import {CollectionHero, MerchandisingBlock} from '~/components/catalog/CollectionHero';
import {ProductItem} from '~/components/ProductItem';
import {experienceCookie} from '~/lib/experience';
import {CONTACT, DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';

/**
 * Supply categories that map to LIVE Shopify collections (no dead links). Each
 * carries a practical blurb and a supply-specific image basename under
 * /images/supplies. Images depict the actual supply (foam, vase, ribbon, wrap,
 * tools) — never a flower bouquet. `image: null` renders a clean text card.
 */
interface SupplyCategory {
  label: string;
  to: string;
  blurb: string;
  image: string | null;
  alt: string;
}
const CATEGORIES: SupplyCategory[] = [
  {
    label: 'Vases & Containers',
    to: '/collections/vases-and-containers',
    blurb: 'Glass, ceramic and studio vessels for arrangements and gifting.',
    image: 'vases',
    alt: 'A clear glass florist vase on a pale studio background',
  },
  {
    label: 'Ribbon',
    to: '/collections/ribbon',
    blurb: 'Satin and fabric ribbon by the roll for finishing and bouquets.',
    image: 'ribbon',
    alt: 'Neatly arranged rolls of florist ribbon in soft neutral tones',
  },
  {
    label: 'Wrapping & Packaging',
    to: '/collections/wrapping-and-packaging',
    blurb: 'Kraft, tissue and cellophane wraps and presentation sleeves.',
    image: 'wrapping',
    alt: 'Rolls of kraft and cellophane floral wrapping material',
  },
  {
    label: 'Tools & Accessories',
    to: '/collections/tools-and-accessories',
    blurb: 'Shears, snips, tape and wire for building and conditioning.',
    image: 'tools',
    alt: 'A pair of florist shears with tape and wire on a studio background',
  },
  {
    label: 'Floral Foam & Mechanics',
    to: '/collections/floral-supplies',
    blurb: 'Florist foam blocks and mechanics that hold every design in place.',
    image: 'foam',
    alt: 'Clean blocks of florist foam on a pale studio background',
  },
  {
    label: 'Florist Essentials',
    to: '/collections/florist-essentials',
    blurb: 'The everyday consumables that keep the studio running.',
    image: 'essentials',
    alt: 'An arranged set of florist studio essentials on a neutral background',
  },
];

const SUPPLY_WIDTHS = [300, 400, 800] as const;
const supplySrcSet = (base: string) =>
  SUPPLY_WIDTHS.map((w) => `/images/supplies/${base}-${w}.webp ${w}w`).join(', ');

export const meta: Route.MetaFunction = () => [
  {title: 'Floral Supplies & Florist Essentials | The New Greenhouse Jamaica'},
  {
    name: 'description',
    content:
      'Vases, ribbon, wrapping, foam, tools and florist essentials for florists, decorators and businesses across Jamaica — from The New Greenhouse, Kingston.',
  },
  {tagName: 'link', rel: 'canonical', href: '/classic/supplies'},
];

export async function loader({context}: Route.LoaderArgs) {
  let featured: FeaturedProduct[] = [];
  try {
    const result = await context.storefront.query(SUPPLIES_FEATURED_QUERY, {
      variables: {handle: 'florist-essentials'},
    });
    featured = result.collection?.products?.nodes ?? [];
  } catch (error) {
    console.error('classic/supplies featured products failed', error);
  }

  // Only surface products that are genuinely purchasable: a real image AND a
  // non-zero price. Incomplete/imageless/unpriced supply products are withheld
  // from the storefront (never published half-built).
  featured = featured.filter(
    (product) =>
      product.featuredImage?.url &&
      Number(product.priceRange?.minVariantPrice?.amount ?? 0) > 0,
  );

  return data(
    {featured},
    {headers: {'Set-Cookie': experienceCookie('classic')}},
  );
}

export default function ClassicSupplies() {
  const {featured} = useLoaderData<typeof loader>();

  return (
    <div className="ng-experience ng-experience--classic">
      <CollectionHero
        eyebrow="Floral Supplies"
        title="Professional floral supplies."
        description="Reliable essentials for florists, decorators, businesses and everyday flower care — organised, practical and ready to reorder, delivered across Jamaica."
        breadcrumbs={[{label: 'Home', to: '/'}, {label: 'Floral Supplies'}]}
      />

      {/* Supply-category grid — image + practical blurb, mapped to live collections */}
      <Section spacing="compact" aria-labelledby="supplies-categories">
        <Container size="xl">
          <SectionHeading
            id="supplies-categories"
            eyebrow="Shop by category"
            title="Everything the studio needs."
          />
          <ul className="ng-supply-grid">
            {CATEGORIES.map((category) => (
              <li key={category.to} className="ng-supply-card">
                <Link to={category.to} className="ng-supply-card-link">
                  <span className="ng-supply-card-media">
                    {category.image ? (
                      <img
                        src={`/images/supplies/${category.image}-800.webp`}
                        srcSet={supplySrcSet(category.image)}
                        sizes="(min-width: 64em) 22vw, (min-width: 48em) 45vw, 90vw"
                        alt={category.alt}
                        width={800}
                        height={800}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="ng-supply-card-placeholder" aria-hidden="true">
                        <Icon name="leaf" />
                      </span>
                    )}
                  </span>
                  <span className="ng-supply-card-body">
                    <span className="ng-supply-card-title">{category.label}</span>
                    <span className="ng-supply-card-blurb">{category.blurb}</span>
                    <span className="ng-supply-card-cta">Shop →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Featured essentials — only complete, purchasable products */}
      <Section spacing="compact" aria-labelledby="supplies-featured">
        <Container size="xl">
          <SectionHeading
            id="supplies-featured"
            eyebrow="Studio staples"
            title="Featured florist essentials."
            action={
              <Link className="ng-link-underline" to="/collections/florist-essentials">
                View all →
              </Link>
            }
          />
          {featured.length ? (
            <div className="recommended-products-grid">
              {featured.map((product, i) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  loading={i < 4 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          ) : (
            <Text size="body">
              Our supply range is being photographed and priced for online ordering.
              In the meantime,{' '}
              <a className="ng-link-underline" href={`tel:${CONTACT.phones[0].href.replace('tel:', '')}`}>
                call us
              </a>{' '}
              or{' '}
              <Link className="ng-link-underline" to="/pages/contact">
                send your list
              </Link>{' '}
              and we’ll confirm availability.
            </Text>
          )}
        </Container>
      </Section>

      {/* Trade quantities */}
      <MerchandisingBlock
        eyebrow="Trade quantities"
        title="Buy in the quantities you actually use."
        description="Many supplies are available by the pack or case for the trade. Pack sizes are shown on each product; ask us if you need a quantity you don’t see."
        actions={
          <ButtonLink to="/collections/floral-supplies" variant="primary">
            Shop all supplies
          </ButtonLink>
        }
      />

      {/* Trade support */}
      <Section spacing="compact" aria-labelledby="supplies-trade">
        <Container size="lg">
          <SectionHeading
            id="supplies-trade"
            eyebrow="For the trade"
            title="Florists, offices and decorators."
          />
          <Text size="body">
            Florists, hotels, offices, decorators and event teams are welcome to
            contact us about volume requirements and recurring supply needs. Tell us
            what you go through and how often, and we’ll help you plan reliable
            reorders. Trade delivery schedules can be arranged separately from retail
            delivery.
          </Text>
        </Container>
      </Section>

      {/* Delivery & pickup */}
      <Section spacing="compact">
        <Container size="lg">
          <TrustGrid aria-label="Delivery and pickup">
            <TrustItem
              icon={<Icon name="clock" size="sm" />}
              label={`Same-day delivery before ${DELIVERY_CUTOFF_SHORT}`}
            />
            <TrustItem
              icon={<Icon name="map-pin" size="sm" />}
              label="Kingston & St. Andrew delivery"
            />
            <TrustItem
              icon={<Icon name="bag" size="sm" />}
              label="Warehouse pickup available"
            />
          </TrustGrid>
        </Container>
      </Section>

      {/* Contact CTA */}
      <CTA
        tone="dark"
        title="Need a supply we don’t list, or a bulk quote?"
        description={`Call ${CONTACT.phones[0].display}, WhatsApp us, or email ${CONTACT.email}. Visit us at ${CONTACT.address.full}.`}
        actions={
          <>
            <ButtonLink to="/pages/contact" variant="primary">
              Contact the store
            </ButtonLink>
            <ButtonLink to="/pages/delivery-information" variant="ghost">
              Delivery information
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}

type FeaturedProduct = NonNullable<
  SuppliesFeaturedQuery['collection']
>['products']['nodes'][number];

const SUPPLIES_FEATURED_QUERY = `#graphql
  fragment SuppliesFeaturedProduct on Product {
    id
    title
    handle
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
  query SuppliesFeatured($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 8, sortKey: BEST_SELLING) {
        nodes {
          ...SuppliesFeaturedProduct
        }
      }
    }
  }
` as const;
