import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {Section, Container, Grid, CollectionCard} from '~/components/ui';
import {CollectionHero} from '~/components/catalog/CollectionHero';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Shop Flowers by Collection | The New Greenhouse'},
    {
      name: 'description',
      content:
        'Browse luxury and wholesale floral collections — bouquets, weddings, sympathy, corporate, plants and gifting — from The New Greenhouse in Kingston, Jamaica.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY),
  ]);
  return {collections};
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();
  const nodes = collections.nodes.filter(
    (c) => c.handle !== 'frontpage',
  );

  return (
    <div className="ng-catalog-page ng-catalog-index">
      <CollectionHero
        breadcrumbs={[
          {label: 'Home', to: '/'},
          {label: 'Collections'},
        ]}
        eyebrow="Browse the house"
        title="Shop flowers by collection"
        description="Curated collections for gifting, weddings, sympathy, corporate spaces and wholesale ordering — the full house of The New Greenhouse."
      />
      <Section spacing="standard">
        <Container size="xl">
          <Grid cols={3}>
            {nodes.map((collection, index) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                index={index}
              />
            ))}
          </Grid>
        </Container>
      </Section>
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <CollectionCard
      href={`/collections/${collection.handle}`}
      title={collection.title}
      eyebrow="Collection"
      description={collection.description || undefined}
      media={
        collection.image ? (
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="16/10"
            data={collection.image}
            loading={index < 4 ? 'eager' : 'lazy'}
            sizes="(min-width: 64em) 30vw, (min-width: 45em) 45vw, 100vw"
          />
        ) : (
          <div className="ng-catalog-card-noimg" aria-hidden="true" />
        )
      }
    />
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    description
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections(first: 50, sortKey: TITLE) {
      nodes {
        ...Collection
      }
    }
  }
` as const;
