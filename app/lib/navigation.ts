/**
 * Experience-aware navigation. One canonical Header + mobile accordion + Footer
 * render whichever dataset the active experience selects (`navFor`).
 *
 * SCOPE (see docs/FOCUSED_DUAL_STORE_AUDIT.md):
 *   CLASSIC = wholesale flowers + floral supplies for the trade. No Weddings /
 *             Corporate departments in the active journey.
 *   DELUXE  = luxury gifting (signature bouquets, premium flowers, gifts,
 *             occasions). No wholesale / supplies / weddings / corporate depts.
 *
 * Every `to` resolves to a LIVE Shopify collection, a real page, or a graceful
 * `all-flowers` catalog filter — no 404s. Deluxe premium collections that do not
 * exist yet (luxury-bouquets, luxury-gifts, premium-roses/orchids as distinct)
 * are re-pointed to their nearest live collection and logged for creation in
 * docs/FUTURE_EXPANSION.md. Weddings/Corporate pages are retained but removed
 * from this data (future expansion).
 */
import type {ExperienceMode} from '~/lib/experience';

export interface NavLink {
  label: string;
  to: string;
}
export interface MegaColumn {
  title: string;
  links: NavLink[];
  /** 'flowers' → wider 2-sub-column list styling. */
  variant?: 'flowers';
}
export interface PrimaryItem {
  label: string;
  to?: string;
  mega?: boolean;
}
export interface ExperienceNav {
  primary: PrimaryItem[];
  mega: MegaColumn[];
  footerShop: NavLink[];
  footerServices: NavLink[];
}

const flower = (h: string) => `/collections/all-flowers?flower=${h}`;

/* -------------------------------------------------------------------------- */
/* CLASSIC — wholesale flowers + floral supplies                              */
/* Primary: Wholesale Flowers · Floral Supplies · About · Delivery · Contact  */
/* (Deluxe reached via the header experience toggle.)                         */
/* -------------------------------------------------------------------------- */
export const CLASSIC_NAV: ExperienceNav = {
  primary: [
    {label: 'Wholesale Flowers', to: '/classic/wholesale', mega: true},
    {label: 'Floral Supplies', to: '/classic/supplies'},
    {label: 'About', to: '/pages/about-us'},
    {label: 'Delivery', to: '/pages/delivery-information'},
    {label: 'Contact', to: '/pages/contact'},
  ],
  // Focused Classic "Shop" mega — no Weddings/Corporate columns.
  mega: [
    {
      title: 'Wholesale',
      links: [
        {label: 'All Wholesale Flowers', to: '/collections/bulk-flowers'},
        {label: 'Wholesale Roses', to: '/collections/wholesale-roses'},
        {label: 'Wholesale Greenery', to: '/collections/wholesale-greenery'},
        {label: 'Florist Essentials', to: '/collections/florist-essentials'},
        {label: 'New / In Stock', to: '/collections/all-flowers?sort=newest'},
      ],
    },
    {
      title: 'Flower Types',
      variant: 'flowers',
      links: [
        {label: 'Roses', to: '/collections/roses'},
        {label: 'Orchids', to: '/collections/orchids'},
        {label: 'Lilies', to: '/collections/lilies'},
        {label: 'Alstroemeria', to: flower('alstroemeria')},
        {label: 'Carnations', to: flower('carnations')},
        {label: 'Chrysanthemums', to: flower('chrysanthemums')},
        {label: 'Hydrangea', to: flower('hydrangea')},
        {label: 'Tulips', to: flower('tulips')},
        {label: 'Greenery', to: '/collections/greenery-and-fillers'},
        {label: 'Fillers', to: flower('fillers')},
      ],
    },
    {
      title: 'Floral Supplies',
      links: [
        {label: 'Shop All Supplies', to: '/collections/floral-supplies'},
        {label: 'Vases & Containers', to: '/collections/vases-and-containers'},
        {label: 'Ribbon', to: '/collections/ribbon'},
        {label: 'Wrapping & Packaging', to: '/collections/wrapping-and-packaging'},
        {label: 'Tools & Accessories', to: '/collections/tools-and-accessories'},
      ],
    },
    {
      title: 'Ordering',
      links: [
        {label: 'Greenery & Fillers', to: '/collections/greenery-and-fillers'},
        {label: 'Delivery Information', to: '/pages/delivery-information'},
        {label: 'How to Order', to: '/pages/contact'},
      ],
    },
  ],
  footerShop: [
    {label: 'All wholesale flowers', to: '/collections/bulk-flowers'},
    {label: 'Wholesale roses', to: '/collections/wholesale-roses'},
    {label: 'Wholesale greenery', to: '/collections/wholesale-greenery'},
    {label: 'Floral supplies', to: '/collections/floral-supplies'},
    {label: 'Greenery & fillers', to: '/collections/greenery-and-fillers'},
    {label: 'Shop all', to: '/collections/all'},
  ],
  footerServices: [
    {label: 'Florist essentials', to: '/collections/florist-essentials'},
    {label: 'Vases & containers', to: '/collections/vases-and-containers'},
    {label: 'Wholesale ordering', to: '/pages/contact'},
    {label: 'Delivery & pickup', to: '/pages/delivery-information'},
  ],
};

