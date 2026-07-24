import type {MetaFunction} from 'react-router';
import {RetailLanding} from '~/components/retail/RetailLanding';

export const meta: MetaFunction = () => [
  {title: 'Retail | The New Greenhouse'},
];

/** Retail landing — editorial department split, green, guest checkout. */
export default function RetailIndex() {
  return (
    <div className="home--general">
      <RetailLanding />
    </div>
  );
}
