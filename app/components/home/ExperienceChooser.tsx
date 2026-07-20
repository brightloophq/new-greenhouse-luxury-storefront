import {Link} from 'react-router';

/**
 * "Choose Your Shopping Experience" — the four entry points into the store.
 * These are wayfinding cards, not product cards: a photograph, a title and one
 * line of copy. Wholesale/Retail/Supplies stay in the bright general storefront;
 * Arrangements enters the elevated Premium/Deluxe collection (a full navigation
 * through the /deluxe entry so the experience cookie + theme switch server-side).
 */
interface ChooserCard {
  title: string;
  blurb: string;
  to: string;
  /** image basename under /public/images/<dir>/ with 400/600/800 webp widths. */
  img: string;
  dir: string;
  /** Arrangements enters a different experience → full-page navigation. */
  external?: boolean;
  /** Adds the subtle premium treatment to the card. */
  premium?: boolean;
}

const CARDS: ChooserCard[] = [
  {
    title: 'Wholesale',
    blurb: 'Fresh stems by the box for florists, planners & venues.',
    to: '/classic/wholesale',
    img: 'wholesale-flowers',
    dir: 'collections',
  },
  {
    title: 'Retail',
    blurb: 'Ready-to-gift bouquets, delivered across Kingston.',
    to: '/collections/all-flowers',
    img: 'retail',
    dir: 'homepage',
  },
  {
    title: 'Arrangements',
    blurb: 'Hand-crafted premium & deluxe floral design.',
    to: '/deluxe?to=/collections',
    img: 'arrangements',
    dir: 'homepage',
    external: true,
    premium: true,
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

function CardMedia({card}: {card: ChooserCard}) {
  const {src, srcSet: ss} = srcSet(card.dir, card.img);
  return (
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
  );
}

function CardBody({card}: {card: ChooserCard}) {
  return (
    <span className="ng-chooser-card-body">
      <span className="ng-chooser-card-title">{card.title}</span>
      <span className="ng-chooser-card-blurb">{card.blurb}</span>
      <span className="ng-chooser-card-cta" aria-hidden="true">
        Explore <span className="ng-chooser-card-arrow">→</span>
      </span>
    </span>
  );
}

export function ExperienceChooser() {
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
        {CARDS.map((card) => (
          <li key={card.title}>
            {card.external ? (
              <a
                className={`ng-chooser-card${card.premium ? ' ng-chooser-card--premium' : ''}`}
                href={card.to}
              >
                <CardMedia card={card} />
                <CardBody card={card} />
              </a>
            ) : (
              <Link
                className={`ng-chooser-card${card.premium ? ' ng-chooser-card--premium' : ''}`}
                to={card.to}
                prefetch="intent"
              >
                <CardMedia card={card} />
                <CardBody card={card} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
