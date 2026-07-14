// Decoupled view-model types for the M4 catalog components.
// Routes map Storefront fragment nodes onto these (structurally compatible),
// so components don't depend on regenerated codegen types.

export interface CatalogImage {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface CatalogMoney {
  amount: string;
  currencyCode: string;
}

export interface CatalogProduct {
  id: string;
  handle: string;
  title: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  availableForSale?: boolean | null;
  featuredImage?: CatalogImage | null;
  images?: {nodes: CatalogImage[]} | null;
  priceRange: {
    minVariantPrice: CatalogMoney;
    maxVariantPrice: CatalogMoney;
  };
  compareAtPriceRange?: {minVariantPrice: CatalogMoney} | null;
  description?: string | null;
}
