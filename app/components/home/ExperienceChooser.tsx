import {useRef, useState} from 'react';
import {Link} from 'react-router';
import {WholesaleAuthModal} from '~/components/wholesale/WholesaleAuthModal';
import {useReveal} from '~/lib/useReveal';

/**
 * The four ways into the store, composed as EDITORIAL BAYS rather than cards.
 *
 * Four equal tiles in a row is the single clearest signal that a page was built
 * on a theme, so the shape is gone: each destination is a full-width bay whose
 * image side alternates, with an oversized index numeral bleeding past the
 * image edge and the name set in display serif. Rhythm comes from the
 * alternation and the numerals, not from a grid.
 *
 * Nothing about the flow changes. Wholesale is still a <button> that opens the
 * auth modal without leaving `/`; the other three are still links.
 */
interface Pathway {
  index: string;
  title: string;
  blurb: string;
  img: string;
  dir: string;
  to?: string;
  action?: 'wholesale';
}

const PATHWAYS: Pathway[] = [
  {
    index: '01',
    title: 'Wholesale',
    blurb: 'Trade pricing by the box, for florists and venues.',
    img: 'wholesale-flowers',
    dir: 'collections',
    action: 'wholesale',
  },
  {
    index: '02',
    title: 'Retail',
    blurb: 'Ready to gift, delivered across Kingston.',
    to: '/retail',
    img: 'retail',
    dir: 'homepage',
  },
  {
    index: '03',
    title: 'Arrangements',
    blurb: 'Hand-composed — occasion, mixed and premium.',
    to: '/arrangements',
    img: 'arrangements',
    dir: 'homepage',
  },
  {
    index: '04',
    title: 'Supplies',
    blurb: 'Vases, ribbon, tools and packaging for the studio.',
    to: '/supplies',
    img: 'supplies',
    dir: 'homepage',
  },
];

function srcSet(dir: string, img: string) {
  const base = `/images/${dir}/${img}`;
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

/** The bay's inner content — identical for the button and the links. */
function BayInner({pathway}: {pathway: Pathway}) {
  const media = srcSet(pathway.dir, pathway.img);
  return (
    <>
      <span className="ng-bay-media">
        <img
          src={media.src}
          srcSet={media.srcSet}
          sizes="(min-width: 64em) 52vw, 92vw"
          alt=""
          loading="lazy"
          decoding="async"
          width={800}
          height={1000}
        />
      </span>

      <span className="ng-bay-text">
        <span className="ng-bay-index" aria-hidden="true">
          {pathway.index}
        </span>
        <span className="ng-bay-title">{pathway.title}</span>
        <span className="ng-bay-blurb">{pathway.blurb}</span>
        <span className="ng-bay-cue" aria-hidden="true">
          <span className="ng-bay-cue-rule" />
          Explore
        </span>
      </span>
    </>
  );
}

export function ExperienceChooser() {
  const [wholesaleOpen, setWholesaleOpen] = useState(false);
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section
      ref={scope}
      id="choose-experience"
      className="ng-bays"
      aria-labelledby="ng-bays-title"
    >
      <div className="ng-bays-head" data-reveal-heading>
        <p className="ng-bays-eyebrow">Where would you like to begin?</p>
        <h2 id="ng-bays-title" className="ng-bays-title">
          Four ways into the greenhouse
        </h2>
      </div>

      <ol className="ng-bays-list">
        {PATHWAYS.map((pathway) => (
          <li key={pathway.title} className="ng-bay" data-reveal-item>
            {pathway.action === 'wholesale' ? (
              <button
                type="button"
                className="ng-bay-link"
                onClick={() => setWholesaleOpen(true)}
              >
                <BayInner pathway={pathway} />
              </button>
            ) : (
              <Link className="ng-bay-link" to={pathway.to!} prefetch="intent">
                <BayInner pathway={pathway} />
              </Link>
            )}
          </li>
        ))}
      </ol>

      <WholesaleAuthModal
        open={wholesaleOpen}
        onClose={() => setWholesaleOpen(false)}
      />
    </section>
  );
}
