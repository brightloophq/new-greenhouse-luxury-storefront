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
import {cx, Icon, IconButton} from '~/components/ui';
import {ExperienceToggle} from '~/components/ExperienceToggle';
import {
  FLOWER_VARIETIES,
  flowerCategoryPath,
  flowerFamilyPath,
} from '~/lib/flowerCategories';
import {hasFlowerImages} from '~/data/flowers';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type MegaLink = {label: string; to: string};
type MegaColumn = {title: string; links: MegaLink[]; variant?: 'flowers'};

const MEGA_COLUMNS: MegaColumn[] = [
  {
    title: 'Occasions',
    links: [
      {label: 'Birthday', to: '/collections/birthday'},
      {label: 'Anniversary', to: '/collections/anniversary'},
      {label: 'Love & Romance', to: '/collections/love-and-romance'},
      {label: 'Sympathy', to: '/collections/sympathy-and-funeral'},
      {label: 'Congratulations', to: '/collections/congratulations'},
      {label: 'Get Well', to: '/collections/get-well'},
    ],
  },
  {
    title: 'Flower Varieties',
    variant: 'flowers',
    // Families with uploaded imagery → their image library page; the rest →
    // the filtered "all flowers" catalog. Both are valid routes (never a 404).
    links: FLOWER_VARIETIES.map((f) => ({
      label: f.name,
      to: hasFlowerImages(f.handle)
        ? flowerFamilyPath(f.handle)
        : flowerCategoryPath(f.handle),
    })),
  },
  {
    title: 'Featured Shopping',
    links: [
      {label: 'Flower Guide', to: '/flowers'},
      {label: 'Gift Bouquets', to: flowerCategoryPath('gift-bouquets')},
      {label: 'Shop All', to: '/collections/all'},
      {label: 'Bulk Flowers', to: '/collections/bulk-flowers'},
    ],
  },
  {
    title: 'Services',
    links: [
      {label: 'Weddings', to: '/pages/wedding-events'},
      {label: 'Corporate', to: '/pages/corporate-flowers'},
      {label: 'Wholesale', to: '/collections/bulk-flowers'},
    ],
  },
];

type PrimaryItem = {label: string; to?: string; mega?: boolean};

const PRIMARY_NAV: PrimaryItem[] = [
  {label: 'Shop', to: '/collections', mega: true},
  {label: 'Weddings', to: '/pages/wedding-events'},
  {label: 'Corporate', to: '/pages/corporate-flowers'},
  {label: 'Wholesale', to: '/collections/bulk-flowers'},
  {label: 'About', to: '/pages/about-us'},
];

export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop} = header;
  const scrolled = useScrolled(24);
  const {open} = useAside();

  return (
    <div className={cx('ng-shell-header', scrolled && 'is-solid')}>
      <div className="ng-shell-announcement" role="status">
        <span>Same-day delivery across Kingston &amp; St. Andrew — order before 2PM</span>
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
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        {PRIMARY_NAV.map((item) => {
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
  open,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: {
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
          {MEGA_COLUMNS.map((col) => (
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
export {MEGA_COLUMNS, PRIMARY_NAV};
export type {MegaColumn, PrimaryItem};
