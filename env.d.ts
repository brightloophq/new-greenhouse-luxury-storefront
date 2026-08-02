/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

import type {HydrogenEnv} from '@shopify/hydrogen';

declare global {
  /**
   * Server-side environment variables. Extends Hydrogen's base env with the
   * wholesale notification config. All four are optional at the type level: if
   * any is missing/blank at runtime the internal notification is skipped (the
   * profile still saves). No address or secret is hardcoded in the app.
   */
  interface Env extends HydrogenEnv {
    RESEND_API_KEY?: string;
    WHOLESALE_NOTIFY_FROM?: string;
    WHOLESALE_NOTIFY_REPLY_TO?: string;
    WHOLESALE_INTERNAL_EMAIL?: string;
    /** Store's myshopify handle (no ".myshopify.com") for the Admin deep link. */
    SHOPIFY_ADMIN_STORE_HANDLE?: string;
    /**
     * Server-side Shopify Admin API access token (shpat_…) with read_customers +
     * write_customers. Used ONLY by the internal review route to read applicant
     * details and write custom.wholesale_status / custom.wholesale_review_note.
     * Never sent to the browser.
     */
    SHOPIFY_ADMIN_API_TOKEN?: string;
    /** HMAC-SHA256 secret for signing email review links. Server-side only. */
    WHOLESALE_REVIEW_SIGNING_SECRET?: string;
    /** Review-link lifetime in seconds (e.g. 172800 = 48h). */
    WHOLESALE_REVIEW_LINK_TTL_SECONDS?: string;
    /** Absolute base URL for the internal review route (no trailing slash). */
    WHOLESALE_REVIEW_BASE_URL?: string;
  }
}

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';
