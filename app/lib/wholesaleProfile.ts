import {redirect} from 'react-router';
import {
  WHOLESALE_PROFILE_QUERY,
  type WholesaleProfileFieldKey,
} from '~/graphql/customer-account/WholesaleProfile';

/**
 * The wholesale business profile — stored as INDIVIDUAL, typed customer
 * metafields in the `custom` namespace (not one JSON blob), so the merchant can
 * read, filter and segment on each value in Shopify admin.
 *
 * This module is the single source of truth for the field list; the form, the
 * validation, the metafieldsSet payload and the completeness gate all derive
 * from it.
 */
export interface WholesaleProfileField {
  /** Metafield key under the `custom` namespace. */
  key: WholesaleProfileFieldKey;
  /** Form field name (same as key — kept explicit for clarity). */
  label: string;
  /** Shopify metafield type. */
  type: 'single_line_text_field' | 'multi_line_text_field' | 'url';
  required: boolean;
  /** Renders a <select> instead of an <input>. */
  options?: string[];
  /** Full-width in the form grid. */
  full?: boolean;
  textarea?: boolean;
  inputType?: string;
}

export const BUSINESS_TYPES = [
  'Florist',
  'Wedding planner',
  'Event planner',
  'Funeral home',
  'Hotel',
  'Restaurant',
  'Retail shop',
  'Corporate buyer',
  'Designer/decorator',
  'Other',
];

export const PURCHASE_FREQUENCIES = [
  'Weekly',
  'Every two weeks',
  'Monthly',
  'Seasonally',
  'Occasionally',
];

export const WHOLESALE_PROFILE_FIELDS: WholesaleProfileField[] = [
  {
    key: 'business_name',
    label: 'Business name',
    type: 'single_line_text_field',
    required: true,
  },
  {
    key: 'business_type',
    label: 'Business type',
    type: 'single_line_text_field',
    required: true,
    options: BUSINESS_TYPES,
  },
  {
    key: 'business_phone',
    label: 'Business phone',
    type: 'single_line_text_field',
    required: true,
    inputType: 'tel',
  },
  {
    key: 'business_address',
    label: 'Business address',
    type: 'multi_line_text_field',
    required: true,
    full: true,
  },
  {
    key: 'city_parish',
    label: 'City / parish',
    type: 'single_line_text_field',
    required: true,
  },
  {
    key: 'delivery_area',
    label: 'Preferred delivery area',
    type: 'single_line_text_field',
    required: true,
  },
  {
    key: 'website_social',
    label: 'Website or Instagram (optional)',
    type: 'single_line_text_field',
    required: false,
    full: true,
  },
  {
    key: 'purchase_frequency',
    label: 'Expected purchasing frequency (optional)',
    type: 'single_line_text_field',
    required: false,
    options: PURCHASE_FREQUENCIES,
  },
  {
    key: 'business_notes',
    label: 'Anything else we should know? (optional)',
    type: 'multi_line_text_field',
    required: false,
    full: true,
    textarea: true,
  },
];

export const REQUIRED_PROFILE_KEYS = WHOLESALE_PROFILE_FIELDS.filter(
  (f) => f.required,
).map((f) => f.key);

export type WholesaleProfile = Partial<Record<WholesaleProfileFieldKey, string>>;

/** Metafield rows → a flat {key: value} profile. */
export function toProfile(
  metafields: ({key?: string | null; value?: string | null} | null)[] | null | undefined,
): WholesaleProfile {
  const profile: WholesaleProfile = {};
  for (const field of metafields ?? []) {
    const value = field?.value?.trim();
    if (field?.key && value) {
      profile[field.key as WholesaleProfileFieldKey] = value;
    }
  }
  return profile;
}

/** Required keys with no value. */
export function missingProfileFields(profile: WholesaleProfile) {
  return REQUIRED_PROFILE_KEYS.filter((key) => !profile[key]);
}

export function isProfileComplete(profile: WholesaleProfile) {
  return missingProfileFields(profile).length === 0;
}

interface CustomerAccountLike {
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{data?: unknown; errors?: unknown}>;
}

/**
 * Gate a wholesale catalogue on profile completeness. An authenticated trade
 * buyer with an incomplete profile is sent to the profile form with a `return`
 * param so they land back where they were heading.
 *
 * If the profile query itself fails (metafield definition not yet granted
 * Customer Account API read access, network error) we DO NOT lock the buyer
 * out — we let them shop and log a warning. A misconfigured metafield must
 * never look like a closed door.
 */
export async function requireWholesaleProfile(
  customerAccount: CustomerAccountLike,
  request: Request,
): Promise<WholesaleProfile> {
  let profile: WholesaleProfile = {};
  try {
    const {data} = (await customerAccount.query(WHOLESALE_PROFILE_QUERY)) as {
      data?: {customer?: {metafields?: ({key?: string; value?: string} | null)[]}};
    };
    profile = toProfile(data?.customer?.metafields);
  } catch (error) {
     
    console.warn('[wholesale] profile lookup failed — allowing access', error);
    return {};
  }

  if (!isProfileComplete(profile)) {
    const {pathname, search} = new URL(request.url);
    throw redirect(
      `/account/wholesale-profile?return=${encodeURIComponent(pathname + search)}`,
    );
  }
  return profile;
}
