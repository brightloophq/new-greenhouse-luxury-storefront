import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

/** The storefront-controlled account area — Shopify's hosted screens are not
 *  touched. Scaffold markup (inline styles, <br> spacing, entity separators)
 *  is gone; presentation lives in app/styles/account.css. */
const ACCOUNT_NAV = [
  {to: '/account/orders', label: 'Orders'},
  {to: '/account/profile', label: 'Account details'},
  {to: '/account/addresses', label: 'Addresses'},
  {to: '/account/wholesale-profile', label: 'Business profile'},
  {to: '/classic/wholesale', label: 'Wholesale dashboard'},
];

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  return (
    <div className="ng-account">
      <header className="ng-account-masthead">
        <p className="ng-account-eyebrow">Your account</p>
        <h1 className="ng-account-title ng-editorial-title">
          {customer?.firstName ? `Welcome, ${customer.firstName}` : 'Welcome back'}
        </h1>
        <p className="ng-account-meta">
          Orders, addresses and trade details — all in one place.
        </p>
      </header>

      <div className="ng-account-body">
        <AccountMenu />
        <div className="ng-account-panel">
          <Outlet context={{customer}} />
        </div>
      </div>
    </div>
  );
}

function AccountMenu() {
  return (
    <nav className="ng-account-nav" aria-label="Account">
      <ul className="ng-account-nav-list">
        {ACCOUNT_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              prefetch="intent"
              className={({isActive}) =>
                isActive ? 'ng-account-nav-link is-active' : 'ng-account-nav-link'
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <Logout />
    </nav>
  );
}

/** POSTs to the existing logout action, which revokes the Shopify session and
 *  clears the cookie — the storefront adds no session handling of its own. */
function Logout() {
  return (
    <Form className="ng-account-logout" method="POST" action="/account/logout">
      <button type="submit" className="ng-account-logout-btn">
        Sign out
      </button>
    </Form>
  );
}
