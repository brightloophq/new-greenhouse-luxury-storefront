/**
 * Storefront regression guard.
 *
 * These lock the APPROVED experience in place: the four-pathway homepage, one
 * unified green navigation, premium styling confined to Premium/Deluxe, and the
 * Admin tooling surviving any future UI restoration. Each test exists because
 * the thing it checks was either removed on purpose or actually broke once.
 */
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {MAIN_NAV, navFor} from './navigation';
import {themeForPath, PREMIUM_ROUTE} from './experience';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Strip comments before asserting on content. A comment explaining that the
 * heritage section was REMOVED must not read as the section being present.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HOMEPAGE = stripComments(read('app/routes/($locale)._index.tsx'));
const CHOOSER = read('app/components/home/ExperienceChooser.tsx');
const FOOTER = read('app/components/Footer.tsx');
const HOME_CSS = read('app/styles/home.css');

/* -------------------------------------------------------------------------- */
/* 1–4. Homepage composition                                                  */
/* -------------------------------------------------------------------------- */

describe('homepage', () => {
  it('offers exactly four shopping cards', () => {
    const titles = [...CHOOSER.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
    expect(titles).toEqual(['Wholesale', 'Retail', 'Arrangements', 'Supplies']);
  });

  it('renders exactly the three approved sections, in order', () => {
    // Hero → four shopping paths → variety discovery. Anything else appearing
    // here is a regression, not an addition.
    const components = [...HOMEPAGE.matchAll(/<([A-Z]\w+)/g)].map((m) => m[1]);
    expect(components).toEqual([
      'BrandHero',
      'ExperienceChooser',
      'ShopByVariety',
    ]);
  });

  it('has no heritage / four-decades section', () => {
    expect(HOMEPAGE).not.toMatch(/heritage|four decades|since 1984|our story/i);
  });

  it('has no testimonials', () => {
    expect(HOMEPAGE).not.toMatch(/testimonial|review|what .*clients? say/i);
  });

  it('has no newsletter or trade-list capture', () => {
    expect(HOMEPAGE).not.toMatch(/newsletter|trade list|subscribe|mailing list/i);
  });

  it('has no announcement bar', () => {
    expect(HOMEPAGE).not.toMatch(/AnnouncementBar/);
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Premium theme containment                                               */
/* -------------------------------------------------------------------------- */

describe('theme resolution', () => {
  const GREEN_ROUTES = [
    '/',
    '/retail',
    '/retail/flowers',
    '/retail/supplies',
    '/wholesale',
    '/wholesale/flowers',
    '/wholesale/supplies',
    '/arrangements',
    '/arrangements/mixed',
    '/arrangements/occasion',
    '/arrangements/occasion/birthday',
    '/supplies',
    '/supplies/ribbon',
    '/about',
    '/contact',
    '/reviews',
  ];

  it.each(GREEN_ROUTES)('%s stays green', (route) => {
    expect(themeForPath(route)).toBe('classic');
  });

  it.each([
    PREMIUM_ROUTE,
    `${PREMIUM_ROUTE}/handcrafted`,
    `${PREMIUM_ROUTE}/vase`,
    `${PREMIUM_ROUTE}/heart-box`,
  ])('%s is premium', (route) => {
    expect(themeForPath(route)).toBe('deluxe');
  });

  it('every premium CSS override is scoped to [data-experience=deluxe]', () => {
    // A premium rule that isn't scoped leaks the dark treatment onto green
    // pages. Every dark-surface hex in home.css must sit inside a deluxe block.
    const unscoped = HOME_CSS.split('\n').filter(
      (line, i, lines) =>
        /#14100c|#1d1811|#241d15/i.test(line) &&
        !lines
          .slice(0, i + 1)
          .reverse()
          .find((l) => l.includes('{') || l.includes('}'))
          ?.includes('data-experience'),
    );
    expect(unscoped).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Navigation                                                              */
/* -------------------------------------------------------------------------- */

describe('global navigation', () => {
  it('is the approved six items', () => {
    expect(MAIN_NAV.primary.map((i) => i.label)).toEqual([
      'Home',
      'Wholesale',
      'Retail',
      'Arrangements',
      'Supplies',
      'About',
    ]);
  });

  it('exposes no Premium/Deluxe entry — premium is reached through Arrangements', () => {
    const labels = [
      ...MAIN_NAV.primary.map((i) => i.label),
      ...MAIN_NAV.mega.flatMap((c) => [c.title, ...c.links.map((l) => l.label)]),
      ...MAIN_NAV.footerShop.map((l) => l.label),
    ];
    expect(labels.join(' ')).not.toMatch(/premium|deluxe|luxury/i);
  });

  it('has no Classic/Deluxe toggle anywhere in the shell', () => {
    expect(existsSync(join(ROOT, 'app/components/ExperienceToggle.tsx'))).toBe(false);
    expect(read('app/components/Header.tsx')).not.toMatch(/ExperienceToggle/);
  });

  it('is one nav regardless of experience', () => {
    expect(navFor('deluxe')).toBe(navFor('classic'));
  });

  it('does not render the same links in two footer columns', () => {
    // "Services" and "Company" both listed About/Contact/Reviews — a duplicated
    // column on every page. The field backing it is gone; keep it gone.
    expect(FOOTER).not.toMatch(/footerServices/);
    expect(MAIN_NAV).not.toHaveProperty('footerServices');
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Wholesale entry                                                         */
/* -------------------------------------------------------------------------- */

describe('wholesale entry', () => {
  it('opens the auth modal from the homepage card instead of navigating', () => {
    expect(CHOOSER).toMatch(/action: 'wholesale'/);
    expect(CHOOSER).toMatch(/WholesaleAuthModal/);
    // The Wholesale card must be a button (opens the modal), never a Link.
    expect(CHOOSER).toMatch(/card\.action === 'wholesale' \?[\s\S]{0,120}<button/);
  });

  it('returns focus to the element that opened it', () => {
    const modal = read('app/components/wholesale/WholesaleAuthModal.tsx');
    expect(modal).toMatch(/openerRef/);
    // Captured before focus moves into the dialog, restored in cleanup.
    expect(modal).toMatch(/openerRef\.current = document\.activeElement/);
    expect(modal).toMatch(/opener\?\.isConnected.*\n?.*opener\.focus\(\)/);
  });

  it('renders the Wholesale button identically to the anchor cards', () => {
    // Wholesale is a <button> and the other three are <a>. Without an explicit
    // reset the button inherits the design system's uppercase button styling,
    // and Wholesale alone shouts in ALL CAPS across the homepage's main row.
    const css = read('app/styles/home.css');
    const rule = css.slice(
      css.indexOf('.ng-chooser-card {'),
      css.indexOf('.ng-chooser-card:hover'),
    );
    expect(rule).toMatch(/text-transform: none/);
    expect(rule).toMatch(/font: inherit/);
    expect(rule).toMatch(/text-align: start/);
  });

  it('has no manual approval gate', () => {
    const wholesale = read('app/lib/wholesale.ts');
    expect(wholesale).not.toMatch(/wholesale_approved|approvalPending|pending_approval/);
  });
});

/* -------------------------------------------------------------------------- */
/* 8. CSS class integrity                                                     */
/* -------------------------------------------------------------------------- */

describe('stylesheet integrity', () => {
  it('every ng-shopcat/ng-chooser class used by a component is defined in CSS', () => {
    // Guards the exact regression this suite was written for: a namespace
    // rename left PathwaySelector pointing at .ng-arrcat-back, whose rules had
    // been deleted, so the back link rendered as unstyled body text.
    const components = [
      'app/components/nav/PathwaySelector.tsx',
      'app/components/catalogue/CatalogueView.tsx',
      'app/components/catalogue/CatalogueCard.tsx',
      'app/components/home/ExperienceChooser.tsx',
    ];
    const allCss = HOME_CSS + read('app/styles/catalog.css');

    const orphans: string[] = [];
    for (const file of components) {
      const source = read(file);
      const classes = [...source.matchAll(/className="([^"$]+)"/g)]
        .flatMap((m) => m[1].split(/\s+/))
        .filter((c) => /^ng-(shopcat|chooser|arrcat)/.test(c));
      for (const cls of new Set(classes)) {
        if (!allCss.includes(`.${cls}`)) orphans.push(`${file}: .${cls}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 9. Admin tooling preservation                                              */
/* -------------------------------------------------------------------------- */

describe('admin tooling survives storefront restoration', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
  };

  it('keeps every shopify:* script entry', () => {
    for (const name of [
      'shopify:collections',
      'shopify:metafields',
      'shopify:tags',
      'shopify:setup',
    ]) {
      expect(pkg.scripts).toHaveProperty(name);
    }
  });

  it('keeps the script files and the merchant documentation', () => {
    for (const file of [
      'scripts/shopify/admin.mjs',
      'scripts/shopify/collections.mjs',
      'scripts/shopify/metafields.mjs',
      'scripts/shopify/tags.mjs',
      'docs/MERCHANT-ACTIONS.md',
    ]) {
      expect(existsSync(join(ROOT, file))).toBe(true);
    }
  });

  it('never writes to Shopify without an explicit --apply', () => {
    const admin = read('scripts/shopify/admin.mjs');
    expect(admin).toMatch(/isApply\s*=\s*process\.argv\.includes\('--apply'\)/);
    for (const file of ['collections', 'metafields', 'tags']) {
      expect(read(`scripts/shopify/${file}.mjs`)).toMatch(/isApply/);
    }
  });

  it('keeps token redaction in place', () => {
    const admin = read('scripts/shopify/admin.mjs');
    expect(admin).toMatch(/redact/);
    expect(admin).toMatch(/shpat_/);
    // Errors must be redacted, never raw.
    expect(admin).toMatch(/throw new Error\(\s*redact\(/);
  });
});
