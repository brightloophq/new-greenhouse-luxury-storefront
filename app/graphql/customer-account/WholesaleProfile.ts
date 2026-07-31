// Customer Account API. The signed-in customer reads/writes their OWN wholesale
// business profile, stored as INDIVIDUAL typed customer metafields in the
// `custom` namespace — not a JSON blob — so each value is readable, filterable
// and segmentable in Shopify admin.
//
// NOTE (merchant): every definition listed in WHOLESALE_PROFILE_KEYS must exist
// under the `custom` namespace with "Customer Account API" READ + WRITE access
// granted, otherwise metafieldsSet returns userErrors (surfaced gracefully).
// See docs/MERCHANT-ACTIONS.md.

export const WHOLESALE_PROFILE_KEYS = [
  'business_name',
  'business_type',
  'cra_trn_number',
  'business_phone',
  'business_address',
  'city_parish',
  'delivery_area',
  'website_social',
  'purchase_frequency',
  'business_notes',
] as const;

export type WholesaleProfileFieldKey = (typeof WHOLESALE_PROFILE_KEYS)[number];

export const WHOLESALE_PROFILE_QUERY = `#graphql
  query WholesaleProfile {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      metafields(
        identifiers: [
          {namespace: "custom", key: "business_name"}
          {namespace: "custom", key: "business_type"}
          {namespace: "custom", key: "cra_trn_number"}
          {namespace: "custom", key: "business_phone"}
          {namespace: "custom", key: "business_address"}
          {namespace: "custom", key: "city_parish"}
          {namespace: "custom", key: "delivery_area"}
          {namespace: "custom", key: "website_social"}
          {namespace: "custom", key: "purchase_frequency"}
          {namespace: "custom", key: "business_notes"}
          {namespace: "custom", key: "wholesale_status"}
        ]
      ) {
        key
        namespace
        value
      }
    }
  }
` as const;

export const WHOLESALE_PROFILE_MUTATION = `#graphql
  mutation SetWholesaleProfile($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;
