import type {ReactNode} from 'react';
import {Heading} from './Typography';
import {cx} from './utils';

type BannerHeight = 'sm' | 'md' | 'lg' | 'hero';
type Align = 'left' | 'center';
type Overlay = 'dark' | 'light' | 'none';

const heightClasses: Record<BannerHeight, string> = {
  sm: 'ng-banner-sm',
  md: 'ng-banner-md',
  lg: 'ng-banner-lg',
  hero: 'ng-banner-hero',
};

const alignClasses: Record<Align, string> = {
  left: '',
  center: 'ng-banner-center',
};

const overlayClasses: Record<Overlay, string> = {
  dark: 'ng-banner-overlay-dark',
  light: 'ng-banner-overlay-light',
  none: 'ng-banner-overlay-none',
};

export type BannerProps = Omit<React.HTMLAttributes<HTMLElement>, 'title'> & {
  media: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  height?: BannerHeight;
  align?: Align;
  overlay?: Overlay;
};

export function Banner({
  className,
  media,
  eyebrow,
  title,
  description,
  actions,
  height = 'md',
  align = 'left',
  overlay = 'dark',
  ...props
}: BannerProps) {
  return (
    <section
      className={cx(
        'ng-banner',
        heightClasses[height],
        alignClasses[align],
        className,
      )}
      {...props}
    >
      <div className="ng-banner-media" aria-hidden="true">
        {media}
      </div>
      <div className={cx('ng-banner-scrim', overlayClasses[overlay])} aria-hidden="true" />
      <div className="ng-banner-content">
        {eyebrow ? <span className="ng-banner-eyebrow">{eyebrow}</span> : null}
        <Heading as={2} size="display-l" className="ng-banner-title">
          {title}
        </Heading>
        {description ? (
          <p className="ng-banner-description">{description}</p>
        ) : null}
        {actions ? <div className="ng-banner-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
