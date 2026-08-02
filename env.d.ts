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
     * TNG Commerce Manager app credentials (Dev Dashboard). The server exchanges
     * these for a short-lived Admin API token via the client-credentials grant.
     * Server-only — never sent to the browser.
     */
    SHOPIFY_API_KEY?: string;
    SHOPIFY_API_SECRET?: string;
    /**
     * TEMPORARY fallback Admin API access token (shpat_…). Used only when the
     * client credentials above are absent; can be removed from Oxygen once the
     * automatic client-credentials exchange is verified in production.
     */
    SHOPIFY_ADMIN_API_TOKEN?: string;
    /** HMAC-SHA256 secret for signing email review links. Server-side only. */
    WHOLESALE_REVIEW_SIGNING_SECRET?: string;
    /** Review-link lifetime in seconds (e.g. 172800 = 48h). */
    WHOLESALE_REVIEW_LINK_TTL_SECONDS?: string;
    /** Absolute base URL for the internal review route (no trailing slash). */
    WHOLESALE_REVIEW_BASE_URL?: string;
    /**
     * Phase 2 feature flag for in-email Approve/Reject decisions. Default OFF.
     * Only "true" renders the signed decision buttons; any other value (or unset)
     * shows only the "Review & Decide in Shopify" link.
     */
    WHOLESALE_EMAIL_DECISIONS_ENABLED?: string;
  }
}

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';
