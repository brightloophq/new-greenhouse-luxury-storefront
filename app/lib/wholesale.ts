/**
 * Wholesale access gate (Phase 2). The trade area requires authentication and
 * merchant approval.
 *
 * Shopify's Customer Account API does not expose customer `tags`, so approval is
 * read from a customer metafield — the API-supported equivalent of a "wholesale"
 * tag. The merchant approves an account by setting:
 *
 *     namespace: custom   key: wholesale_approved   value: "true"   (boolean/single-line)
 *
 * (The metafield definition must grant "Customer Account API" read access.)
 *
 * States:
 *   guest    → not signed in           → show sign-in / apply gate
 *   pending  → signed in, not approved  → show "approval pending / contact" gate
 *   approved → signed in + approved     → full wholesale dashboard
 *
 * The metafield read is defensive: any error (metafield not yet configured, no
 * access) resolves to `pending` — secure by default, and never breaks the page.
 */

import {WHOLESALE_APPROVAL_QUERY} from '~/graphql/customer-account/WholesaleApprovalQuery';

export type WholesaleAccess = 'guest' | 'pending' | 'approved';

export interface WholesaleAccessResult {
  access: WholesaleAccess;
  firstName?: string;
}

interface WholesaleCustomerAccount {
  isLoggedIn(): Promise<boolean>;
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{
    data?: {
      customer?: {
        firstName?: string | null;
        metafield?: {value?: string | null} | null;
      } | null;
    } | null;
    errors?: unknown;
  }>;
}

const TRUTHY = new Set(['true', '1', 'yes', 'approved']);

/** Resolve the shopper's wholesale access level (guest | pending | approved). */
export async function getWholesaleAccess(
  customerAccount: WholesaleCustomerAccount,
): Promise<WholesaleAccessResult> {
  let loggedIn = false;
  try {
    loggedIn = await customerAccount.isLoggedIn();
  } catch {
    loggedIn = false;
  }
  if (!loggedIn) return {access: 'guest'};

  try {
    const {data} = await customerAccount.query(WHOLESALE_APPROVAL_QUERY);
    const value = data?.customer?.metafield?.value?.trim().toLowerCase();
    const approved = value != null && TRUTHY.has(value);
    return {
      access: approved ? 'approved' : 'pending',
      firstName: data?.customer?.firstName ?? undefined,
    };
  } catch {
    // Metafield not configured / no read access → secure default.
    return {access: 'pending'};
  }
}
