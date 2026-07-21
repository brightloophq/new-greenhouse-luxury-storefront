/**
 * Homepage motion architecture.
 *
 * These assert the RULES the motion system must keep, not the exact numbers:
 * one central token source, GSAP never in the critical path, reduced motion
 * honoured before the library loads, and every timeline reverted on unmount.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {DURATION, EASE, STAGGER, DISTANCE, REVEAL_START} from './motion';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const REVEAL = read('app/lib/useReveal.ts');
const HERO = read('app/lib/useHeroTimeline.ts');
const HOOKS = {useReveal: REVEAL, useHeroTimeline: HERO};

describe('motion tokens', () => {
  it('sits in the ranges the brief specifies', () => {
    expect(DURATION.fast).toBeCloseTo(0.2, 2);
    expect(DURATION.standard).toBeCloseTo(0.4, 2);
    expect(DURATION.section).toBeGreaterThanOrEqual(0.6);
    expect(DURATION.section).toBeLessThanOrEqual(0.85);
    expect(DURATION.hero).toBeGreaterThanOrEqual(0.9);
    expect(DURATION.hero).toBeLessThanOrEqual(1.3);
    expect(STAGGER.cards).toBeGreaterThanOrEqual(0.08);
    expect(STAGGER.cards).toBeLessThanOrEqual(0.12);
    expect(DISTANCE.sm).toBeGreaterThan(0);
    expect(DISTANCE.md).toBeGreaterThan(DISTANCE.sm);
  });

  it('uses only the approved easings — no bounce, elastic or overshoot', () => {
    const eases = Object.values(EASE);
    expect(eases).toEqual(
      expect.arrayContaining(['power2.out', 'power3.out', 'expo.out']),
    );
    for (const ease of eases) {
      expect(ease).not.toMatch(/bounce|elastic|back/i);
    }
  });

  it('expresses the scroll start once, for every trigger to share', () => {
    expect(REVEAL_START).toMatch(/^top \d+%$/);
    expect(REVEAL).toContain('REVEAL_START');
  });
});

describe.each(Object.entries(HOOKS))('%s', (name, source) => {
  it('imports GSAP dynamically, never statically', () => {
    // Either form is fine — a bare `await import`, or inside a Promise.all when
    // a plugin is loaded alongside it. What matters is that it is deferred.
    expect(source).toMatch(/import\('gsap(\/\w+)?'\)/);
    expect(source).toMatch(/await /);
    expect(source).not.toMatch(/^import .*from 'gsap'/m);
  });

  it('checks reduced motion BEFORE paying for the library', () => {
    const guard = source.indexOf('prefersReducedMotion()');
    const load = source.indexOf("import('gsap')");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(load);
  });

  it('runs inside a gsap.context and reverts it on unmount', () => {
    expect(source).toMatch(/gsap\.context\(/);
    expect(source).toMatch(/ctx\?\.revert\(\)/);
  });

  it('defers its hidden state so content is never stuck invisible', () => {
    expect(source).toMatch(/fromTo\(/);
    expect(source).toMatch(/immediateRender: false/);
  });

  it('reads timing from the central tokens, never hardcoded values', () => {
    expect(source).toMatch(/DURATION\./);
    expect(source).toMatch(/EASE\./);
    expect(source).not.toMatch(/duration: [0-9]/);
    expect(source).not.toMatch(/ease: ['"]/);
  });

  it('guards against a late resolve after unmount', () => {
    expect(source).toMatch(/cancelled/);
  });
});

describe('ScrollTrigger discipline', () => {
  it('is used only by the scroll reveal — the hero runs on mount', () => {
    expect(REVEAL).toMatch(/ScrollTrigger/);
    // The hero is already in view; putting it behind a scroll trigger would
    // risk the headline never appearing.
    expect(HERO).not.toMatch(/ScrollTrigger/);
  });

  it('never pins and never scrubs', () => {
    expect(REVEAL).not.toMatch(/pin:|scrub:/);
  });

  it('fires once per section', () => {
    expect(REVEAL).toMatch(/once: true/);
  });

  it('refreshes only after images settle, not on a loop', () => {
    const refreshes = REVEAL.match(/ScrollTrigger\.refresh\(\)/g) ?? [];
    // Two call sites: images-already-loaded, and the last image's load handler.
    expect(refreshes.length).toBeLessThanOrEqual(2);
  });
});

describe('homepage sections are wired to the motion system', () => {
  const HOMEPAGE_SECTIONS = {
    'BrandHero.tsx': 'useHeroTimeline',
    'ExperienceChooser.tsx': 'useReveal',
    'ShopByVariety.tsx': 'useReveal',
  };

  it.each(Object.entries(HOMEPAGE_SECTIONS))(
    '%s uses %s',
    (file, hook) => {
      const source = read(`app/components/home/${file}`);
      expect(source).toContain(hook);
      // No component may reach for GSAP directly.
      expect(source).not.toMatch(/from 'gsap'/);
    },
  );

  it('reveals the shopping paths as ONE batched section, not four triggers', () => {
    const chooser = read('app/components/home/ExperienceChooser.tsx');
    const calls = chooser.match(/useReveal\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(chooser).toMatch(/data-reveal-heading/);
    expect(chooser).toMatch(/data-reveal-item/);
  });

  it('never animates the hero photograph — it is the LCP element', () => {
    const hero = read('app/components/home/BrandHero.tsx');
    const css = read('app/styles/home.css');
    // No data-hook on the image, and no CSS animation on it either.
    expect(hero).not.toMatch(/data-hero-\w+[^>]*\n?\s*src=/);
    const mediaRule = css.slice(
      css.indexOf('.ng-brandhero-media img {'),
      css.indexOf('.ng-brandhero-media img {') + 260,
    );
    expect(mediaRule).not.toMatch(/animation:/);
  });

  it('leaves no orphaned keyframes behind', () => {
    const css = read('app/styles/home.css');
    for (const name of [...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1])) {
      const uses = css.match(new RegExp(`animation:[^;]*${name}`, 'g')) ?? [];
      expect(uses.length, `@keyframes ${name} is unused`).toBeGreaterThan(0);
    }
  });
});

describe('reduced motion', () => {
  it('disables hover transitions in CSS as well as JS timelines', () => {
    const css = read('app/styles/home.css');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/transition: none/);
  });

  it('has a reduced-motion guard for the variety card motion too', () => {
    const css = read('app/styles/home.css');
    const blocks = css.match(/@media \(prefers-reduced-motion: reduce\)/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(2);
  });
});
