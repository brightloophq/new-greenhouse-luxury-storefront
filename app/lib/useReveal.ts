import {useEffect, type RefObject} from 'react';
import {
  DURATION,
  DISTANCE,
  EASE,
  REVEAL_START,
  STAGGER,
  prefersReducedMotion,
} from '~/lib/motion';

/**
 * Scroll-triggered reveal for one section. The ONE place GSAP and ScrollTrigger
 * are used — components describe *what* should reveal, never *how*.
 *
 * Guarantees that matter for a Hydrogen SPA:
 *  - GSAP is dynamically imported, so it stays out of the server bundle and off
 *    the initial critical path; nothing loads on routes that don't reveal.
 *  - Everything runs inside a `gsap.context` scoped to the section, and the
 *    cleanup reverts it — no ScrollTrigger accumulates across client
 *    navigations, which is how these leak in React Router apps.
 *  - Reduced motion short-circuits BEFORE the import: no library, no animation,
 *    content simply present.
 *  - Content is never hidden by JS that might not arrive. The CSS ships the
 *    section visible; we only animate once GSAP is in hand, so a failed chunk
 *    degrades to "no animation", never to "invisible homepage".
 */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  options: {
    /** Selector for the leading text block (fades up first). */
    heading?: string;
    /** Selector for items that stagger in after the heading. */
    items?: string;
    /** Disable — e.g. while data is still loading. */
    enabled?: boolean;
  } = {},
) {
  const {heading = '[data-reveal-heading]', items = '[data-reveal-item]', enabled = true} =
    options;

  useEffect(() => {
    const root = scope.current;
    if (!root || !enabled) return;
    // Respect the OS setting before paying for the library.
    if (prefersReducedMotion()) return;

    let ctx: {revert: () => void} | undefined;
    let cancelled = false;

    // Fire-and-forget: the effect's cleanup handles teardown via `cancelled`
    // and the gsap context, so there is nothing to await here.
    void (async () => {
      const [{gsap}, {ScrollTrigger}] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const headingEl = root.querySelectorAll(heading);
        const itemEls = root.querySelectorAll(items);

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: REVEAL_START,
            // Once only: a section that re-animates every time it scrolls past
            // draws attention to the motion instead of the flowers.
            once: true,
          },
        });

        // `fromTo` + immediateRender:false is deliberate. A plain `.from()`
        // applies its start state (opacity 0) the moment the tween is built,
        // so if the ScrollTrigger never fires — trigger mis-measured, layout
        // shifted, scroll restored past the start — the section stays
        // PERMANENTLY INVISIBLE. Deferring the start state means the content
        // ships visible and is only hidden for the instant before it animates.
        if (headingEl.length) {
          timeline.fromTo(
            headingEl,
            {y: DISTANCE.sm, opacity: 0},
            {
              y: 0,
              opacity: 1,
              duration: DURATION.section,
              ease: EASE.out,
              immediateRender: false,
            },
          );
        }

        if (itemEls.length) {
          timeline.fromTo(
            itemEls,
            {y: DISTANCE.md, opacity: 0},
            {
              y: 0,
              opacity: 1,
              duration: DURATION.section,
              ease: EASE.out,
              stagger: STAGGER.cards,
              immediateRender: false,
            },
            // Overlap slightly with the heading so the section reads as one move.
            headingEl.length ? '-=0.45' : 0,
          );
        }
      }, root);

      // Images below the fold settle late and change the page height, which
      // leaves triggers measured against a stale layout. One refresh once the
      // section's own images are done keeps the start position honest.
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
      // Reverts every tween AND kills the ScrollTriggers created in this scope.
      ctx?.revert();
    };
  }, [scope, heading, items, enabled]);
}
