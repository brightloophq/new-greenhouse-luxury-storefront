// Customer Account API. Reads the manual wholesale-review decision the owner
// records on the customer in Shopify Admin: namespace "custom", key
// "wholesale_status" (values: approved | pending | rejected |
// more_information_required). The API does not expose customer `tags`, so a
// customer metafield is the supported equivalent. Signing in is necessary but
// NOT sufficient — only "approved" opens the trade catalogue and its pricing.
export const WHOLESALE_STATUS_QUERY = `#graphql
  query WholesaleStatus {
    customer {
      firstName
      metafield(namespace: "custom", key: "wholesale_status") {
        value
      }
    }
  }
` as const;
