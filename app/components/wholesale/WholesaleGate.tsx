import {Link} from 'react-router';

/**
 * Wholesale gate shown on a direct visit to the trade area by a signed-out
 * shopper. Signed-in customers get immediate access (no approval), so there is
 * no "pending" state. Bright, botanical and welcoming.
 */
export function WholesaleGate() {
  return (
    <section className="ng-wsgate" aria-labelledby="ng-wsgate-title">
      <div className="ng-wsgate-inner">
        <p className="ng-wsgate-eyebrow">Wholesale · For the trade</p>
        <h1 id="ng-wsgate-title" className="ng-wsgate-title">
          Sign in to shop wholesale
        </h1>
        <p className="ng-wsgate-body">
          Wholesale pricing is for florists, event planners, hotels and venues.
          Sign in or create a business account to shop wholesale flowers and
          supplies — access is immediate.
        </p>

        <div className="ng-wsgate-actions">
          {/* Full navigation — /account/login redirects to Shopify sign-in. */}
          <a className="ng-wsgate-btn" href="/account/login">
            Sign in
          </a>
          <a className="ng-wsgate-btn ng-wsgate-btn--ghost" href="/account/login">
            Create wholesale account
          </a>
        </div>

        <ul className="ng-wsgate-perks">
          <li>Trade pricing by the bunch &amp; box</li>
          <li>Same-day delivery across Kingston &amp; St. Andrew</li>
          <li>Consistent, graded fresh stems — 40+ years supplying Jamaica</li>
        </ul>

        <p className="ng-wsgate-body" style={{marginTop: '2rem'}}>
          <Link to="/">Back to The New Greenhouse</Link>
        </p>
      </div>
    </section>
  );
}
