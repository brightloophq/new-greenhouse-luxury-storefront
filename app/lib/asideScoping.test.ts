import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Regression guard for the cart-drawer aside leak.
 *
 * The Hydrogen scaffold once styled the cart drawer with a bare `aside { … }`
 * rule (fixed positioning, 100vh, --aside-width, drawer shadow). The live drawer
 * is a `<div class="ng-drawer">`, so that rule styled nothing it needed — it only
 * leaked drawer positioning onto every semantic <aside> (catalogue filters,
 * delivery band, product-detail sidebar), which twice collapsed real layouts.
 *
 * These tests fail if an UNSCOPED global `aside` positioning rule is ever
 * reintroduced, and confirm the drawer keeps its own scoped `.ng-drawer` styling.
 */
const STYLES_DIR = join(__dirname, '..', 'styles');

function cssFiles(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

/** Strip /* … *\/ comments so commented-out examples never trip the scanner. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Rough rule splitter: captures `selector { body }` pairs (no nested braces in this codebase's CSS). */
function rules(css: string): Array<{selector: string; body: string}> {
  const out: Array<{selector: string; body: string}> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push({selector: m[1].trim(), body: m[2]});
  return out;
}

describe('cart-drawer aside scoping', () => {
  const files = cssFiles(STYLES_DIR).map((path) => ({
    path,
    css: stripComments(readFileSync(path, 'utf8')),
  }));

  it('has CSS to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('never styles the bare `aside` element with positioning (must be class-scoped)', () => {
    const offenders: string[] = [];
    for (const {path, css} of files) {
      for (const {selector, body} of rules(css)) {
        // Each comma-separated selector; a bare element `aside` is the hazard.
        const hasBareAside = selector
          .split(',')
          .map((s) => s.trim().replace(/\s+/g, ' '))
          .some((s) => s === 'aside' || s.endsWith(' aside') || s.endsWith('>aside'));
        if (!hasBareAside) continue;
        if (/\b(position|inset|top|right|bottom|left|width|height|inline-size|block-size|box-shadow)\s*:/.test(body)) {
          offenders.push(`${path.split(/[\\/]/).slice(-2).join('/')} — "${selector.trim()}"`);
        }
      }
    }
    expect(
      offenders,
      `Unscoped global <aside> positioning reintroduced (scope it to the cart drawer, e.g. .ng-drawer):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps the cart drawer styled by its own scoped selector', () => {
    const shell = readFileSync(join(STYLES_DIR, 'shell.css'), 'utf8');
    expect(shell).toMatch(/\.ng-drawer\s*\{/);
    expect(shell).toMatch(/\.ng-drawer-scrim\s*\{/);
    expect(shell).toMatch(/\.ng-scroll-locked\s*\{/); // body-scroll lock, not html:has(.overlay)
  });
});
