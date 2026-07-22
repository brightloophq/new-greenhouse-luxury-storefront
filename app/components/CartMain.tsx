import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {useEffect, useRef} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary, CartExtras} from './CartSummary';
import {useExperience} from '~/components/ExperienceProvider';
import {primaryShopPath} from '~/lib/navigation';
import {DISTANCE, MOTION, STAGGER, prefersReducedMotion} from '~/lib/motion';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};

function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

export function CartMain({layout, cart: originalCart}: CartMainProps) {
  const cart = useOptimisticCart(originalCart);
  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main ng-cart ${withDiscount ? 'with-discount' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  // Editorial reveal: line items, notes and summary lift in as the drawer opens
  // (or as the /cart page mounts). Reuses the house motion vocabulary and GSAP
  // is dynamically imported — presentation only, no cart logic. Skipped entirely
  // under prefers-reduced-motion, and the content ships visible without JS.
  const {type} = useAside();
  const scope = useRef<HTMLElement>(null);
  const revealed = useRef(false);
  const active = layout === 'page' || type === 'cart';
  useEffect(() => {
    if (!active) {
      revealed.current = false;
      return;
    }
    if (revealed.current) return;
    revealed.current = true;
    if (prefersReducedMotion()) return;
    const root = scope.current;
    if (!root) return;
    let ctx: {revert: () => void} | undefined;
    let cancelled = false;
    void import('gsap').then(({gsap}) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const items = root.querySelectorAll('[data-cart-reveal]');
        if (!items.length) return;
        gsap.fromTo(
          items,
          {y: DISTANCE.sm, opacity: 0},
          {
            y: 0,
            opacity: 1,
            duration: MOTION.modal.duration,
            ease: MOTION.modal.ease,
            stagger: STAGGER.tight,
            immediateRender: false,
          },
        );
      }, root);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [active]);

  return (
    <section
      ref={scope}
      className={className}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      <div className="cart-luxury-header">
        <p className="greenhouse-kicker">Your selection</p>
        <h2>{layout === 'page' ? 'Shopping cart' : 'Cart'}</h2>
        <p className="cart-intro">
          Every stem is prepared with care before it reaches your door.
        </p>
      </div>
      <CartEmpty hidden={linesCount} />
      <div className="cart-details">
        <p id="cart-lines" className="sr-only">
          Line items
        </p>
        <div>
          <ul aria-labelledby="cart-lines">
            {(cart?.lines?.nodes ?? []).map((line) => {
              if (
                'parentRelationship' in line &&
                line.parentRelationship?.parent
              ) {
                return null;
              }
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                />
              );
            })}
          </ul>
        </div>
        {cartHasItems && (
          <div className="cart-luxury-notes" data-cart-reveal>
            <label htmlFor={`cart-gift-note-${layout}`}>Gift message</label>
            <textarea
              id={`cart-gift-note-${layout}`}
              placeholder="Add a note for the recipient"
              rows={3}
            />
            <p>Same-day delivery windows are confirmed by our Kingston team.</p>
          </div>
        )}
        {/* Discount + gift-card entry lives in the scrolling region so the
            docked subtotal + checkout stay short and always reachable (§9). */}
        {cartHasItems && (
          <div data-cart-reveal>
            <CartExtras cart={cart} />
          </div>
        )}
      </div>
      {/* Subtotal + checkout sit OUTSIDE the scrolling `.cart-details` so, inside
          the drawer, they dock as a compact fixed footer — checkout is always
          reachable without scrolling (§9). On the /cart page it follows in flow. */}
      {cartHasItems && (
        <div className="cart-summary-dock" data-cart-reveal>
          <CartSummary cart={cart} layout={layout} />
        </div>
      )}
    </section>
  );
}

function CartEmpty({hidden = false}: {hidden: boolean}) {
  const {close} = useAside();
  const {experience} = useExperience();
  return (
    <div hidden={hidden} className="cart-empty-state" data-cart-reveal>
      <svg
        className="cart-empty-art"
        viewBox="0 0 64 72"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M32 68V30"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M32 40C32 40 24 38 20 31C16 24 18 14 18 14C18 14 28 18 31 25C34 32 32 40 32 40Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M32 34C32 34 40 32 44 25C48 18 46 8 46 8C46 8 36 12 33 19C30 26 32 34 32 34Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M24 68H40"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <p className="cart-empty-title">Your greenhouse is waiting.</p>
      <p className="cart-empty-copy">
        Beautiful flowers are ready whenever you are.
      </p>
      <Link
        className="greenhouse-button greenhouse-button-dark"
        to={primaryShopPath(experience)}
        onClick={close}
        prefetch="viewport"
      >
        Continue shopping
      </Link>
    </div>
  );
}
