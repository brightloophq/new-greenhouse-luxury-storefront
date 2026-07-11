import type {ReactNode} from 'react';
import {Heading} from './Typography';
import {cx} from './utils';

type Tone = 'light' | 'muted' | 'dark';

const toneClasses: Record<Tone, string> = {
  light: '',
  muted: 'ng-editorial-muted',
  dark: 'ng-editorial-dark',
};

export type EditorialBlockProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> & {
  media: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  reverse?: boolean;
  tone?: Tone;
  as?: 2 | 3;
};

export function EditorialBlock({
  className,
  media,
  eyebrow,
  title,
  children,
  actions,
  reverse = false,
  tone = 'light',
  as = 2,
  ...props
}: EditorialBlockProps) {
  return (
    <section
      className={cx(
        'ng-editorial',
        reverse && 'ng-editorial-reverse',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="ng-editorial-media">{media}</div>
      <div className="ng-editorial-body">
        {eyebrow ? <span className="ng-editorial-eyebrow">{eyebrow}</span> : null}
        <Heading as={as} size="h2" className="ng-editorial-title">
          {title}
        </Heading>
        {children ? <div className="ng-editorial-text">{children}</div> : null}
        {actions ? <div className="ng-editorial-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
