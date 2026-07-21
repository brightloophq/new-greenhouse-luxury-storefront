/**
 * Focal-point metadata for the photography system.
 *
 * Every homepage photograph is a portrait bloom shot, but the frames that hold
 * them are not — the entrances crop to 5:4 and 3:2, the variety plates to
 * anything from 4:5 to 3:1. `object-fit: cover` then trims the top and bottom,
 * and a naive centred crop decapitates a bouquet whose blooms sit high in the
 * frame (the retail bouquet is the worst case — its flowers are at ~34% with a
 * long wrapped stem below).
 *
 * A focal point says WHERE the subject is, as `object-position` percentages, so
 * the same photograph crops responsibly into any frame at any width. It is pure
 * metadata resolved at render — no JavaScript runs on the client, and
 * `object-position` changes neither layout nor the LCP, so there is no CLS or
 * performance cost.
 *
 * Keyed by an image's public path base (without the `-{width}.webp` suffix), so
 * one entry covers every responsive width. Values were read from the actual
 * photographs, not guessed. Anything unregistered falls back to the botanical
 * default — blooms sit above stems, so "centre" for a flower is a little high.
 */
export interface FocalPoint {
  /** Horizontal subject position, 0–100%. */
  x: number;
  /** Vertical subject position, 0–100%. */
  y: number;
}

/** Blooms above stems: the honest centre of a tied bunch is ~40% down. */
export const DEFAULT_FOCAL: FocalPoint = {x: 50, y: 40};

const FOCAL_POINTS: Record<string, FocalPoint> = {
  // Entrances — hardest crops (5:4 desktop, 3:2 mobile).
  '/images/collections/wholesale-flowers': {x: 50, y: 42},
  '/images/homepage/retail': {x: 50, y: 34},
  '/images/homepage/arrangements': {x: 50, y: 48},
  '/images/homepage/supplies': {x: 50, y: 46},
};

/** The focal point for an image base path, or the botanical default. */
export function focalFor(base: string): FocalPoint {
  return FOCAL_POINTS[base] ?? DEFAULT_FOCAL;
}

/**
 * Inline style carrying the focal point as `object-position`. Applied to a
 * covering `<img>`; harmless on any element that isn't `object-fit: cover`.
 */
export function focalStyle(base: string): {objectPosition: string} {
  const {x, y} = focalFor(base);
  return {objectPosition: `${x}% ${y}%`};
}
