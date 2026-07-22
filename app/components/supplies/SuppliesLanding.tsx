import {useRef} from 'react';
import {useReveal} from '~/lib/useReveal';
import {focalStyle} from '~/lib/focalPoint';
import {SUPPLY_CATEGORIES} from '~/lib/catalogues';
import {EditorialSectionHeader} from '~/components/editorial/EditorialSectionHeader';
import {EditorialPanel} from '~/components/editorial/EditorialPanel';
import {EditorialCrossSell} from '~/components/editorial/EditorialCrossSell';

/**
 * Supplies landing — another room of the same greenhouse. Composed from the
 * shared editorial primitives (section header, image-led panels, cross-sell) and
 * laid out as an editorial directory: one featured department leads, the rest
 * read as an elegant index. The `.ng-supplies-*` rules keep the presentation.
 *
 * Presentation only. The destinations (/supplies/<slug>) come straight from the
 * single SUPPLY_CATEGORIES source of truth; the cross-sell points at /retail.
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
      <EditorialSectionHeader
        prefix="ng-supplies"
        titleId="ng-supplies-title"
        back={{to: '/', label: 'Home'}}
        eyebrow="Supplies · everything around the flower"
        title={
          <>
            The <em className="ng-flourish">supply</em> room
          </>
        }
        lede="Vessels, ribbon, wrapping and the tools of the trade — stocked for florists and home arrangers alike, and yours to check out as a guest."
      />

      <ol className="ng-supplies-depts">
        {DEPARTMENTS.map((dept) => {
          const media = deptSrc(dept.img);
          return (
            <li key={dept.slug} className="ng-supplies-dept" data-reveal-item>
              <EditorialPanel
                className="ng-supplies-panel"
                to={dept.to}
                src={media.src}
                srcSet={media.srcSet}
                sizes="(min-width: 64em) 32vw, (min-width: 45em) 46vw, 92vw"
                style={focalStyle(dept.img)}
                kicker={dept.kicker}
                title={dept.label}
                blurb={dept.blurb}
                cue="Explore"
              />
            </li>
          );
        })}
      </ol>

      <EditorialCrossSell
        className="ng-supplies-xsell"
        to="/retail"
        linkLabel={
          <>
            Shop flowers <span aria-hidden="true">→</span>
          </>
        }
      >
        <b>Need the blooms to match?</b> Fresh flowers by the stem and the bunch on
        the retail side.
      </EditorialCrossSell>
    </section>
  );
}
