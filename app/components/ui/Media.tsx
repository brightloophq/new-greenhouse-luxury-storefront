import {cx} from './utils';

type Ratio = 'product' | 'collection' | 'editorial' | 'square';

const ratioClasses: Record<Ratio, string> = {
  product: 'ng-ratio-product',
  collection: 'ng-ratio-collection',
  editorial: 'ng-ratio-editorial',
  square: 'ng-ratio-square',
};

export type ImageFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  ratio?: Ratio;
};

export function ImageFrame({
  className,
  ratio = 'editorial',
  ...props
}: ImageFrameProps) {
  return <div className={cx('ng-image-frame', ratioClasses[ratio], className)} {...props} />;
}

export function IconFrame({className, ...props}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ng-icon-frame', className)} {...props} />;
}
