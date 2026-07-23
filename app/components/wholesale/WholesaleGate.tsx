import {useRef, useState} from 'react';
import {Link} from 'react-router';
import {AuthModal} from '~/components/auth/AuthModal';
import {cardImage} from '~/lib/catalogues';
import {useReveal} from '~/lib/useReveal';

/**
 * The signed-out /wholesale gate — the same trade invitation as the modal, given
 * a full room. Signed-in customers get immediate access (no approval, so no
 * "pending" state); this is only what a signed-out shopper sees on a direct
 * visit. The body, perks and actions are the approved wholesale copy; the auth
 * actions still hand off to /account/login.
 */
const GATE_IMG = '/images/collections/wholesale-flowers';
const PERKS = [
  'Trade pricing by the bunch & box',
  'Same-day delivery across Kingston & St. Andrew',
  'Consistent, graded fresh stems — 40+ years supplying Jamaica',
];

export function WholesaleGate() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const media = cardImage(GATE_IMG);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section ref={scope} className="ng-trade-gate" aria-labelledby="ng-trade-gate-title">
      <div className="ng-trade-gate-inner">
        <div className="ng-trade-gate-body" data-reveal-heading>
          <Link className="ng-trade-gate-back" to="/" prefetch="intent">
            <span aria-hidden="true">←</span> Back to The New Greenhouse
          </Link>
          <p className="ng-trade-gate-eyebrow">Wholesale · for the trade</p>
          <h1
            id="ng-trade-gate-title"
            className="ng-trade-gate-title ng-editorial-title"
          >
            A private trade conservatory
          </h1>
          <p className="ng-trade-gate-lead">
            Wholesale pricing is for florists, event planners, hotels and venues.
            Sign in or create a business account to shop wholesale flowers and
            supplies — access is immediate.
          </p>
          <div className="ng-trade-gate-actions">
            {/* One entry, shared with the masthead and the homepage trade card:
                the modal explains the hand-off, then /account/login redirects
                into Shopify's hosted sign-in. */}
            <button
              type="button"
              className="ng-trade-btn"
              onClick={() => setAuthOpen(true)}
            >
              Sign in to shop wholesale
            </button>
          </div>
          <ul className="ng-trade-gate-perks">
            {PERKS.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </div>

        <figure className="ng-trade-gate-media" data-reveal-item>
          <img
            src={media.src}
            srcSet={media.srcSet}
            sizes="(min-width: 60em) 40vw, 92vw"
            alt="Fresh graded stems by the box for the trade"
            loading="lazy"
            decoding="async"
            width={800}
            height={1000}
          />
        </figure>
      </div>

      <AuthModal
        open={authOpen}
        variant="wholesale"
        onClose={() => setAuthOpen(false)}
      />
    </section>
  );
}
