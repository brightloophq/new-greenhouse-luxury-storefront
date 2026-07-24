import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DEFAULT_FOCAL, focalFor, focalStyle} from './focalPoint';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

// The registry is keyed by path base; pull the entries back out of the source
// so the test covers whatever is registered, not a hardcoded copy.
const REGISTERED = [
  ...read('app/lib/focalPoint.ts').matchAll(/'(\/images\/[^']+)':\s*\{x:\s*(\d+),\s*y:\s*(\d+)\}/g),
].map((m) => ({base: m[1], x: Number(m[2]), y: Number(m[3])}));

describe('focal-point metadata', () => {
  it('registers real images, and the -800 asset exists on disk', () => {
    expect(REGISTERED.length).toBeGreaterThanOrEqual(4);
    for (const {base} of REGISTERED) {
      const file = join(ROOT, 'public', `${base}-800.webp`);
      expect(existsSync(file), `${base}-800.webp`).toBe(true);
    }
  });

  it('keeps every point inside the frame', () => {
    for (const {x, y} of [...REGISTERED, DEFAULT_FOCAL as {x: number; y: number}]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('defaults botanically — a flower centre sits above the geometric one', () => {
    expect(DEFAULT_FOCAL.y).toBeLessThan(50);
  });

  it('falls back to the default for an unregistered image', () => {
    expect(focalFor('/images/nope/does-not-exist')).toEqual(DEFAULT_FOCAL);
  });

  it('emits an object-position style string', () => {
    expect(focalStyle('/images/homepage/retail')).toEqual({
      objectPosition: '50% 34%',
    });
  });

  it('is wired into the hardest-cropping surfaces', () => {
    // Metadata that nothing reads is just a comment.
    expect(read('app/components/home/ExperienceChooser.tsx')).toMatch(
      /style=\{focalStyle\(/,
    );
    expect(read('app/components/home/ShopByVariety.tsx')).toMatch(
      /style=\{focalStyle\(variety\.img\)\}/,
    );
  });
});
