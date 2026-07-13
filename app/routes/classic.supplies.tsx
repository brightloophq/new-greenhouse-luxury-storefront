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

/** Supply categories that map to live Shopify collections (no dead links). */
const CATEGORIES: {label: string; to: string}[] = [
  {label: 'Shop All Supplies', to: '/collections/floral-supplies'},
  {label: 'Vases & Containers', to: '/collections/vases-and-containers'},
  {label: 'Ribbon', to: '/collections/ribbon'},
  {label: 'Wrapping & Packaging', to: '/collections/wrapping-and-packaging'},
  {label: 'Tools & Accessories', to: '/collections/tools-and-accessories'},
  {label: 'Florist Essentials', to: '/collections/florist-essentials'},
];

/** Shop-by-purpose rail → nearest live supply collection. */
const PURPOSES: {label: string; to: string}[] = [
  {label: 'Arranging', to: '/collections/floral-supplies'},
  {label: 'Packaging', to: '/collections/wrapping-and-packaging'},
  {label: 'Presentation', to: '/collections/vases-and-containers'},
  {label: 'Tools', to: '/collections/tools-and-accessories'},
];

export const meta: Route.MetaFunction = () => [
  {title: 'Floral Supplies & Florist Essentials | The New Greenhouse Jamaica'},
  {
    name: 'description',
    content:
      'Vases, ribbon, wrapping, tools and florist essentials for professionals across Jamaica. Stock the studio in one delivery from The New Greenhouse, Kingston.',
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
        title="Everything the studio needs."
        description="Vases, ribbon, wrapping, tools and florist essentials — organised, practical and ready to reorder, delivered across Jamaica."
        breadcrumbs={[{label: 'Home', to: '/'}, {label: 'Floral Supplies'}]}
      />

      {/* Supply-category grid */}
      <Section spacing="compact" aria-labelledby="supplies-categories">
        <Container size="xl">
          <SectionHeading
            id="supplies-categories"
            eyebrow="Shop supplies"
            title="Browse by category."
          />
          <div className="greenhouse-occasion-grid">
            {CATEGORIES.map((category) => (
              <Link key={category.to} to={category.to}>
                <span>{category.label}</span>
                <small>Shop</small>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Featured florist essentials */}
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
              New essentials are added regularly.{' '}
              <Link className="ng-link-underline" to="/collections/floral-supplies">
                Browse all supplies →
              </Link>
            </Text>
          )}
        </Container>
      </Section>

      {/* Shop by purpose */}
      <Section spacing="compact" aria-labelledby="supplies-purpose">
        <Container size="xl">
          <SectionHeading
            id="supplies-purpose"
            eyebrow="Shop by purpose"
            title="Find it by the job."
          />
          <div className="greenhouse-occasion-grid">
            {PURPOSES.map((purpose) => (
              <Link key={purpose.label} to={purpose.to}>
                <span>{purpose.label}</span>
                <small>Shop</small>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Bulk & pack-size information */}
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

      {/* Delivery & pickup */}
      <Section spacing="compact">
        <Container size="lg">
          <TrustGrid aria-label="Delivery and pickup">
            <TrustItem
              icon={<Icon name="clock" size="sm" />}
              label="Same-day delivery before 2PM"
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

      {/* Need help sourcing CTA */}
      <CTA
        tone="dark"
        title="Looking for a supply we don’t list?"
        description="Tell us what you need to source and we’ll do our best to get it in for you."
        actions={
          <ButtonLink to="/pages/contact" variant="primary">
            Ask about sourcing
          </ButtonLink>
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
