// Customer Account API. The signed-in customer reads/writes their OWN wholesale
// business profile, stored as a single JSON metafield (custom.wholesale_profile).
// No manual approval — completing the profile is encouraged, not gating.
//
// NOTE (merchant): the metafield definition custom.wholesale_profile (type json)
// must grant "Customer Account API" READ + WRITE access for these to succeed at
// runtime; userErrors are surfaced gracefully if not.

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
      wholesaleProfile: metafield(namespace: "custom", key: "wholesale_profile") {
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
