import {useRef} from 'react';
import {useHeroTimeline} from '~/lib/useHeroTimeline';

/**
 * Brand hero — one unified, bright, botanical identity (2026 redesign).
 * Split layout: minimal copy on a soft sage-cream panel (left) and a large,
 * vibrant botanical photograph (right). Green, fresh and welcoming — never a
 * dark luxury hero. "Explore More" smooth-scrolls to the shopping chooser.
 *
 * The photograph carries no entrance animation on purpose: it is the LCP
 * element, so it paints as early as the network allows and is never held back
 * by JavaScript. Only the copy sequences in.
 */
export function BrandHero() {
  const scope = useRef<HTMLElement>(null);
  useHeroTimeline(scope);

  return (
    <section
      ref={scope}
      className="ng-brandhero"
      aria-labelledby="ng-brandhero-title"
    >
      <div className="ng-brandhero-copy">
        <p className="ng-brandhero-eyebrow" data-hero-eyebrow>
          Est. 1984 · Kingston, Jamaica
        </p>
        <h1
          id="ng-brandhero-title"
          className="ng-brandhero-wordmark"
          data-hero-title
        >
          The New Greenhouse
        </h1>
        <p className="ng-brandhero-tagline" data-hero-tagline>
          Fresh flowers, arrangements &amp; florist supplies — delivered daily
          across Kingston.
        </p>
        <a className="ng-brandhero-cta" href="#choose-experience" data-hero-cta>
          Explore More
          <span className="ng-brandhero-cta-arrow" aria-hidden="true">↓</span>
        </a>
      </div>

      <div className="ng-brandhero-media">
        <img
          src="/images/homepage/hero-split-1200.webp"
          srcSet="/images/homepage/hero-split-640.webp 640w, /images/homepage/hero-split-900.webp 900w, /images/homepage/hero-split-1200.webp 1200w"
          sizes="(min-width: 60em) 50vw, 100vw"
          alt="A vibrant New Greenhouse arrangement of colourful fresh flowers surrounded by lush green foliage in a bright botanical studio"
          width={1200}
          height={1500}
          loading="eager"
          decoding="async"
        />
      </div>
    </section>
  );
}
