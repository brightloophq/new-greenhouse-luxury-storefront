import {useRef} from 'react';
import {useHeroTimeline} from '~/lib/useHeroTimeline';
import {HeroMedia} from '~/components/home/HeroMedia';

/**
 * Brand hero — Concept A, "The Glasshouse".
 *
 * Full-bleed botanical media with the wordmark set oversized ON the glass: a
 * fine glazing grid overlays the media, the way light reads through greenhouse
 * panes. Replaces the previous split panel, which was the layout every Hydrogen
 * theme ships.
 *
 * Legibility is not left to chance — a tonal scrim sits between the media and
 * the type, so the wordmark holds AA contrast on every frame of the loop rather
 * than only on the poster.
 */
export function BrandHero() {
  const scope = useRef<HTMLElement>(null);
  useHeroTimeline(scope);

  return (
    <section
      ref={scope}
      className="ng-hero"
      aria-labelledby="ng-hero-title"
    >
      <div className="ng-hero-media">
        <HeroMedia
          poster="/video/hero-poster.webp"
          video={{src: '/video/hero.mp4'}}
          alt="Morning light through the glass of a greenhouse, over cream and blush peonies"
        />
        {/* Scrim first, then glazing bars — both decorative. */}
        <div className="ng-hero-scrim" aria-hidden="true" />
        <div className="ng-hero-glazing" aria-hidden="true" />
      </div>

      <div className="ng-hero-copy">
        <p className="ng-hero-eyebrow" data-hero-eyebrow>
          Est. 1984 · Kingston, Jamaica
        </p>
        <h1 id="ng-hero-title" className="ng-hero-wordmark" data-hero-title>
          The New Greenhouse
        </h1>
        <p className="ng-hero-tagline" data-hero-tagline>
          Not just a flower, whatever it takes.
        </p>
        <a className="ng-hero-cta" href="#choose-experience" data-hero-cta>
          Explore More
          <span className="ng-hero-cta-rule" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
