import {useCallback, useEffect, useRef, useState} from 'react';
import {cardImage} from '~/lib/catalogues';
import {prefersReducedMotion} from '~/lib/motion';

/**
 * Wholesale invitation modal. Opening the homepage Wholesale card surfaces this
 * immediately — no interstitial, no URL change. Shopify's Customer Account API is
 * OAuth-based, so both actions hand off to /account/login (the same server
 * redirect as before); we never collect credentials in-app.
 *
 * Presentation only: an asymmetric private room (photograph + invitation) with a
 * GSAP entrance/exit drawn from the house motion vocabulary, a focus trap, and an
 * editorial loading affordance while the hand-off opens. Reduced motion, SSR
 * visibility and focus return are all preserved.
 */
const AUTH_HREF = '/account/login';
const GATE_IMG = '/images/collections/wholesale-flowers';
const PERKS = [
  'Trade pricing by the bunch & box',
  'Fresh, graded stems — 40+ years supplying Jamaica',
  'Same-day delivery across Kingston & St. Andrew',
];

export function WholesaleAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** The element that opened the dialog — focus must return to it on close. */
  const openerRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'opening'>('idle');
  const media = cardImage(GATE_IMG);

  /** Close gracefully: reverse the entrance, then unmount via onClose. */
  const requestClose = useCallback(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel || prefersReducedMotion()) {
      onClose();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClose();
    };
    void (async () => {
      try {
        const {gsap} = await import('gsap');
        gsap.to(panel, {y: 12, opacity: 0, duration: 0.26, ease: 'power2.in'});
        gsap.to(backdrop, {opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: finish});
      } catch {
        finish();
      }
    })();
    // Safety net if the library never resolves.
    window.setTimeout(finish, 420);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    setStatus('idle');
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    // Entrance — the room opens. Content ships visible (CSS); GSAP only animates
    // when motion is allowed, and a failed chunk simply degrades to no animation.
    let ctx: {revert: () => void} | undefined;
    let cancelled = false;
    if (!prefersReducedMotion()) {
      void (async () => {
        try {
          const {gsap} = await import('gsap');
          if (cancelled) return;
          ctx = gsap.context(() => {
            const panel = panelRef.current;
            const backdrop = backdropRef.current;
            if (!panel || !backdrop) return;
            const timeline = gsap.timeline();
            timeline.fromTo(backdrop, {opacity: 0}, {opacity: 1, duration: 0.32, ease: 'power2.out'});
            timeline.fromTo(
              panel,
              {y: 24, opacity: 0},
              {y: 0, opacity: 1, duration: 0.4, ease: 'power3.out'},
              '-=0.18',
            );
            const image = panel.parentElement?.querySelector('[data-trade-media] img');
            if (image) {
              timeline.fromTo(
                image,
                {opacity: 0, scale: 1.05},
                {opacity: 1, scale: 1, duration: 0.55, ease: 'power2.out'},
                '-=0.32',
              );
            }
            const items = panel.querySelectorAll('[data-trade-item]');
            if (items.length) {
              timeline.fromTo(
                items,
                {y: 14, opacity: 0},
                {y: 0, opacity: 1, duration: 0.36, ease: 'power3.out', stagger: 0.06},
                '-=0.28',
              );
            }
          });
        } catch {
          /* no animation — content is already visible */
        }
      })();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      ctx?.revert();
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="ng-trade-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="ng-trade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ng-trade-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="ng-trade-close"
          aria-label="Close"
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="ng-trade-media" data-trade-media>
          <img
            src={media.src}
            srcSet={media.srcSet}
            sizes="(min-width: 48em) 26vw, 100vw"
            alt=""
            loading="lazy"
            decoding="async"
            width={800}
            height={800}
          />
        </div>

        <div ref={panelRef} className="ng-trade-panel">
          {status === 'opening' ? (
            <div className="ng-trade-loading" role="status" aria-live="polite">
              <span className="ng-trade-loading-bar" aria-hidden="true">
                <span />
              </span>
              <p className="ng-trade-loading-text">
                Opening your wholesale workspace…
              </p>
            </div>
          ) : (
            <>
              <p className="ng-trade-eyebrow" data-trade-item>
                For the trade
              </p>
              <h2
                id="ng-trade-title"
                className="ng-trade-title ng-editorial-title"
                data-trade-item
              >
                A private trade conservatory
              </h2>
              <p className="ng-trade-body" data-trade-item>
                Trade pricing is reserved for approved florists, event
                professionals and wholesale partners. Sign in to continue, or
                create a trade account.
              </p>
              <ul className="ng-trade-perks" data-trade-item>
                {PERKS.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className="ng-trade-actions" data-trade-item>
                <a
                  className="ng-trade-btn"
                  href={AUTH_HREF}
                  onClick={() => setStatus('opening')}
                >
                  Sign in
                </a>
                <a
                  className="ng-trade-btn ng-trade-btn--ghost"
                  href={AUTH_HREF}
                  onClick={() => setStatus('opening')}
                >
                  Create trade account
                </a>
                <button
                  type="button"
                  className="ng-trade-btn ng-trade-btn--text"
                  onClick={requestClose}
                >
                  Continue shopping
                </button>
              </div>
              <p className="ng-trade-foot" data-trade-item>
                Prefer to apply first? <a href="/contact">Contact our team →</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
