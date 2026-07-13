import {flowerCategoryPath, flowerFamilyPath} from '~/lib/flowerCategories';
import type {ExperienceMode} from '~/lib/experience';

/**
 * Homepage content, keyed by experience.
 *
 * ONE set of homepage components (see routes/_index.tsx) renders from this data,
 * so switching the experience re-composes the entire homepage — hero, featured
 * collections, browse rails, editorial blocks, testimonials — without any
 * duplicated markup.
 *
 * DELUXE  = luxury gifting voice (signature bouquets, weddings, sympathy,
 *           corporate styling). The brief-approved black + champagne identity.
 * CLASSIC = wholesale / professional voice (bulk stems by the box, greenery,
 *           florist supplies, standing orders) for florists, planners and
 *           venues — matching the green Classic identity.
 *
 * Image keys map to bundled assets in routes/_index.tsx (IMAGES).
 */
export type HomeImageKey = 'hero' | 'occasion' | 'botanical';

export interface HomeCard {
  title: string;
  eyebrow: string;
  /** null → link to the freshest featured collection at render time. */
  to: string | null;
  image: HomeImageKey;
  alt: string;
}

export interface HomeTile {
  label: string;
  to: string;
}

export interface HomeEditorial {
  kicker: string;
  title: string;
  body: string;
  cta: {label: string; to: string};
  image: HomeImageKey;
  alt: string;
}

export interface HomeContent {
  announcement: string;
  hero: {
    kicker: string;
    title: string;
    body: string;
    /** null primary target → freshest featured collection. */
    primary: {label: string; to: string | null};
    secondary: {label: string; to: string};
    slogan: string;
    image: HomeImageKey;
    alt: string;
  };
  featured: {kicker: string; title: string; cards: HomeCard[]};
  flowers: {
    kicker: string;
    title: string;
    link?: {label: string; to: string};
    tiles: HomeTile[];
  };
  browse: {
    kicker: string;
    title: string;
    link?: {label: string; to: string};
    tiles: HomeTile[];
  };
  productRow: {kicker: string; title: string};
  /**
   * Editorial feature rows, rendered in order with alternating media/copy
   * layout. Deluxe = gifting editorials (wedding atelier, corporate styling);
   * Classic = wholesale-first (how ordering works, delivery & pickup) — no
   * Weddings/Corporate departments in the active journey.
   */
  editorials: HomeEditorial[];
  heritage: {kicker: string; title: string; body: string};
  testimonials: {
    kicker: string;
    title: string;
    items: {quote: string; name: string; context: string}[];
  };
  newsletter: {kicker: string; title: string; body: string};
}

const SLOGAN = 'Not just flowers, whatever it takes.';

/** Shared "Shop by flower" tiles — buying stems is relevant to both audiences. */
const FLOWER_TILES: HomeTile[] = [
  {label: 'Alstroemeria', to: flowerFamilyPath('alstroemeria')},
  {label: 'Roses - In Stock', to: flowerCategoryPath('roses-in-stock')},
  {label: 'Orchids', to: flowerCategoryPath('orchids')},
  {label: 'Lilies', to: flowerCategoryPath('lilies')},
  {label: 'Hydrangea', to: flowerCategoryPath('hydrangea')},
  {label: 'Tulips', to: flowerCategoryPath('tulips')},
];

