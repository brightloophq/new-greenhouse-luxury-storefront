import type {ComponentProps} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {Badge, PriceBlock, ProductCard} from '~/components/ui';
import type {CatalogMoney, CatalogProduct} from '~/components/catalog/types';

/** CatalogMoney is structurally compatible with Hydrogen's MoneyV2 view-model. */
const asMoney = (money: CatalogMoney) =>
  money as ComponentProps<typeof Money>['data'];

export type CatalogProductCardProps = {
  product: CatalogProduct;
  /** Image loading strategy — first rows should be "eager" for LCP. */
  loading?: 'eager' | 'lazy';
  /** When provided, renders a "Quick view" control that opens the modal. */
  onQuickView?: (product: CatalogProduct) => void;
};

const IMAGE_SIZES =
  '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw';

/**
 * Catalog-facing product card. Wraps the GraphQL-agnostic M2 `ProductCard`
 * with Hydrogen `<Image>`/`<Money>` and a hover image cross-fade. Read-only —
 * the "Quick view" control opens a modal, it never mutates the cart.
 */
export function CatalogProductCard({
  product,
  loading = 'lazy',
  onQuickView,
}: CatalogProductCardProps) {
  const {
    handle,
    title,
    featuredImage,
    images,
    priceRange,
    compareAtPriceRange,
    availableForSale,
  } = product;

  const href = `/products/${handle}`;

  // Second gallery image (skip if it's the same node as the featured image).
  const gallery = images?.nodes ?? [];
  const hoverImage =
    gallery.find(
      (img) => img && img.url && img.url !== featuredImage?.url,
    ) ?? null;

  const min = priceRange.minVariantPrice;
  const max = priceRange.maxVariantPrice;
  const isRange = min.amount !== max.amount;
  const compareAt = compareAtPriceRange?.minVariantPrice;
  const showCompare =
    compareAt && Number(compareAt.amount) > Number(min.amount);

  const media = (
    <div
      className={
        'ng-catalog-card-media' +
        (hoverImage ? ' ng-catalog-card-media-swap' : '')
      }
    >
      {featuredImage ? (
        <Image
          className="ng-catalog-card-img ng-catalog-card-img-primary"
          data={featuredImage}
          alt={featuredImage.altText ?? title}
          aspectRatio="4/5"
          sizes={IMAGE_SIZES}
          loading={loading}
        />
      ) : (
        <span
          className="ng-catalog-card-img ng-catalog-card-img-primary ng-catalog-card-noimg"
          aria-hidden="true"
        />
      )}
      {hoverImage ? (
        <Image
          className="ng-catalog-card-img ng-catalog-card-img-secondary"
          data={hoverImage}
          alt=""
          aria-hidden="true"
          aspectRatio="4/5"
          sizes={IMAGE_SIZES}
          loading="lazy"
        />
      ) : null}
    </div>
  );

  const price = (
    <PriceBlock
      price={
        <>
          {isRange ? <span className="ng-catalog-price-from">From </span> : null}
          <Money data={asMoney(min)} />
        </>
      }
      compareAt={showCompare ? <Money data={asMoney(compareAt)} /> : undefined}
    />
  );

  const badge =
    availableForSale === false ? <Badge>Sold out</Badge> : undefined;

  const quickAction = onQuickView ? (
    <button
      type="button"
      className="ng-button-secondary ng-button-sm ng-catalog-quickview-btn"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onQuickView(product);
      }}
    >
      Quick view
    </button>
  ) : undefined;

  return (
    <ProductCard
      className="ng-catalog-card"
      href={href}
      title={title}
      media={media}
      price={price}
      badge={badge}
      quickAction={quickAction}
    />
  );
}
