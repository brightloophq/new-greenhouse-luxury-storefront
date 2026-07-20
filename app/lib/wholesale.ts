/**
 * Wholesale access. The trade area requires authentication, but NOT manual
 * approval — a customer who signs in or creates a wholesale account gets
 * immediate wholesale access. (Business-profile details are collected during
 * onboarding; they do not gate shopping.)
 *
 * States:
 *   guest         → not signed in       → open the sign-in / create-account modal
 *   authenticated → signed in           → wholesale dashboard + catalogue
 */

import {WHOLESALE_APPROVAL_QUERY} from '~/graphql/customer-account/WholesaleApprovalQuery';

export type WholesaleAccess = 'guest' | 'authenticated';

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
      customer?: {firstName?: string | null} | null;
    } | null;
    errors?: unknown;
  }>;
}

/** Resolve wholesale access: signed-in shoppers get immediate access. */
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

  // Signed in → immediate access. Fetch the first name for a friendly greeting.
  try {
    const {data} = await customerAccount.query(WHOLESALE_APPROVAL_QUERY);
    return {access: 'authenticated', firstName: data?.customer?.firstName ?? undefined};
  } catch {
    return {access: 'authenticated'};
  }
}
