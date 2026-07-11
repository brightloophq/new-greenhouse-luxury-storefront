import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {cx} from './utils';

export type CollectionCardProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> & {
  /** Destination for the collection page. */
  href: string;
  title: ReactNode;
  /** Collection media — page passes a Hydrogen <Image>. */
  media: ReactNode;
  /** Small overline above the title. */
  eyebrow?: string;
  /** Optional editorial blurb shown in the overlay. */
  description?: string;
  /** Optional product count, e.g. 24 renders "24 arrangements". */
  count?: number;
  /** Noun for the count, defaults to "pieces". */
  countLabel?: string;
};

/**
 * Editorial collection card: full-bleed image with a gradient overlay and
 * a stretched title link. GraphQL-agnostic (media passed as a slot).
 */
export function CollectionCard({
  className,
  href,
  title,
  media,
  eyebrow,
  description,
  count,
  countLabel = 'pieces',
  ...props
}: CollectionCardProps) {
  const hasCount = typeof count === 'number' && Number.isFinite(count);

  return (
    <article className={cx('ng-collection-card', 'ng-collection-card-x', className)} {...props}>
      <div className="ng-image-frame ng-ratio-collection ng-collection-card-media">
        {media}
        <div className="ng-collection-card-overlay">
          {eyebrow ? (
            <span className="ng-label ng-collection-card-eyebrow">{eyebrow}</span>
          ) : null}
          <Link to={href} className="ng-collection-card-link">
            <span className="ng-collection-card-title">{title}</span>
          </Link>
          {description ? (
            <p className="ng-collection-card-desc">{description}</p>
          ) : null}
          {hasCount ? (
            <span className="ng-collection-card-count">
              {count} {countLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
