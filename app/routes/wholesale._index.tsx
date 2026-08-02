import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {WholesaleGate} from '~/components/wholesale/WholesaleGate';
import {WholesaleStatusNotice} from '~/components/wholesale/WholesaleStatusNotice';
import {getWholesaleAccess} from '~/lib/wholesale';

export const meta: MetaFunction = () => [
  {title: 'Wholesale | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  const {access, firstName} = await getWholesaleAccess(context.customerAccount);
  return {access, firstName: firstName ?? null};
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
