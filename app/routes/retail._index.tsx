import {type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {RetailLanding} from '~/components/retail/RetailLanding';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/retail',
    title: 'Shop Retail Flowers & Supplies | The New Greenhouse',
    description:
      'Shop retail from The New Greenhouse in Kingston, Jamaica — fresh flowers, hand-crafted arrangements and florist supplies, with guest checkout.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Retail', path: '/retail'},
    ],
  });

/** Origin only — powers the absolute self-canonical for this landing page. */
export async function loader({request}: LoaderFunctionArgs) {
  return {origin: new URL(request.url).origin};
}

/** Retail landing — editorial department split, green, guest checkout. */
export default function RetailIndex() {
  return (
    <div className="home--general">
      <RetailLanding />
    </div>
  );
}
