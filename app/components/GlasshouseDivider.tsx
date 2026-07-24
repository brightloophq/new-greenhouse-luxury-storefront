/**
 * The glazing-bar divider — the join where two panes of the greenhouse meet.
 *
 * A signature element of the Glasshouse language: a full-measure hairline that
 * breaks at centre for a small structural node. It replaces the generic <hr>
 * between sections so every seam in the store reads as architecture rather than
 * a rule. Purely decorative — `aria-hidden`, no content.
 *
 * All styling lives in the `.ng-glaze-rule` primitive (design-system.css) so
 * the divider is identical on every page that uses it.
 */
export function GlasshouseDivider({className = ''}: {className?: string}) {
  return (
    <div
      className={`ng-glaze-rule${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <span className="ng-glaze-node" />
    </div>
  );
}
