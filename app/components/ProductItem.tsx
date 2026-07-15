import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {RecommendedProductFragment} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product: RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      <span className="product-item-media">
        {image ? (
          <Image
            alt={image.altText || product.title}
            aspectRatio="4/5"
            data={image}
            loading={loading}
            sizes="(min-width: 80em) 320px, (min-width: 45em) 25vw, 50vw"
          />
        ) : (
          <span className="product-item-placeholder" aria-hidden="true" />
        )}
        <span className="product-item-quick">View details</span>
      </span>
      <span className="product-item-copy">
        <span className="product-item-title">{product.title}</span>
        <small>
          <Money data={product.priceRange.minVariantPrice} />
        </small>
      </span>
    </Link>
  );
}
