import {useEffect, useId, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';
import {useExperience} from '~/components/ExperienceProvider';
import {useTabTrap} from '~/lib/useTabTrap';
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
} from '~/components/ui';
import {
  FACETS,
  activeChips,
  countActiveFilters,
  type AppliedFilters,
} from '~/lib/catalog';

/* -------------------------------------------------------------------------- */
/* Shared URL helper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns a `commit` fn that mutates a fresh copy of the current search params
 * and always resets cursor-based pagination (`cursor`,`direction`) before
 * writing back — every filter change must return the shopper to page one.
 */
function useCatalogParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  function commit(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    next.delete('cursor');
    next.delete('direction');
    setSearchParams(next, {preventScrollReset: true});
  }

  function setParam(key: string, value: string | undefined) {
    commit((params) => {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    });
  }

  /** Remove every facet/availability/price param; keep sort untouched. */
  function clearAll() {
    commit((params) => {
      for (const facet of FACETS) params.delete(facet.key);
      params.delete('avail');
      params.delete('minp');
      params.delete('maxp');
    });
  }

  return {commit, setParam, clearAll};
}

/* -------------------------------------------------------------------------- */
/* FilterPanel                                                                */
/* -------------------------------------------------------------------------- */

export interface FilterPanelProps {
  /** Applied filter state, parsed from the URL by the route. */
  filters: AppliedFilters;
  /** Layout context — full sidebar or inside the mobile drawer. */
  variant?: 'sidebar' | 'drawer';
}

/**
 * The filter controls: one single-select radio group per facet, an
 * availability toggle, and a price range. Every change writes to the URL and
 * resets pagination. Reads its checked/toggle state from `filters` (URL is the
 * single source of truth).
 */
