import {type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {ArrangementsGallery} from '~/components/arrangements/ArrangementsGallery';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/arrangements',
    title: 'Flower Arrangements | The New Greenhouse',
    description:
      'Hand-crafted floral arrangements from The New Greenhouse in Kingston, Jamaica — premium and deluxe, mixed bouquets and arrangements by occasion.',
  });

/** Origin only — powers the absolute self-canonical for this landing page. */
export async function loader({request}: LoaderFunctionArgs) {
  return {origin: new URL(request.url).origin};
}

/**
 * Arrangements hub — the signature gallery. STAYS GREEN; the premium theme only
 * activates once Premium / Deluxe is chosen. Three curated ways into the craft.
 */
const PATHS = [
  {
    label: 'Premium / Deluxe',
    to: '/arrangements/premium-deluxe',
    img: '/images/collections/signature-collection',
    kicker: 'The signature room',
    blurb:
      'Our most considered work — couture blooms and statement vessels, made to be remembered.',
  },
  {
    label: 'Mixed',
    to: '/arrangements/mixed',
    img: '/images/collections/all-flowers',
    kicker: 'Daily beauty',
    blurb:
      'Seasonal hand-tied arrangements for the everyday — expressive, generous, never the same twice.',
  },
  {
    label: 'Occasion',
    to: '/arrangements/occasion',
    img: '/images/occasions/birthday',
    kicker: 'For the moment',
    blurb:
      'Flowers chosen for the day they mark — birthdays, romance, sympathy and more.',
  },
];

export default function ArrangementsIndex() {
  return (
    <ArrangementsGallery
      eyebrow="Arrangements · the signature"
      titleId="ng-arr-title"
      title={
        <>
          The floral <em className="ng-flourish">gallery</em>
        </>
      }
      lede="Three ways into our craft — the signature deluxe room, the daily-beauty of mixed bouquets, and flowers composed for the occasions that matter."
      back={{to: '/', label: 'Home'}}
      items={PATHS}
      sizes="(min-width: 64em) 32vw, (min-width: 45em) 46vw, 92vw"
    />
  );
}