/* -------------------------------------------------------------------------- */
/* DELUXE — luxury gifting                                                     */
/* Primary: Signature Bouquets · Luxury Gifts · Premium Flowers · Occasions ·  */
/*          Our Story · Contact  (Classic reached via the experience toggle.)  */
/* -------------------------------------------------------------------------- */
export const DELUXE_NAV: ExperienceNav = {
  primary: [
    {label: 'Signature Bouquets', to: '/collections/luxury-bouquets', mega: true},
    {label: 'Luxury Gifts', to: '/collections/add-ons'},
    {label: 'Premium Flowers', to: '/collections/roses'},
    {label: 'Occasions', to: '/collections/birthday'},
    {label: 'Our Story', to: '/pages/about-us'},
    {label: 'Contact', to: '/pages/contact'},
  ],
  // Focused Deluxe "Shop" mega — gifting only, no wholesale/supplies/weddings.
  // Never links /collections/all-flowers (the shared variety hub, which can
  // surface wholesale stems) or /collections/all — only curated gifting sets.
  mega: [
    {
      title: 'Signature',
      links: [
        {label: 'Signature Bouquets', to: '/collections/luxury-bouquets'},
        {label: 'Premium Flowers', to: '/collections/roses'},
        {label: 'Seasonal Deluxe', to: '/collections/seasonal-deluxe'},
      ],
    },
    {
      title: 'Premium Flowers',
      variant: 'flowers',
      links: [
        {label: 'Premium Roses', to: '/collections/roses'},
        {label: 'Premium Orchids', to: '/collections/orchids'},
        {label: 'Lilies', to: '/collections/lilies'},
      ],
    },
    {
      title: 'Luxury Gifts',
      links: [
        {label: 'Curated Add-ons', to: '/collections/add-ons'},
        {label: 'Romance', to: '/collections/love-and-romance'},
        {label: 'Anniversary', to: '/collections/anniversary'},
        {label: 'Premium Birthday', to: '/collections/birthday'},
      ],
    },
    {
      title: 'Shop by Occasion',
      links: [
        {label: 'Birthday', to: '/collections/birthday'},
        {label: 'Anniversary', to: '/collections/anniversary'},
        {label: 'Romance', to: '/collections/love-and-romance'},
        {label: 'Congratulations', to: '/collections/congratulations'},
        {label: 'New Baby', to: '/collections/new-baby'},
        {label: 'Get Well', to: '/collections/get-well'},
      ],
    },
  ],
  footerShop: [
    {label: 'Signature bouquets', to: '/collections/luxury-bouquets'},
    {label: 'Premium roses', to: '/collections/roses'},
    {label: 'Premium orchids', to: '/collections/orchids'},
    {label: 'Curated add-ons', to: '/collections/add-ons'},
    {label: 'Romance', to: '/collections/love-and-romance'},
    {label: 'Seasonal deluxe', to: '/collections/seasonal-deluxe'},
  ],
  footerServices: [
    {label: 'Birthday', to: '/collections/birthday'},
    {label: 'Anniversary', to: '/collections/anniversary'},
    {label: 'Our story', to: '/pages/about-us'},
    {label: 'Concierge & delivery', to: '/pages/delivery-information'},
  ],
};

export function navFor(experience: ExperienceMode): ExperienceNav {
  return experience === 'deluxe' ? DELUXE_NAV : CLASSIC_NAV;
}
