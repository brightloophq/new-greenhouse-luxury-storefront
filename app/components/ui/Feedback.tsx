import type {ReactNode} from 'react';
import {cx} from './utils';

/**
 * Feedback atoms for loading, placeholder, and status messaging. All are
 * accessible by default and driven purely by design tokens.
 */

const spinnerSizeClasses = {
  sm: 'ng-spinner-sm',
  md: '',
  lg: 'ng-spinner-lg',
} as const;

type SpinnerSize = keyof typeof spinnerSizeClasses;

export type SpinnerProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: SpinnerSize;
  /** Accessible loading label announced to assistive tech. */
  label?: string;
};

/** Accessible loading indicator (`role="status"`). */
export function Spinner({
  className,
  label = 'Loading',
  size = 'md',
  ...props
}: SpinnerProps) {
  return (
    <span
      className={cx('ng-spinner', spinnerSizeClasses[size], className)}
      role="status"
      {...props}
    >
      <span aria-hidden="true" className="ng-spinner-ring" />
      <span className="ng-visually-hidden">{label}</span>
    </span>
  );
}

const skeletonRatioClasses = {
  product: 'ng-ratio-product',
  collection: 'ng-ratio-collection',
  editorial: 'ng-ratio-editorial',
  square: 'ng-ratio-square',
  text: 'ng-skeleton-text',
} as const;

type SkeletonRatio = keyof typeof skeletonRatioClasses;

export type SkeletonProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Shape preset — image aspect ratios or a text line. */
  ratio?: SkeletonRatio;
};

/**
 * Shimmering placeholder built on the shared `.ng-blur-placeholder` gradient.
 * Decorative — hidden from assistive tech; pair with a `Spinner`/status region
 * when announcing loading state.
 */
export function Skeleton({className, ratio = 'text', ...props}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'ng-skeleton',
        'ng-blur-placeholder',
        skeletonRatioClasses[ratio],
        className,
      )}
      {...props}
    />
  );
}

export type VisuallyHiddenProps = React.HTMLAttributes<HTMLSpanElement>;

/** Renders content for assistive tech only (visually hidden, still in a11y tree). */
export function VisuallyHidden({className, ...props}: VisuallyHiddenProps) {
  return <span className={cx('ng-visually-hidden', className)} {...props} />;
}

const alertToneClasses = {
  success: 'ng-alert-success',
  error: 'ng-alert-error',
  warning: 'ng-alert-warning',
  info: 'ng-alert-info',
} as const;

type AlertTone = keyof typeof alertToneClasses;

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  /** Optional leading icon slot. */
  icon?: ReactNode;
  /** Optional title rendered above the message. */
  title?: ReactNode;
};

/**
 * Inline status message for form/cart feedback. `error`/`warning` announce
 * assertively (`role="alert"`); `success`/`info` announce politely
 * (`role="status"`).
 */
export function Alert({
  children,
  className,
  icon,
  title,
  tone = 'info',
  ...props
}: AlertProps) {
  const assertive = tone === 'error' || tone === 'warning';
  return (
    <div
      className={cx('ng-alert', alertToneClasses[tone], className)}
      role={assertive ? 'alert' : 'status'}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="ng-alert-icon">
          {icon}
        </span>
      ) : null}
      <div className="ng-alert-content">
        {title ? <p className="ng-alert-title">{title}</p> : null}
        {children ? <div className="ng-alert-message">{children}</div> : null}
      </div>
    </div>
  );
}
