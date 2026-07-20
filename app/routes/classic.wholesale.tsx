import {Link, data, useLoaderData} from 'react-router';
import type {WholesaleFeaturedQuery} from 'storefrontapi.generated';
import type {Route} from './+types/classic.wholesale';
import {
  ButtonLink,
  Card,
  CardBody,
  Container,
  Grid,
  Heading,
  Icon,
  Section,
  SectionHeading,
  Text,
  TrustGrid,
  TrustItem,
  CTA,
} from '~/components/ui';
import {CollectionHero, MerchandisingBlock} from '~/components/catalog/CollectionHero';
import {FlowerCategoryGrid} from '~/components/catalog/FlowerCategoryGrid';
import {ProductItem} from '~/components/ProductItem';
import {WholesaleGate} from '~/components/wholesale/WholesaleGate';
import {experienceCookie} from '~/lib/experience';
import {getWholesaleAccess} from '~/lib/wholesale';
import {DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';

/** Live colour collections for the shop-by-colour rail. */
const COLOURS: {label: string; to: string}[] = [
  {label: 'White & Ivory', to: '/collections/white-and-ivory'},
  {label: 'Red', to: '/collections/red'},
  {label: 'Pink', to: '/collections/pink'},
  {label: 'Yellow & Orange', to: '/collections/yellow-and-orange'},
  {label: 'Purple', to: '/collections/purple'},
  {label: 'Green', to: '/collections/green-flowers'},
];

const ORDER_STEPS = [
  {
    title: 'Browse & build your list',
    body: 'Shop by variety, colour or the wholesale collections — everything is priced by the bunch or box for the trade.',
  },
  {
    title: 'Place your order',
    body: 'Add stems and supplies to one cart and check out, or send your list and we confirm availability and pricing.',
  },
  {
    title: 'Collect or get it delivered',
    body: `Same-day delivery across Kingston & St. Andrew for orders before ${DELIVERY_CUTOFF_SHORT}, or arrange warehouse pickup.`,
  },
];

export const meta: Route.MetaFunction = () => [
  {title: 'Wholesale Flowers by the Box | The New Greenhouse Jamaica'},
  {
    name: 'description',
    content:
      'Wholesale flowers, greenery and fillers by the bunch or box for florists, planners, hotels and event teams across Jamaica. Fresh, graded stems delivered from Kingston.',
  },
  {tagName: 'link', rel: 'canonical', href: '/classic/wholesale'},
];

export async function loader({context}: Route.LoaderArgs) {
  // Wholesale is trade-only: gate on authentication + merchant approval.
  const {access, firstName} = await getWholesaleAccess(context.customerAccount);

  // Signed-in trade accounts load (and see) the wholesale catalogue.
  let featured: FeaturedProduct[] = [];
  if (access === 'authenticated') {
    try {
      const result = await context.storefront.query(WHOLESALE_FEATURED_QUERY, {
        variables: {handle: 'bulk-flowers'},
      });
      featured = result.collection?.products?.nodes ?? [];
    } catch (error) {
      console.error('classic/wholesale featured products failed', error);
    }
  }

  // Landing in the Classic experience persists the wholesale (green) mode.
  return data(
    {access, firstName: firstName ?? null, featured},
    {headers: {'Set-Cookie': experienceCookie('classic')}},
  );
}

export default function ClassicWholesale() {
  const {access, firstName, featured} = useLoaderData<typeof loader>();

  // Trade gate — guests must sign in / create an account first.
  if (access !== 'authenticated') {
    return (
      <div className="ng-experience ng-experience--classic">
        <WholesaleGate />
      </div>
    );
  }

  return (
    <div className="ng-experience ng-experience--classic">
      {firstName ? (
        <p className="ng-wholesale-welcome">
          Welcome back, {firstName} — you’re signed in to trade pricing.
        </p>
      ) : null}
      <CollectionHero
        eyebrow="Wholesale & Trade"
        title="Wholesale flowers by the box."
        description="Fresh, graded stems by the bunch or box — plus greenery, fillers and everything a florist, planner or venue needs, delivered across Jamaica."
        breadcrumbs={[
          {label: 'Home', to: '/'},
          {label: 'Wholesale Flowers'},
        ]}
      />

      {/* Intro / explanation */}
      <Section spacing="compact">
        <Container size="lg">
          <SectionHeading
            align="center"
            eyebrow="For the trade"
            title="Trade pricing, dependable supply."
            description="For 40+ years The New Greenhouse has supplied Jamaica’s florists, event planners, hotels and restaurants with fresh stems and greenery by the box — consistent quality, ordered your way."
            action={
              <ButtonLink to="/collections/bulk-flowers" variant="primary">
                Shop all wholesale flowers
              </ButtonLink>
            }
          />
        </Container>
      </Section>

      {/* Category grid — the 25 approved varieties, funnelling into bulk-flowers */}
      <Section spacing="compact" aria-labelledby="wholesale-varieties">
        <Container size="xl">
          <SectionHeading
            id="wholesale-varieties"
            eyebrow="Shop by variety"
            title="Order by the flower you need."
          />
          <FlowerCategoryGrid collectionHandle="bulk-flowers" />
        </Container>
      </Section>

      {/* Featured wholesale products */}
      <Section spacing="compact" aria-labelledby="wholesale-featured">
        <Container size="xl">
          <SectionHeading
            id="wholesale-featured"
            eyebrow="In stock now"
            title="Trade favourites, ready to order."
            action={
              <Link className="ng-link-underline" to="/collections/bulk-flowers">
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
              Fresh stock is updated regularly.{' '}
              <Link className="ng-link-underline" to="/collections/bulk-flowers">
                Browse the full wholesale range →
              </Link>
            </Text>
          )}
        </Container>
      </Section>

      {/* Shop by colour */}
      <Section spacing="compact" aria-labelledby="wholesale-colour">
        <Container size="xl">
          <SectionHeading
            id="wholesale-colour"
            eyebrow="Shop by colour"
            title="Match your palette."
          />
          <div className="greenhouse-occasion-grid">
            {COLOURS.map((colour) => (
              <Link key={colour.to} to={colour.to}>
                <span>{colour.label}</span>
                <small>Shop</small>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Greenery & fillers + supplies cross-sell */}
      <MerchandisingBlock
        eyebrow="Every build"
        title="Greenery, fillers & florist supplies."
        description="Complete the order with fresh greenery and fillers, plus vases, ribbon, tools and packaging — all in one delivery."
        actions={
          <>
            <ButtonLink to="/collections/greenery-and-fillers" variant="primary">
              Greenery & fillers
            </ButtonLink>
            <ButtonLink to="/classic/supplies" variant="secondary">
              Floral supplies
            </ButtonLink>
          </>
        }
      />

      {/* How wholesale ordering works */}
      <Section spacing="compact" aria-labelledby="wholesale-ordering">
        <Container size="xl">
          <SectionHeading
            id="wholesale-ordering"
            align="center"
            eyebrow="How it works"
            title="Wholesale ordering, made simple."
          />
          <Grid cols={3}>
            {ORDER_STEPS.map((step, i) => (
              <Card key={step.title} variant="feature">
                <CardBody>
                  <span className="ng-section-heading-eyebrow">
                    Step {i + 1}
                  </span>
                  <Heading as={3} size="h4">
                    {step.title}
                  </Heading>
                  <Text size="small">{step.body}</Text>
                </CardBody>
              </Card>
            ))}
          </Grid>
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

      {/* Wholesale help CTA */}
      <CTA
        tone="dark"
        title="Need a hand with a wholesale order?"
        description="Tell us what your studio, event or venue needs and we’ll confirm availability, pricing and delivery."
        actions={
          <ButtonLink to="/pages/contact" variant="primary">
            Contact the wholesale team
          </ButtonLink>
        }
      />
    </div>
  );
}

type FeaturedProduct = NonNullable<
  WholesaleFeaturedQuery['collection']
>['products']['nodes'][number];

const WHOLESALE_FEATURED_QUERY = `#graphql
  fragment WholesaleFeaturedProduct on Product {
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
  query WholesaleFeatured($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 8, sortKey: BEST_SELLING) {
        nodes {
          ...WholesaleFeaturedProduct
        }
      }
    }
  }
` as const;
