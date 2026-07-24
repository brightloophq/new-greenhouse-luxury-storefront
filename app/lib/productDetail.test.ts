import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Step 9 — editorial product detail (presentation only). These lock the thing
 * that matters: the classic PDP is recomposed from the EXISTING Shopify
 * components and data, the deluxe/premium PDP is left untouched, and no product,
 * variant, price, image or cart logic is reimplemented.
 */
describe('PDP route — classic recomposed, deluxe untouched', () => {
  const route = read('app/routes/($locale).products.$handle.tsx');

  it('renders the editorial detail for classic and keeps the deluxe markup', () => {
    expect(route).toMatch(/if \(!deluxe\)[\s\S]{0,120}<EditorialProductDetail/);
    // Deluxe still renders its own approved markup below.
    expect(route).toMatch(/className="product commerce-product"/);
    expect(route).toMatch(/className="product-main"/);
  });

  it('preserves the Shopify product loader, variant and query logic', () => {
    expect(route).toMatch(/useOptimisticVariant/);
    expect(route).toMatch(/getProductOptions/);
    expect(route).toMatch(/PRODUCT_QUERY/);
    expect(route).toMatch(/PRODUCT_RECOMMENDATIONS_QUERY/);
    expect(route).toMatch(/productRecommendations/);
    // structured data + analytics still present
    expect(route).toMatch(/script:ld\+json/);
    expect(route).toMatch(/Analytics\.ProductView/);
  });
});

describe('EditorialProductDetail — delegates, never reimplements', () => {
  const pdp = read('app/components/product/EditorialProductDetail.tsx');

  it('uses the existing product components for every commerce surface', () => {
    expect(pdp).toMatch(/ProductForm/); // variants + quantity + add-to-cart, unchanged
    expect(pdp).toMatch(/ProductPrice/); // price + compare-at, unchanged
    expect(pdp).toMatch(/ProductImage/); // gallery image, unchanged
    expect(pdp).toMatch(/ProductGrid/); // related, existing card
    expect(pdp).toMatch(/Analytics\.ProductView/);
  });

  it('never reimplements cart, variant, price or quantity logic', () => {
    expect(pdp).not.toMatch(/CartForm|merchandiseId|LinesAdd/); // cart stays in AddToCartButton
    expect(pdp).not.toMatch(/useState|useNavigate/); // no local variant/quantity state
    expect(pdp).not.toMatch(/<input|type="password"/);
  });

  it('preserves title, price, compare-at, sku, images and description', () => {
    expect(pdp).toMatch(/\{title\}/);
    expect(pdp).toMatch(/price=\{selectedVariant\?\.price\}/);
    expect(pdp).toMatch(/compareAtPrice=\{selectedVariant\?\.compareAtPrice\}/);
    expect(pdp).toMatch(/selectedVariant\?\.sku/);
    expect(pdp).toMatch(/product\.images\?\.nodes/);
    expect(pdp).toMatch(/dangerouslySetInnerHTML=\{\{__html: descriptionHtml\}\}/);
  });

  it('reveals with the existing GSAP hook and fabricates no attributes', () => {
    expect(pdp).toMatch(/useReveal/);
    // Only real product data — no invented care/size/origin fields beyond the
    // approved static care + delivery copy the page already carried.
    expect(pdp).not.toMatch(/lorem|placeholder|verdant/i);
  });
});

describe('related products keep the existing recommendation logic', () => {
  const route = read('app/routes/($locale).products.$handle.tsx');
  it('still filters recommendations by experience and caps at four', () => {
    expect(route).toMatch(/recommendations/);
    expect(route).toMatch(/productInExperience/);
    expect(route).toMatch(/\.slice\(0, 4\)/);
  });
});

describe('product stylesheet stays scoped + on-brand', () => {
  const css = read('app/styles/product.css');

  it('is classic-only — no premium token leak (deluxe keeps its own styling)', () => {
    expect(css).not.toMatch(/--ng-premium-/);
  });

  it('recomposes the page responsively (image-first on mobile)', () => {
    expect(css).toMatch(/@media \(max-width: 60em\)[\s\S]*?\.ng-pdp-hero,[\s\S]*?grid-template-columns: 1fr/);
  });

  it('names only the brand faces and stays fully class-scoped', () => {
    const families = css.match(/font-family:[^;]+;/g) ?? [];
    for (const f of families) expect(f).toMatch(/var\(--ng-font-(heading|body)\)/);
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = stripped.split('\n').filter((l) => /^[a-z][\w-]*\s*[,{]/.test(l));
    expect(bare).toEqual([]);
  });
});