const DELUXE: HomeContent = {
  announcement:
    'Same-day delivery available across Kingston & St. Andrew for orders placed before 2PM.',
  hero: {
    kicker: 'The New Greenhouse, Kingston',
    title: "Luxury flowers for life's most meaningful moments.",
    body: "Signature bouquets, premium roses and orchids, and curated luxury gifts — hand-composed and delivered across Kingston for life's most meaningful moments.",
    primary: {label: 'Shop Signature Bouquets', to: null},
    secondary: {label: 'Send a Luxury Gift', to: '/collections/add-ons'},
    slogan: SLOGAN,
    image: 'hero',
    alt: 'Luxury ivory and blush floral arrangement by The New Greenhouse',
  },
  featured: {
    kicker: 'Featured collections',
    title: 'Floral gestures for every kind of occasion.',
    cards: [
      {
        title: 'Signature Bouquets',
        eyebrow: 'House arrangements',
        to: null,
        image: 'occasion',
        alt: 'Blush and ivory luxury floral arrangement',
      },
      {
        title: 'Premium Flowers',
        eyebrow: 'Roses & orchids',
        to: '/collections/roses',
        image: 'hero',
        alt: 'Premium long-stem roses in a cinematic dark setting',
      },
      {
        title: 'Luxury Gifts',
        eyebrow: 'Curated add-ons',
        to: '/collections/add-ons',
        image: 'botanical',
        alt: 'Curated luxury gift add-ons styled with premium flowers',
      },
      {
        title: 'Romance',
        eyebrow: 'For someone special',
        to: '/collections/love-and-romance',
        image: 'occasion',
        alt: 'Romantic red and blush luxury floral arrangement',
      },
    ],
  },
  flowers: {
    kicker: 'Shop by flower',
    title: 'Choose your bloom.',
    link: {label: 'All flowers', to: '/collections/all-flowers'},
    tiles: FLOWER_TILES,
  },
  browse: {
    kicker: 'Shop by occasion',
    title: 'Send beauty with intention.',
    tiles: [
      {label: 'Birthday', to: '/collections/birthday'},
      {label: 'Anniversary', to: '/collections/anniversary'},
      {label: 'Romance', to: '/collections/love-and-romance'},
      {label: 'Congratulations', to: '/collections/congratulations'},
      {label: 'New Baby', to: '/collections/new-baby'},
      {label: 'Get Well', to: '/collections/get-well'},
    ],
  },
  productRow: {
    kicker: 'Best sellers',
    title: 'Arrangements made to be remembered.',
  },
  editorials: [
    {
      kicker: 'The gifting concierge',
      title: 'Gifts composed to be remembered.',
      body: 'Pair a signature bouquet with curated add-ons and a hand-written note. We compose, wrap, and deliver each gift so it arrives feeling personal and complete.',
      cta: {label: 'Explore Luxury Gifts', to: '/collections/add-ons'},
      image: 'occasion',
      alt: 'Curated luxury gift with a signature bouquet and add-ons',
    },
    {
      kicker: 'Premium flowers',
      title: 'The rarest stems, hand-selected.',
      body: 'Premium roses and orchids chosen for form and longevity, arranged with the restraint of a boutique florist — the quiet luxury of exceptional flowers.',
      cta: {label: 'Shop Premium Flowers', to: '/collections/roses'},
      image: 'botanical',
      alt: 'Premium orchids and roses in an editorial arrangement',
    },
  ],
  heritage: {
    kicker: 'Kingston, Jamaica',
    title: 'Four decades of flowers, memories, and moments.',
    body: 'For 40+ years, The New Greenhouse has served Jamaica with flowers for celebrations, farewells, weddings, homes, businesses, and the meaningful gestures in between.',
  },
  testimonials: {
    kicker: 'Loved by customers',
    title: 'A quiet standard of excellence.',
    items: [
      {
        quote:
          'Every arrangement arrived with the polish of a luxury gift and the warmth of something personal.',
        name: 'Marsha L.',
        context: 'Kingston',
      },
      {
        quote:
          'The bouquet I sent for our anniversary was breathtaking — exactly the statement I hoped for.',
        name: 'Danielle R.',
        context: 'Anniversary gift',
      },
      {
        quote:
          'Beautifully presented and delivered right on time. They are my go-to for every celebration.',
        name: 'Repeat client',
        context: 'Kingston',
      },
    ],
  },
  newsletter: {
    kicker: 'The floral circle',
    title: 'Join the floral circle.',
    body: 'Receive seasonal arrivals, gifting inspiration, and exclusive floral updates.',
  },
};

