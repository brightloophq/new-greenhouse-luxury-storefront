import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {AccountEntry} from '~/components/auth/AccountEntry';
import {useScrolled} from '~/lib/useScrolled';

import {useMastheadCompression} from '~/lib/useMastheadCompression';
import {useCloseOnRouteChange} from '~/lib/useCloseOnRouteChange';
import {cx, Icon, IconButton} from '~/components/ui';
import {useExperience} from '~/components/ExperienceProvider';
import {navFor, type MegaColumn} from '~/lib/navigation';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

const SOCIAL = [
  {name: 'instagram' as const, label: 'Instagram', href: 'https://www.instagram.com/newgreenhouse'},
  {name: 'facebook' as const, label: 'Facebook', href: 'https://www.facebook.com/TheNewGreenhouse/'},
  {name: 'whatsapp' as const, label: 'WhatsApp', href: 'https://wa.me/18768438964'},
];

/**
 * Editorial masthead — two levels, not a navbar.
 *
 *   Row 1  socials · WORDMARK · search / account / cart
 *   Row 2  centred primary navigation, hairline rule beneath
 *
 * The wordmark is the anchor: large and centred, the way an apothecary or
 * magazine masthead works, rather than the small-logo-plus-menu bar every
 * Shopify theme ships. On scroll the two rows compress into one (see
 * `useMastheadCompression`) so the masthead earns its height only at the top
 * of the page.
 */
export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop} = header;
  const scrolled = useScrolled(80);
  const {open} = useAside();
  const ref = useRef<HTMLDivElement>(null);
  useMastheadCompression(ref, scrolled);

  return (
    <div
      ref={ref}
      className={cx('ng-masthead', scrolled && 'is-compressed')}
      data-compressed={scrolled ? 'true' : 'false'}
    >
      <header className="ng-masthead-top">
        <ul className="ng-masthead-social" aria-label="Social media">
          {SOCIAL.map((social) => (
            <li key={social.name}>
              <a
                className="ng-masthead-social-link"
                href={social.href}
                aria-label={social.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon name={social.name} size="sm" />
              </a>
            </li>
          ))}
        </ul>

        <IconButton
          className="ng-masthead-burger"
          aria-label="Open menu"
          onClick={() => open('mobile')}
        >
          <Icon name="menu" />
        </IconButton>

        <NavLink className="ng-masthead-wordmark" prefetch="intent" to="/" end>
          {shop.name || 'The New Greenhouse'}
        </NavLink>

        <div className="ng-masthead-actions">
          <IconButton aria-label="Search" onClick={() => open('search')}>
            <Icon name="search" />
          </IconButton>
          {/* Guest → branded modal; signed in → straight to /account. */}
          <AccountEntry
            isLoggedIn={isLoggedIn}
            className="ng-masthead-account"
            labelClassName="ng-masthead-account-label"
            guestLabel="Sign in"
            memberLabel="Account"
          />
          <CartToggle cart={cart} />
        </div>
      </header>

      <div className="ng-masthead-navrow">
        <DesktopNav />
      </div>
    </div>
  );
}

function DesktopNav() {
  const {experience} = useExperience();
  const nav = navFor(experience);
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close the mega on any route change (covers Back/Forward and keyboard/touch
  // activation) so a hover panel never lingers over the destination page.
  useCloseOnRouteChange(() => setOpenLabel(null));

  const clearTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpenLabel(null), 120);
  };

  // Close mega on Escape and on focus leaving the nav.
  useEffect(() => {
    if (!openLabel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenLabel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openLabel]);

  // Premium/Deluxe catalogue: no global tabs — just a clear way back to the
  // green Arrangements page (the theme re-greens on navigation).
  if (experience === 'deluxe') {
    return (
      <nav className="ng-shell-primary" aria-label="Primary">
        <NavLink to="/arrangements" prefetch="intent" className="ng-shell-back">
          <span aria-hidden="true">←</span> Arrangements
        </NavLink>
      </nav>
    );
  }

  return (
    <nav
      className="ng-shell-primary"
      aria-label="Primary"
      ref={navRef}
      onBlur={(e) => {
        if (!navRef.current?.contains(e.relatedTarget as Node)) setOpenLabel(null);
      }}
    >
      <ul className="ng-shell-primary-list">
        {nav.primary.map((item) => {
          const isOpen = openLabel === item.label;
          if (item.mega) {
            return (
              <li
                key={item.label}
                className="ng-shell-primary-item has-mega"
                onPointerEnter={() => {
                  clearTimer();
                  setOpenLabel(item.label);
                }}
                onPointerLeave={scheduleClose}
              >
                <button
                  type="button"
                  className={cx('ng-shell-navlink', 'ng-shell-mega-trigger', isOpen && 'is-open')}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  onClick={() => setOpenLabel(isOpen ? null : item.label)}
                  onFocus={() => {
                    clearTimer();
                    setOpenLabel(item.label);
                  }}
                >
                  {item.label}
                  <Icon name="chevron-down" size="xs" className="ng-shell-mega-caret" />
                </button>
                <MegaPanel
                  columns={nav.mega}
                  open={isOpen}
                  onPointerEnter={clearTimer}
                  onPointerLeave={scheduleClose}
                  onClose={() => setOpenLabel(null)}
                />
              </li>
            );
          }
          return (
            <li key={item.label} className="ng-shell-primary-item">
              <NavLink
                to={item.to!}
                prefetch="intent"
                className={({isActive}) => cx('ng-shell-navlink', isActive && 'is-active')}
                onFocus={() => setOpenLabel(null)}
              >
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MegaPanel({
  columns,
  open,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: {
  columns: MegaColumn[];
  open: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cx('ng-mega', open && 'is-open')}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      hidden={!open}
    >
      <div className="ng-mega-inner">
        <div className="ng-mega-columns">
          {columns.map((col) => (
            <div
              className={cx(
                'ng-mega-column',
                col.variant === 'flowers' && 'ng-mega-column--flowers',
              )}
              key={col.title}
            >
              <p className="ng-mega-column-title">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <NavLink
                      to={link.to}
                      prefetch="intent"
                      className="ng-mega-link"
                      onClick={onClose}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartButton count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartButton count={cart?.totalQuantity ?? 0} />;
}

function CartButton({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();
  return (
    <button
      type="button"
      className="ng-shell-cart"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      onClick={() => {
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <Icon name="bag" />
      {count > 0 ? <span className="ng-shell-cart-count">{count}</span> : null}
    </button>
  );
}

// Consumed by the mobile-navigation drawer in PageLayout.
