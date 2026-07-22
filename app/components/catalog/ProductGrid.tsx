import {Fragment} from 'react';
import {ButtonLink, Button, Heading, Icon, Skeleton, Text} from '~/components/ui';
import type {CatalogProduct} from '~/components/catalog/types';
import {CatalogProductCard} from './CatalogProductCard';
import {useExperience} from '~/components/ExperienceProvider';
import {primaryShopPath} from '~/lib/navigation';

/** Number of leading cards whose images load eagerly (above the fold). */
const EAGER_COUNT = 8;

/**
 * The catalogue's single breathing room.
 *
 * A grid that never changes rhythm reads as a database. One full-measure pause
 * — placed after the first complete block of flowers — lifts the eye, offers
 * something genuinely useful, and lets the customer re-enter the collection
 * with fresh attention. Exactly one, deliberately: interrupt repeatedly and the
 * interruption becomes the new metronome.
 *
 * Presentation only. It is inserted BETWEEN rendered cards and touches no
 * product data, ordering, filtering, sorting or pagination.
 */
const MOMENT_AFTER = 8;
/** Only pause when there is a real collection to pause inside of. */
const MOMENT_MIN_PRODUCTS = 11;

export type ProductGridProps = {
  products: CatalogProduct[];
  /** When provided, each card exposes a "Quick view" control. */
  onQuickView?: (product: CatalogProduct) => void;
};

/** Responsive catalog grid: 2 cols mobile → 3 → 4 desktop. */
export function ProductGrid({products, onQuickView}: ProductGridProps) {
  const showMoment = products.length >= MOMENT_MIN_PRODUCTS;

  return (
    <ul className="ng-catalog-grid">
      {products.map((product, index) => (
        <Fragment key={product.id}>
          <li className="ng-catalog-grid-item">
            <CatalogProductCard
              product={product}
              loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
              onQuickView={onQuickView}
            />
          </li>
          {showMoment && index === MOMENT_AFTER - 1 ? (
            <CatalogMoment />
          ) : null}
        </Fragment>
      ))}
    </ul>
  );
}

/**
 * The pause itself — a pane of the greenhouse set into the grid. Drawn entirely
 * from the existing language: a glazing seam, a botanical stem in currentColor,
 * champagne eyebrow, editorial measure. No image, no JS, no dependency, so it
 * costs nothing to render and cannot shift layout.
 */
function CatalogMoment() {
  return (
    <li className="ng-catalog-moment">
      <div className="ng-catalog-moment-inner">
        <svg
          className="ng-catalog-moment-stem"
          viewBox="0 0 48 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M24 62V14" />
          <path d="M24 34c0-9-6-14-14-15 0 9 5 14 14 15Z" />
          <path d="M24 26c0-9 6-14 14-15 0 9-5 14-14 15Z" />
          <path d="M24 46c0-7-5-11-11-12 0 7 4 11 11 12Z" />
          <circle cx="24" cy="10" r="4" />
        </svg>
        <p className="ng-catalog-moment-eyebrow">From the greenhouse</p>
        <p className="ng-catalog-moment-note">
          Cut stems at an angle and change the water daily — it keeps the
          channels open and the blooms drinking for days longer.
        </p>
      </div>
    </li>
  );
}

export type ProductGridSkeletonProps = {
  count?: number;
};

/** Placeholder grid shown while the collection loads. */
export function ProductGridSkeleton({count = 8}: ProductGridSkeletonProps) {
  return (
    <div
      className="ng-catalog-grid ng-catalog-skeleton-grid"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="ng-visually-hidden">Loading products…</span>
      {Array.from({length: count}, (_, index) => `sk-${index}`).map((key) => (
        <div key={key} className="ng-catalog-skeleton-item" aria-hidden="true">
          <Skeleton ratio="product" className="ng-catalog-skeleton-media" />
          <Skeleton ratio="text" className="ng-catalog-skeleton-line" />
          <Skeleton ratio="text" className="ng-catalog-skeleton-line ng-catalog-skeleton-line-short" />
        </div>
      ))}
    </div>
  );
}

export type CatalogEmptyStateProps = {
  /** Whether active filters are narrowing the result set. */
  hasFilters?: boolean;
  /** Clears active filters (rendered as a button when `hasFilters`). */
  onClearFilters?: () => void;
};

/** Premium, generously spaced empty state for a catalog with no results. */
export function CatalogEmptyState({
  hasFilters,
  onClearFilters,
}: CatalogEmptyStateProps) {
  const {experience} = useExperience();
  return (
    <div className="ng-catalog-empty" role="status">
      <span className="ng-catalog-empty-icon" aria-hidden="true">
        <Icon name={hasFilters ? 'search' : 'flower'} size="lg" />
      </span>
      {hasFilters ? (
        <>
          <Heading as={2} size="h3" className="ng-catalog-empty-title">
            No blooms match your filters
          </Heading>
          <Text tone="secondary" className="ng-catalog-empty-text">
            Try loosening a filter or two to see more of the collection.
          </Text>
          {onClearFilters ? (
            <Button
              variant="secondary"
              onClick={onClearFilters}
              className="ng-catalog-empty-action"
            >
              Clear filters
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <Heading as={2} size="h3" className="ng-catalog-empty-title">
            This collection is being planted
          </Heading>
          <Text tone="secondary" className="ng-catalog-empty-text">
            New arrangements are being arranged with care. In the meantime,
            explore the rest of our collections.
          </Text>
          <ButtonLink
            to={primaryShopPath(experience)}
            variant="primary"
            className="ng-catalog-empty-action"
          >
            {experience === 'deluxe' ? 'Browse collections' : 'Browse the shop'}
          </ButtonLink>
        </>
      )}
    </div>
  );
}
