import type {ReactNode} from 'react';
import {Heading} from './Typography';
import {cx} from './utils';

type Tone = 'light' | 'dark' | 'gold';

const toneClasses: Record<Tone, string> = {
  light: 'ng-cta-light',
  dark: 'ng-cta-dark',
  gold: 'ng-cta-gold',
};

export type CTAProps = Omit<React.HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  actions: ReactNode;
  tone?: Tone;
};

export function CTA({
  className,
  title,
  description,
  actions,
  tone = 'light',
  ...props
}: CTAProps) {
  return (
    <section className={cx('ng-cta', toneClasses[tone], className)} {...props}>
      <div className="ng-cta-inner">
        <div className="ng-cta-text">
          <Heading as={2} size="h2" className="ng-cta-title">
            {title}
          </Heading>
          {description ? (
            <p className="ng-cta-description">{description}</p>
          ) : null}
        </div>
        <div className="ng-cta-actions">{actions}</div>
      </div>
    </section>
  );
}
