import type {MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';

export const meta: MetaFunction = () => [
  {title: 'Arrangements | The New Greenhouse'},
  {
    name: 'description',
    content:
      'Hand-crafted floral arrangements — premium/deluxe, mixed bouquets and by occasion.',
  },
];

/**
 * Arrangements selector — STAYS GREEN. Exactly three pathways; the premium
 * theme only activates after Premium / Deluxe is chosen.
 */
export default function ArrangementsIndex() {
  return (
    <div className="home--general">
      <PathwaySelector
        id="arrangements"
        eyebrow="Arrangements"
        title="Arrangements"
        back={{to: '/', label: 'Home'}}
        columns={3}
        items={[
          {
            label: 'Premium / Deluxe',
            to: '/arrangements/premium-deluxe',
            img: '/images/collections/signature-collection',
          },
          {
            label: 'Mixed',
            to: '/arrangements/mixed',
            img: '/images/collections/all-flowers',
          },
          {
            label: 'Occasion',
            to: '/arrangements/occasion',
            img: '/images/occasions/birthday',
          },
        ]}
      />
    </div>
  );
}