export function FilterPanel({filters, variant = 'sidebar'}: FilterPanelProps) {
  const {setParam, commit, clearAll} = useCatalogParams();
  const activeCount = countActiveFilters(filters);
  const {experience} = useExperience();

  // Deluxe is gifting-only: hide the wholesale/retail "Buying Option" facet so
  // the Deluxe catalogue never offers a wholesale filter. Classic keeps it.
  const visibleFacets =
    experience === 'deluxe'
      ? FACETS.filter((facet) => facet.key !== 'channel')
      : FACETS;

  // Local, uncommitted price inputs — applied on the "Apply" action so we don't
  // fire a navigation on every keystroke. Re-sync when the URL changes.
  const [minPrice, setMinPrice] = useState(
    filters.minPrice != null ? String(filters.minPrice) : '',
  );
  const [maxPrice, setMaxPrice] = useState(
    filters.maxPrice != null ? String(filters.maxPrice) : '',
  );
  useEffect(() => {
    setMinPrice(filters.minPrice != null ? String(filters.minPrice) : '');
    setMaxPrice(filters.maxPrice != null ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  function selectFacet(key: string, value: string) {
    // Toggle: re-selecting the active option clears the facet.
    const current = (filters as unknown as Record<string, unknown>)[key];
    setParam(key, current === value ? undefined : value);
  }

  function applyPrice(event: React.FormEvent) {
    event.preventDefault();
    commit((params) => {
      const min = minPrice.trim();
      const max = maxPrice.trim();
      if (min && Number(min) > 0) params.set('minp', min);
      else params.delete('minp');
      if (max && Number(max) > 0) params.set('maxp', max);
      else params.delete('maxp');
    });
  }

  return (
    <div className={`ng-catalog-filters ng-catalog-filters--${variant}`}>
      <div className="ng-catalog-filters-head">
        {variant === 'sidebar' ? (
          <h2 className="ng-catalog-filters-title">
            Filter
            {activeCount > 0 ? (
              <Badge className="ng-catalog-filters-count">{activeCount}</Badge>
            ) : null}
          </h2>
        ) : (
          <span aria-hidden="true" />
        )}
        {activeCount > 0 ? (
          <Button
            className="ng-catalog-filters-clear"
            variant="text"
            size="sm"
            onClick={clearAll}
          >
            Clear all filters
          </Button>
        ) : null}
      </div>

      <Accordion className="ng-catalog-filters-groups">
        {visibleFacets.map((facet) => {
          const current = (filters as unknown as Record<
            string,
            string | undefined
          >)[facet.key];
          return (
            <AccordionItem key={facet.key} title={facet.label} defaultOpen>
              <fieldset className="ng-catalog-filter-group">
                <legend className="ng-visually-hidden">{facet.label}</legend>
                <ul className="ng-catalog-filter-options">
                  <li>
                    <label className="ng-catalog-filter-option">
                      <input
                        type="radio"
                        className="ng-catalog-filter-radio"
                        name={facet.key}
                        checked={!current}
                        onChange={() => setParam(facet.key, undefined)}
                      />
                      <span className="ng-catalog-filter-option-label">
                        All
                      </span>
                    </label>
                  </li>
                  {facet.options.map((option) => (
                    <li key={option.value}>
                      <label className="ng-catalog-filter-option">
                        <input
                          type="radio"
                          className="ng-catalog-filter-radio"
                          name={facet.key}
                          checked={current === option.value}
                          onChange={() =>
                            setParam(facet.key, option.value)
                          }
                          onClick={() => {
                            // Allow deselecting the already-checked option.
                            if (current === option.value)
                              selectFacet(facet.key, option.value);
                          }}
                        />
                        <span className="ng-catalog-filter-option-label">
                          {option.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </AccordionItem>
          );
        })}

        <AccordionItem title="Availability" defaultOpen>
          <label className="ng-catalog-filter-toggle">
            <input
              type="checkbox"
              className="ng-catalog-filter-check"
              checked={filters.available}
              onChange={(event) =>
                setParam('avail', event.target.checked ? '1' : undefined)
              }
            />
            <span className="ng-catalog-filter-option-label">
              In stock only
            </span>
          </label>
        </AccordionItem>

        <AccordionItem title="Price" defaultOpen>
          <form className="ng-catalog-filter-price" onSubmit={applyPrice}>
            <div className="ng-catalog-filter-price-inputs">
              <label
                className="ng-catalog-filter-price-field"
                htmlFor={`ng-price-min-${variant}`}
              >
                <span className="ng-catalog-filter-price-label">Min</span>
                <Input
                  id={`ng-price-min-${variant}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="$0"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>
              <span className="ng-catalog-filter-price-sep" aria-hidden="true">
                –
              </span>
              <label
                className="ng-catalog-filter-price-field"
                htmlFor={`ng-price-max-${variant}`}
              >
                <span className="ng-catalog-filter-price-label">Max</span>
                <Input
                  id={`ng-price-max-${variant}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FilterDrawer                                                               */
/* -------------------------------------------------------------------------- */

export interface FilterDrawerProps {
  filters: AppliedFilters;
  /** Whether the off-canvas drawer is open. */
  open: boolean;
  /** Requests the drawer be closed (scrim click, close button, or Esc). */
  onClose: () => void;
}

/**
 * Mobile off-canvas filter drawer. Owns its own scrim, Esc-to-close, body
 * scroll lock, and initial focus — an accessible modal dialog. Renders a
 * `FilterPanel` in the "drawer" layout.
 */
export function FilterDrawer({filters, open, onClose}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Trap Tab focus within the drawer while open.
  useTabTrap(panelRef, open);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the dialog on open; restore it to the trigger on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => restoreFocusRef.current?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="ng-catalog-filter-drawer is-open">
      <button
        type="button"
        className="ng-catalog-filter-drawer-scrim"
        aria-label="Close filters"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="ng-catalog-filter-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ng-catalog-filter-drawer-head">
          <h2 id={titleId} className="ng-catalog-filter-drawer-title">
            Filters
          </h2>
          <IconButton
            className="ng-catalog-filter-drawer-close"
            aria-label="Close filters"
            onClick={onClose}
          >
            <Icon name="close" />
          </IconButton>
        </div>
        <div className="ng-catalog-filter-drawer-body">
          <FilterPanel variant="drawer" filters={filters} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ActiveFilterChips                                                          */
/* -------------------------------------------------------------------------- */

export interface ActiveFilterChipsProps {
  filters: AppliedFilters;
}

/**
 * Removable chips for each active filter, plus a "Clear all". Each × deletes
 * that chip's param(s) and resets pagination. Renders nothing when no filters
 * are active.
 */
export function ActiveFilterChips({filters}: ActiveFilterChipsProps) {
  const {commit, clearAll} = useCatalogParams();
  const chips = activeChips(filters);

  if (chips.length === 0) return null;

  function removeChip(key: string) {
    commit((params) => {
      if (key === 'price') {
        // The price chip is backed by two params.
        params.delete('minp');
        params.delete('maxp');
      } else {
        params.delete(key);
      }
    });
  }

  return (
    <div className="ng-catalog-chips" role="group" aria-label="Active filters">
      <ul className="ng-catalog-chips-list">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Badge className="ng-catalog-chip">
              <span className="ng-catalog-chip-label">{chip.label}</span>
              <button
                type="button"
                className="ng-catalog-chip-remove"
                aria-label={`Remove ${chip.label} filter`}
                onClick={() => removeChip(chip.key)}
              >
                <Icon name="close" size="xs" />
              </button>
            </Badge>
          </li>
        ))}
      </ul>
      <Button
        className="ng-catalog-chips-clear"
        variant="text"
        size="sm"
        onClick={clearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
