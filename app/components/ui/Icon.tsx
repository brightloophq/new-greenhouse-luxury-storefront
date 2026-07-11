import type {ReactNode} from 'react';
import {cx} from './utils';

/**
 * Curated luxury line-icon set. Every glyph is stroke-based, uses
 * `currentColor`, and is drawn on a shared 24x24 canvas with a consistent
 * thin stroke so the family reads as one system. Add glyphs by extending the
 * `icons` record below — the union `IconName` updates automatically.
 */
const icons = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <line x1="20" y1="20" x2="15.6" y2="15.6" />
    </>
  ),
  cart: (
    <>
      <path d="M2.5 3h2l1.6 10.2a1.5 1.5 0 0 0 1.48 1.3h8.2a1.5 1.5 0 0 0 1.47-1.2L20 6.5H6" />
      <circle cx="9" cy="19.5" r="1.2" />
      <circle cx="17" cy="19.5" r="1.2" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 7h13l-1 13.5H6.5L5.5 7Z" />
      <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" />
    </>
  ),
  menu: (
    <>
      <line x1="3.5" y1="7" x2="20.5" y2="7" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <line x1="3.5" y1="17" x2="20.5" y2="17" />
    </>
  ),
  close: (
    <>
      <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
      <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
    </>
  ),
  'chevron-down': <polyline points="5.5 8.75 12 15.25 18.5 8.75" />,
  'chevron-up': <polyline points="5.5 15.25 12 8.75 18.5 15.25" />,
  'chevron-right': <polyline points="8.75 5.5 15.25 12 8.75 18.5" />,
  'chevron-left': <polyline points="15.25 5.5 8.75 12 15.25 18.5" />,
  'arrow-right': (
    <>
      <line x1="3.5" y1="12" x2="20" y2="12" />
      <polyline points="13.5 5.5 20 12 13.5 18.5" />
    </>
  ),
  'arrow-left': (
    <>
      <line x1="20.5" y1="12" x2="4" y2="12" />
      <polyline points="10.5 5.5 4 12 10.5 18.5" />
    </>
  ),
  'arrow-up': (
    <>
      <line x1="12" y1="20.5" x2="12" y2="4" />
      <polyline points="5.5 10.5 12 4 18.5 10.5" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="4.5" x2="12" y2="19.5" />
      <line x1="4.5" y1="12" x2="19.5" y2="12" />
    </>
  ),
  minus: <line x1="4.5" y1="12" x2="19.5" y2="12" />,
  check: <polyline points="4.5 12.5 9.5 17.5 19.5 6.5" />,
  star: (
    <path d="M12 3.5l2.55 5.36 5.7.72-4.2 4 1.08 5.92L12 16.7l-5.13 2.8L7.95 13.6l-4.2-4 5.7-.72L12 3.5Z" />
  ),
  heart: (
    <path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 8.5 1.8C20.5 15 12 20.5 12 20.5Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20c0-3.6 3.36-6 7.5-6s7.5 2.4 7.5 6" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11.5v9H2.5z" />
      <path d="M14 9.5h3.7l3 3v3H14z" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5c.5 0 .9.3 1.05.78l1.03 3.1a1.1 1.1 0 0 1-.28 1.13l-1.3 1.28a12 12 0 0 0 5.13 5.13l1.28-1.3a1.1 1.1 0 0 1 1.13-.28l3.1 1.03c.48.15.78.55.78 1.05V19a1.6 1.6 0 0 1-1.7 1.6C10.3 20.1 3.9 13.7 3.4 6.3A1.6 1.6 0 0 1 5 4.6Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <polyline points="3.5 7 12 13 20.5 7" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21.5s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <polyline points="12 7.5 12 12 15.5 14" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.5 8.5V6.7c0-.8.5-1 1-1H17V2.7h-2.4c-2.5 0-3.6 1.6-3.6 3.8v2H9v3h2v9h3.5v-9H17l.5-3h-3Z" />
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.15-4.1a7.6 7.6 0 1 1 2.9 2.86L4 20Z" />
      <path d="M9 8.6c.16-.4.35-.4.5-.4h.45c.15 0 .35-.05.55.4l.7 1.65c.05.15.1.32 0 .5l-.4.6c-.1.14-.2.3-.08.53.5.86 1.2 1.55 2.05 2 .25.13.4.1.55-.05l.55-.6c.14-.16.28-.13.47-.06l1.6.75c.2.1.33.14.38.22.05.28.05.6-.08.9-.3.7-1.45 1.15-2.05 1.1-1.9-.15-4.5-2.35-5.5-4.8-.13-.9.05-1.75.28-2.14Z" />
    </>
  ),
  leaf: (
    <>
      <path d="M4.5 19.5c0-8 5-13 15-13 0 10-5 15-13 15" />
      <path d="M4.5 19.5c3.5-4.5 6.5-6.5 11-8.5" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="9" r="2.2" />
      <path d="M12 6.8c0-2 .8-3.3 2.2-3.3S16 4.9 14.2 7.2M12 11.2c0 2-.8 3.3-2.2 3.3S8 12.9 9.8 10.8M9.8 9.6C8.1 8.5 6.7 8.3 5.8 9.4S6 12.4 8.6 10.9M14.2 8.4c1.7-1.1 3.1-1.3 4-.2S18 11.6 15.4 10.1" />
      <path d="M12 11.3v9" />
      <path d="M12 15.5c1.6-1.6 3.2-2 4.5-1.5M12 18c-1.6-1.6-3.2-2-4.5-1.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;

const sizeClasses = {
  xs: 'ng-icon-xs',
  sm: 'ng-icon-sm',
  md: 'ng-icon-md',
  lg: 'ng-icon-lg',
} as const;

type IconSize = keyof typeof sizeClasses;

export type IconProps = Omit<React.SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  /** Token preset (`xs|sm|md|lg`) or an explicit pixel number. */
  size?: IconSize | number;
  /**
   * Accessible name. When provided the icon is exposed as `role="img"` with an
   * `aria-label`; when omitted the icon is decorative (`aria-hidden`).
   */
  label?: string;
};

export function Icon({
  className,
  label,
  name,
  size = 'md',
  style,
  ...props
}: IconProps) {
  const isNumeric = typeof size === 'number';
  const labelled = Boolean(label);
  return (
    <svg
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? label : undefined}
      className={cx('ng-icon', !isNumeric && sizeClasses[size], className)}
      fill="none"
      focusable="false"
      role={labelled ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      style={
        isNumeric ? {width: size, height: size, ...style} : style
      }
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {icons[name]}
    </svg>
  );
}

/** Names of every available icon, handy for demos and validation. */
export const iconNames = Object.keys(icons) as IconName[];
