import type {ReactNode} from 'react';
import {NavLink, type NavLinkProps} from 'react-router';
import {cx} from './utils';

/**
 * Reusable navigation building blocks. These are composable primitives — a
 * page header, footer, or drawer consumes them; none of them is a finished
 * chrome component on its own.
 */

export type NavBarProps = React.HTMLAttributes<HTMLElement> & {
  /** Accessible name for the landmark (required for multiple nav regions). */
  label: string;
};

/** Semantic `<nav>` landmark wrapper. */
export function NavBar({className, label, ...props}: NavBarProps) {
  return <nav aria-label={label} className={cx('ng-nav', className)} {...props} />;
}

export type NavListProps = React.HTMLAttributes<HTMLUListElement>;

/** Unstyled-reset `<ul>` list for nav items. */
export function NavList({className, ...props}: NavListProps) {
  return <ul className={cx('ng-nav-list', className)} {...props} />;
}

export type NavItemProps = React.LiHTMLAttributes<HTMLLIElement>;

/** `<li>` wrapper for a single nav entry. */
export function NavItem({className, ...props}: NavItemProps) {
  return <li className={cx('ng-nav-item', className)} {...props} />;
}

/**
 * Merge active/pending state classes onto a caller-provided className. Works
 * whether `className` is a string or a NavLink render-prop function.
 */
function navLinkClassName(
  base: string,
  className: NavLinkProps['className'],
) {
  return ({
    isActive,
    isPending,
    isTransitioning,
  }: {
    isActive: boolean;
    isPending: boolean;
    isTransitioning: boolean;
  }) =>
    cx(
      base,
      isActive && 'is-active',
      isPending && 'is-pending',
      typeof className === 'function'
        ? className({isActive, isPending, isTransitioning})
        : className,
    );
}

export type NavLinkStyledProps = NavLinkProps & {
  /** Prefetch strategy; defaults to `intent` for snappy hover loads. */
  prefetch?: NavLinkProps['prefetch'];
};

/**
 * Styled `NavLink` with underline-on-hover and active/pending states applied
 * through the shared `--ng` classes.
 */
export function NavLinkStyled({
  className,
  prefetch = 'intent',
  ...props
}: NavLinkStyledProps) {
  return (
    <NavLink
      className={navLinkClassName('ng-navlink', className)}
      prefetch={prefetch}
      {...props}
    />
  );
}

export type AnnouncementBarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Optional dismiss handler; when supplied a close button is rendered. */
  onDismiss?: () => void;
  /** Accessible label for the dismiss control. */
  dismissLabel?: string;
  /** Trailing slot (e.g. a CTA link) rendered opposite the message. */
  action?: ReactNode;
};

/**
 * Slim promotional/announcement bar for the top of the page. Optionally
 * dismissible — pass `onDismiss` to render a close affordance. The `children`
 * are the message; `action` is an optional trailing slot.
 */
export function AnnouncementBar({
  action,
  children,
  className,
  dismissLabel = 'Dismiss announcement',
  onDismiss,
  ...props
}: AnnouncementBarProps) {
  return (
    <div className={cx('ng-announcement-bar', className)} {...props}>
      <p className="ng-announcement-bar-message">{children}</p>
      {action ? (
        <span className="ng-announcement-bar-action">{action}</span>
      ) : null}
      {onDismiss ? (
        <button
          aria-label={dismissLabel}
          className="ng-announcement-bar-dismiss"
          onClick={onDismiss}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
          >
            <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
            <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export type BreadcrumbItem = {
  /** Visible label. */
  label: ReactNode;
  /** Destination; omit (or leave undefined) for the current page. */
  to?: string;
};

export type BreadcrumbsProps = React.HTMLAttributes<HTMLElement> & {
  items: BreadcrumbItem[];
  /** Landmark label. */
  label?: string;
  /** Separator glyph between crumbs. */
  separator?: ReactNode;
};

/**
 * Accessible breadcrumb trail. The final item (or any item without `to`) is
 * marked `aria-current="page"` and rendered as plain text.
 */
export function Breadcrumbs({
  className,
  items,
  label = 'Breadcrumb',
  separator = '/',
  ...props
}: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={cx('ng-breadcrumbs', className)} {...props}>
      <ol className="ng-breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = isLast || !item.to;
          return (
            <li className="ng-breadcrumbs-item" key={item.to ?? 'breadcrumb-current'}>
              {isCurrent || !item.to ? (
                <span aria-current="page" className="ng-breadcrumbs-current">
                  {item.label}
                </span>
              ) : (
                <NavLink
                  className="ng-breadcrumbs-link"
                  prefetch="intent"
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="ng-breadcrumbs-separator">
                  {separator}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
