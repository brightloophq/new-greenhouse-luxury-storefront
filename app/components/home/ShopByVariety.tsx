import {useRef} from 'react';
import {Link} from 'react-router';
import {useReveal} from '~/lib/useReveal';
import {useVarietyParallax} from '~/lib/useVarietyParallax';
import {BotanicalSpine} from '~/components/home/BotanicalSpine';
import {PetalDrift} from '~/components/home/PetalDrift';
import {
  varietyPath,
  varietyNote,
  type FlowerVariety,
  type VarietySpan,
} from '~/lib/flowerVarieties';

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
 * Editorial span patterns on a 12-column grid, keyed by how many varieties are
 * actually available. Every row sums to exactly 12, so the composition resolves
 * with no orphaned card and no hole at the right edge — whatever the count.
 *
 *   tall = 5 cols × 2 rows   regular = 7   half = 6   wide = 12
 *
 * Layout is decided HERE, not in the data: which varieties exist is a
 * merchandising fact, how they're composed is a design decision, and the two
 * change for different reasons. (Baking spans into the data produced exactly
 * one bug: a pattern authored for eight cards left the fourth card stranded
 * 482px short of the grid edge when only four were in stock.)
 */
const SPAN_PATTERNS: Record<number, VarietySpan[]> = {
  1: ['wide'],
  2: ['half', 'half'],
  3: ['tall', 'regular', 'regular'],
  4: ['tall', 'regular', 'regular', 'wide'],
  5: ['tall', 'regular', 'regular', 'half', 'half'],
  6: ['tall', 'regular', 'regular', 'half', 'half', 'wide'],
  7: ['tall', 'regular', 'regular', 'half', 'half', 'wide', 'wide'],
  8: ['tall', 'regular', 'regular', 'half', 'half', 'tall', 'regular', 'regular'],
};

function spansFor(count: number): VarietySpan[] {
  const known = SPAN_PATTERNS[count];
  if (known) return known;
  // Beyond the authored range, fall back to even pairs closed by a full-width
  // plate when the count is odd — still no ragged row.
  const spans: VarietySpan[] = Array.from({length: count}, () => 'half');
  if (count % 2 === 1) spans[count - 1] = 'wide';
  return spans;
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
  useVarietyParallax(scope, {enabled: varieties.length > 0});

  if (!varieties.length) return null;

  const spans = spansFor(varieties.length);

  return (
    <section
      ref={scope}
      className="ng-variety"
      aria-labelledby="ng-variety-title"
    >
      {/* Slightly thinner here than over the bays — this ground is sage, not
          cream, so the same density reads heavier against it. */}
      <PetalDrift density={12} />
      <BotanicalSpine side="end" />

      <div className="ng-variety-head" data-reveal-heading>
        <p className="ng-variety-eyebrow">The collection</p>
        <h2 id="ng-variety-title" className="ng-variety-title">
          Shop by Flower Variety
        </h2>
      </div>

      <ul className="ng-variety-grid">
        {varieties.map((variety, index) => {
          const media = srcSet(variety.img);
          return (
            <li
              key={variety.handle}
              className={`ng-variety-cell ng-variety-cell--${spans[index]}`}
              data-reveal-item
              data-parallax-item
            >
              <Link
                className="ng-variety-card"
                to={varietyPath(variety)}
                prefetch="intent"
              >
                <span className="ng-variety-card-media">
                  {/* The parallax hook moves this wrapper's yPercent; hover
                      scales the <img> inside it. Two elements, two transforms,
                      so scroll drift and hover zoom never overwrite each other. */}
                  <span className="ng-variety-card-parallax" data-parallax-media>
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
                </span>
                <span className="ng-variety-card-foot">
                  <span className="ng-variety-card-no" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="ng-variety-card-label">
                    <span className="ng-variety-card-name">{variety.label}</span>
                    {varietyNote(variety) ? (
                      <span className="ng-variety-card-note">
                        {varietyNote(variety)}
                      </span>
                    ) : null}
                  </span>
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
