import * as React from 'react';
import {useSearchParams} from 'react-router';
import {Pagination} from '@shopify/hydrogen';
import {cx} from '~/components/ui';
import type {CatalogProduct} from '~/components/catalog/types';
import {
  ProductGrid,
  ProductGridSkeleton,
  CatalogEmptyState,
} from '~/components/catalog/ProductGrid';

/**
 * Wraps Hydrogen <Pagination> with the premium grid, loading skeleton, empty state,
 * and styled load-more controls. Preserves Hydrogen cursor pagination + commerce logic.
 */
export function CatalogResults({
  connection,
  loading,
  hasFilters,
  onQuickView,
}: {
  connection: React.ComponentProps<typeof Pagination<CatalogProduct>>['connection'];
  loading?: boolean;
  hasFilters?: boolean;
  onQuickView?: (product: CatalogProduct) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    ['flower', 'color', 'occasion', 'channel', 'avail', 'minp', 'maxp', 'cursor', 'direction'].forEach(
      (k) => next.delete(k),
    );
    setSearchParams(next, {preventScrollReset: true});
  }

  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink, hasNextPage, hasPreviousPage}) => {
        const products = nodes as CatalogProduct[];

        if (!products.length) {
          return loading ? (
            <ProductGridSkeleton />
          ) : (
            <CatalogEmptyState hasFilters={Boolean(hasFilters)} onClearFilters={clearFilters} />
          );
        }

        return (
          <div className="ng-catalog-results-wrap">
            {hasPreviousPage ? (
              <div className="ng-catalog-loadmore ng-catalog-loadmore-prev">
                <PreviousLink>
                  <span className="ng-catalog-loadmore-btn ng-catalog-loadmore-btn-outline">
                    {isLoading ? 'Loading…' : '↑ Load previous'}
                  </span>
                </PreviousLink>
              </div>
            ) : null}

            <div
              className={cx('ng-catalog-results', loading && 'is-loading')}
              aria-busy={loading || undefined}
            >
              <ProductGrid products={products} onQuickView={onQuickView} />
            </div>

            {hasNextPage ? (
              <div className="ng-catalog-loadmore">
                <NextLink>
                  <span className="ng-catalog-loadmore-btn">
                    {isLoading ? 'Loading…' : 'Load more'}
                  </span>
                </NextLink>
              </div>
            ) : null}
          </div>
        );
      }}
    </Pagination>
  );
}
