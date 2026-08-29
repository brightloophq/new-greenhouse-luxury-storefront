import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {WholesaleGate} from '~/components/wholesale/WholesaleGate';
import {WholesaleStatusNotice} from '~/components/wholesale/WholesaleStatusNotice';
import {getWholesaleAccess} from '~/lib/wholesale';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/wholesale',
    title: 'Wholesale Flowers for Florists & Trade | The New Greenhouse',
    description:
      'Wholesale flowers and florist supplies from The New Greenhouse in Kingston, Jamaica, for florists, event professionals and trade partners. Approved trade accounts sign in for pricing.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Wholesale', path: '/wholesale'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  const {access, firstName} = await getWholesaleAccess(context.customerAccount);
  return {
    access,
    firstName: firstName ?? null,
    origin: new URL(request.url).origin,
  };
}

/**
 * Wholesale entry. Signed-out shoppers see the sign-in / create-account gate.
 * Signed-in customers see the catalogue selector only once the owner has set
 * their `custom.wholesale_status` to "approved"; every other state (pending,
 * rejected, more_information_required, or blank) shows the matching notice.
 */
export default function WholesaleIndex() {
  const {access, firstName} = useLoaderData<typeof loader>();

  if (access === 'guest') {
    return <WholesaleGate />;
  }

  if (access !== 'approved') {
    return <WholesaleStatusNotice status={access} />;
  }

  return (
    <div className="home--general">
      {firstName ? (
        <p className="ng-wholesale-welcome">
          Welcome back, <b>{firstName}</b> — your wholesale workspace is open.
        </p>
      ) : null}
      <PathwaySelector
        id="wholesale"
        eyebrow="Wholesale"
        title="Shop wholesale"
        back={{to: '/', label: 'Home'}}
        columns={2}
        items={[
          {label: 'Flowers', to: '/wholesale/flowers', img: '/images/collections/wholesale-flowers'},
          {label: 'Supplies', to: '/wholesale/supplies', img: '/images/homepage/supplies'},
        ]}
      />
    </div>
  );
}
