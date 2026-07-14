import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {useExperience} from '~/components/ExperienceProvider';
import {primaryShopPath} from '~/lib/navigation';

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
  const className = `cart-main ${withDiscount ? 'with-discount' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      className={className}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      <div className="cart-luxury-header">
        <p className="greenhouse-kicker">Your selection</p>
        <h2>{layout === 'page' ? 'Shopping cart' : 'Cart'}</h2>
        <p>
          Every arrangement is prepared with care, presentation, and a refined
          delivery experience.
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
          <div className="cart-luxury-notes">
            <label htmlFor={`cart-gift-note-${layout}`}>Gift message</label>
            <textarea
              id={`cart-gift-note-${layout}`}
              placeholder="Add a note for the recipient"
              rows={3}
            />
            <p>Same-day delivery windows are confirmed by our Kingston team.</p>
          </div>
        )}
        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
      </div>
    </section>
  );
}

function CartEmpty({hidden = false}: {hidden: boolean}) {
  const {close} = useAside();
  const {experience} = useExperience();
  return (
    <div hidden={hidden} className="cart-empty-state">
      <p className="cart-empty-copy">
        Looks like you haven&apos;t added anything yet. Let&apos;s get you
        started with something beautiful.
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
