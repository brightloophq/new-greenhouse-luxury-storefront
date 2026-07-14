import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {useScrolled} from '~/lib/useScrolled';
import {useCloseOnRouteChange} from '~/lib/useCloseOnRouteChange';
import {DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';
import {cx, Icon, IconButton} from '~/components/ui';
import {ExperienceToggle} from '~/components/ExperienceToggle';
import {useExperience} from '~/components/ExperienceProvider';
import {navFor, type MegaColumn} from '~/lib/navigation';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop} = header;
  const scrolled = useScrolled(24);
  const {open} = useAside();

  return (
    <div className={cx('ng-shell-header', scrolled && 'is-solid')}>
      <div className="ng-shell-announcement" role="status">
        <span>Same-day delivery across Kingston &amp; St. Andrew — order before {DELIVERY_CUTOFF_SHORT}</span>
        <span aria-hidden="true" className="ng-shell-announcement-sep">·</span>
        <span>Luxury florals since 1984</span>
      </div>

      <header className="ng-shell-nav">
        <div className="ng-shell-nav-inner">
          <div className="ng-shell-nav-left">
            <IconButton
              className="ng-shell-burger"
              aria-label="Open menu"
              onClick={() => open('mobile')}
            >
              <Icon name="menu" />
            </IconButton>
            <DesktopNav />
          </div>

          <NavLink className="ng-shell-logo" prefetch="intent" to="/" end>
            <span className="ng-shell-logo-mark">{shop.name || 'The New Greenhouse'}</span>
          </NavLink>

          <div className="ng-shell-actions">
            <ExperienceToggle className="ng-exp-toggle--header" />
            <IconButton aria-label="Search" onClick={() => open('search')}>
              <Icon name="search" />
            </IconButton>
            <NavLink className="ng-shell-action-account" prefetch="intent" to="/account">
              <Icon name="user" />
              <span className="ng-shell-action-label">
                <Suspense fallback="Sign in">
                  <Await resolve={isLoggedIn} errorElement="Sign in">
                    {(loggedIn) => (loggedIn ? 'Account' : 'Sign in')}
                  </Await>
                </Suspense>
              </span>
            </NavLink>
            <CartToggle cart={cart} />
          </div>
        </div>
      </header>
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
