/**
 * Global navigation — ONE green brand, one minimal nav on every route.
 * Premium/Deluxe is a catalogue pathway inside Arrangements and never appears
 * here. About is a dropdown holding About Us / Contact Us / Reviews (reviews
 * live only on their own page).
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

/** The approved global navigation. */
export const MAIN_NAV: ExperienceNav = {
  primary: [
    {label: 'Home', to: '/'},
    {label: 'Wholesale', to: '/wholesale'},
    {label: 'Retail', to: '/retail'},
    {label: 'Arrangements', to: '/arrangements'},
    {label: 'Supplies', to: '/supplies'},
    {label: 'About', to: '/about', mega: true},
  ],
  // Single dropdown column, rendered by the accessible mega panel.
  mega: [
    {
      title: 'About',
      links: [
        {label: 'About Us', to: '/about'},
        {label: 'Contact Us', to: '/contact'},
        {label: 'Reviews', to: '/reviews'},
      ],
    },
  ],
  footerShop: [
    {label: 'Wholesale', to: '/wholesale'},
    {label: 'Retail', to: '/retail'},
    {label: 'Arrangements', to: '/arrangements'},
    {label: 'Supplies', to: '/supplies'},
  ],
  footerServices: [
    {label: 'About Us', to: '/about'},
    {label: 'Contact Us', to: '/contact'},
    {label: 'Reviews', to: '/reviews'},
  ],
};

/**
 * One nav everywhere. The optional `_experience` argument is kept so existing
 * call sites compile unchanged.
 */
export function navFor(_experience?: ExperienceMode): ExperienceNav {
  return MAIN_NAV;
}

/** Primary "keep shopping" destination for shared empty states. */
export function primaryShopPath(_experience?: ExperienceMode): string {
  return '/arrangements';
}
