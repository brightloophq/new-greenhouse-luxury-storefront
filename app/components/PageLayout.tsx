import {Await, Link} from 'react-router';
import {Suspense, useId} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {navFor} from '~/lib/navigation';
import {useExperience} from '~/components/ExperienceProvider';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {Accordion, AccordionItem, Icon} from '~/components/ui';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {CONTACT, DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileNavAside isLoggedIn={isLoggedIn} />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="Your cart" position="right">
      <Suspense
        fallback={
          <div className="ng-drawer-loading" role="status">
            <span className="ng-loading-glaze" aria-hidden="true" />
            <p className="ng-loading-note">Gathering your selections…</p>
          </div>
        }
      >
        <Await resolve={cart}>
          {(resolved) => <CartMain cart={resolved} layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  return (
    <Aside type="search" heading="Search" position="top">
      <div className="ng-search">
        <SearchFormPredictive className="ng-search-form">
          {({fetchResults, goToSearch, inputRef}) => (
            <div className="ng-search-field">
              <Icon name="search" className="ng-search-icon" />
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search flowers, occasions, collections…"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
                data-autofocus
                aria-label="Search"
              />
              <button type="button" className="ng-search-submit" onClick={goToSearch}>
                Search
              </button>
            </div>
          )}
        </SearchFormPredictive>

        {/* The glazing seam that frames the search field — the same structural
            join used between sections everywhere else, so the overlay reads as
            another pane of the greenhouse rather than a search box. */}
        <GlasshouseDivider className="ng-search-seam" />

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return (
                <div className="ng-search-status" role="status">
                  <span className="ng-loading-glaze" aria-hidden="true" />
                  <p className="ng-loading-note">Searching…</p>
                </div>
              );
            }
            if (!total) {
              return (
                <div className="ng-search-status">
                  <SearchResultsPredictive.Empty term={term} />
                </div>
              );
            }
            return (
              <div className="ng-search-results">
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    className="ng-search-viewall"
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    View all results for <q>{term.current}</q> →
                  </Link>
                ) : null}
              </div>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

function MobileNavAside({isLoggedIn}: {isLoggedIn: PageLayoutProps['isLoggedIn']}) {
  const {close} = useAside();
  const {experience} = useExperience();
  const nav = navFor(experience);
  return (
    <Aside type="mobile" heading="Menu" position="left">
      <nav className="ng-mobilenav" aria-label="Mobile">
        <ul className="ng-mobilenav-primary">
          <li>
            <Link to="/" prefetch="intent" onClick={close} className="ng-mobilenav-link">
              Home
            </Link>
          </li>
          {/* Home is rendered explicitly above; drop it from the data list so the
              Deluxe drawer (whose primary[0] is Home) never shows it twice. */}
          {nav.primary.filter((i) => !i.mega && i.to !== '/').map((item) => (
            <li key={item.label}>
              <Link
                to={item.to!}
                prefetch="intent"
                onClick={close}
                className="ng-mobilenav-link"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Accordion className="ng-mobilenav-accordion">
          {nav.mega.map((col) => (
            <AccordionItem key={col.title} title={col.title}>
              <ul className="ng-mobilenav-sublist">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      prefetch="intent"
                      onClick={close}
                      className="ng-mobilenav-sublink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="ng-mobilenav-footer">
          <Link to="/account" prefetch="intent" onClick={close} className="ng-mobilenav-account">
            <Icon name="user" size="sm" />
            <Suspense fallback="Sign in">
              <Await resolve={isLoggedIn} errorElement="Sign in">
                {(loggedIn) => (loggedIn ? 'My account' : 'Sign in')}
              </Await>
            </Suspense>
          </Link>
          <a href={`mailto:${CONTACT.email}`} className="ng-mobilenav-contact">
            <Icon name="mail" size="sm" /> {CONTACT.email}
          </a>
          <p className="ng-mobilenav-note">
            Same-day delivery across Kingston &amp; St. Andrew before {DELIVERY_CUTOFF_SHORT}.
          </p>
        </div>
      </nav>
    </Aside>
  );
}
