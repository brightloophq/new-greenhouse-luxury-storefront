// Customer Account API. Reads the wholesale-approval metafield (the API does not
// expose customer `tags`, so a customer metafield is the supported equivalent).
// Merchant sets: namespace "custom", key "wholesale_approved", value "true".
export const WHOLESALE_APPROVAL_QUERY = `#graphql
  query WholesaleApproval {
    customer {
      firstName
      metafield(namespace: "custom", key: "wholesale_approved") {
        value
      }
    }
  }
` as const;
