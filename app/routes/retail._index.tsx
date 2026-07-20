import type {MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';

export const meta: MetaFunction = () => [
  {title: 'Retail | The New Greenhouse'},
];

/** Retail selector — exactly two choices, green, guest checkout. */
export default function RetailIndex() {
  return (
    <div className="home--general">
      <PathwaySelector
        id="retail"
        eyebrow="Retail"
        title="Shop retail"
        back={{to: '/', label: 'Home'}}
        columns={2}
        items={[
          {label: 'Flowers', to: '/retail/flowers', img: '/images/homepage/retail'},
          {label: 'Supplies', to: '/retail/supplies', img: '/images/homepage/supplies'},
        ]}
      />
    </div>
  );
}
