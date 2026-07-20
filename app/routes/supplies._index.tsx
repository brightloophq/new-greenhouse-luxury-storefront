import type {MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {SUPPLY_CATEGORIES} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Florist Supplies | The New Greenhouse'},
];

/** Supply category selector — green, utility-first. */
export default function SuppliesIndex() {
  return (
    <div className="home--general">
      <PathwaySelector
        id="supplies"
        eyebrow="Supplies"
        title="Florist supplies"
        back={{to: '/', label: 'Home'}}
        columns={3}
        items={SUPPLY_CATEGORIES.map((c) => ({
          label: c.label,
          to: `/supplies/${c.slug}`,
          img: c.img,
        }))}
      />
    </div>
  );
}
