import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';

/**
 * The closing movement — "step inside the greenhouse."
 *
 * A single architectural statement set inside a mullion frame: the Glasshouse
 * language at full volume, with one oversized flourish word and one action.
 * It is the page's final breath, replacing the generic newsletter/marketing
 * blocks a theme would close on. Deliberately spare — one focal point, one
 * primary action, per the luxury principles.
 *
 * Functionally it loops the reader back to the entrances rather than
 * introducing a new destination, so nothing about the flow changes.
 */
export function ConservatoryBand() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section ref={scope} className="ng-conservatory" aria-labelledby="ng-conservatory-title">
      <div className="ng-conservatory-frame ng-glass-framed" data-reveal-heading>
        <p className="ng-plate-label">
          <span className="ng-plate-label__index">IV</span>
          The invitation
        </p>
        <h2 id="ng-conservatory-title" className="ng-conservatory-title ng-editorial-title">
          Step inside the <em className="ng-flourish">greenhouse</em>
        </h2>
        <p className="ng-conservatory-lede">
          Every stem cut, conditioned and composed under one roof in Kingston —
          for the trade by the box, and for the table by the stem.
        </p>
        <Link className="ng-conservatory-cta" to="/#choose-experience">
          Find your entrance
          <span className="ng-conservatory-cta-rule" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
