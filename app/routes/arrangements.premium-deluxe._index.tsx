import type {MetaFunction} from 'react-router';
import {ArrangementsGallery} from '~/components/arrangements/ArrangementsGallery';
import {PREMIUM_CATEGORIES} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Premium / Deluxe | The New Greenhouse'},
];

/** Short lead-in per premium category. */
const KICKER: Record<string, string> = {
  handcrafted: 'Made by hand',
  vase: 'Vessel & bloom',
  'heart-box': 'The gesture',
};
const BLURB: Record<string, string> = {
  handcrafted: 'Couture arrangements built stem by stem — our most exacting work.',
  vase: 'Statement flowers arranged in a vessel worth keeping.',
  'heart-box': 'Signature blooms in the heart box — romance, boxed.',
};

/**
 * Premium / Deluxe room — the same gallery, elevated. The elevated theme is
 * resolved by `themeForPath` (this branch renders under data-experience=deluxe),
 * so `.ng-arr` picks up the deluxe palette; no separate identity or navigation.
 */
export default function PremiumDeluxeIndex() {
  const items = PREMIUM_CATEGORIES.map((c) => ({
    label: c.label,
    to: `/arrangements/premium-deluxe/${c.slug}`,
    img: c.img,
    kicker: KICKER[c.slug] ?? '',
    blurb: BLURB[c.slug] ?? '',
  }));

  return (
    <ArrangementsGallery
      eyebrow="Arrangements · premium / deluxe"
      titleId="ng-arr-title"
      title={
        <>
          The <em className="ng-flourish">deluxe</em> room
        </>
      }
      lede="The most considered corner of the greenhouse — couture blooms, statement vessels, and the heart box."
      back={{to: '/arrangements', label: 'Arrangements'}}
      items={items}
      cue="Enter"
      sizes="(min-width: 64em) 32vw, (min-width: 45em) 46vw, 92vw"
      xsell={{
        to: '/arrangements/mixed',
        linkLabel: (
          <>
            See mixed <span aria-hidden="true">→</span>
          </>
        ),
        children: (
          <>
            <b>Looking for the everyday?</b> Our mixed arrangements are made fresh
            daily.
          </>
        ),
      }}
    />
  );
}
