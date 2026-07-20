import type {ComponentProps} from 'react';
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';

/** Minimal product shape rendered by every catalogue grid. */
export interface CatalogueProduct {
  id: string;
  handle: string;
  title: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: readonly string[] | null;
  availableForSale?: boolean | null;
  featuredImage?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {minVariantPrice: ComponentProps<typeof Money>['data']};
  compareAtPriceRange?: {
    minVariantPrice: ComponentProps<typeof Money>['data'];
  } | null;
}

/**
 * Presentation variants. The catalogue a product belongs to decides the card —
 * the card never decides the theme. Premium styling is applied by the route via
 * `<html data-experience="deluxe">`, not by this component.
 *
 *   retail    — generous imagery, gifting-first (also used by Arrangements)
 *   wholesale — denser grid, trade pricing framed "per box"
 *   supply    — product-type spec line instead of gifting copy
 *   premium   — same markup, elevated by the route theme
 */
export type CatalogueCardVariant =
  | 'retail'
  | 'wholesale'
  | 'supply'
  | 'premium';

export function CatalogueCard({
  product,
  variant = 'retail',
}: {
  product: CatalogueProduct;
  variant?: CatalogueCardVariant;
}) {
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange?.minVariantPrice;
  const onSale =
    compareAt != null && Number(compareAt.amount) > Number(price.amount);
  const soldOut = product.availableForSale === false;

  return (
    <Link
      className={`ng-shopcat-card ng-shopcat-card--${variant}`}
      to={`/products/${product.handle}`}
      prefetch="intent"
    >
      <span className="ng-shopcat-card-media">
        {product.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            width={product.featuredImage.width ?? undefined}
            height={product.featuredImage.height ?? undefined}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="ng-shopcat-card-noimg" aria-hidden="true" />
        )}
        {soldOut ? (
          <span className="ng-shopcat-card-flag">Sold out</span>
        ) : onSale ? (
          <span className="ng-shopcat-card-flag ng-shopcat-card-flag--sale">Sale</span>
        ) : null}
      </span>

      <span className="ng-shopcat-card-body">
        <span className="ng-shopcat-card-title">{product.title}</span>

        {/* Supplies are bought on specification, not sentiment. */}
        {variant === 'supply' && product.productType ? (
          <span className="ng-shopcat-card-spec">{product.productType}</span>
        ) : null}

        <span className="ng-shopcat-card-price">
          <Money data={price} />
          {onSale ? (
            <s className="ng-shopcat-card-was">
              <Money data={compareAt} />
            </s>
          ) : null}
          {variant === 'wholesale' ? (
            <span className="ng-shopcat-card-unit"> / box</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
