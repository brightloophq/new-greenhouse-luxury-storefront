import type {MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {PREMIUM_CATEGORIES} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Premium / Deluxe | The New Greenhouse'},
];

/** Premium category selector — elevated theme, concise, straight to product. */
export default function PremiumDeluxeIndex() {
  return (
    <PathwaySelector
      id="premium"
      eyebrow="Arrangements"
      title="Premium / Deluxe"
      back={{to: '/arrangements', label: 'Arrangements'}}
      columns={3}
      items={PREMIUM_CATEGORIES.map((c) => ({
        label: c.label,
        to: `/arrangements/premium-deluxe/${c.slug}`,
        img: c.img,
      }))}
    />
  );
}
