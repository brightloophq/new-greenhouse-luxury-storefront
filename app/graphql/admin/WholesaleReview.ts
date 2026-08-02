// Shopify ADMIN API operations for the internal wholesale review route.
// Server-side only (uses SHOPIFY_ADMIN_API_TOKEN). The Customer Account API
// cannot write wholesale_status, so the staff decision goes through the Admin API.

export const REVIEW_CUSTOMER_QUERY = `#graphql
  query ReviewCustomer($id: ID!) {
    customer(id: $id) {
      id
      businessName: metafield(namespace: "custom", key: "business_name") { value }
      businessType: metafield(namespace: "custom", key: "business_type") { value }
      craTrn: metafield(namespace: "custom", key: "cra_trn_number") { value }
      businessPhone: metafield(namespace: "custom", key: "business_phone") { value }
      wholesaleStatus: metafield(namespace: "custom", key: "wholesale_status") { value }
    }
  }
` as const;

export const REVIEW_DECISION_MUTATION = `#graphql
  mutation SetWholesaleDecision($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key namespace }
      userErrors { field message code }
    }
  }
` as const;
