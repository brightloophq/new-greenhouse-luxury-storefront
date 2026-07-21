import {useEffect, type RefObject} from 'react';
import {DURATION, DISTANCE, EASE, prefersReducedMotion} from '~/lib/motion';

/**
 * The homepage hero's opening sequence. Runs on mount rather than on scroll —
 * the hero is already in view.
 *
 * Order: the photograph is simply there (it is the LCP element and is never
 * animated or hidden), then wordmark → tagline → CTA settle in.
 *
 * Same guarantees as `useReveal`:
 *  - GSAP is dynamically imported, so it never enters the server bundle.
 *  - Reduced motion short-circuits BEFORE the import.
 *  - `fromTo` + immediateRender:false, so the server-rendered hero is READABLE
 *    immediately and is only hidden for the instant before it animates. Nothing
 *    critical is ever hidden waiting on a chunk that may not arrive.
 *  - Everything lives in a gsap.context reverted on unmount.
 *  - The CTA is a plain anchor and is clickable throughout — motion never gates
 *    interaction.
 */
export function useHeroTimeline(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    let ctx: {revert: () => void} | undefined;
    let cancelled = false;

    void (async () => {
      const {gsap} = await import('gsap');
      if (cancelled) return;

      ctx = gsap.context(() => {
        const steps = [
          '[data-hero-eyebrow]',
          '[data-hero-title]',
          '[data-hero-tagline]',
          '[data-hero-cta]',
        ].filter((selector) => root.querySelector(selector));
        if (!steps.length) return;

        gsap
          .timeline({defaults: {ease: EASE.out, immediateRender: false}})
          .fromTo(
            steps,
            {y: DISTANCE.sm, opacity: 0},
            {
              y: 0,
              opacity: 1,
              duration: DURATION.hero * 0.55,
              // Each line follows the one above rather than arriving together.
              stagger: 0.11,
            },
          );
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [scope]);
}
