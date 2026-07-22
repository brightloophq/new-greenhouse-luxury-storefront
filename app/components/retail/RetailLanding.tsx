import {useRef} from 'react';
import {useReveal} from '~/lib/useReveal';
import {focalStyle} from '~/lib/focalPoint';
import {EditorialSectionHeader} from '~/components/editorial/EditorialSectionHeader';
import {EditorialPanel} from '~/components/editorial/EditorialPanel';
import {EditorialCrossSell} from '~/components/editorial/EditorialCrossSell';

/**
 * Retail landing — the first room after the homepage's Retail entrance, so it
 * speaks the exact homepage language: a glazing seam and plate label open the
 * section, the title carries an italic flourish, and the two departments are
 * image-led panels with a foot scrim and an "Explore" cue — the same treatment
 * as the homepage shopping panels, at two-up.
 *
 * Composed from the shared editorial primitives; the `.ng-retail-*` rules keep
 * the presentation. Destinations (/retail/flowers, /retail/supplies) and the
 * guest-checkout journey are unchanged; the cross-sell points at /wholesale.
 */
const DEPARTMENTS = [
  {
    title: 'Flowers',
    to: '/retail/flowers',
    img: '/images/homepage/retail',
    kicker: 'By the stem or the bunch',
    blurb:
      'Single stems, market bunches and ready-tied bouquets — cut fresh and wrapped to go.',
  },
  {
    title: 'Supplies',
    to: '/retail/supplies',
    img: '/images/homepage/supplies',
    kicker: 'Everything around the flowers',
    blurb:
      'Vases, ribbon, care and the finishing touches — for home arrangers and gift-wrappers alike.',
  },
];

/** The flower library set: 400/600/800 on disk. */
function deptSrc(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

export function RetailLanding() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section ref={scope} className="ng-retail" aria-labelledby="ng-retail-title">
      <EditorialSectionHeader
        prefix="ng-retail"
        titleId="ng-retail-title"
        back={{to: '/', label: 'Home'}}
        eyebrow="Retail · no account needed"
        title={
          <>
            Shop <em className="ng-flourish">retail</em>
          </>
        }
        lede="Fresh flowers and everyday supplies for the home — buy by the stem, the bunch or the ready-made bouquet, and check out as a guest."
      />

      <ol className="ng-retail-depts">
        {DEPARTMENTS.map((dept) => {
          const media = deptSrc(dept.img);
          return (
            <li key={dept.title} className="ng-retail-dept" data-reveal-item>
              <EditorialPanel
                className="ng-retail-panel"
                to={dept.to}
                src={media.src}
                srcSet={media.srcSet}
                sizes="(min-width: 64em) 46vw, 92vw"
                style={focalStyle(dept.img)}
                kicker={dept.kicker}
                title={dept.title}
                blurb={dept.blurb}
                cue={`Explore ${dept.title.toLowerCase()}`}
              />
            </li>
          );
        })}
      </ol>

      <EditorialCrossSell
        className="ng-retail-xsell"
        to="/wholesale"
        linkLabel={
          <>
            See wholesale <span aria-hidden="true">→</span>
          </>
        }
      >
        <b>Buying for a shop or event?</b> Unlock trade pricing by the box on the
        wholesale side.
      </EditorialCrossSell>
    </section>
  );
}
