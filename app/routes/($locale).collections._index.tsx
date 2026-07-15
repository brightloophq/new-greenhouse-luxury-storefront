import type {ReactNode} from 'react';
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {Section, Container, Grid, CollectionCard} from '~/components/ui';
import {CollectionHero} from '~/components/catalog/CollectionHero';
import {getExperienceFromRequest} from '~/lib/experience';
import {DELUXE_COLLECTION_ORDER} from '~/lib/experienceClassify';
import {collectionCardImage} from '~/lib/collectionImages';

export const meta: Route.MetaFunction = ({data}) => {
  if (data?.experience === 'deluxe') {
    return [
      {title: 'Shop by Occasion | The New Greenhouse'},
      {
        name: 'description',
        content:
          'Explore luxury floral collections for every occasion — anniversary, birthday, romance, sympathy, congratulations and signature bouquets — hand-delivered across Kingston by The New Greenhouse.',
      },
    ];
  }
  return [
    {title: 'Shop Flowers by Collection | The New Greenhouse'},
    {
      name: 'description',
      content:
        'Browse wholesale and retail floral collections — bulk stems, greenery, supplies, bouquets and gifting — from The New Greenhouse in Kingston, Jamaica.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const experience = getExperienceFromRequest(request);

  // Classic has NO generic collection directory (Part 3/19). The Classic journey
  // is Home → Wholesale Flowers / Floral Supplies — never a long list of Shopify
  // collections. Send Classic (and the classic-default no-cookie case) straight
  // to the Wholesale Flowers hub; Floral Supplies is one nav click away.
  if (experience !== 'deluxe') {
    throw redirect('/classic/wholesale');
  }

  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY),
  ]);

  // Deluxe shows ONLY the curated allow-list, filtered server-side so wholesale
  // collections never reach the Deluxe client (not even the serialized payload).
  const nodes = DELUXE_COLLECTION_ORDER.map((handle) =>
    collections.nodes.find((c) => c.handle === handle),
  ).filter((c): c is CollectionFragment => Boolean(c));

  return {nodes, experience};
}

export default function Collections() {
  const {nodes, experience} = useLoaderData<typeof loader>();
  const deluxe = experience === 'deluxe';

  return (
    <div className="ng-catalog-page ng-catalog-index">
      <CollectionHero
        breadcrumbs={[{label: 'Home', to: '/'}, {label: 'Collections'}]}
        eyebrow={deluxe ? 'Shop by occasion' : 'Browse the house'}
        title={deluxe ? 'The luxury collection' : 'Shop flowers by collection'}
        description={
          deluxe
            ? 'Hand-composed arrangements for every occasion — anniversary, romance, birthday, sympathy and our signature bouquets — gift-ready and delivered with a personal touch.'
            : 'Curated collections for gifting, weddings, sympathy, corporate spaces and wholesale ordering — the full house of The New Greenhouse.'
        }
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
  // Prefer the bespoke local card image (unique per collection, always present);
  // fall back to the Shopify collection image, then an elegant placeholder.
  const local = collectionCardImage(collection.handle);
  const sizes = '(min-width: 64em) 30vw, (min-width: 45em) 45vw, 100vw';
  let media: React.ReactNode;
  if (local) {
    media = (
      <img
        className="ng-collection-card-img"
        src={local.src}
        srcSet={local.srcSet}
        sizes={sizes}
        alt={collection.title}
        loading={index < 4 ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  } else if (collection.image) {
    media = (
      <Image
        alt={collection.image.altText || collection.title}
        aspectRatio="16/10"
        data={collection.image}
        loading={index < 4 ? 'eager' : 'lazy'}
        sizes={sizes}
      />
    );
  } else {
    media = <div className="ng-catalog-card-noimg" aria-hidden="true" />;
  }

  return (
    <CollectionCard
      href={`/collections/${collection.handle}`}
      title={collection.title}
      eyebrow="Collection"
      description={collection.description || undefined}
      media={media}
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
