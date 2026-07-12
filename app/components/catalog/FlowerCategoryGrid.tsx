import {Link, useSearchParams} from 'react-router';
import {cx} from '~/components/ui';
import {FLOWER_CATEGORIES, type FlowerCategory} from '~/lib/flowerCategories';
import {categoryImageBase, flowerSrc, flowerSrcSet} from '~/data/flowers';

interface FlowerCategoryGridProps {
  /** Collection whose products the cards filter (e.g. "bulk-flowers"). */
  collectionHandle: string;
  /** Currently active flower handle (for the synced active state), if any. */
  activeFlower?: string;
}

const CARD_SIZES = '(min-width: 1100px) 22vw, (min-width: 640px) 30vw, 45vw';
// Eagerly load only the first visible row; everything else lazy-loads.
const PRIORITY_COUNT = 8;

/**
 * Premium category browser for the flower collections. Each card filters the
 * current collection to `?flower=<handle>` — the exact same action as the
 * sidebar radio, so the two stay synchronised through the URL (single source
 * of truth). Cards preserve any other active facets (channel/occasion/colour).
 */
export function FlowerCategoryGrid({
  collectionHandle,
  activeFlower,
}: FlowerCategoryGridProps) {
  const [searchParams] = useSearchParams();

  function hrefFor(handle: string): string {
    const params = new URLSearchParams(searchParams);
    params.set('flower', handle);
    params.delete('cursor');
    params.delete('direction');
    return `/collections/${collectionHandle}?${params.toString()}`;
  }

  return (
    <ul className="ng-cat-cards" aria-label="Browse flowers by variety">
      {FLOWER_CATEGORIES.map((category, i) => (
        <li key={category.handle} className="ng-cat-cards-item">
          <FlowerCategoryCard
            category={category}
            to={hrefFor(category.handle)}
            active={activeFlower === category.handle}
            priority={i < PRIORITY_COUNT}
          />
        </li>
      ))}
    </ul>
  );
}

function FlowerCategoryCard({
  category,
  to,
  active,
  priority,
}: {
  category: FlowerCategory;
  to: string;
  active: boolean;
  priority: boolean;
}) {
  const base = categoryImageBase(category.handle);

  return (
    <Link
      to={to}
      prefetch="intent"
      preventScrollReset
      className={cx('ng-cat-card', active && 'is-active')}
      aria-current={active ? 'true' : undefined}
    >
      <span className="ng-cat-card-media">
        {base ? (
          <img
            className="ng-cat-card-img"
            src={flowerSrc(base)}
            srcSet={flowerSrcSet(base)}
            sizes={CARD_SIZES}
            width={400}
            height={500}
            alt={`${category.name} flowers`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <span className="ng-cat-card-placeholder" aria-hidden="true">
            <span className="ng-cat-card-placeholder-mark">
              {category.name.charAt(0)}
            </span>
          </span>
        )}
      </span>
      <span className="ng-cat-card-body">
        <span className="ng-cat-card-name">{category.name}</span>
        <span className="ng-cat-card-cue" aria-hidden="true">
          {active ? 'Viewing' : 'Browse'}
        </span>
      </span>
    </Link>
  );
}
