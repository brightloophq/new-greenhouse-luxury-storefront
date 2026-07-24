import {useEffect, type RefObject} from 'react';
import {prefersReducedMotion} from '~/lib/motion';

/**
 * Scroll-scrubbed parallax for the flower-variety plates.
 *
 * Where `useReveal` fires ONCE as a section enters, this is the other kind of
 * ScrollTrigger: a `scrub`-linked tween tied continuously to scroll position,
 * so each plate's photograph drifts slowly upward within its frame as the card
 * travels through the viewport. It's the editorial "images breathe as you
 * scroll" motion, and it reads only while scrolling — nothing plays at the
 * reader.
 *
 * Kept separate from the reveal on purpose: the reveal owns the card's opacity
 * and entrance, this owns only the media's `yPercent`, so the two never write
 * the same property and can't fight. The media is over-tall in CSS
 * (`.ng-variety-card-media img { height: 116% }`) precisely so this drift has
 * headroom and never exposes a gap at the frame edge.
 *
 * Same discipline as every other motion hook here: dynamic import so GSAP stays
 * out of the server bundle and off routes that don't scroll, reduced-motion
 * short-circuit BEFORE the import, and a scoped context reverted on unmount so
 * no ScrollTrigger leaks across client navigations.
 */
export function useVarietyParallax(
  scope: RefObject<HTMLElement | null>,
  options: {item?: string; media?: string; enabled?: boolean} = {},
) {
  const {
    item = '[data-parallax-item]',
    media = '[data-parallax-media]',
    enabled = true,
  } = options;

  useEffect(() => {
    const root = scope.current;
    if (!root || !enabled) return;
    if (prefersReducedMotion()) return;

    let ctx: {revert: () => void} | undefined;
    let cancelled = false;

    void (async () => {
      const [{gsap}, {ScrollTrigger}] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const cards = root.querySelectorAll<HTMLElement>(item);
        cards.forEach((card) => {
          const img = card.querySelector<HTMLElement>(media);
          if (!img) return;
          // From +7% (nudged down) to -7% (nudged up) across the card's full
          // pass through the viewport. Small on purpose — this is atmosphere,
          // not a theme-park ride.
          gsap.fromTo(
            img,
            {yPercent: 7},
            {
              yPercent: -7,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
              },
            },
          );
        });
      }, root);

      // Late-loading imagery shifts the page height; one refresh once this
      // section's own images settle keeps every start/end honest.
      const images = Array.from(root.querySelectorAll('img'));
      const pending = images.filter((img) => !img.complete);
      if (pending.length) {
        let settled = 0;
        const done = () => {
          settled += 1;
          if (settled === pending.length && !cancelled) ScrollTrigger.refresh();
        };
        pending.forEach((img) => {
          img.addEventListener('load', done, {once: true});
          img.addEventListener('error', done, {once: true});
        });
      } else {
        ScrollTrigger.refresh();
      }
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [scope, item, media, enabled]);
}
