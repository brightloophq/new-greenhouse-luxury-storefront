import {cx} from './utils';

export function Badge({className, ...props}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ng-badge', className)} {...props} />;
}

export function Divider({className, ...props}: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cx('ng-divider', className)} {...props} />;
}

export function LuxuryLink({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cx('ng-link-underline', className)} {...props}>
      {children}
    </a>
  );
}
