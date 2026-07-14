import {Image} from '@shopify/hydrogen';

/** Structural image shape — accepts either a variant image or a product media. */
export interface ProductImageData {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export function ProductImage({
  image,
  aspectRatio = '1/1',
}: {
  image?: ProductImageData | null;
  /** Frame ratio — Deluxe passes '4/5' for portrait arrangements; Classic keeps '1/1'. */
  aspectRatio?: string;
}) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div className="product-image">
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio={aspectRatio}
        data={image}
        key={image.id ?? image.url}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}
