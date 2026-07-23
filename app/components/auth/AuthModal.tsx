import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router';
import {cardImage} from '~/lib/catalogues';
import {loginHref} from '~/lib/authReturnTo';
import {prefersReducedMotion} from '~/lib/motion';

/**
 * The one authentication modal — a branded entry point to Shopify's hosted
 * Customer Accounts flow. Two variants share the room:
 *
 *   account   — the masthead / mobile-drawer account entry for a guest
 *   wholesale — the homepage trade card and the signed-out /wholesale gate
 *
 * Shopify's Customer Account API is OAuth-based, so every action hands off to
 * `/account/login` (a server 302 into Shopify's hosted screen). We never render
 * a credential field and we never see a password.
 *
 * One primary action, deliberately. Hydrogen's `LoginOptions` exposes only
 * `locale`, `countryCode`, `acrValues`, `loginHint` and `loginHintMode` — there
 * is no create-account endpoint or parameter to point a second button at, and
 * inventing one would be fiction. New customers are created inside the same
 * Shopify screen, which the copy says plainly.
 *
 * Presentation is the asymmetric private room: photograph + invitation, a GSAP
 * entrance/exit from the house motion vocabulary, focus trap, scroll lock,
 * reduced-motion and SSR-visible content, with focus returned to the opener.
 */

type AuthVariant = 'account' | 'wholesale';

interface VariantContent {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  perks: string[];
  action: string;
  loading: string;
  foot: React.ReactNode;
}

const CONTENT: Record<AuthVariant, VariantContent> = {
  account: {
    image: '/images/collections/signature-collection',
    eyebrow: 'Your account',
    title: 'Sign in to The New Greenhouse',
    body: 'Your orders, addresses and saved details live here. We hand you to Shopify’s secure sign-in — never a password on our side. New customers are created in the same step.',
    perks: [
      'Every order and delivery, tracked',
      'Saved addresses for a faster checkout',
      'Secured end-to-end by Shopify',
    ],
    action: 'Continue to secure sign-in',
    loading: 'Opening secure sign-in…',
    foot: (
      <>
        Need a hand? <a href="/contact">Talk to our team →</a>
      </>
    ),
  },
  wholesale: {
    image: '/images/collections/wholesale-flowers',
    eyebrow: 'For the trade',
    title: 'A private trade conservatory',
    body: 'Trade pricing is reserved for florists, event professionals and wholesale partners. Sign in to continue — a trade account is created in the same secure step, and access is immediate.',
    perks: [
      'Trade pricing by the bunch & box',
      'Fresh, graded stems — 40+ years supplying Jamaica',
      'Same-day delivery across Kingston & St. Andrew',
    ],
    action: 'Continue to secure sign-in',
    loading: 'Opening your wholesale workspace…',
    foot: (
      <>
        Prefer to apply first? <a href="/contact">Contact our team →</a>
      </>
    ),
  },
};

/**
 * How long the hand-off may take before we offer a retry. The click starts a
 * full-page navigation, so in the happy path this component is torn down long
 * before the timer fires; it only surfaces when the redirect never happens
 * (offline, a blocked navigation, a failing edge).
 */
const HANDOFF_TIMEOUT_MS = 10_000;

type Status = 'idle' | 'opening' | 'failed';

export function AuthModal({
  open,
  onClose,
  variant = 'account',
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  variant?: AuthVariant;
  /** Overrides the current location as the post-sign-in destination. */
  returnTo?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** The element that opened the dialog — focus must return to it on close. */
  const openerRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const location = useLocation();
  const content = CONTENT[variant];
  const media = cardImage(content.image);
  const href = loginHref(
    returnTo ?? `${location.pathname}${location.search}`,
  );

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

  /**
   * Start the hand-off. Guarded so a double-click (or Enter held on the link)
   * cannot fire two navigations, and armed with a timer that offers a retry if
   * the redirect never lands.
   */
  const startHandoff = useCallback((event: React.MouseEvent) => {
    if (status === 'opening') {
      event.preventDefault();
      return;
    }
    setStatus('opening');
  }, [status]);

  useEffect(() => {
    if (status !== 'opening') return;
    const timer = window.setTimeout(() => setStatus('failed'), HANDOFF_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

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

  // Portalled to <body>. The drawer opens its own stacking context, so a modal
  // rendered inside the drawer's subtree would sit *under* the drawer scrim no
  // matter how high its z-index climbed. Safe on the server: `open` is always
  // false until a customer clicks, so this path is client-only.
  return createPortal(
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
              {/* Carries the dialog's label id through every state, so the
                  accessible name never disappears mid-hand-off. */}
              <p id="ng-trade-title" className="ng-trade-loading-text">
                {content.loading}
              </p>
            </div>
          ) : status === 'failed' ? (
            <div className="ng-trade-failure" role="alert">
              <h2 id="ng-trade-title" className="ng-trade-title ng-editorial-title">
                That took longer than it should
              </h2>
              <p className="ng-trade-body">
                Secure sign-in didn’t open. Your connection may have dropped —
                nothing was submitted, so it’s safe to try again.
              </p>
              <div className="ng-trade-actions">
                <a
                  className="ng-trade-btn"
                  href={href}
                  onClick={() => setStatus('opening')}
                >
                  Try again
                </a>
                <button
                  type="button"
                  className="ng-trade-btn ng-trade-btn--text"
                  onClick={requestClose}
                >
                  Continue shopping
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="ng-trade-eyebrow" data-trade-item>
                {content.eyebrow}
              </p>
              <h2
                id="ng-trade-title"
                className="ng-trade-title ng-editorial-title"
                data-trade-item
              >
                {content.title}
              </h2>
              <p className="ng-trade-body" data-trade-item>
                {content.body}
              </p>
              <ul className="ng-trade-perks" data-trade-item>
                {content.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className="ng-trade-actions" data-trade-item>
                <a className="ng-trade-btn" href={href} onClick={startHandoff}>
                  {content.action}
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
                {content.foot}
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
