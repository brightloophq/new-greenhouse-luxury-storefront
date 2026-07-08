import {Link, type LinkProps} from 'react-router';
import {cx} from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'ng-button ng-button-primary',
  secondary: 'ng-button-secondary',
  outline: 'ng-button-outline',
  ghost: 'ng-button-ghost',
  text: 'ng-button-text',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'ng-button-sm',
  md: '',
  lg: 'ng-button-lg',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(variantClasses[variant], sizeClasses[size], className)}
      type={type}
      {...props}
    />
  );
}

export type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  className,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({className, type = 'button', ...props}: IconButtonProps) {
  return <button className={cx('ng-icon-button', className)} type={type} {...props} />;
}
