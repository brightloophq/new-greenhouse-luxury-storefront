import type {MetaFunction} from 'react-router';
import {SuppliesLanding} from '~/components/supplies/SuppliesLanding';

export const meta: MetaFunction = () => [
  {title: 'Florist Supplies | The New Greenhouse'},
];

/** The editorial supplies department landing (guest, no account needed). */
export default function SuppliesIndex() {
  return <SuppliesLanding />;
}
