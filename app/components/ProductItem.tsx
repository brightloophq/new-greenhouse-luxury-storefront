import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {RecommendedProductFragment} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';
import {useExperience} from '~/components/ExperienceProvider';

export function ProductItem({
  product,
  loading,
}: {
  product: RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const {experience} = useExperience();
  const deluxe = experience === 'deluxe';
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
        {/* Luxury flourish only in Deluxe; the wholesale row stays unadorned. */}
        {deluxe ? (
          <span className="product-item-badge">The Greenhouse Edit</span>
        ) : null}
        <span className="product-item-quick">
          {deluxe ? 'View arrangement' : 'View product'}
        </span>
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
