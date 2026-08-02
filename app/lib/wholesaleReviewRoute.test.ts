import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it, expect} from 'vitest';

// Source-level guards for the internal review route: prove GET is read-only, the
// action verifies the token and matches its action, and secrets stay server-side.
const src = readFileSync(
  join(__dirname, '..', 'routes', 'internal.wholesale.review.tsx'),
  'utf8',
);

const loaderSrc = src.slice(
  src.indexOf('export async function loader'),
  src.indexOf('export async function action'),
);
const actionSrc = src.slice(src.indexOf('export async function action'));

describe('internal review route — HTTP safety + security shape', () => {
  it('exports a GET loader and a POST action', () => {
    expect(src).toMatch(/export async function loader/);
    expect(src).toMatch(/export async function action/);
  });

  it('the loader (GET) performs NO write — read-only for scanners/previews', () => {
    expect(loaderSrc).not.toContain('writeWholesaleDecision');
    expect(loaderSrc).not.toContain('commitReviewDecision');
    expect(loaderSrc).not.toContain('metafieldsSet');
  });

  it('the action verifies the token, matches the action, then commits', () => {
    expect(actionSrc).toContain('verifyReviewToken');
    expect(actionSrc).toContain('formAction !== act');
    expect(actionSrc).toContain('commitReviewDecision');
  });

  it('uses the server-only Admin client and NOT the Customer Account API', () => {
    expect(src).toContain('shopifyAdmin');
    expect(src).not.toContain('customerAccount');
  });

  it('is marked noindex (never enters search/analytics)', () => {
    expect(src).toMatch(/noindex/);
  });

  it('never hardcodes a Shopify token or the signing secret', () => {
    expect(src).not.toMatch(/shpat_[A-Za-z0-9]/);
    expect(src).not.toContain('WHOLESALE_REVIEW_SIGNING_SECRET =');
  });
});
