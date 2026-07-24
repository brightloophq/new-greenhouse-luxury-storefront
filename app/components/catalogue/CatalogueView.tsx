import {useEffect, useState} from 'react';
import {Link, useNavigation, useSearchParams} from 'react-router';
import {CatalogToolbar} from '~/components/catalog/CatalogToolbar';
import {
  ActiveFilterChips,
  FilterDrawer,
  FilterPanel,
} from '~/components/catalog/Filters';
import {
  CatalogueCard,
  type CatalogueCardVariant,
  type CatalogueProduct,
} from '~/components/catalogue/CatalogueCard';
import {countActiveFilters, type AppliedFilters, type FilterContext} from '~/lib/catalog';

export interface CatalogueViewProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  products: CatalogueProduct[];
  /** URL-parsed filter state (single source of truth). */
  filters: AppliedFilters;
  sort: string;
  /** Which facets this catalogue exposes. */
  context: FilterContext;
  variant?: CatalogueCardVariant;
  /** Shopify collection handle absent — intentional "being set up" state. */
  missing?: boolean;
  /** Storefront query threw — recoverable error state. */
  failed?: boolean;
  /** Result noun, singular ("stem", "item", "arrangement"). */
  noun?: string;
  back?: {to: string; label: string} | null;
}

/**
 * The one catalogue surface behind every shopping route: Wholesale, Retail,
 * Supplies, Arrangements and Premium all render this. Search, sort, filters,
 * count, active-filter summary and clear-all live entirely in the URL, so every
 * catalogue state is linkable, shareable and restorable on reload.
 */
export function CatalogueView({
  eyebrow,
  title,
  sub,
  products,
  filters,
  sort,
  context,
  variant = 'retail',
  missing = false,
  failed = false,
  noun = 'product',
  back = null,
}: CatalogueViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigation = useNavigation();
  const activeCount = countActiveFilters(filters);

  // A catalogue navigation to this same route (filter/sort/search change) is a
  // "refining" state — the grid dims rather than being replaced by a spinner.
  const busy = navigation.state === 'loading';

  // Retail, standalone Supplies and Arrangements get the editorial (homepage)
  // presentation, scoped by CONTEXT — not by variant, because variant is shared
  // across sections. The `arrangements` context covers Mixed and Occasion; Premium
  // stays context="premium" and keeps its own elevated (deluxe) catalogue. Each
  // experience owns its modifier in its own stylesheet.
  const editorialModifier = context.startsWith('retail')
    ? ' ng-shopcat--retail'
    : context.startsWith('supplies')
      ? ' ng-shopcat--supplies'
      : context.startsWith('arrangements')
        ? ' ng-shopcat--arrangements'
        : '';

  return (
    <div className={`ng-shopcat${editorialModifier}`}>
      <header className="ng-shopcat-head">
        {back ? (
          <Link className="ng-shopcat-back" to={back.to} prefetch="intent">
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}
        {/* The back link already names the parent — don't say it twice. */}
        {eyebrow && eyebrow !== back?.label ? (
          <p className="ng-shopcat-eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="ng-shopcat-title">{title}</h1>
        {sub ? <p className="ng-shopcat-sub">{sub}</p> : null}
      </header>

      <div className="ng-shopcat-layout">
        <aside className="ng-shopcat-aside">
          <FilterPanel filters={filters} context={context} />
        </aside>

        <div className="ng-shopcat-main">
          <CatalogueSearch value={filters.q ?? ''} noun={noun} />

          <CatalogToolbar
            count={products.length}
            sort={sort}
            onOpenFilters={() => setDrawerOpen(true)}
            activeCount={activeCount}
            noun={noun}
          />

          <ActiveFilterChips filters={filters} />

          <div
            className="ng-shopcat-results"
            aria-busy={busy || undefined}
            data-state={busy ? 'loading' : 'idle'}
          >
            {failed ? (
              <CatalogueNotice
                title="We couldn’t load this catalogue"
                body="Something went wrong on our end. Please try again in a moment."
              />
            ) : products.length ? (
              <ul className="ng-shopcat-grid">
                {products.map((product) => (
                  <li key={product.id}>
                    <CatalogueCard product={product} variant={variant} />
                  </li>
                ))}
              </ul>
            ) : missing ? (
              <CatalogueNotice
                title="This collection is being set up"
                body="Please check back shortly — we’re preparing it now."
              />
            ) : activeCount > 0 ? (
              <CatalogueNotice
                title="No matches"
                body="Nothing here matches your current filters. Try clearing one."
              />
            ) : (
              <CatalogueNotice
                title="Nothing here yet"
                body="New stock is being added to this collection."
              />
            )}
          </div>
        </div>
      </div>

      <FilterDrawer
        filters={filters}
        context={context}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CatalogueNotice({title, body}: {title: string; body: string}) {
  return (
    <div className="ng-shopcat-notice" role="status">
      <p className="ng-shopcat-notice-title">{title}</p>
      <p className="ng-shopcat-notice-body">{body}</p>
    </div>
  );
}

/**
 * Keyword search scoped to the current catalogue. Submits to the URL (`?q=`) so
 * the result is a normal, shareable navigation.
 */
function CatalogueSearch({value, noun}: {value: string; noun: string}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState(value);

  // Re-sync when the URL changes underneath us (back button, chip removal).
  useEffect(() => setDraft(value), [value]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const q = draft.trim();
    if (q) next.set('q', q);
    else next.delete('q');
    next.delete('cursor');
    next.delete('direction');
    setSearchParams(next, {preventScrollReset: true});
  }

  return (
    <form className="ng-shopcat-search" role="search" onSubmit={submit}>
      <label className="ng-visually-hidden" htmlFor="ng-shopcat-search-input">
        Search this collection
      </label>
      <input
        id="ng-shopcat-search-input"
        className="ng-shopcat-search-input"
        type="search"
        name="q"
        placeholder={`Search ${noun}s`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button className="ng-shopcat-search-submit" type="submit">
        Search
      </button>
    </form>
  );
}
