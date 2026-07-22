import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';

/**
 * EditorialSectionHeader — the masthead shared by the editorial landing rooms
 * (Retail, Supplies): a back link, a glazing seam, a plate-label eyebrow, the
 * flourished display title, and a lede. `data-reveal-heading` marks it for the
 * existing GSAP reveal.
 *
 * Structure only — the type scale, spacing and colour come from each surface's
 * `${prefix}-*` rules, so nothing changes visually when a page adopts it.
 */
export interface EditorialSectionHeaderProps {
  /** Class prefix for this surface, e.g. "ng-retail" → `.ng-retail-head`, `.ng-retail-eyebrow`, … */
  prefix: string;
  /** id the section's aria-labelledby points at. */
  titleId: string;
  back: {to: string; label: string};
  eyebrow: string;
  /** The h1 content (usually text with an `<em className="ng-flourish">`). */
  title: ReactNode;
  lede: ReactNode;
}

export function EditorialSectionHeader({
  prefix,
  titleId,
  back,
  eyebrow,
  title,
  lede,
}: EditorialSectionHeaderProps) {
  return (
    <div className={`${prefix}-head`} data-reveal-heading>
      <Link className={`${prefix}-back`} to={back.to} prefetch="intent">
        <span aria-hidden="true">←</span> {back.label}
      </Link>
      <GlasshouseDivider className="ng-section-seam" />
      <p className={`${prefix}-eyebrow`}>{eyebrow}</p>
      <h1 id={titleId} className={`${prefix}-title ng-editorial-title`}>
        {title}
      </h1>
      <p className={`${prefix}-lede`}>{lede}</p>
    </div>
  );
}
