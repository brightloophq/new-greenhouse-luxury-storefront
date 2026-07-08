import {cx} from './utils';

type CardVariant =
  | 'base'
  | 'product'
  | 'collection'
  | 'editorial'
  | 'feature'
  | 'service'
  | 'category'
  | 'testimonial'
  | 'image';

const cardClasses: Record<CardVariant, string> = {
  base: 'ng-card',
  product: 'ng-product-card',
  collection: 'ng-collection-card',
  editorial: 'ng-editorial-card',
  feature: 'ng-feature-card',
  service: 'ng-service-card',
  category: 'ng-category-card',
  testimonial: 'ng-testimonial-card',
  image: 'ng-image-card',
};

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export function Card({className, variant = 'base', ...props}: CardProps) {
  return <div className={cx(cardClasses[variant], className)} {...props} />;
}

export function CardBody({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ng-card-body', className)} {...props} />;
}
