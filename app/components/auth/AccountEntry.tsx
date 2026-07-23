import {Suspense, useState} from 'react';
import {Await, NavLink} from 'react-router';
import {AuthModal} from '~/components/auth/AuthModal';
import {Icon} from '~/components/ui';

/**
 * The account entry point, shared by the masthead and the mobile drawer.
 *
 * Signed in  → a link straight to /account.
 * Guest      → a button opening the branded {@link AuthModal}; the direct
 *              navigation is gone, so a guest never gets bounced to Shopify's
 *              hosted screen without context.
 *
 * `isLoggedIn` is a deferred promise, so until it resolves we render the link.
 * That is the progressive-enhancement safe default: it works with no JS and it
 * still lands a guest in the right place (Hydrogen redirects them to sign-in),
 * it simply skips the modal for the few hundred milliseconds before hydration
 * settles.
 */
export function AccountEntry({
  isLoggedIn,
  className,
  labelClassName,
  guestLabel,
  memberLabel,
  iconSize,
  onNavigate,
}: {
  isLoggedIn: Promise<boolean>;
  className: string;
  labelClassName?: string;
  guestLabel: string;
  memberLabel: string;
  iconSize?: 'sm' | 'md';
  /** Runs when an authenticated customer navigates (used to close the drawer). */
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const label = (text: string) =>
    labelClassName ? (
      <span className={labelClassName}>{text}</span>
    ) : (
      <span>{text}</span>
    );

  // The masthead hides the text label below the desktop breakpoint, leaving an
  // icon-only control — so the accessible name is carried explicitly.
  const accountLink = (text: string) => (
    <NavLink
      className={className}
      prefetch="intent"
      to="/account"
      aria-label={text}
      onClick={onNavigate}
    >
      <Icon name="user" size={iconSize} />
      {label(text)}
    </NavLink>
  );

  return (
    <>
      <Suspense fallback={accountLink(guestLabel)}>
        <Await resolve={isLoggedIn} errorElement={accountLink(guestLabel)}>
          {(loggedIn) =>
            loggedIn ? (
              accountLink(memberLabel)
            ) : (
              <button
                type="button"
                className={className}
                aria-label={guestLabel}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
              >
                <Icon name="user" size={iconSize} />
                {label(guestLabel)}
              </button>
            )
          }
        </Await>
      </Suspense>
      <AuthModal open={open} variant="account" onClose={() => setOpen(false)} />
    </>
  );
}
