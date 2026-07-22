import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {WholesaleGate} from '~/components/wholesale/WholesaleGate';
import {getWholesaleAccess} from '~/lib/wholesale';

export const meta: MetaFunction = () => [
  {title: 'Wholesale | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  const {access, firstName} = await getWholesaleAccess(context.customerAccount);
  return {access, firstName: firstName ?? null};
}

/**
 * Wholesale entry. Signed-out shoppers see the sign-in / create-account gate
 * (the homepage card opens the modal directly). Signed-in customers get
 * immediate access — no approval — and choose Flowers or Supplies.
 */
export default function WholesaleIndex() {
  const {access, firstName} = useLoaderData<typeof loader>();

  if (access !== 'authenticated') {
    return <WholesaleGate />;
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
