import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';
import {varietyPath, type FlowerVariety} from '~/lib/flowerVarieties';

/**
 * The flower library is generated at 200/300/400/800 — NOT the 400/600/800 set
 * used elsewhere in the app. Listing a width that doesn't exist would hand the
 * browser a 404 to pick from, so this set matches what is actually on disk.
 */
function srcSet(base: string) {
  return {
    src: `${base}-800.webp`,
    srcSet: [300, 400, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

/**
 * "Shop by Flower Variety" — discovery, not a second decision point.
 *
 * Deliberately NOT a four-up tile grid: the shopping chooser directly above is
 * already four equal cards, and repeating that rhythm is what makes a homepage
 * read as a template. This is an asymmetric editorial composition — one tall
 * plate, two regular, one wide — so the two sections feel authored rather than
 * stamped.
 *
 * Renders nothing when no variety is available, so the homepage never shows an
 * empty heading (see `loadFlowerVarieties`).
 */
export function ShopByVariety({varieties}: {varieties: FlowerVariety[]}) {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope, {enabled: varieties.length > 0});

  if (!varieties.length) return null;

  return (
    <section
      ref={scope}
      className="ng-variety"
      aria-labelledby="ng-variety-title"
    >
      <div className="ng-variety-head" data-reveal-heading>
        <h2 id="ng-variety-title" className="ng-variety-title">
          Shop by Flower Variety
        </h2>
        <p className="ng-variety-sub">Explore fresh flowers by type.</p>
      </div>

      <ul className="ng-variety-grid">
        {varieties.map((variety) => {
          const media = srcSet(variety.img);
          return (
            <li
              key={variety.handle}
              className={`ng-variety-cell ng-variety-cell--${variety.span}`}
              data-reveal-item
            >
              <Link
                className="ng-variety-card"
                to={varietyPath(variety)}
                prefetch="intent"
              >
                <span className="ng-variety-card-media">
                  <img
                    src={media.src}
                    srcSet={media.srcSet}
                    sizes="(min-width: 64em) 34vw, (min-width: 45em) 48vw, 82vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={1000}
                  />
                </span>
                <span className="ng-variety-card-foot">
                  <span className="ng-variety-card-name">{variety.label}</span>
                  <span className="ng-variety-card-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
