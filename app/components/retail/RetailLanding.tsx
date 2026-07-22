import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {focalStyle} from '~/lib/focalPoint';

/**
 * Retail landing — the first room after the homepage's Retail entrance, so it
 * speaks the exact homepage language: a glazing seam and plate label open the
 * section, the title carries an italic flourish, and the two departments are
 * image-led panels with a foot scrim and an "Explore" cue — the same treatment
 * as the homepage shopping panels, at two-up.
 *
 * Presentation only. The destinations (/retail/flowers, /retail/supplies) and
 * the guest-checkout journey are unchanged; the cross-sell points at the
 * existing /wholesale route.
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
      <div className="ng-retail-head" data-reveal-heading>
        <Link className="ng-retail-back" to="/" prefetch="intent">
          <span aria-hidden="true">←</span> Home
        </Link>
        <GlasshouseDivider className="ng-section-seam" />
        <p className="ng-retail-eyebrow">Retail · no account needed</p>
        <h1 id="ng-retail-title" className="ng-retail-title ng-editorial-title">
          Shop <em className="ng-flourish">retail</em>
        </h1>
        <p className="ng-retail-lede">
          Fresh flowers and everyday supplies for the home — buy by the stem, the
          bunch or the ready-made bouquet, and check out as a guest.
        </p>
      </div>

      <ol className="ng-retail-depts">
        {DEPARTMENTS.map((dept) => {
          const media = deptSrc(dept.img);
          return (
            <li key={dept.title} className="ng-retail-dept" data-reveal-item>
              <Link className="ng-retail-panel" to={dept.to} prefetch="intent">
                <span className="ng-retail-panel-media">
                  <img
                    src={media.src}
                    srcSet={media.srcSet}
                    sizes="(min-width: 64em) 46vw, 92vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={1000}
                    style={focalStyle(dept.img)}
                  />
                </span>
                <span className="ng-retail-panel-scrim" aria-hidden="true" />
                <span className="ng-retail-panel-text">
                  <span className="ng-retail-panel-kicker">{dept.kicker}</span>
                  <span className="ng-retail-panel-title">{dept.title}</span>
                  <span className="ng-retail-panel-blurb">{dept.blurb}</span>
                  <span className="ng-retail-panel-cue" aria-hidden="true">
                    <span className="ng-retail-panel-cue-rule" />
                    Explore {dept.title.toLowerCase()}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* A <div>, not <aside>: the Hydrogen scaffold sets `aside { position: fixed }`
          globally for its cart drawer, which would tear this out of the flow. */}
      <div className="ng-retail-xsell" data-reveal-item>
        <p className="ng-retail-xsell-text">
          <b>Buying for a shop or event?</b> Unlock trade pricing by the box on
          the wholesale side.
        </p>
        <Link className="ng-retail-xsell-link" to="/wholesale" prefetch="intent">
          See wholesale <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
