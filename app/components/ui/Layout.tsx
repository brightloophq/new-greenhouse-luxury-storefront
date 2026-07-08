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
