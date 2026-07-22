import type {MetaFunction} from 'react-router';
import {ArrangementsGallery} from '~/components/arrangements/ArrangementsGallery';
import {OCCASIONS} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Arrangements by Occasion | The New Greenhouse'},
];

/** Short evocative lead-in per occasion (the label carries the rest). */
const KICKER: Record<string, string> = {
  birthday: 'Many happy returns',
  romance: 'With love',
  sympathy: 'With sympathy',
  'thank-you': 'With thanks',
  'get-well': 'Get well soon',
  'new-baby': 'Welcome, little one',
};

/** Occasion exhibition — a curated room for every moment. Stays green. */
export default function OccasionIndex() {
  const items = OCCASIONS.map((o) => ({
    label: o.label,
    to: `/arrangements/occasion/${o.slug}`,
    img: o.img,
    kicker: KICKER[o.slug] ?? '',
    blurb: '',
  }));

  return (
    <ArrangementsGallery
      eyebrow="Arrangements · by occasion"
      titleId="ng-arr-title"
      title={
        <>
          For every <em className="ng-flourish">occasion</em>
        </>
      }
      lede="Flowers composed for the day they mark — step into the room that fits the moment."
      back={{to: '/arrangements', label: 'Arrangements'}}
      items={items}
      labelsOnly
      sizes="(min-width: 64em) 30vw, (min-width: 45em) 46vw, 92vw"
      xsell={{
        to: '/arrangements/mixed',
        linkLabel: (
          <>
            See mixed <span aria-hidden="true">→</span>
          </>
        ),
        children: (
          <>
            <b>Not for a set occasion?</b> Our mixed arrangements are made fresh
            every day.
          </>
        ),
      }}
    />
  );
}
