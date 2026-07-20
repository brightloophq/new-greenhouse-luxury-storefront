import {Link} from 'react-router';
import type {Route} from './+types/arrangements.occasion._index';
import {OCCASION_COLLECTIONS, OCCASION_ORDER} from '~/lib/arrangements';

/** Occasion selector — GREEN. Choose an occasion, then browse its catalogue. */
export const meta: Route.MetaFunction = () => [
  {title: 'Arrangements by Occasion | The New Greenhouse'},
];

/** Card image per occasion (existing bespoke occasion photography). */
const OCCASION_IMAGE: Record<string, string> = {
  birthday: '/images/occasions/birthday',
  romance: '/images/occasions/love-and-romance',
  'just-because': '/images/collections/best-sellers',
  sympathy: '/images/occasions/sympathy-and-funeral',
  'new-baby': '/images/occasions/new-baby',
  'thank-you': '/images/occasions/thank-you',
};

function srcSet(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

export default function OccasionIndex() {
  return (
    <div className="home--general">
      <section className="ng-arr-hero">
        <Link className="ng-arrcat-back" to="/arrangements" prefetch="intent">
          <span aria-hidden="true">←</span> Arrangements
        </Link>
        <h1 className="ng-arr-title">By Occasion</h1>
        <p className="ng-arr-sub">Flowers for every moment.</p>
      </section>

      <section className="ng-chooser" aria-label="Occasions">
        <ul className="ng-chooser-grid">
          {OCCASION_ORDER.map((slug) => {
            const occ = OCCASION_COLLECTIONS[slug];
            const {src, srcSet: ss} = srcSet(OCCASION_IMAGE[slug]);
            return (
              <li key={slug}>
                <Link
                  className="ng-chooser-card"
                  to={`/arrangements/occasion/${slug}`}
                  prefetch="intent"
                >
                  <span className="ng-chooser-card-media">
                    <img
                      src={src}
                      srcSet={ss}
                      sizes="(min-width: 64em) 24vw, (min-width: 45em) 45vw, 90vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="ng-chooser-card-body">
                    <span className="ng-chooser-card-title">{occ.label}</span>
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
