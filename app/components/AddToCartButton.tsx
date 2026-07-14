import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => {
        const busy = fetcher.state !== 'idle';
        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            <button
              className="add-to-cart-button"
              type="submit"
              onClick={onClick}
              disabled={disabled || busy}
            >
              {busy ? 'Adding…' : children}
            </button>
            {/* Screen-reader confirmation that a line was added (the cart drawer
                also opens on click, but this is a robust polite announcement). */}
            <span className="ng-visually-hidden" role="status" aria-live="polite">
              {fetcher.data && fetcher.state === 'idle' ? 'Added to cart' : ''}
            </span>
          </>
        );
      }}
    </CartForm>
  );
}
