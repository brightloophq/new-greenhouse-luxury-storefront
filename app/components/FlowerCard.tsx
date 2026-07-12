import {Link} from 'react-router';
import {
  type Flower,
  FLOWER_IMAGE_RATIO,
  flowerHref,
  flowerSrc,
  flowerSrcSet,
  formatJmd,
} from '~/data/flowers';

interface FlowerCardProps {
  flower: Flower;
  /**
   * When true the image loads eagerly with high priority (use for the first
   * viewport row only). All other cards lazy-load.
   */
  priority?: boolean;
  /** Size hint for the browser's srcset selection. */
  sizes?: string;
}

const DEFAULT_SIZES =
  '(min-width: 1100px) 300px, (min-width: 700px) 30vw, 45vw';

/**
 * The single, reusable flower card. Every flower on the site renders through
 * this component — adding varieties is a data-only change (see app/data/flowers.ts).
 */
export function FlowerCard({
  flower,
  priority = false,
  sizes = DEFAULT_SIZES,
}: FlowerCardProps) {
  const soldOut = flower.availability === 'coming-soon';

  return (
    <Link
      to={flowerHref(flower)}
      prefetch="intent"
      className="flower-card"
      aria-label={`${flower.name} — shop ${flower.family}`}
    >
      <span className="flower-card-media">
        <img
          className="flower-card-img"
          src={flowerSrc(flower.image)}
          srcSet={flowerSrcSet(flower.image)}
          sizes={sizes}
          width={FLOWER_IMAGE_RATIO.width}
          height={FLOWER_IMAGE_RATIO.height}
          alt={flower.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
        {flower.availability === 'seasonal' ? (
          <span className="flower-card-badge">Seasonal</span>
        ) : null}
        {soldOut ? <span className="flower-card-badge">Coming soon</span> : null}
      </span>
      <span className="flower-card-body">
        <span className="flower-card-name">{flower.name}</span>
        <span className="flower-card-meta">
          <span className="flower-card-color">{flower.color}</span>
          {flower.price != null ? (
            <span className="flower-card-price">{formatJmd(flower.price)}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
