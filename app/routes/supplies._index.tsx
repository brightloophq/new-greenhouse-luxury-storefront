import {type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {SuppliesLanding} from '~/components/supplies/SuppliesLanding';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/supplies',
    title: 'Florist Supplies | The New Greenhouse',
    description:
      'Florist supplies from The New Greenhouse in Kingston, Jamaica — vases, tools and materials for arranging and presenting fresh flowers, for retail and trade.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Supplies', path: '/supplies'},
    ],
  });

/** Origin only — powers the absolute self-canonical for this landing page. */
export async function loader({request}: LoaderFunctionArgs) {
  return {origin: new URL(request.url).origin};
}

/** The editorial supplies department landing (guest, no account needed). */
export default function SuppliesIndex() {
  return <SuppliesLanding />;
}
