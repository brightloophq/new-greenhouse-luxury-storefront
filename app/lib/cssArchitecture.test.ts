import {readdirSync, readFileSync} from 'node:fs';
import {basename, join} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * CSS ARCHITECTURE GUARD (hardening sprint).
 *
 * The architecture rule, learned from the cart-drawer `aside {…}` leak: global
 * bare-element styling that controls LAYOUT belongs ONLY in the base layer
 * (reset / design-system / tailwind). Component stylesheets must scope layout to
 * classes, so a rule can never silently reach an unrelated <aside>, <section>,
 * <main>, <img>, etc. These tests fail if that boundary is crossed again.
 */
const STYLES_DIR = join(__dirname, '..', 'styles');

/** The sanctioned base layer — the only files allowed global element layout rules. */
const BASE_LAYER = new Set(['reset.css', 'design-system.css', 'tailwind.css']);

/** Properties that make a global element selector a layout/positioning hazard. */
const LAYOUT_PROP =
  /(^|[;{]\s*)(position|inset|top|right|bottom|left|width|min-width|max-width|height|min-height|max-height|inline-size|block-size|min-inline-size|max-inline-size|min-block-size|max-block-size|display|grid-template|grid-column|grid-row|flex|float|transform|z-index|overflow)\s*:/;

function cssFiles(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return cssFiles(full);
    return e.name.endsWith('.css') ? [full] : [];
  });
}
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** A selector token is component-anchored if it carries a class, id, or attribute. */
const anchored = (sel: string) => /[.#\[]/.test(sel);
/** Keyframe steps / at-rule preludes / the universal + custom-prop roots aren't element leaks. */
const nonElement = (sel: string) =>
  /^(from|to|\d+%|:root|\*|html|body)$/i.test(sel.trim()) || sel.trim().startsWith('@') || sel.includes('*');

/**
 * Collect TOP-LEVEL rules only (selector opens at column 0). Native-nested rules
 * are indented, so this never mistakes a scoped `.card { img { … } }` for a global.
 */
function topLevelRules(css: string): Array<{selector: string; body: string}> {
  const lines = css.split('\n');
  const out: Array<{selector: string; body: string}> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^([a-zA-Z][^.#\[{}]*?)\{/.exec(line); // col-0 element selector opening a block
    if (!m) continue;
    const selector = m[1].trim();
    if (!selector || selector.startsWith('@')) continue;
    // gather body until a column-0 closing brace
    let body = line.slice(m.index + m[0].length);
    let j = i;
    while (j < lines.length && !/^\}/.test(lines[j] === line ? body : lines[j])) {
      j++;
      if (j < lines.length && !/^\}/.test(lines[j])) body += '\n' + lines[j];
      else break;
    }
    out.push({selector, body});
  }
  return out;
}

describe('CSS architecture — no leaked global element layout selectors', () => {
  const files = cssFiles(STYLES_DIR);

  it('scans the stylesheets', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('component stylesheets scope all layout to classes (no global element layout rules)', () => {
    const offenders: string[] = [];
    for (const path of files) {
      if (BASE_LAYER.has(basename(path))) continue; // base layer may set element defaults
      const css = stripComments(readFileSync(path, 'utf8'));
      for (const {selector, body} of topLevelRules(css)) {
        const bare = selector
          .split(',')
          .map((s) => s.trim())
          .some((s) => s && !anchored(s) && !nonElement(s));
        if (bare && LAYOUT_PROP.test(body)) {
          offenders.push(`${basename(path)} — "${selector}"`);
        }
      }
    }
    expect(
      offenders,
      `Global element selector controlling layout found in a component stylesheet.\n` +
        `Scope it to a component class, or move a true base default into reset.css.\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('never styles the bare `aside` element with positioning anywhere (cart-drawer leak guard)', () => {
    const offenders: string[] = [];
    for (const path of files) {
      const css = stripComments(readFileSync(path, 'utf8'));
      const re = /([^{}]+)\{([^{}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css))) {
        const hasBareAside = m[1]
          .split(',')
          .map((s) => s.trim().replace(/\s+/g, ' '))
          .some((s) => s === 'aside' || s.endsWith(' aside') || s.endsWith('>aside'));
        if (hasBareAside && /\b(position|inset|top|right|bottom|left|width|height|inline-size|block-size|box-shadow)\s*:/.test(m[2])) {
          offenders.push(`${basename(path)} — "${m[1].trim()}"`);
        }
      }
    }
    expect(offenders, `Unscoped <aside> positioning reintroduced:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps the cart drawer styled by its own scoped selectors', () => {
    const shell = readFileSync(join(STYLES_DIR, 'shell.css'), 'utf8');
    expect(shell).toMatch(/\.ng-drawer\s*\{/);
    expect(shell).toMatch(/\.ng-drawer-scrim\s*\{/);
    expect(shell).toMatch(/\.ng-scroll-locked\s*\{/);
  });
});
