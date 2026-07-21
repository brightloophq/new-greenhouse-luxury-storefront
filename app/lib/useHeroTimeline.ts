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
        const lines = root.querySelectorAll('[data-hero-title] .ng-hero-line-inner');
        const supporting = [
          '[data-hero-eyebrow]',
          '[data-hero-tagline]',
          '[data-hero-cta]',
        ].filter((selector) => root.querySelector(selector));
        if (!lines.length && !supporting.length) return;

        const tl = gsap.timeline({
          defaults: {ease: EASE.out, immediateRender: false},
        });

        // The wordmark rises out of its clip. yPercent (not y) so the distance
        // scales with the line's own size — the hero type ranges from 2.9rem to
        // 8rem, and a fixed pixel offset would under-travel at the top end.
        if (lines.length) {
          tl.fromTo(
            lines,
            {yPercent: 108},
            {yPercent: 0, duration: DURATION.hero * 0.72, stagger: 0.09},
          );
        }

        // Supporting copy follows, overlapping the tail of the wordmark so the
        // hero reads as one gesture rather than two.
        if (supporting.length) {
          tl.fromTo(
            supporting,
            {y: DISTANCE.sm, opacity: 0},
            {
              y: 0,
              opacity: 1,
              duration: DURATION.hero * 0.55,
              stagger: 0.11,
            },
            lines.length ? '-=0.5' : 0,
          );
        }
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [scope]);
}
