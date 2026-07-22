import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {COMPANY, CONTACT} from '~/lib/companyContent';
import {HOME_CONTENT, HOMEPAGE_REVIEW_RATING} from '~/lib/homeContent';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 7 — About · Contact · Reviews (presentation only). These lock the thing
 * that matters most on these pages: not one item of approved business content,
 * contact detail or review is lost, invented, or de-linked, and the shared page
 * language stays scoped + on-brand.
 */
describe('About — brand story preserves approved content', () => {
  const about = read('app/routes/about.tsx');

  it('is composed in the shared editorial page language', () => {
    expect(about).not.toMatch(/PathwaySelector/);
    expect(about).toMatch(/ng-info/);
    expect(about).toMatch(/GlasshouseDivider/); // shared glazing seam
    expect(about).toMatch(/useReveal/); // shared reveal
  });

  it('keeps every approved fact from companyContent', () => {
    // Sourced from the single source of truth, never hard-coded.
    expect(about).toMatch(/COMPANY\.name/);
    expect(about).toMatch(/COMPANY\.story/); // the approved family-florist story belongs here
    expect(about).toMatch(/COMPANY\.experienceBlurb/);
    expect(about).toMatch(/COMPANY\.establishedYear/);
    expect(about).toMatch(/CONTACT\.address\.full/);
    expect(about).toMatch(/CONTACT\.phones\[0\]/);
    expect(about).toMatch(/CONTACT\.email/);
    // the year is the real one, unchanged.
    expect(COMPANY.establishedYear).toBe(1984);
  });

  it('invents nothing and restores no removed sections', () => {
    // strip comments so the guard checks rendered copy, not our own annotations.
    const body = about.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(body).not.toMatch(/founder|award|since 19[0-9]{2}|newsletter|floral circle|trade list/i);
  });
});

describe('Contact — every real detail preserved and tappable', () => {
  const contact = read('app/routes/contact.tsx');

  it('is composed in the shared editorial page language', () => {
    expect(contact).toMatch(/ng-info/);
    expect(contact).toMatch(/GlasshouseDivider/);
    expect(contact).toMatch(/useReveal/);
  });

  it('keeps address, both phones, email, WhatsApp, delivery and socials', () => {
    expect(contact).toMatch(/CONTACT\.address\.full/);
    expect(contact).toMatch(/CONTACT\.phones\.map/); // both numbers, not just one
    expect(contact).toMatch(/CONTACT\.whatsapp\.href/);
    expect(contact).toMatch(/mailto:\$\{CONTACT\.email\}/);
    expect(contact).toMatch(/DELIVERY_CUTOFF/);
    expect(contact).toMatch(/CONTACT\.social\.instagram/);
    expect(contact).toMatch(/CONTACT\.social\.facebook/);
    // the tel: hrefs come straight from the data.
    expect(CONTACT.phones).toHaveLength(2);
    expect(CONTACT.phones[0].href).toMatch(/^tel:/);
  });

  it('does not fabricate a form, hours, or contact info that does not exist', () => {
    expect(contact).not.toMatch(/<form|onSubmit|opening hours|Mon(day)?\s*[-–]/i);
  });
});

describe('Reviews — real ratings and testimonials, richer format', () => {
  const reviews = read('app/routes/reviews.tsx');
  const t = HOME_CONTENT.classic.testimonials;

  it('is composed in the shared editorial page language', () => {
    expect(reviews).toMatch(/ng-info/);
    expect(reviews).toMatch(/ng-reviews-wall/);
    expect(reviews).toMatch(/useReveal/);
  });

  it('draws from the existing approved testimonial + rating data, not new copy', () => {
    expect(reviews).toMatch(/HOME_CONTENT\.classic\.testimonials/); // the page's own testimonials
    expect(reviews).toMatch(/t\.items/);
    expect(reviews).toMatch(/HOMEPAGE_REVIEW_RATING/); // the REAL exported Google aggregate
    expect(reviews).toMatch(/rating\.href/); // external Google link
    expect(reviews).toMatch(/rating\.score/);
    expect(reviews).toMatch(/rating\.count/);
  });

  it('keeps the REAL aggregate rating and link unchanged', () => {
    // The aggregate is the shared, real Google figure — never raised or invented.
    expect(HOMEPAGE_REVIEW_RATING.score).toBe('4.5');
    expect(HOMEPAGE_REVIEW_RATING.count).toBe(44);
    expect(HOMEPAGE_REVIEW_RATING.href).toMatch(/^https:\/\/maps\.app\.goo\.gl\//);
    // Every current testimonial is preserved.
    expect(t.items.length).toBeGreaterThanOrEqual(3);
  });
});

describe('navigation + footer destinations remain correct', () => {
  const nav = read('app/lib/navigation.ts');

  it('the About dropdown still points at /about, /contact, /reviews', () => {
    expect(nav).toMatch(/to: '\/about'/);
    expect(nav).toMatch(/to: '\/contact'/);
    expect(nav).toMatch(/to: '\/reviews'/);
  });
});

describe('informational stylesheet stays scoped + on-brand', () => {
  const css = read('app/styles/informational.css');

  it('carries no premium token leak (these routes are never deluxe)', () => {
    expect(css).not.toMatch(/--ng-premium-/);
  });

  it('names no font family other than the brand tokens (Montserrat / Raleway)', () => {
    // Every font-family must be a token; no raw mockup faces.
    const families = css.match(/font-family:[^;]+;/g) ?? [];
    for (const f of families) {
      expect(f).toMatch(/var\(--ng-font-(heading|body)\)/);
    }
    expect(css).not.toMatch(/Fraunces|Jost|Cormorant|Playfair|Georgia|Times/);
  });

  it('has no bare global element selectors (only .ng-info* / .ng-about* / …)', () => {
    // No top-level (column-0) rule may open with a bare element selector.
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = stripped
      .split('\n')
      .filter((l) => /^[a-z][\w-]*\s*[,{]/.test(l));
    expect(bare).toEqual([]);
  });
});
