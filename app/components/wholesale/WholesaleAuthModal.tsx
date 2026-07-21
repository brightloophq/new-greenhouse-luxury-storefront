import {useEffect, useRef} from 'react';

/**
 * Wholesale authentication modal (Phase: unified brand). Opening the Wholesale
 * card surfaces this immediately — no interstitial page. Shopify's Customer
 * Account API is OAuth-based, so both actions hand off to the Shopify-hosted
 * sign-in / create-account flow (we never collect credentials in-app).
 */
export function WholesaleAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  /** The element that opened the dialog — focus must go back to it on close. */
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Remember who opened us BEFORE moving focus into the dialog, so closing
    // returns the keyboard user to the Wholesale card rather than dumping them
    // at the top of the document.
    openerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    // Prevent background scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      // Only restore if focus is still inside the dialog — if the customer has
      // moved on (e.g. the OAuth hand-off), don't yank it back.
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ng-wsmodal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ng-wsmodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ng-wsmodal-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="ng-wsmodal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <p className="ng-wsmodal-eyebrow">For the trade</p>
        <h2 id="ng-wsmodal-title" className="ng-wsmodal-title">
          Wholesale Account
        </h2>
        {/* One line. The previous three-sentence version explained who
            qualifies before the shopper had chosen anything. */}
        <p className="ng-wsmodal-body">
          Sign in or create a business account to shop wholesale flowers and
          supplies.
        </p>

        <div className="ng-wsmodal-actions">
          {/* Full navigation — /account/login hands off to Shopify sign-in. */}
          <a className="ng-wsmodal-btn" href="/account/login">
            Sign in
          </a>
          <a
            className="ng-wsmodal-btn ng-wsmodal-btn--ghost"
            href="/account/login"
          >
            Create wholesale account
          </a>
        </div>

        <p className="ng-wsmodal-foot">
          Prefer to apply first? <a href="/pages/contact">Contact our team →</a>
        </p>
      </div>
    </div>
  );
}
