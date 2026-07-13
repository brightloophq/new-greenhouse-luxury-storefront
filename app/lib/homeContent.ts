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
  wedding: HomeEditorial;
  corporate: HomeEditorial;
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
    body: "Handcrafted floral arrangements, gifts, weddings, sympathy flowers, and corporate designs from Kingston's trusted floral house.",
    primary: {label: 'Shop Arrangements', to: null},
    secondary: {label: 'Request Custom Design', to: '/pages/contact'},
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
        title: 'Sympathy & Funeral',
        eyebrow: 'Quiet grace',
        to: '/collections/sympathy-and-funeral',
        image: 'hero',
        alt: 'Ivory floral arrangement in a cinematic dark setting',
      },
      {
        title: 'Weddings & Events',
        eyebrow: 'Ceremonies in bloom',
        to: '/pages/wedding-events',
        image: 'botanical',
        alt: 'Botanical floral arrangement with orchids and deep greenery',
      },
      {
        title: 'Wholesale Flowers',
        eyebrow: 'By the box',
        to: '/collections/bulk-flowers',
        image: 'occasion',
        alt: 'Bulk wholesale flowers ready for florists and events',
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
      {label: 'Sympathy', to: '/collections/sympathy-and-funeral'},
      {label: 'Congratulations', to: '/collections/congratulations'},
      {label: 'Romance', to: '/collections/love-and-romance'},
      {label: 'Corporate', to: '/collections/corporate-gifting'},
    ],
  },
  productRow: {
    kicker: 'Best sellers',
    title: 'Arrangements made to be remembered.',
  },
  wedding: {
    kicker: 'Wedding atelier',
    title: 'Your wedding, imagined in bloom.',
    body: 'From ceremony arches to tablescapes, our floral team composes the atmosphere around your vows, venue, and the feeling you want guests to carry home.',
    cta: {label: 'Book a Floral Consultation', to: '/pages/wedding-events'},
    image: 'occasion',
    alt: 'Romantic blush and ivory wedding floral arrangement',
  },
  corporate: {
    kicker: 'Corporate floral services',
    title: 'Flowers that hold the room.',
    body: 'Weekly floral styling and event arrangements for Kingston hotels, offices, restaurants, embassies, boutiques, and private functions.',
    cta: {label: 'Explore Corporate Flowers', to: '/collections/corporate-gifting'},
    image: 'botanical',
    alt: 'Botanical floral arrangement for a luxury hospitality interior',
  },
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
          'Their wedding florals transformed the space without ever feeling overdone.',
        name: 'Danielle R.',
        context: 'Wedding client',
      },
      {
        quote:
          'Reliable, elegant, and beautifully presented. Our lobby flowers are now part of the guest experience.',
        name: 'Corporate client',
        context: 'Hospitality',
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
  wedding: {
    kicker: 'Weddings & events',
    title: 'Flowers by the box for planners and venues.',
    body: 'Order ceremony and reception flowers in bulk — fresh, graded stems and greenery delivered on schedule so your team can build with confidence.',
    cta: {label: 'Plan an Event Order', to: '/pages/wedding-events'},
    image: 'occasion',
    alt: 'Bulk wedding flowers and greenery prepared for an event build',
  },
  corporate: {
    kicker: 'Standing orders',
    title: 'Weekly flowers for venues and offices.',
    body: 'Reliable standing orders and bulk supply for Kingston hotels, restaurants, offices and event teams — consistent quality, delivered on your schedule.',
    cta: {label: 'Set Up Trade Delivery', to: '/collections/corporate-gifting'},
    image: 'botanical',
    alt: 'Bulk floral supply prepared for a hospitality standing order',
  },
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
