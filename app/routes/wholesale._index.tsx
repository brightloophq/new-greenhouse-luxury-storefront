import {useLoaderData, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {PathwaySelector} from '~/components/nav/PathwaySelector';
import {BusinessAccountInvite} from '~/components/wholesale/BusinessAccountInvite';
import {WholesaleStatusNotice} from '~/components/wholesale/WholesaleStatusNotice';
import {getWholesaleAccess} from '~/lib/wholesale';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/wholesale',
    title: 'Wholesale Flowers for Florists & Trade | The New Greenhouse',
    description:
      'Wholesale flowers and florist supplies from The New Greenhouse in Kingston, Jamaica — buy by the bunch or the box, no account required. Florists, event professionals and trade partners welcome.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Wholesale', path: '/wholesale'},
    ],
  });

export async function loader({context, request}: LoaderFunctionArgs) {
  // The customer's business-account state is read ONLY to tailor the optional
  // Business Account block below — it does NOT gate the wholesale catalogue,
  // which is public to everyone (guest wholesale purchasing). `custom.wholesale_status`
  // is an eligibility flag for future benefits, never a shopping gate.
  const {access, firstName} = await getWholesaleAccess(context.customerAccount);
  return {
    access,
    firstName: firstName ?? null,
    origin: new URL(request.url).origin,
  };
}

/**
 * Wholesale entry — PUBLIC. Anyone can browse and buy wholesale (guest checkout,
 * name + email at Shopify checkout; no account, profile or approval required).
 *
 * Beneath the shop selector we show ONE optional Business Account block, chosen
 * by the signed-in customer's `custom.wholesale_status` (an eligibility flag,
 * not a gate):
 *   - guest        → an invitation to open a Business Account (optional)
 *   - approved     → a welcome + note that eligible benefits apply automatically
 *   - other states → the application-status notice (informational, non-blocking)
 */
export default function WholesaleIndex() {
  const {access, firstName} = useLoaderData<typeof loader>();

  return (
    <div className="home--general">
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

      {access === 'guest' ? (
        <BusinessAccountInvite />
      ) : access === 'approved' ? (
        <section className="ng-wholesale-account-note" aria-label="Business account">
          <p className="ng-wholesale-welcome">
            {firstName ? (
              <>
                Welcome back, <b>{firstName}</b> — your business account is active.
              </>
            ) : (
              <>Your business account is active.</>
            )}{' '}
            Any eligible business pricing, discounts and offers are applied
            automatically as they become available.
          </p>
        </section>
      ) : (
        // pending / more_information_required / rejected — informational only.
        // The wholesale catalogue above stays open regardless of this state.
        <WholesaleStatusNotice status={access} />
      )}
    </div>
  );
}
