import type {MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {OCCASIONS} from '~/lib/catalogues';

export const meta: MetaFunction = () => [
  {title: 'Arrangements by Occasion | The New Greenhouse'},
];

/** Occasion selector — stays green. */
export default function OccasionIndex() {
  return (
    <div className="home--general">
      <PathwaySelector
        id="occasion"
        eyebrow="Arrangements"
        title="By occasion"
        back={{to: '/arrangements', label: 'Arrangements'}}
        columns={3}
        items={OCCASIONS.map((o) => ({
          label: o.label,
          to: `/arrangements/occasion/${o.slug}`,
          img: o.img,
        }))}
      />
    </div>
  );
}
