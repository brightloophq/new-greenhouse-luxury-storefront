import {useRef} from 'react';
import {cardImage} from '~/lib/catalogues';
import {useReveal} from '~/lib/useReveal';

/**
 * The OPTIONAL Business Account invitation shown on the public /wholesale page.
 *
 * Wholesale shopping is open to everyone — no account is required to browse or
 * buy (name + email are captured at Shopify checkout). This section is a
 * separate, optional path: businesses that order regularly can open a Business
 * Account so The New Greenhouse can recognise the relationship and extend
 * eligible benefits (special pricing, offers) as they become available. It never
 * gates purchasing, and it promises no specific discount.
 *
 * (Formerly `WholesaleGate` — a sign-in wall — now an invite, not a gate.)
 */
const INVITE_IMG = '/images/collections/wholesale-flowers';
const BENEFITS = [
  'A recognised business relationship with The New Greenhouse',
  'Eligibility for special pricing, offers and business benefits as they become available',
  'One saved business profile for your ongoing orders',
];

export function BusinessAccountInvite() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const media = cardImage(INVITE_IMG);

  return (
    <section
      ref={scope}
      className="ng-trade-gate ng-trade-gate--invite"
      aria-labelledby="ng-business-invite-title"
    >
      <div className="ng-trade-gate-inner">
        <div className="ng-trade-gate-body" data-reveal-heading>
          <p className="ng-trade-gate-eyebrow">Business Account · optional</p>
          <h2
            id="ng-business-invite-title"
            className="ng-trade-gate-title ng-editorial-title"
          >
            Buy for your business regularly?
          </h2>
          <p className="ng-trade-gate-lead">
            Wholesale is open to everyone — shop by the bunch or the box with no
            account needed. If you run a florist, event, hospitality or corporate
            business and order regularly, open a Business Account so we can
            recognise your business and extend eligible benefits over time.
          </p>
          <div className="ng-trade-gate-actions">
            {/* /account/login is Shopify OAuth — create an account or sign in;
                afterwards the customer completes their business profile at
                /account/wholesale-profile. */}
            <a className="ng-trade-btn" href="/account/login">
              Create a business account
            </a>
            <a className="ng-trade-btn ng-trade-btn--ghost" href="/account/login">
              Sign in
            </a>
          </div>
          <ul className="ng-trade-gate-perks">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
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
    </section>
  );
}
