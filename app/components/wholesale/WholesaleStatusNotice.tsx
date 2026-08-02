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
 *
 * Presentation only: it reuses the storefront's trade-gate layout, tokens and
 * reveal animation so it reads as the same room as the signed-out gate.
 */
type DeniedStatus = Exclude<WholesaleDecision, 'approved'>;

interface NoticeCopy {
  eyebrow: string;
  /** Short status pill label + tone (drives the accent dot colour). */
  pill: string;
  tone: 'wait' | 'info' | 'closed';
  title: string;
  lead: string;
  /** Optional reassuring second line. */
  note?: string;
  /** Contact call-to-action for the states a customer can act on. */
  contact?: boolean;
}

const COPY: Record<DeniedStatus, NoticeCopy> = {
  pending: {
    eyebrow: 'Wholesale · application received',
    pill: 'Under review',
    tone: 'wait',
    title: 'Your application is under review',
    lead: 'Thank you for applying for a wholesale account. Our team is verifying the business details you submitted, including your CRA/TRN, to confirm your trade eligibility.',
    note: 'You’ll receive an email as soon as a decision is made — this usually takes one business day. No further action is needed from you right now.',
  },
  more_information_required: {
    eyebrow: 'Wholesale · one more step',
    pill: 'Action needed',
    tone: 'info',
    title: 'We need a little more information',
    lead: 'We’ve started reviewing your wholesale application and need a few more details before we can confirm your account. It only takes a moment to sort out.',
    note: 'Get in touch and a member of our team will help you complete your application.',
    contact: true,
  },
  rejected: {
    eyebrow: 'Wholesale · application update',
    pill: 'Not approved',
    tone: 'closed',
    title: 'We couldn’t approve this application',
    lead: 'Thank you for your interest in a wholesale account with The New Greenhouse. After reviewing your submission, we’re unable to open a trade account at this time.',
    note: 'If your circumstances have changed or you believe this was a mistake, we’d be glad to take another look — please reach out.',
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
          <p className={`ng-trade-status-pill ng-trade-status-pill--${copy.tone}`}>
            <span className="ng-trade-status-dot" aria-hidden="true" />
            {copy.pill}
          </p>
          <h1
            id="ng-trade-notice-title"
            className="ng-trade-gate-title ng-editorial-title"
          >
            {copy.title}
          </h1>
          <p className="ng-trade-gate-lead">{copy.lead}</p>
          {copy.note ? <p className="ng-trade-gate-note">{copy.note}</p> : null}
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
