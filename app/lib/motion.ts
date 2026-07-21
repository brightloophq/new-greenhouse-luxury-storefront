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
  cards: 0.09,
} as const;

/** True when the visitor has asked for reduced motion (SSR-safe). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
