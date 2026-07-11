import type {ReactNode} from 'react';
import {Heading} from './Typography';
import {cx} from './utils';

type HeadingLevel = 1 | 2 | 3 | 4;
type HeadingSize = 'display-xl' | 'display-l' | 'h1' | 'h2' | 'h3' | 'h4';
type Align = 'left' | 'center';

const alignClasses: Record<Align, string> = {
  left: '',
  center: 'ng-section-heading-center',
};

export type SectionHeadingProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: Align;
  as?: HeadingLevel;
  size?: HeadingSize;
  action?: ReactNode;
};

export function SectionHeading({
  className,
  eyebrow,
  title,
  description,
  align = 'left',
  as = 2,
  size = 'h2',
  action,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cx('ng-section-heading', alignClasses[align], className)}
      {...props}
    >
      <div className="ng-section-heading-text">
        {eyebrow ? (
          <span className="ng-section-heading-eyebrow">{eyebrow}</span>
        ) : null}
        <Heading as={as} size={size} className="ng-section-heading-title">
          {title}
        </Heading>
        {description ? (
          <p className="ng-section-heading-description">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="ng-section-heading-action">{action}</div>
      ) : null}
    </div>
  );
}
