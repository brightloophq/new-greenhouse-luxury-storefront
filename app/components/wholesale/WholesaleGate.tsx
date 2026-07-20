import {Link} from 'react-router';
import type {WholesaleAccess} from '~/lib/wholesale';

/**
 * Wholesale access gate shown when the shopper is not an approved trade account.
 *   guest   → invite to sign in / apply
 *   pending → signed in, approval not yet granted → invite to contact
 * Bright, botanical and welcoming — consistent with the general storefront.
 */
export function WholesaleGate({
  access,
}: {
  access: Exclude<WholesaleAccess, 'approved'>;
}) {
  const guest = access === 'guest';
  return (
    <section className="ng-wsgate" aria-labelledby="ng-wsgate-title">
      <div className="ng-wsgate-inner">
        <p className="ng-wsgate-eyebrow">Wholesale · For the trade</p>
        <h1 id="ng-wsgate-title" className="ng-wsgate-title">
          {guest
            ? 'Sign in to shop wholesale'
            : 'Your wholesale access is on the way'}
        </h1>
        <p className="ng-wsgate-body">
          {guest
            ? 'Our wholesale store is reserved for florists, event planners, hotels and venues. Sign in to your trade account for wholesale pricing and ordering by the box — or apply for an account and our team will set you up.'
            : 'Thanks for signing in. Your account isn’t approved for wholesale pricing yet — our team reviews every trade application personally. Reach out and we’ll activate your wholesale access.'}
        </p>

        <div className="ng-wsgate-actions">
          {guest ? (
            <>
              {/* Full navigation — /account/login redirects to Shopify sign-in. */}
              <a className="ng-wsgate-btn" href="/account/login">
                Sign in
              </a>
              <Link
                className="ng-wsgate-btn ng-wsgate-btn--ghost"
                to="/pages/contact"
              >
                Apply for a trade account
              </Link>
            </>
          ) : (
            <>
              <Link className="ng-wsgate-btn" to="/pages/contact">
                Request wholesale access
              </Link>
              <Link
                className="ng-wsgate-btn ng-wsgate-btn--ghost"
                to="/collections/all-flowers"
              >
                Browse retail instead
              </Link>
            </>
          )}
        </div>

        <ul className="ng-wsgate-perks">
          <li>Trade pricing by the bunch &amp; box</li>
          <li>Same-day delivery across Kingston &amp; St. Andrew</li>
          <li>Consistent, graded fresh stems — 40+ years supplying Jamaica</li>
        </ul>
      </div>
    </section>
  );
}
