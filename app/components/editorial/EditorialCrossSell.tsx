import type {ReactNode} from 'react';
import {Link} from 'react-router';

/**
 * EditorialCrossSell — the quiet bordered rail that points from one editorial
 * room to an adjacent one (Retail → Wholesale, Supplies → Retail). Rendered as a
 * plain div (a promotional strip is not a landmark region) so it stays in flow.
 *
 * Structure only — width, border and colour come from each surface's
 * `${className}*` rules.
 */
export interface EditorialCrossSellProps {
  /** Root rail class; `${className}-text` and `${className}-link` derive from it. */
  className: string;
  to: string;
  /** The link content (label + arrow). */
  linkLabel: ReactNode;
  /** The rail copy (usually a <b> lead-in + sentence). */
  children: ReactNode;
}

export function EditorialCrossSell({
  className,
  to,
  linkLabel,
  children,
}: EditorialCrossSellProps) {
  return (
    <div className={className} data-reveal-item>
      <p className={`${className}-text`}>{children}</p>
      <Link className={`${className}-link`} to={to} prefetch="intent">
        {linkLabel}
      </Link>
    </div>
  );
}
