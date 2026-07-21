/**
 * The single motion vocabulary for the storefront.
 *
 * Every animation in the app reads its duration, easing, distance and stagger
 * from here — no component invents its own timing. GSAP is loaded DYNAMICALLY
 * by `useReveal`, so it never enters the server bundle or the critical path,
 * and it is skipped entirely when the visitor prefers reduced motion.
 *
 * House style: restrained. No bounce, no elastic, no overshoot.
 */

export const DURATION = {
  /** Hovers, small state changes. */
  fast: 0.2,
  /** Standard element transitions. */
  standard: 0.4,
  /** A section arriving on scroll. */
  section: 0.72,
  /** The hero's opening sequence. */
  hero: 1.1,
} as const;

export const EASE = {
  /** Default for entrances. */
  out: 'power3.out',
  /** Softer, for small movements. */
  soft: 'power2.out',
  /** Long, decisive reveals — image masks, hero. */
  expo: 'expo.out',
} as const;

export const DISTANCE = {
  /** Text lift. */
  sm: 16,
  /** Card lift. */
  md: 28,
} as const;

export const STAGGER = {
  tight: 0.06,
  cards: 0.1,
} as const;

/**
 * Where a scroll-revealed section starts animating, expressed once so every
 * ScrollTrigger in the app agrees. "top 78%" fires a little before the section
 * is fully on screen, so the movement is finishing as the reader arrives rather
 * than starting.
 */
export const REVEAL_START = 'top 78%';

/**
 * MOTION FAMILIES — the named recipes every animated surface draws from.
 *
 * A family is a {duration, ease} pair with a job. Components pick a family by
 * name; they never choose a number. When the house style is retuned, it is
 * retuned here and everything follows.
 *
 * These are also the CSS contract: `--ng-motion-*` custom properties mirror
 * them, so a hover written in CSS and a timeline written in GSAP move at
 * exactly the same speed.
 */
export const MOTION = {
  /** Buttons, links, arrows — must feel instant. */
  hover: {duration: DURATION.fast, ease: EASE.soft},
  /** Inputs, toggles, small state changes. */
  interact: {duration: DURATION.fast, ease: EASE.soft},
  /** Cards lifting, images scaling under the pointer. */
  card: {duration: DURATION.standard, ease: EASE.out},
  /** Dialogs and drawers opening. */
  modal: {duration: DURATION.standard, ease: EASE.out},
  /** Nav panels, mega-menu, mobile drawer. */
  nav: {duration: DURATION.standard, ease: EASE.out},
  /** Route change — brisk, because it gates content. */
  page: {duration: DURATION.standard, ease: EASE.out},
  /** A section arriving on scroll. */
  reveal: {duration: DURATION.section, ease: EASE.out},
  /** The homepage hero's opening sequence. */
  hero: {duration: DURATION.hero, ease: EASE.out},
  /** Skeleton shimmer and pending states. */
  loading: {duration: DURATION.section, ease: EASE.soft},
  /** Confirmation — add-to-cart, saved. */
  success: {duration: DURATION.standard, ease: EASE.expo},
  /** Errors: same speed as success, never a shake or bounce. */
  error: {duration: DURATION.standard, ease: EASE.out},
} as const;

export type MotionFamily = keyof typeof MOTION;

/** `transition` shorthand for a family — for inline styles and CSS-in-JS. */
export function transitionFor(
  family: MotionFamily,
  property = 'all',
): string {
  const {duration} = MOTION[family];
  // CSS cannot read GSAP's named eases, so the cubic-bezier below is the
  // equivalent of power2/3.out and is what --ng-motion-ease resolves to.
  return `${property} ${duration}s cubic-bezier(0.2, 0.7, 0.2, 1)`;
}

/** True when the visitor has asked for reduced motion (SSR-safe). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
