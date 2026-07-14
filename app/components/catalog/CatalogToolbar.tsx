import {useSearchParams} from 'react-router';
import {Badge, Button, Icon, Select} from '~/components/ui';
import {SORT_OPTIONS} from '~/lib/catalog';

export interface CatalogToolbarProps {
  /** Total number of results currently shown. */
  count: number;
  /** Currently applied sort value (from SORT_OPTIONS). */
  sort: string;
  /** Opens the mobile filter drawer. */
  onOpenFilters: () => void;
  /** Number of active filters — drives the mobile "Filters" badge. */
  activeCount: number;
  /** Singular result noun (plural adds "s"). Supplies use "item", not
   *  "arrangement" — supply grids must not inherit flower/gift wording. */
  noun?: string;
}

/**
 * Catalog results toolbar: result count, sort <select>, and a mobile-only
 * "Filters" trigger. Sort changes rewrite the `sort` URL param and reset
 * cursor-based pagination. Decoupled — reads/writes only the URL.
 */
export function CatalogToolbar({
  count,
  sort,
  onOpenFilters,
  activeCount,
  noun: nounSingular = 'arrangement',
}: CatalogToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  function onSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams);
    next.set('sort', event.target.value);
    // Reset pagination so the new sort starts from the first page.
    next.delete('cursor');
    next.delete('direction');
    setSearchParams(next, {preventScrollReset: true});
  }

  const noun = count === 1 ? nounSingular : `${nounSingular}s`;

  return (
    <div className="ng-catalog-toolbar">
      <p className="ng-catalog-toolbar-count" aria-live="polite">
        <span className="ng-catalog-toolbar-count-num">{count}</span> {noun}
      </p>

      <div className="ng-catalog-toolbar-controls">
        <label className="ng-catalog-toolbar-sort">
          <span className="ng-catalog-toolbar-sort-label">Sort</span>
          <Select
            className="ng-catalog-toolbar-sort-select"
            value={sort}
            onChange={onSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <Button
          className="ng-catalog-toolbar-filters"
          variant="outline"
          size="sm"
          onClick={onOpenFilters}
          aria-haspopup="dialog"
        >
          <Icon name="menu" size="sm" />
          <span>Filters</span>
          {activeCount > 0 ? (
            <Badge className="ng-catalog-toolbar-filters-badge">{activeCount}</Badge>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
