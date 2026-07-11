import {cx} from './utils';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl';
type SectionSpacing = 'compact' | 'standard' | 'editorial';

const containerClasses: Record<ContainerSize, string> = {
  sm: 'ng-container ng-container-sm',
  md: 'ng-container',
  lg: 'ng-container',
  xl: 'ng-container ng-container-xl',
};

const sectionClasses: Record<SectionSpacing, string> = {
  compact: 'ng-section-compact',
  standard: 'ng-section',
  editorial: 'ng-section-editorial',
};

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: ContainerSize;
};

export function Container({className, size = 'md', ...props}: ContainerProps) {
  return <div className={cx(containerClasses[size], className)} {...props} />;
}

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
  spacing?: SectionSpacing;
};

export function Section({className, spacing = 'standard', ...props}: SectionProps) {
  return <section className={cx(sectionClasses[spacing], className)} {...props} />;
}

export function Stack({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ng-stack', className)} {...props} />;
}

export function Cluster({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ng-cluster', className)} {...props} />;
}

type GridCols = 2 | 3 | 4;

const gridClasses: Record<GridCols, string> = {
  2: 'ng-grid-2',
  3: 'ng-grid-3',
  4: 'ng-grid-4',
};

export type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  cols?: GridCols;
};

/** Responsive grid: collapses to 1 column on small screens (see .ng-grid* tokens). */
export function Grid({className, cols = 3, ...props}: GridProps) {
  return (
    <div className={cx('ng-grid', gridClasses[cols], className)} {...props} />
  );
}
