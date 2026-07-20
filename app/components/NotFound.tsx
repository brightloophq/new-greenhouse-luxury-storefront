import {Link} from 'react-router';

const DESTINATIONS = [
  {to: '/', label: 'Home', blurb: 'Start from the beginning'},
  {to: '/retail', label: 'Retail', blurb: 'Flowers ready to gift'},
  {to: '/arrangements', label: 'Arrangements', blurb: 'Hand-crafted designs'},
  {to: '/supplies', label: 'Supplies', blurb: 'Vases, ribbon & tools'},
];

/**
 * The 404 surface — a designed page in the house green, not a stack trace.
 * One apology, one line of orientation, four ways back into the store.
 */
export function NotFound({status = 404}: {status?: number}) {
  const isNotFound = status === 404;
  return (
    <section className="ng-404" aria-labelledby="ng-404-title">
      <p className="ng-404-code">{status}</p>
      <h1 id="ng-404-title" className="ng-404-title">
        {isNotFound ? 'This page has been cut' : 'Something went wrong'}
      </h1>
      <p className="ng-404-sub">
        {isNotFound
          ? 'The page you’re looking for isn’t here anymore. Everything else is still in bloom.'
          : 'We hit an unexpected problem. Please try again, or pick up from one of these.'}
      </p>

      <nav className="ng-404-links" aria-label="Continue shopping">
        <ul className="ng-404-list">
          {DESTINATIONS.map((destination) => (
            <li key={destination.to}>
              <Link
                className="ng-404-link"
                to={destination.to}
                prefetch="intent"
              >
                <span className="ng-404-link-label">{destination.label}</span>
                <span className="ng-404-link-blurb">{destination.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
