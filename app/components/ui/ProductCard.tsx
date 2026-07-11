import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {cx} from './utils';

export type ProductCardProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> & {
  /** Destination for the product detail page. */
  href: string;
  title: ReactNode;
  /** Product media — page passes a Hydrogen <Image>. */
  media: ReactNode;
  /** Price content — page passes <PriceBlock> or a formatted node. */
  price?: ReactNode;
  /** Small overline above the title, e.g. a collection or category. */
  eyebrow?: string;
  /** Optional status marker, e.g. <Badge>New</Badge>. */
  badge?: ReactNode;
  /** Optional interactive control (e.g. add-to-cart) layered above the card. */
  quickAction?: ReactNode;
};

/**
 * Slot-based, GraphQL-agnostic product card.
 * Uses a stretched-link pattern so the whole card navigates while any
 * `quickAction` control stays independently clickable (no nested <a>/<button>).
 */
export function ProductCard({
  className,
  href,
  title,
  media,
  price,
  eyebrow,
  badge,
  quickAction,
  ...props
}: ProductCardProps) {
  return (
    <article className={cx('ng-product-card', 'ng-product-card-x', className)} {...props}>
      <div className="ng-image-frame ng-ratio-product ng-product-card-media">
        {media}
        <span className="ng-product-card-quickview" aria-hidden="true">
          Quick view
        </span>
        {badge ? <div className="ng-product-card-badge">{badge}</div> : null}
        {quickAction ? (
          <div className="ng-product-card-action">{quickAction}</div>
        ) : null}
      </div>
      <div className="ng-card-body ng-product-card-body">
        {eyebrow ? (
          <span className="ng-label ng-product-card-eyebrow">{eyebrow}</span>
        ) : null}
        <Link to={href} className="ng-product-card-link">
          <span className="ng-product-name ng-product-card-title">{title}</span>
        </Link>
        {price ? <div className="ng-product-card-price">{price}</div> : null}
      </div>
    </article>
  );
}
