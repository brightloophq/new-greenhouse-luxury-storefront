import {Link} from 'react-router';
import type {Route} from './+types/arrangements._index';

/**
 * Arrangements selector — STILL the bright green brand. Three equal pathways.
 * No dark/gold styling here: the elevated theme only activates once the shopper
 * opens the Premium/Deluxe catalogue.
 */
export const meta: Route.MetaFunction = () => [
  {title: 'Arrangements | The New Greenhouse'},
  {
    name: 'description',
    content:
      'Hand-crafted floral arrangements from The New Greenhouse — premium/deluxe, mixed bouquets, and by occasion.',
  },
];

interface Path {
  title: string;
  blurb: string;
  img: string;
  to: string;
}

const PATHS: Path[] = [
  {
    title: 'Premium / Deluxe',
    blurb: 'Exceptional arrangements, thoughtfully composed.',
    img: '/images/collections/signature-collection',
    to: '/arrangements/premium-deluxe',
  },
  {
    title: 'Mixed',
    blurb: 'Abundant, colourful mixed bouquets for any day.',
    img: '/images/collections/all-flowers',
    to: '/arrangements/mixed',
  },
  {
    title: 'Occasion',
    blurb: 'Birthday, romance, sympathy, new baby & more.',
    img: '/images/occasions/birthday',
    to: '/arrangements/occasion',
  },
];

function srcSet(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

export default function ArrangementsIndex() {
  return (
    <div className="home--general">
      <section className="ng-arr-hero">
        <p className="ng-arr-eyebrow">The New Greenhouse</p>
        <h1 className="ng-arr-title">Arrangements</h1>
        <p className="ng-arr-sub">Hand-crafted by our florists — choose a pathway.</p>
      </section>

      <section className="ng-chooser" aria-label="Arrangement pathways">
        <ul className="ng-chooser-grid ng-chooser-grid--three">
          {PATHS.map((p) => {
            const {src, srcSet: ss} = srcSet(p.img);
            return (
              <li key={p.title}>
                <Link className="ng-chooser-card" to={p.to} prefetch="intent">
                  <span className="ng-chooser-card-media">
                    <img
                      src={src}
                      srcSet={ss}
                      sizes="(min-width: 64em) 30vw, (min-width: 45em) 45vw, 90vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="ng-chooser-card-body">
                    <span className="ng-chooser-card-title">{p.title}</span>
                    <span className="ng-chooser-card-blurb">{p.blurb}</span>
                    <span className="ng-chooser-card-cta" aria-hidden="true">
                      Explore <span className="ng-chooser-card-arrow">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
