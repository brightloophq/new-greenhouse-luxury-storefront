import {ButtonLink, Button, Heading, Icon, Skeleton, Text} from '~/components/ui';
import type {CatalogProduct} from '~/components/catalog/types';
import {CatalogProductCard} from './CatalogProductCard';

/** Number of leading cards whose images load eagerly (above the fold). */
const EAGER_COUNT = 8;

export type ProductGridProps = {
  products: CatalogProduct[];
  /** When provided, each card exposes a "Quick view" control. */
  onQuickView?: (product: CatalogProduct) => void;
};

/** Responsive catalog grid: 2 cols mobile → 3 → 4 desktop. */
export function ProductGrid({products, onQuickView}: ProductGridProps) {
  return (
    <ul className="ng-catalog-grid">
      {products.map((product, index) => (
        <li key={product.id} className="ng-catalog-grid-item">
          <CatalogProductCard
            product={product}
            loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
            onQuickView={onQuickView}
          />
        </li>
      ))}
    </ul>
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
            to="/collections"
            variant="primary"
            className="ng-catalog-empty-action"
          >
            Browse collections
          </ButtonLink>
        </>
      )}
    </div>
  );
}
