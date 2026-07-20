import {useState} from 'react';
import {Link} from 'react-router';
import {WholesaleAuthModal} from '~/components/wholesale/WholesaleAuthModal';

/**
 * "Choose Your Shopping Experience" — the four entry points into the store.
 * Wayfinding cards, not product cards: a photograph, a title, one line of copy.
 *
 * Everything stays in the one bright, green brand:
 *   Wholesale     → opens the sign-in / register modal immediately (trade only)
 *   Retail        → shop flowers & supplies, guest checkout
 *   Arrangements  → the (still green) Arrangements page; Premium/Deluxe is a
 *                   deliberate choice one level deeper
 *   Supplies      → the florist supplies categories
 */
interface ChooserCard {
  title: string;
  blurb: string;
  img: string;
  dir: string;
  /** Internal link destination (Link). */
  to?: string;
  /** Wholesale opens the auth modal instead of navigating. */
  action?: 'wholesale';
  /** Adds the subtle premium hint to the card. */
  premium?: boolean;
}

const CARDS: ChooserCard[] = [
  {
    title: 'Wholesale',
    blurb: 'Trade pricing by the box for florists & venues.',
    img: 'wholesale-flowers',
    dir: 'collections',
    action: 'wholesale',
  },
  {
    title: 'Retail',
    blurb: 'Ready-to-gift flowers, delivered across Kingston.',
    to: '/collections/all-flowers',
    img: 'retail',
    dir: 'homepage',
  },
  {
    title: 'Arrangements',
    blurb: 'Hand-crafted designs — occasion, mixed & premium.',
    to: '/arrangements',
    img: 'arrangements',
    dir: 'homepage',
  },
  {
    title: 'Supplies',
    blurb: 'Vases, ribbon, tools & packaging for the studio.',
    to: '/classic/supplies',
    img: 'supplies',
    dir: 'homepage',
  },
];

function srcSet(dir: string, img: string) {
  const base = `/images/${dir}/${img}`;
  return {
    src: `${base}-800.webp`,
    srcSet: [400, 600, 800].map((w) => `${base}-${w}.webp ${w}w`).join(', '),
  };
}

function CardInner({card}: {card: ChooserCard}) {
  const {src, srcSet: ss} = srcSet(card.dir, card.img);
  return (
    <>
      <span className="ng-chooser-card-media">
        <img
          src={src}
          srcSet={ss}
          sizes="(min-width: 64em) 24vw, (min-width: 45em) 45vw, 90vw"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="ng-chooser-card-body">
        <span className="ng-chooser-card-title">{card.title}</span>
        <span className="ng-chooser-card-blurb">{card.blurb}</span>
        <span className="ng-chooser-card-cta" aria-hidden="true">
          Explore <span className="ng-chooser-card-arrow">→</span>
        </span>
      </span>
    </>
  );
}

export function ExperienceChooser() {
  const [wholesaleOpen, setWholesaleOpen] = useState(false);

  return (
    <section
      id="choose-experience"
      className="ng-chooser"
      aria-labelledby="ng-chooser-title"
    >
      <div className="ng-chooser-head">
        <p className="ng-chooser-eyebrow">Where would you like to begin?</p>
        <h2 id="ng-chooser-title">Choose your shopping experience</h2>
      </div>

      <ul className="ng-chooser-grid">
        {CARDS.map((card) => {
          const className = `ng-chooser-card${card.premium ? ' ng-chooser-card--premium' : ''}`;
          return (
            <li key={card.title}>
              {card.action === 'wholesale' ? (
                <button
                  type="button"
                  className={className}
                  onClick={() => setWholesaleOpen(true)}
                >
                  <CardInner card={card} />
                </button>
              ) : (
                <Link className={className} to={card.to!} prefetch="intent">
                  <CardInner card={card} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <WholesaleAuthModal
        open={wholesaleOpen}
        onClose={() => setWholesaleOpen(false)}
      />
    </section>
  );
}
