import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {Section, Container, Grid, CollectionCard} from '~/components/ui';
import {CollectionHero} from '~/components/catalog/CollectionHero';
import {getExperienceFromRequest} from '~/lib/experience';

/**
 * Deluxe (luxury) collection index allow-list, in curated occasion-first order.
 * The Deluxe experience shows ONLY these gifting/occasion/signature collections —
 * never the wholesale supply collections (bulk-flowers, floral-supplies, vases,
 * ribbon, greenery, all-flowers…) or the empty legacy duplicates. Handles not
 * present in the store are simply skipped. Classic keeps the full catalogue.
 */
const DELUXE_COLLECTION_ORDER = [
  'best-sellers',
  'luxury-bouquets',
  'signature-collection',
  'anniversary',
  'birthday',
  'love-and-romance',
  'sympathy-and-funeral',
  'congratulations',
  'thank-you',
  'get-well',
  'new-baby',
  'corporate-gifting',
  'bridal-bouquets',
  'seasonal-deluxe',
  'orchids',
  'roses',
  'same-day-delivery',
  'add-ons',
  'centerpieces',
];
const DELUXE_ALLOW = new Set(DELUXE_COLLECTION_ORDER);

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
  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY),
  ]);

  // Filter server-side so wholesale collections/copy never reach the Deluxe
  // client at all (not even in the serialized loader payload).
  const nodes =
    experience === 'deluxe'
      ? DELUXE_COLLECTION_ORDER.map((handle) =>
          collections.nodes.find((c) => c.handle === handle),
        ).filter((c): c is CollectionFragment => Boolean(c))
      : collections.nodes.filter((c) => c.handle !== 'frontpage');

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
