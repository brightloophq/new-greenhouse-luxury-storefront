import {useRef} from 'react';
import {Link} from 'react-router';
import {Analytics, Image, type MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {ProductGrid} from '~/components/catalog/ProductGrid';
import type {CatalogProduct} from '~/components/catalog/types';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {useReveal} from '~/lib/useReveal';
import {DELIVERY_CUTOFF} from '~/lib/companyContent';

/**
 * The CLASSIC editorial product detail — a botanical exhibition plate. Deluxe /
 * premium keeps its own (untouched) presentation; this is only rendered for the
 * classic experience. Presentation only: every Shopify component, variant, price,
 * image, description, add-to-cart form, recommendation and analytics call is the
 * existing one, recomposed into the editorial page language.
 */
const ASSURANCES = [
  'Wholesale pricing available',
  'Fresh, graded stems',
  'Island-wide delivery by arrangement',
];

export function EditorialProductDetail({
  product,
  selectedVariant,
  productOptions,
  related,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  productOptions: MappedProductOptions[];
  related: CatalogProduct[];
}) {
  const scope = useRef<HTMLDivElement>(null);
  useReveal(scope);

  const {title, descriptionHtml, vendor} = product;
  const galleryImages = product.images?.nodes ?? [];
  const primaryImage = selectedVariant?.image ?? galleryImages[0] ?? null;
  const secondaryImages = galleryImages.filter(
    (image) => image?.url && image.url !== primaryImage?.url,
  );
  const available = Boolean(selectedVariant?.availableForSale);
  const sku = selectedVariant?.sku;
  const total = secondaryImages.length + 1;

  return (
    <div ref={scope} className="ng-pdp">
      <nav className="ng-pdp-crumb" aria-label="Breadcrumb">
        <Link to="/" prefetch="intent">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="ng-pdp-hero">
        <section
          className="ng-pdp-gallery"
          aria-label={`${title} imagery`}
          data-reveal-item
        >
          <div className="ng-pdp-frame ng-pdp-frame--main">
            <ProductImage image={primaryImage} aspectRatio="1/1" />
            {total > 1 ? (
              <span className="ng-pdp-frame-num" aria-hidden="true">
                01 / {String(total).padStart(2, '0')}
              </span>
            ) : null}
          </div>
          {secondaryImages.length ? (
            <ul className="ng-pdp-strip">
              {secondaryImages.map((image, index) => (
                <li key={image.id ?? image.url} className="ng-pdp-frame">
                  <Image
                    data={image}
                    alt={image.altText ?? title}
                    aspectRatio="1/1"
                    sizes="(min-width: 60em) 20vw, 40vw"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="ng-pdp-frame-num" aria-hidden="true">
                    {String(index + 2).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="ng-pdp-buy" data-reveal-heading>
          <p className="ng-pdp-kicker">{vendor || 'The New Greenhouse'}</p>
          <h1 className="ng-pdp-title ng-editorial-title">{title}</h1>
          <div className="ng-pdp-price">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
            <span className={`ng-pdp-stock${available ? '' : ' is-out'}`}>
              {available ? 'Available' : 'Sold out'}
            </span>
          </div>
          <p className="ng-pdp-delivery">
            Same-day delivery may be available across Kingston &amp; St. Andrew
            for orders placed before {DELIVERY_CUTOFF}, Monday–Saturday.
          </p>

          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />

          <div className="ng-pdp-trade">
            <p className="ng-pdp-trade-title">Buying for a business or event?</p>
            <small>
              Volume and standing-order pricing is available for florists,
              planners, hotels and offices.{' '}
              <Link to="/contact">Ask about trade pricing →</Link>
            </small>
          </div>

          <ul className="ng-pdp-assurances" aria-label="Purchase assurances">
            {ASSURANCES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <GlasshouseDivider className="ng-pdp-seam" />

      <div className="ng-pdp-detail" data-reveal-item>
        {descriptionHtml ? (
          <div className="ng-pdp-story">
            <p className="ng-pdp-detail-label">Product details</p>
            <div
              className="ng-pdp-story-body"
              dangerouslySetInnerHTML={{__html: descriptionHtml}}
            />
          </div>
        ) : null}
        <dl className="ng-pdp-spec">
          <div>
            <dt>Availability</dt>
            <dd>{available ? 'In stock' : 'Sold out'}</dd>
          </div>
          {sku ? (
            <div>
              <dt>SKU</dt>
              <dd>{sku}</dd>
            </div>
          ) : null}
          <div>
            <dt>Flower care</dt>
            <dd>
              Refresh water daily, keep blooms away from direct sunlight, and
              remove fading stems to preserve the arrangement.
            </dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>
              Our team confirms timing after purchase and prepares each order
              with care for local delivery or collection.
            </dd>
          </div>
        </dl>
      </div>

      {related.length ? (
        <section className="ng-pdp-related" data-reveal-item>
          <div className="ng-pdp-related-head">
            <p className="ng-pdp-kicker">You may also like</p>
            <h2 className="ng-pdp-related-title ng-editorial-title">
              Complete the gesture.
            </h2>
          </div>
          <ProductGrid products={related} />
        </section>
      ) : (
        <section
          className="ng-pdp-related ng-pdp-related--curated"
          data-reveal-item
        >
          <div className="ng-pdp-related-head">
            <p className="ng-pdp-kicker">Build your order</p>
            <h2 className="ng-pdp-related-title ng-editorial-title">
              Everything for your build.
            </h2>
            <p className="ng-pdp-related-copy">
              Add greenery, vases and studio supplies to complete your order in
              one delivery.
            </p>
          </div>
          <Link className="ng-pdp-related-cta" to="/collections/floral-supplies">
            Shop supplies
          </Link>
        </section>
      )}

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}
