import {useId} from 'react';
import {cx} from './utils';

type SwatchElement = 'button' | 'a';

type SwatchBaseProps = {
  /** Whether this option is the active selection. */
  selected?: boolean;
  /** Whether this option can be chosen; false renders an unavailable state. */
  available?: boolean;
  /** CSS color for a solid swatch (ignored when `image` is set). */
  color?: string;
  /** Image URL for a patterned/photographic swatch. */
  image?: string;
  /** Human-readable option name, e.g. "Ivory", "Dusty Rose". */
  label: string;
  as?: SwatchElement;
};

export type SwatchProps = SwatchBaseProps &
  Omit<React.HTMLAttributes<HTMLElement>, 'color'> & {
    href?: string;
  };

export function Swatch({
  className,
  selected = false,
  available = true,
  color,
  image,
  label,
  as = 'button',
  href,
  ...props
}: SwatchProps) {
  const swatchStyle = image
    ? {backgroundImage: `url(${image})`}
    : color
      ? {background: color}
      : undefined;

  const dot = (
    <span
      className="ng-swatch-dot"
      style={swatchStyle}
      data-empty={!color && !image ? '' : undefined}
      aria-hidden="true"
    />
  );

  const stateClass = cx(
    'ng-swatch',
    selected && 'ng-swatch-selected',
    !available && 'ng-swatch-unavailable',
    className,
  );

  if (as === 'a') {
    return (
      <a
        className={stateClass}
        href={available ? href : undefined}
        title={label}
        aria-label={label}
        aria-current={selected ? 'true' : undefined}
        aria-disabled={!available || undefined}
        {...props}
      >
        {dot}
        <span className="ng-visually-hidden">{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={stateClass}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      disabled={!available}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {dot}
      <span className="ng-visually-hidden">{label}</span>
    </button>
  );
}

export type SwatchGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Group label, e.g. "Color" or "Ribbon". */
  label: string;
  /** Optional short summary of the current selection shown beside the label. */
  selection?: string;
};

export function SwatchGroup({
  className,
  label,
  selection,
  children,
  ...props
}: SwatchGroupProps) {
  const labelId = useId();

  return (
    <div
      className={cx('ng-swatch-group', className)}
      role="group"
      aria-labelledby={labelId}
      {...props}
    >
      <span className="ng-swatch-group-label" id={labelId}>
        <span className="ng-label">{label}</span>
        {selection ? (
          <span className="ng-swatch-group-selection">{selection}</span>
        ) : null}
      </span>
      <div className="ng-swatch-group-options">{children}</div>
    </div>
  );
}
