import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {focalStyle} from '~/lib/focalPoint';
import {SUPPLY_CATEGORIES} from '~/lib/catalogues';

/**
 * Supplies landing — another room of the same greenhouse. It speaks the exact
 * homepage/retail language: a glazing seam and plate label open the section, the
 * title carries an italic flourish, and the departments are image-led panels
 * with a foot scrim and an "Explore" cue. Laid out as an editorial directory —
 * one featured department leads, the rest read as an elegant index.
 *
 * Presentation only. The destinations (/supplies/<slug>) come straight from the
 * single SUPPLY_CATEGORIES source of truth; the guest-checkout journey is
 * unchanged, and the cross-sell points at the existing /retail route.
 */
const COPY: Record<string, {kicker: string; blurb: string}> = {
  'vases-and-containers': {
    kicker: 'Vessels for every stem',
    blurb:
      'Glass, ceramic and footed containers — from bud vases to statement urns.',
  },
  ribbon: {
    kicker: 'The finishing tie',
    blurb: 'Satin, organza and grosgrain by the roll, in the house palette and beyond.',
  },
  'wrapping-and-packaging': {
    kicker: 'Dressed to give',
    blurb: 'Kraft, tissue, sleeves and boxes to carry an arrangement beautifully.',
  },
  'tools-and-accessories': {
    kicker: "The florist's hand",
    blurb: 'Snips, wire, tape and picks — the quiet essentials behind every build.',
  },
  'florist-essentials': {
    kicker: 'Stocked and ready',
    blurb: 'Foam, flower food and the consumables that keep a workroom running.',
  },
};

const DEPARTMENTS = SUPPLY_CATEGORIES.map((c) => ({
  slug: c.slug,
  label: c.label,
  to: `/supplies/${c.slug}`,
  img: c.img,
  kicker: COPY[c.slug]?.kicker ?? '',
  blurb: COPY[c.slug]?.blurb ?? '',
}));

/** Supply imagery ships 400 + 800 widths on disk; keep the srcSet to those. */
function deptSrc(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: `${base}-400.webp 400w, ${base}-800.webp 800w`,
  };
}

export function SuppliesLanding() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section ref={scope} className="ng-supplies" aria-labelledby="ng-supplies-title">
      <div className="ng-supplies-head" data-reveal-heading>
        <Link className="ng-supplies-back" to="/" prefetch="intent">
          <span aria-hidden="true">←</span> Home
        </Link>
        <GlasshouseDivider className="ng-section-seam" />
        <p className="ng-supplies-eyebrow">Supplies · everything around the flower</p>
        <h1 id="ng-supplies-title" className="ng-supplies-title ng-editorial-title">
          The <em className="ng-flourish">supply</em> room
        </h1>
        <p className="ng-supplies-lede">
          Vessels, ribbon, wrapping and the tools of the trade — stocked for
          florists and home arrangers alike, and yours to check out as a guest.
        </p>
      </div>

      <ol className="ng-supplies-depts">
        {DEPARTMENTS.map((dept) => {
          const media = deptSrc(dept.img);
          return (
            <li key={dept.slug} className="ng-supplies-dept" data-reveal-item>
              <Link className="ng-supplies-panel" to={dept.to} prefetch="intent">
                <span className="ng-supplies-panel-media">
                  <img
                    src={media.src}
                    srcSet={media.srcSet}
                    sizes="(min-width: 64em) 32vw, (min-width: 45em) 46vw, 92vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={1000}
                    style={focalStyle(dept.img)}
                  />
                </span>
                <span className="ng-supplies-panel-scrim" aria-hidden="true" />
                <span className="ng-supplies-panel-text">
                  <span className="ng-supplies-panel-kicker">{dept.kicker}</span>
                  <span className="ng-supplies-panel-title">{dept.label}</span>
                  <span className="ng-supplies-panel-blurb">{dept.blurb}</span>
                  <span className="ng-supplies-panel-cue" aria-hidden="true">
                    <span className="ng-supplies-panel-cue-rule" />
                    Explore
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* A <div>, not <aside>: semantic asides carry no drawer styling now, but a
          rail like this is not a landmark aside either. */}
      <div className="ng-supplies-xsell" data-reveal-item>
        <p className="ng-supplies-xsell-text">
          <b>Need the blooms to match?</b> Fresh flowers by the stem and the bunch
          on the retail side.
        </p>
        <Link className="ng-supplies-xsell-link" to="/retail" prefetch="intent">
          Shop flowers <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
