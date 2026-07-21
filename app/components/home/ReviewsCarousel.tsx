import {useCallback, useEffect, useRef, useState} from 'react';
import {
  HOMEPAGE_REVIEWS,
  HOMEPAGE_REVIEW_RATING,
} from '~/lib/homeContent';
import {useReveal} from '~/lib/useReveal';
import {prefersReducedMotion} from '~/lib/motion';

/**
 * Homepage reviews, as a carousel.
 *
 * Built on native scroll-snap rather than a JS-transformed track: the browser
 * owns the motion, so it's smooth, interruptible, momentum-scrollable on touch,
 * and works with zero JS if the island never hydrates. JS adds the niceties —
 * prev/next, dots, keyboard, and a gentle auto-advance — on top of markup that
 * already scrolls.
 *
 * Accessibility:
 *  - the track is a labelled `group` the arrow keys drive;
 *  - each slide reports "n of 6" to assistive tech;
 *  - auto-advance pauses on hover, on keyboard focus anywhere inside, when the
 *    tab is hidden, and never starts under reduced motion or before hydration;
 *  - the dots are real buttons with current-slide state.
 *
 * The heading reveals through the shared `useReveal`; the auto-advance is the
 * only bespoke motion, and it is opt-out at the OS level.
 */
export function ReviewsCarousel() {
  const scope = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useReveal(scope);

  const count = HOMEPAGE_REVIEWS.length;

  const rafRef = useRef(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slides = track.querySelectorAll<HTMLElement>('.ng-reviews-slide');
    const clamped = (index + slides.length) % slides.length;
    const slide = slides[clamped];
    if (!slide) return;
    // Centre the slide in the track. The slides `scroll-snap-align: center`, so
    // a left-aligned target would fight the snap and land on the wrong slide —
    // this matches the snap point exactly. Scroll the TRACK, deliberately not
    // the element-into-view API, which also scrolls the whole page to reveal the
    // section and hijacks the reader mid-scroll.
    const target =
      slide.offsetLeft -
      track.offsetLeft -
      (track.clientWidth - slide.clientWidth) / 2;

    // Reduced motion, or no rAF: jump. Otherwise a short manual tween — driving
    // scrollLeft directly rather than trusting `behavior: 'smooth'`, which some
    // engines quietly no-op (and which CSS scroll-snap can cancel mid-flight).
    cancelAnimationFrame(rafRef.current);
    if (prefersReducedMotion()) {
      track.scrollLeft = target;
      return;
    }
    const from = track.scrollLeft;
    const distance = target - from;
    if (Math.abs(distance) < 1) return;
    const duration = 460;
    let startTs = 0;
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      track.scrollLeft = from + distance * easeInOut(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // The slide currently nearest the track's centre, read from scroll position.
  // Navigation steps relative to THIS, not the `active` state — auto-advance
  // also writes `active`, so stepping from state could wrap back onto the slide
  // you're already viewing. Scroll position is the single source of truth.
  const currentIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const slides = Array.from(
      track.querySelectorAll<HTMLElement>('.ng-reviews-slide'),
    );
    const centre = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((s, i) => {
      const c = s.offsetLeft - track.offsetLeft + s.clientWidth / 2;
      const d = Math.abs(c - centre);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }, []);

  const step = useCallback(
    (delta: number) => scrollToIndex(currentIndex() + delta),
    [currentIndex, scrollToIndex],
  );

  // Track which slide is centred, so the dots and auto-advance stay in sync
  // with wherever the reader has dragged the track — not just button presses.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(
      track.querySelectorAll<HTMLElement>('.ng-reviews-slide'),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = slides.indexOf(entry.target as HTMLElement);
            if (i !== -1) setActive(i);
          }
        }
      },
      {root: track, threshold: 0.6},
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Gentle auto-advance. Every guard that should stop it does. Steps from the
  // centred slide, so a reader who dragged the track is carried on from where
  // they left it, not snapped back to a stale index.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (paused) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      step(1);
    }, 5200);
    return () => window.clearInterval(id);
  }, [paused, step]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <section
      ref={scope}
      className="ng-reviews"
      aria-labelledby="ng-reviews-title"
    >
      <div className="ng-reviews-head" data-reveal-heading>
        <p className="ng-reviews-eyebrow">Loved in Kingston</p>
        <h2 id="ng-reviews-title" className="ng-reviews-title">
          What our customers say
        </h2>
        <a
          className="ng-reviews-rating"
          href={HOMEPAGE_REVIEW_RATING.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ng-reviews-stars" aria-hidden="true">
            ★★★★★
          </span>
          <strong>{HOMEPAGE_REVIEW_RATING.score}</strong>
          <span>from {HOMEPAGE_REVIEW_RATING.count} Google reviews</span>
        </a>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="ng-reviews-viewport"
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onKeyDown={onKeyDown}
      >
        <ul className="ng-reviews-track" ref={trackRef} data-reveal-item>
          {HOMEPAGE_REVIEWS.map((review, index) => (
            <li
              key={review.quote}
              className="ng-reviews-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
            >
              <figure className="ng-review-card">
                <span className="ng-review-mark" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="ng-review-quote">
                  {review.quote}
                </blockquote>
                <figcaption className="ng-review-by">
                  <span className="ng-review-name">{review.name}</span>
                  <span className="ng-review-context">{review.context}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <div className="ng-reviews-controls">
          <button
            type="button"
            className="ng-reviews-arrow"
            aria-label="Previous review"
            onClick={() => step(-1)}
          >
            ←
          </button>
          <ol className="ng-reviews-dots" aria-label="Choose a review">
            {HOMEPAGE_REVIEWS.map((review, index) => (
              <li key={review.quote}>
                <button
                  type="button"
                  className={`ng-reviews-dot${
                    index === active ? ' is-active' : ''
                  }`}
                  aria-label={`Review ${index + 1}`}
                  aria-current={index === active ? 'true' : undefined}
                  onClick={() => scrollToIndex(index)}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="ng-reviews-arrow"
            aria-label="Next review"
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
