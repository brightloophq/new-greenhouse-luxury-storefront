import {useEffect, useRef} from 'react';
import {EASE, prefersReducedMotion} from '~/lib/motion';

/**
 * A single botanical stem that draws itself down the page as you scroll past
 * the shopping bays — the one signature element on the homepage.
 *
 * Purely decorative: `aria-hidden`, no content, no claims, no links. It sits in
 * the outer margin and never overlaps the bays' text or imagery, and it is
 * hidden entirely below the width where that margin exists.
 *
 * Technique from design-reference/wildstem-motion.html — stroke-dash offset
 * scrubbed against scroll — but drawn in the house green and tied to the
 * existing motion system rather than its own easing.
 */
export function BotanicalSpine({
  side = 'start',
}: {
  /** Which margin the stem grows in. 'end' mirrors it. */
  side?: 'start' | 'end';
}) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
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
        const paths = root.querySelectorAll<SVGPathElement>('[data-draw]');
        const bud = root.querySelector('[data-bud]');

        paths.forEach((path) => {
          const length = path.getTotalLength();
          gsap.set(path, {strokeDasharray: length, strokeDashoffset: length});
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              // Scrubbed to the section, so the stem grows at the reader's own
              // pace instead of playing at them.
              trigger: root.parentElement ?? root,
              start: 'top 70%',
              end: 'bottom 85%',
              scrub: 0.6,
            },
          });
        });

        if (bud) {
          gsap.fromTo(
            bud,
            {opacity: 0, scale: 0.7},
            {
              opacity: 1,
              scale: 1,
              ease: EASE.out,
              transformOrigin: 'center',
              immediateRender: false,
              scrollTrigger: {
                trigger: root.parentElement ?? root,
                start: 'bottom 95%',
                end: 'bottom 70%',
                scrub: 0.6,
              },
            },
          );
        }
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={scope} className={`ng-spine ng-spine--${side}`} aria-hidden="true">
      <svg
        className="ng-spine-svg"
        viewBox="0 0 120 1400"
        preserveAspectRatio="none"
        fill="none"
      >
        <g
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          {/* main stem */}
          <path
            data-draw
            d="M60 1400 C60 1180 60 1010 60 860 C60 720 26 660 22 560 C18 470 74 430 60 330 C50 250 30 210 60 120"
          />
          {/* leaves, alternating like the bays above them */}
          <path data-draw d="M60 1120 C22 1096 8 1050 14 1004 C50 1024 66 1070 60 1120 Z" />
          <path data-draw d="M46 880 C86 862 104 818 100 772 C62 790 44 834 46 880 Z" />
          <path data-draw d="M32 620 C0 596 -8 552 0 512 C30 534 42 578 32 620 Z" />
          <path data-draw d="M64 400 C102 380 116 336 110 292 C74 312 60 356 64 400 Z" />
        </g>
        <g data-bud stroke="currentColor" strokeWidth="1.4" fill="none">
          <circle cx="60" cy="86" r="30" />
          <circle cx="60" cy="86" r="13" />
        </g>
      </svg>
    </div>
  );
}
