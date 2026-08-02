import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';
import type {WholesaleDecision} from '~/lib/wholesale';

/**
 * Shown to a signed-in customer whose wholesale application has NOT been
 * approved. The owner reviews the CRA/TRN from the notification email and sets
 * `custom.wholesale_status` in Shopify Admin; until it reads "approved" the
 * trade catalogue and its pricing stay closed and this notice explains why.
 *
 * `pending` is also the fallback for a blank/unknown status or a failed status
 * read — a customer is never shown wholesale pricing by default.
 */
type DeniedStatus = Exclude<WholesaleDecision, 'approved'>;

interface NoticeCopy {
  eyebrow: string;
  title: string;
  lead: string;
  /** Optional contact call-to-action for states the customer can act on. */
  contact?: boolean;
}

const COPY: Record<DeniedStatus, NoticeCopy> = {
  pending: {
    eyebrow: 'Wholesale · application received',
    title: 'Your application is under review',
    lead: 'Thank you for applying for a wholesale account. Our team is reviewing your business details, and we’ll confirm your trade access by email once a decision is made. This usually takes one business day.',
  },
  more_information_required: {
    eyebrow: 'Wholesale · one more step',
    title: 'We need a little more information',
    lead: 'We’ve started reviewing your wholesale application but need a few more details before we can approve your account. Please get in touch and we’ll help you complete it.',
    contact: true,
  },
  rejected: {
    eyebrow: 'Wholesale · application update',
    title: 'We couldn’t approve this application',
    lead: 'After reviewing your submission, we’re unable to open a wholesale account at this time. If you believe this was a mistake or your circumstances have changed, please contact us.',
    contact: true,
  },
};

export function WholesaleStatusNotice({status}: {status: DeniedStatus}) {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const copy = COPY[status] ?? COPY.pending;

  return (
    <section
      ref={scope}
      className="ng-trade-gate ng-trade-gate--notice"
      aria-labelledby="ng-trade-notice-title"
    >
      <div className="ng-trade-gate-inner ng-trade-gate-inner--notice">
        <div className="ng-trade-gate-body" data-reveal-heading>
          <Link className="ng-trade-gate-back" to="/" prefetch="intent">
            <span aria-hidden="true">←</span> Back to The New Greenhouse
          </Link>
          <p className="ng-trade-gate-eyebrow">{copy.eyebrow}</p>
          <h1
            id="ng-trade-notice-title"
            className="ng-trade-gate-title ng-editorial-title"
          >
            {copy.title}
          </h1>
          <p className="ng-trade-gate-lead">{copy.lead}</p>
          <div className="ng-trade-gate-actions">
            {copy.contact ? (
              <Link className="ng-trade-btn" to="/contact" prefetch="intent">
                Contact us
              </Link>
            ) : (
              <Link
                className="ng-trade-btn ng-trade-btn--ghost"
                to="/"
                prefetch="intent"
              >
                Continue browsing
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
