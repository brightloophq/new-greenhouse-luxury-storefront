import type {ReactNode} from 'react';
import {cx} from './utils';

export type TestimonialProps = React.HTMLAttributes<HTMLElement> & {
  quote: ReactNode;
  author: ReactNode;
  context?: ReactNode;
  avatar?: ReactNode;
  rating?: ReactNode;
};

export function Testimonial({
  className,
  quote,
  author,
  context,
  avatar,
  rating,
  ...props
}: TestimonialProps) {
  return (
    <figure className={cx('ng-testimonial', 'ng-testimonial-card', className)} {...props}>
      {rating ? <div className="ng-testimonial-rating">{rating}</div> : null}
      <blockquote className="ng-testimonial-quote">{quote}</blockquote>
      <figcaption className="ng-testimonial-caption">
        {avatar ? (
          <span className="ng-testimonial-avatar" aria-hidden="true">
            {avatar}
          </span>
        ) : null}
        <span className="ng-testimonial-attribution">
          <span className="ng-testimonial-author">{author}</span>
          {context ? (
            <span className="ng-testimonial-context">{context}</span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

export type TestimonialGridProps = React.HTMLAttributes<HTMLDivElement>;

export function TestimonialGrid({className, ...props}: TestimonialGridProps) {
  return <div className={cx('ng-testimonial-grid', className)} {...props} />;
}
