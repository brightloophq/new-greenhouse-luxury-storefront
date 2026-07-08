import {cx} from './utils';

type HeadingLevel = 1 | 2 | 3 | 4;
type HeadingSize = 'display-xl' | 'display-l' | 'h1' | 'h2' | 'h3' | 'h4';

const headingClasses: Record<HeadingSize, string> = {
  'display-xl': 'ng-display-xl',
  'display-l': 'ng-display-l',
  h1: 'ng-h1',
  h2: 'ng-h2',
  h3: 'ng-h3',
  h4: 'ng-h4',
};

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingLevel;
  size?: HeadingSize;
};

export function Heading({as = 2, className, size = 'h2', ...props}: HeadingProps) {
  const Tag = `h${as}` as const;
  return <Tag className={cx(headingClasses[size], className)} {...props} />;
}

type TextTone = 'primary' | 'secondary' | 'muted';
type TextSize = 'large' | 'body' | 'small' | 'caption';

const textSizeClasses: Record<TextSize, string> = {
  large: 'ng-body-lg',
  body: 'ng-body',
  small: 'ng-small',
  caption: 'ng-caption',
};

const textToneClasses: Record<TextTone, string> = {
  primary: '',
  secondary: 'ng-text-secondary',
  muted: 'ng-text-muted',
};

export type TextProps = React.HTMLAttributes<HTMLParagraphElement> & {
  size?: TextSize;
  tone?: TextTone;
};

export function Text({
  className,
  size = 'body',
  tone = 'primary',
  ...props
}: TextProps) {
  return (
    <p
      className={cx(textSizeClasses[size], textToneClasses[tone], className)}
      {...props}
    />
  );
}

export function Label({className, ...props}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ng-label', className)} {...props} />;
}

export function Price({className, ...props}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ng-price', className)} {...props} />;
}
