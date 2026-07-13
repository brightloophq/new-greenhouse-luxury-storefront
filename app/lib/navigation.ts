/**
 * Experience-aware navigation. One canonical Header + mobile accordion + Footer
 * render whichever dataset the active experience selects (`navFor`). Every `to`
 * resolves to an EXISTING Shopify collection, a real page, or a graceful catalog
 * filter — no 404s. Premium Deluxe collections that don't exist yet map to their
 * nearest live collection and are noted for Phase 5 creation.
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
/* CLASSIC — wholesale / catalog-oriented                                     */
/* -------------------------------------------------------------------------- */
export const CLASSIC_NAV: ExperienceNav = {
  primary: [
    {label: 'Shop', to: '/collections/all-flowers', mega: true},
    {label: 'Wholesale', to: '/collections/bulk-flowers'},
    {label: 'Supplies', to: '/collections/floral-supplies'},
    {label: 'Weddings', to: '/pages/wedding-events'},
    {label: 'Corporate', to: '/pages/corporate-flowers'},
  ],
  mega: [
    {
      title: 'Shop Flowers',
      variant: 'flowers',
      links: [
        {label: 'All Flowers', to: '/collections/all-flowers'},
        {label: 'Roses', to: '/collections/roses'},
        {label: 'Orchids', to: '/collections/orchids'},
        {label: 'Lilies', to: '/collections/lilies'},
        {label: 'Carnations', to: flower('carnations')},
        {label: 'Chrysanthemums', to: flower('chrysanthemums')},
        {label: 'Hydrangea', to: flower('hydrangea')},
        {label: 'Tropical Flowers', to: '/collections/tropical-flowers'},
        {label: 'Greenery', to: '/collections/greenery-and-fillers'},
        {label: 'Fillers', to: flower('fillers')},
      ],
    },
    {
      title: 'Wholesale',
      links: [
        {label: 'Bulk Flowers', to: '/collections/bulk-flowers'},
        {label: 'Wholesale Roses', to: '/collections/wholesale-roses'},
        {label: 'Wholesale Greenery', to: '/collections/wholesale-greenery'},
        {label: 'Florist Essentials', to: '/collections/florist-essentials'},
        {label: 'Business Accounts', to: '/pages/contact'},
      ],
    },
    {
      title: 'Floral Supplies',
      links: [
        {label: 'Floral Supplies', to: '/collections/floral-supplies'},
        {label: 'Vases & Containers', to: '/collections/vases-and-containers'},
        {label: 'Ribbon', to: '/collections/ribbon'},
        {label: 'Wrapping & Packaging', to: '/collections/wrapping-and-packaging'},
        {label: 'Tools & Accessories', to: '/collections/tools-and-accessories'},
        {label: 'Baskets', to: '/collections/gift-baskets'},
      ],
    },
    {
      title: 'Shop By',
      links: [
        {label: 'Colour', to: '/collections/all-flowers'},
        {label: 'Occasion', to: '/collections/birthday'},
        {label: 'Wedding Flowers', to: '/collections/wedding-flowers'},
        {label: 'Plants', to: '/collections/plants'},
      ],
    },
  ],
  footerShop: [
    {label: 'All flowers', to: '/collections/all-flowers'},
    {label: 'Bulk flowers', to: '/collections/bulk-flowers'},
    {label: 'Wholesale roses', to: '/collections/wholesale-roses'},
    {label: 'Floral supplies', to: '/collections/floral-supplies'},
    {label: 'Greenery & fillers', to: '/collections/greenery-and-fillers'},
    {label: 'Shop all', to: '/collections/all'},
  ],
  footerServices: [
    {label: 'Weddings', to: '/pages/wedding-events'},
    {label: 'Corporate', to: '/pages/corporate-flowers'},
    {label: 'Wholesale', to: '/collections/bulk-flowers'},
    {label: 'Same-day delivery', to: '/pages/delivery-information'},
  ],
};

/* -------------------------------------------------------------------------- */
/* DELUXE — luxury gifting / editorial                                        */
/* -------------------------------------------------------------------------- */
export const DELUXE_NAV: ExperienceNav = {
  primary: [
    {label: 'Shop', to: '/collections/luxury-bouquets', mega: true},
    {label: 'Weddings', to: '/pages/wedding-events'},
    {label: 'Our Story', to: '/pages/about-us'},
    {label: 'Concierge', to: '/pages/contact'},
  ],
  mega: [
    {
      title: 'Signature',
      links: [
        {label: 'Signature Bouquets', to: '/collections/luxury-bouquets'},
        {label: 'New Arrivals', to: '/collections/all-flowers?sort=newest'},
        {label: 'Best Sellers', to: '/collections/all-flowers'},
        {label: 'Luxury Arrangements', to: '/collections/luxury-bouquets'},
      ],
    },
    {
      title: 'Flowers',
      links: [
        {label: 'Premium Roses', to: '/collections/roses'},
        {label: 'Premium Orchids', to: '/collections/orchids'},
        {label: 'Lilies', to: '/collections/lilies'},
        {label: 'Tropical Flowers', to: '/collections/tropical-flowers'},
      ],
    },
    {
      title: 'Gifts',
      links: [
        {label: 'Luxury Gift Boxes', to: '/collections/gift-baskets'},
        {label: 'Romance', to: '/collections/love-and-romance'},
        {label: 'Anniversary', to: '/collections/anniversary'},
        {label: 'Birthday', to: '/collections/birthday'},
        {label: 'Corporate Gifting', to: '/collections/corporate-gifting'},
        {label: 'Add-ons', to: '/collections/add-ons'},
      ],
    },
    {
      title: 'Services',
      links: [
        {label: 'Weddings', to: '/pages/wedding-events'},
        {label: 'Corporate', to: '/pages/corporate-flowers'},
        {label: 'Concierge', to: '/pages/contact'},
        {label: 'Our Story', to: '/pages/about-us'},
      ],
    },
  ],
  footerShop: [
    {label: 'Signature bouquets', to: '/collections/luxury-bouquets'},
    {label: 'Premium roses', to: '/collections/roses'},
    {label: 'Luxury gifts', to: '/collections/gift-baskets'},
    {label: 'Romance', to: '/collections/love-and-romance'},
    {label: 'Anniversary', to: '/collections/anniversary'},
    {label: 'Shop all', to: '/collections/all'},
  ],
  footerServices: [
    {label: 'Weddings', to: '/pages/wedding-events'},
    {label: 'Corporate gifting', to: '/pages/corporate-flowers'},
    {label: 'Concierge', to: '/pages/contact'},
    {label: 'Same-day delivery', to: '/pages/delivery-information'},
  ],
};

export function navFor(experience: ExperienceMode): ExperienceNav {
  return experience === 'deluxe' ? DELUXE_NAV : CLASSIC_NAV;
}
