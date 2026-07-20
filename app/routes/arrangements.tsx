import {data, Link} from 'react-router';
import type {Route} from './+types/arrangements';
import {experienceCookie} from '~/lib/experience';

/**
 * Arrangements landing — STILL the bright green brand (Part 11). The shopper
 * chooses how to browse hand-crafted arrangements. Only the "Premium / Deluxe"
 * card deliberately enters the elevated premium experience (a full navigation
 * through /deluxe so the theme + cookie switch server-side); Occasion and Mixed
 * stay in the main store.
 */
export const meta: Route.MetaFunction = () => [
  {title: 'Arrangements | The New Greenhouse'},
  {
    name: 'description',
    content:
      'Hand-crafted floral arrangements from The New Greenhouse — by occasion, mixed bouquets, and our premium Deluxe collection.',
  },
];

export async function loader() {
  // Stay in the bright (green) experience while on this page.
  return data({}, {headers: {'Set-Cookie': experienceCookie('classic')}});
}

interface Path {
  title: string;
  blurb: string;
  img: string; // basename under /public with 400/600/800 webp
  to: string;
  /** Enters the premium experience → full navigation. */
  premium?: boolean;
}

const PATHS: Path[] = [
  {
    title: 'Premium / Deluxe',
    blurb: 'Our most elevated, hand-composed signature arrangements.',
    img: '/images/collections/signature-collection',
    to: '/deluxe?to=/collections',
    premium: true,
  },
  {
    title: 'Occasion',
    blurb: 'Birthday, romance, sympathy, new baby, thank you & more.',
    img: '/images/occasions/birthday',
    to: '/deluxe?to=/collections',
    premium: true,
  },
  {
    title: 'Mixed',
    blurb: 'Abundant, colourful mixed bouquets for any day.',
    img: '/images/collections/all-flowers',
    to: '/deluxe?to=/collections/luxury-bouquets',
    premium: true,
  },
];

function srcSet(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

export default function Arrangements() {
  return (
    <div className="home--general">
      <section className="ng-arr-hero">
        <p className="ng-arr-eyebrow">The New Greenhouse</p>
        <h1 className="ng-arr-title">Arrangements</h1>
        <p className="ng-arr-sub">
          Hand-crafted by our florists — choose how you’d like to shop.
        </p>
      </section>

      <section className="ng-chooser" aria-label="Arrangement collections">
        <ul className="ng-chooser-grid ng-chooser-grid--three">
          {PATHS.map((p) => {
            const {src, srcSet: ss} = srcSet(p.img);
            const inner = (
              <>
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
              </>
            );
            return (
              <li key={p.title}>
                {p.premium ? (
                  <a className="ng-chooser-card" href={p.to}>
                    {inner}
                  </a>
                ) : (
                  <Link className="ng-chooser-card" to={p.to} prefetch="intent">
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
