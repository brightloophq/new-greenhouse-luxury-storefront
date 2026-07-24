import type {CSSProperties, ReactNode} from 'react';
import {Link} from 'react-router';

/**
 * EditorialPanel — the image-led entrance panel shared by every "department"
 * surface (homepage shopping bays, Retail, Supplies): a covering photograph, a
 * foot scrim, and bottom-aligned text (kicker · title · blurb · "Explore" cue).
 *
 * The visual language lives in each surface's own stylesheet — this component
 * only emits the structure, keyed off `className` so `.foo`, `.foo-media`,
 * `.foo-scrim`, … resolve to that surface's rules. Purely structural: extracting
 * it changes no markup, classes, or styling.
 */
export interface EditorialPanelProps {
  /** Root panel class; every child class is derived from it (`${className}-media`, …). */
  className: string;
  to: string;
  src: string;
  srcSet: string;
  sizes: string;
  /** Focal-point object-position (from `focalStyle`). */
  style?: CSSProperties;
  width?: number;
  height?: number;
  kicker: string;
  title: string;
  blurb: string;
  /** The "Explore" cue text (e.g. "Explore" or "Explore flowers"). */
  cue: ReactNode;
}

export function EditorialPanel({
  className,
  to,
  src,
  srcSet,
  sizes,
  style,
  width = 800,
  height = 1000,
  kicker,
  title,
  blurb,
  cue,
}: EditorialPanelProps) {
  return (
    <Link className={className} to={to} prefetch="intent">
      <span className={`${className}-media`}>
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          style={style}
        />
      </span>
      <span className={`${className}-scrim`} aria-hidden="true" />
      <span className={`${className}-text`}>
        <span className={`${className}-kicker`}>{kicker}</span>
        <span className={`${className}-title`}>{title}</span>
        <span className={`${className}-blurb`}>{blurb}</span>
        <span className={`${className}-cue`} aria-hidden="true">
          <span className={`${className}-cue-rule`} />
          {cue}
        </span>
      </span>
    </Link>
  );
}
