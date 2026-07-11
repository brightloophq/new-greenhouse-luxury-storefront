import type {ReactNode} from 'react';
import {cx} from './utils';

type PriceSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<PriceSize, string> = {
  sm: 'ng-price-block-sm',
  md: '',
  lg: 'ng-price-block-lg',
};

export type PriceBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Current selling price (page passes Hydrogen <Money> or a formatted string). */
  price: ReactNode;
  /** Optional original price, rendered struck-through. */
  compareAt?: ReactNode;
  /** Optional pre-computed discount, e.g. 20 renders "20% off". */
  discountPercent?: number;
  /** Optional wholesale unit label, e.g. "/ stem", "/ bunch". */
  unit?: string;
  size?: PriceSize;
};

export function PriceBlock({
  className,
  price,
  compareAt,
  discountPercent,
  unit,
  size = 'md',
  ...props
}: PriceBlockProps) {
  const hasDiscount =
    typeof discountPercent === 'number' && Number.isFinite(discountPercent) && discountPercent > 0;

  return (
    <div className={cx('ng-price-block', sizeClasses[size], className)} {...props}>
      <span className="ng-price ng-price-current">{price}</span>
      {unit ? (
        <span className="ng-price-unit"> {unit}</span>
      ) : null}
      {compareAt ? (
        <s className="ng-price-compare">{compareAt}</s>
      ) : null}
      {hasDiscount ? (
        <span className="ng-price-discount">{Math.round(discountPercent!)}% off</span>
      ) : null}
    </div>
  );
}