const CLASSIC: HomeContent = {
  announcement:
    'Wholesale pricing for florists, planners and venues — fresh stems by the box, delivered across Jamaica.',
  hero: {
    kicker: 'Wholesale & Florist Supplies',
    title: 'Wholesale flowers, greenery & florist supplies.',
    body: 'Fresh, graded stems by the box — plus vases, ribbon, tools and everything a florist, planner or venue needs, delivered across Jamaica.',
    primary: {label: 'Shop Wholesale Flowers', to: '/collections/bulk-flowers'},
    secondary: {label: 'Floral Supplies', to: '/collections/floral-supplies'},
    slogan: SLOGAN,
    image: 'botanical',
    alt: 'Bulk wholesale flowers and greenery ready for florists and events',
  },
  featured: {
    kicker: 'Shop the warehouse',
    title: 'Everything a florist orders, in one delivery.',
    cards: [
      {
        title: 'Wholesale Flowers',
        eyebrow: 'By the box',
        to: '/collections/bulk-flowers',
        image: 'occasion',
        alt: 'Bulk wholesale flowers ready for florists and events',
      },
      {
        title: 'Greenery & Fillers',
        eyebrow: 'For every build',
        to: '/collections/greenery-and-fillers',
        image: 'botanical',
        alt: 'Fresh greenery and foliage fillers for floral arrangements',
      },
      {
        title: 'Floral Supplies',
        eyebrow: 'Studio essentials',
        to: '/collections/floral-supplies',
        image: 'hero',
        alt: 'Florist supplies including tools, ribbon and packaging',
      },
      {
        title: 'Vases & Containers',
        eyebrow: 'Finishing touches',
        to: '/collections/vases-and-containers',
        image: 'occasion',
        alt: 'Vases and containers for floral arrangements',
      },
    ],
  },
  flowers: {
    kicker: 'Shop by flower',
    title: 'Order by variety.',
    link: {label: 'All flowers', to: '/collections/all-flowers'},
    tiles: FLOWER_TILES,
  },
  browse: {
    kicker: 'Shop by category',
    title: 'Stock the studio.',
    link: {label: 'All supplies', to: '/collections/floral-supplies'},
    tiles: [
      {label: 'Greenery & Fillers', to: '/collections/greenery-and-fillers'},
      {label: 'Floral Supplies', to: '/collections/floral-supplies'},
      {label: 'Vases & Containers', to: '/collections/vases-and-containers'},
      {label: 'Ribbon', to: '/collections/ribbon'},
      {label: 'Tools & Accessories', to: '/collections/tools-and-accessories'},
      {label: 'Wrapping & Packaging', to: '/collections/wrapping-and-packaging'},
    ],
  },
  productRow: {
    kicker: 'Trade favourites',
    title: 'Stems the pros reorder every week.',
  },
  editorials: [
    {
      kicker: 'How wholesale ordering works',
      title: 'Order by the bunch or the box.',
      body: 'Browse by variety, colour or wholesale collection, build your list at trade pricing, and we prepare it fresh and graded for delivery or pickup — no account or minimum to get started.',
      cta: {label: 'Start a Wholesale Order', to: '/classic/wholesale'},
      image: 'occasion',
      alt: 'Wholesale flowers graded and boxed for a trade order',
    },
    {
      kicker: 'Delivery & pickup',
      title: 'Fresh stems, delivered across Jamaica.',
      body: 'Island-wide delivery and same-day pickup in Kingston & St. Andrew, with cold-chain handling so every order arrives in peak condition for your build.',
      cta: {label: 'Delivery & Pickup Details', to: '/pages/delivery-information'},
      image: 'botanical',
      alt: 'Fresh floral stems prepared for island-wide delivery',
    },
  ],
  heritage: {
    kicker: 'Kingston, Jamaica',
    title: 'Four decades supplying Jamaica’s florists.',
    body: 'For 40+ years, The New Greenhouse has kept florists, planners, hotels and event teams across Jamaica supplied with fresh stems, greenery and the tools of the trade.',
  },
  testimonials: {
    kicker: 'Trusted by the trade',
    title: 'The supplier florists rely on.',
    items: [
      {
        quote:
          'Consistent quality by the box — our studio orders every week and it has never let us down.',
        name: 'Studio florist',
        context: 'Kingston',
      },
      {
        quote:
          'Bulk greenery and fillers always arrive fresh and graded. It saves my team hours on every event.',
        name: 'Event planner',
        context: 'St. Andrew',
      },
      {
        quote:
          'Our standing order for the lobby is effortless and always beautiful. Reordering is simple.',
        name: 'Hospitality buyer',
        context: 'Kingston',
      },
    ],
  },
  newsletter: {
    kicker: 'The trade list',
    title: 'Join the trade list.',
    body: 'Get restock alerts, seasonal availability and wholesale pricing updates.',
  },
};

export const HOME_CONTENT: Record<ExperienceMode, HomeContent> = {
  classic: CLASSIC,
  deluxe: DELUXE,
};
