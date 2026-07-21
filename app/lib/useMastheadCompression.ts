import {useEffect, type RefObject} from 'react';
import {MOTION, prefersReducedMotion} from '~/lib/motion';

/**
 * Compresses the two-level masthead into a single bar once the reader passes
 * the hero threshold, and expands it again at the top of the page.
 *
 * Only the wordmark's SCALE and the two collapsing rows' height/opacity are
 * animated — all transform and opacity, no layout properties, so the browser
 * can composite it.
 *
 * The compressed state is also expressed in CSS via `.is-compressed`, so the
 * masthead still compresses correctly when GSAP is unavailable or reduced
 * motion is on: it simply snaps instead of easing. Navigation, search, account
 * and cart stay reachable in both states.
 */
export function useMastheadCompression(
  scope: RefObject<HTMLElement | null>,
  compressed: boolean,
) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    // CSS already describes both states; without motion we let it snap.
    if (prefersReducedMotion()) return;

    let ctx: {revert: () => void} | undefined;
    let cancelled = false;

    void (async () => {
      const {gsap} = await import('gsap');
      if (cancelled) return;

      ctx = gsap.context(() => {
        const wordmark = root.querySelector('.ng-masthead-wordmark');
        const social = root.querySelector('.ng-masthead-social');
        const {duration, ease} = MOTION.nav;

        const tl = gsap.timeline({defaults: {duration, ease}});

        if (wordmark) {
          // Scale, not font-size: font-size would reflow the row every frame.
          tl.to(wordmark, {scale: compressed ? 0.66 : 1}, 0);
        }
        if (social) {
          // The socials are the first thing to go — the least useful control
          // once the reader is shopping. autoAlpha (not opacity) so the links
          // become `visibility: hidden` and drop out of the tab order rather
          // than sitting invisible-but-focusable.
          tl.to(social, {autoAlpha: compressed ? 0 : 1, y: compressed ? -6 : 0}, 0);
        }
        // The NAV ROW IS NEVER COLLAPSED. Height comes off the top row instead
        // (wordmark scale + socials leaving + tighter padding in CSS), so the
        // primary navigation stays visible and focusable in both states.
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [scope, compressed]);
}
