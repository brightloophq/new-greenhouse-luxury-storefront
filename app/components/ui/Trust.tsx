import type {ReactNode} from 'react';
import {cx} from './utils';

export type TrustItemProps = React.LiHTMLAttributes<HTMLLIElement> & {
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
};

export function TrustItem({
  className,
  icon,
  label,
  detail,
  ...props
}: TrustItemProps) {
  return (
    <li className={cx('ng-trust-item', className)} {...props}>
      {icon ? (
        <span className="ng-trust-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="ng-trust-text">
        <span className="ng-trust-label">{label}</span>
        {detail ? <span className="ng-trust-detail">{detail}</span> : null}
      </span>
    </li>
  );
}

export type TrustGridProps = React.HTMLAttributes<HTMLUListElement>;

export function TrustGrid({className, children, ...props}: TrustGridProps) {
  return (
    <ul className={cx('ng-trust-grid', className)} {...props}>
      {children}
    </ul>
  );
}
